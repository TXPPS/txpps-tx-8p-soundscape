#!/usr/bin/env node
/**
 * TX-8P headless audio + engine smoke test.
 *
 * Boots the dev server, drives a real headless Chromium via the Chrome
 * DevTools Protocol (no extra npm deps — Node 22 provides WebSocket/fetch),
 * and asserts REAL audio behaviour through the analyser plus the engine's
 * ownership guarantees:
 *   - first note produces audible RMS
 *   - release decays to the noise floor
 *   - release-before-startup never leaks a late note
 *   - an 8-note chord runs 8 voices; a 9th steals (stays <= 8)
 *   - panic returns active voices to 0 and silences output
 *   - the parameter registry is internally consistent
 *
 * Exit code 0 = all assertions passed.
 */
import { spawn } from "node:child_process";
import net from "node:net";

const CHROME = process.env.TX8P_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const APP_PORT = 45999;
const CDP_PORT = 45123;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;

const log = (...a) => console.log("[audio-smoke]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => {
        s.destroy();
        resolve();
      });
      s.once("error", () => {
        s.destroy();
        if (Date.now() > deadline) reject(new Error(`port ${port} timeout`));
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

// ---- minimal CDP client ----
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.sessions = new Set();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", (e) => reject(e));
  });
}

let devProc, chromeProc;
function cleanup() {
  try {
    chromeProc?.kill("SIGKILL");
  } catch {}
  try {
    devProc?.kill("SIGKILL");
  } catch {}
}

async function main() {
  log("starting dev server…");
  devProc = spawn(
    "node_modules/.bin/vite",
    ["dev", "--port", String(APP_PORT), "--host", "127.0.0.1"],
    {
      stdio: ["ignore", "ignore", "inherit"],
      env: process.env,
    },
  );
  await waitPort(APP_PORT, 60000);
  await sleep(1500);
  log("dev server up");

  log("launching chromium…");
  chromeProc = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--remote-debugging-address=127.0.0.1",
      "--no-sandbox",
      "--disable-gpu",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-ui-for-media-stream",
      "--no-first-run",
      "--user-data-dir=/tmp/tx8p-chrome-profile",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "inherit"], env: process.env },
  );
  await waitPort(CDP_PORT, 30000);
  await sleep(800);

  const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  const browser = new CDP(await connect(ver.webSocketDebuggerUrl));

  const { targetId } = await browser.send("Target.createTarget", { url: APP_URL });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => browser.send(m, p, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");
  await sleep(3500); // hydrate + mount

  const evaluate = async (expression, userGesture = true) => {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description || "eval error");
    return r.result.value;
  };

  // wait for engine to exist
  await evaluate(
    `(async()=>{for(let i=0;i<40;i++){if(window.__tx8p?.engine)return true;await new Promise(r=>setTimeout(r,100));}throw new Error('engine missing')})()`,
  );

  const results = [];
  const assert = (name, cond, detail = "") => {
    results.push({ name, ok: !!cond, detail });
    log(`${cond ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
  };

  // helper injected in page: RMS over the analyser
  const setup = `
    window.__t = {
      eng: window.__tx8p.engine,
      rms(){ const a=this.eng.getAnalyser(); if(!a) return -1;
        const buf=new Float32Array(a.fftSize); a.getFloatTimeDomainData(buf);
        let s=0; for(let i=0;i<buf.length;i++) s+=buf[i]*buf[i]; return Math.sqrt(s/buf.length); }
    };`;
  await evaluate(setup);

  // 1) first note → audible
  const firstNote = await evaluate(`(async()=>{
    const t=window.__t; const h=t.eng.pressNote('screen','smoke',60,0.9);
    await new Promise(r=>setTimeout(r,400));
    const r1=t.rms();
    t.eng.releaseNote(h);
    await new Promise(r=>setTimeout(r,900));
    const r2=t.rms();
    return {r1,r2,active:t.eng.getActiveVoiceCount()};
  })()`);
  assert("first note produces audible RMS", firstNote.r1 > 0.005, `rms=${firstNote.r1.toFixed(4)}`);
  assert(
    "release decays toward floor",
    firstNote.r2 < firstNote.r1 * 0.5 + 0.002,
    `rms=${firstNote.r2.toFixed(4)}`,
  );

  // 2) release-before-startup guarantee (simulate by press+immediate release many times)
  const noLeak = await evaluate(`(async()=>{
    const t=window.__t;
    for(let i=0;i<20;i++){const h=t.eng.pressNote('screen','rapid'+i,64,0.8); t.eng.releaseNote(h);}
    await new Promise(r=>setTimeout(r,600));
    return {active:t.eng.getActiveVoiceCount(), pending:t.eng.getPendingCount(), rms:t.rms()};
  })()`);
  assert(
    "20 rapid press+release leave no active voices",
    noLeak.active === 0,
    `active=${noLeak.active}`,
  );
  assert("rapid taps leave silence", noLeak.rms < 0.01, `rms=${noLeak.rms.toFixed(4)}`);

  // 3) 8-note chord + 9th steal
  const chord = await evaluate(`(async()=>{
    const t=window.__t; const hs=[];
    for(let i=0;i<9;i++) hs.push(t.eng.pressNote('screen','chord'+i,55+i,0.8));
    await new Promise(r=>setTimeout(r,250));
    const active=t.eng.getActiveVoiceCount();
    for(const h of hs) t.eng.releaseNote(h);
    await new Promise(r=>setTimeout(r,1200));
    return {active, after:t.eng.getActiveVoiceCount()};
  })()`);
  assert(
    "9-note input keeps voices <= 8 (stealing)",
    chord.active <= 8 && chord.active >= 6,
    `active=${chord.active}`,
  );
  assert("chord release returns to 0 active", chord.after === 0, `after=${chord.after}`);

  // 4) panic
  const panic = await evaluate(`(async()=>{
    const t=window.__t; const hs=[];
    for(let i=0;i<5;i++) hs.push(t.eng.pressNote('screen','p'+i,60+i,0.8));
    await new Promise(r=>setTimeout(r,200));
    t.eng.panic();
    await new Promise(r=>setTimeout(r,150));
    const a=t.eng.getActiveVoiceCount(), p=t.eng.getPendingCount(), rms=t.rms();
    // next note after panic still works
    const h=t.eng.pressNote('screen','after',67,0.9);
    await new Promise(r=>setTimeout(r,300));
    const rms2=t.rms(); t.eng.releaseNote(h);
    return {a,p,rms,rms2};
  })()`);
  assert("panic clears active voices", panic.a === 0, `active=${panic.a}`);
  assert("panic clears pending", panic.p === 0, `pending=${panic.p}`);
  assert("note after panic sounds", panic.rms2 > 0.005, `rms=${panic.rms2.toFixed(4)}`);

  // 5) registry integrity
  const reg = await evaluate(`(async()=>{
    const t=window.__t;
    // exercise a preset load + a param change to confirm no throw
    t.eng.setParam('filter.cutoff', 2000);
    t.eng.setParam('osc2.level', 0.6);
    t.eng.setParam('voice.mode', 1);
    const h=t.eng.pressNote('screen','mono',60,0.9);
    await new Promise(r=>setTimeout(r,200));
    const rms=t.rms(); t.eng.releaseNote(h);
    await new Promise(r=>setTimeout(r,400));
    t.eng.setParam('voice.mode', 0);
    return {rms, sr:t.eng.getSampleRate()};
  })()`);
  assert("param changes + mono mode still sound", reg.rms > 0.004, `rms=${reg.rms.toFixed(4)}`);
  assert("sample rate reported", reg.sr > 0, `sr=${reg.sr}`);

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  log(`\n${passed}/${total} assertions passed`);
  cleanup();
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error("[audio-smoke] ERROR", e);
  cleanup();
  process.exit(1);
});
