#!/usr/bin/env node
/**
 * TX-8P responsive layout smoke test.
 *
 * Boots the app in headless Chromium at representative iPhone portrait and
 * landscape viewports and asserts the docked-layout invariants:
 *   - three regions present (header meter, editor, performance dock)
 *   - keyboard is visible and tall enough to play
 *   - the performance dock sits BELOW the editor (no overlap / merge)
 *   - the top output meter is visible
 *   - no horizontal page overflow; dock stays within the viewport
 *
 * Exit 0 = all assertions passed. No extra npm deps (Node 22 WebSocket/fetch).
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

function findChrome() {
  if (process.env.TX8P_CHROME) return process.env.TX8P_CHROME;
  const home = os.homedir();
  const cands = [
    ...["ms-playwright"].flatMap((dir) => {
      const base =
        process.platform === "win32"
          ? path.join(home, "AppData", "Local", dir)
          : process.platform === "darwin"
            ? path.join(home, "Library", "Caches", dir)
            : path.join(home, ".cache", dir);
      if (!existsSync(base)) return [];
      return readdirSync(base)
        .filter((n) => /^chromium-\d+$/.test(n))
        .sort()
        .reverse()
        .flatMap((n) => [
          path.join(base, n, "chrome-win64", "chrome.exe"),
          path.join(base, n, "chrome-linux", "chrome"),
          path.join(base, n, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        ]);
    }),
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ];
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error("No Chromium found. Set TX8P_CHROME=<path>.");
}

const CHROME = findChrome();
const APP_PORT = 45997;
const CDP_PORT = 45127;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const log = (...a) => console.log("[responsive]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => (s.destroy(), resolve()));
      s.once("error", () => {
        s.destroy();
        if (Date.now() > deadline) reject(new Error("timeout"));
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}
const conn = (u) =>
  new Promise((res, rej) => {
    const ws = new WebSocket(u);
    ws.addEventListener("open", () => res(ws));
    ws.addEventListener("error", rej);
  });

let devProc, chromeProc;
const cleanup = () => {
  try {
    chromeProc?.kill("SIGKILL");
  } catch {}
  try {
    devProc?.kill("SIGKILL");
  } catch {}
};

async function main() {
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
  chromeProc = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${path.join(os.tmpdir(), "tx8p-responsive")}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "inherit"], env: process.env },
  );
  await waitPort(CDP_PORT, 30000);
  await sleep(800);

  const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  const ws = await conn(ver.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) {
      const { r, j } = pend.get(m.id);
      pend.delete(m.id);
      m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((r, j) => {
      const i = ++id;
      pend.set(i, { r, j });
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s("Page.enable");
  await s("Runtime.enable");

  const results = [];
  const assert = (name, cond, detail = "") => {
    results.push({ name, ok: !!cond });
    log(`${cond ? "PASS" : "FAIL"} — ${name}${detail ? ` (${detail})` : ""}`);
  };

  const measure = async (w, h, label) => {
    await s("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await s("Page.navigate", { url: APP_URL });
    await sleep(3200);
    const r = await s("Runtime.evaluate", {
      expression: `(() => {
        const rect = (el) => { if(!el) return null; const b=el.getBoundingClientRect(); return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,w:b.width,h:b.height}; };
        const one = (sel) => rect(document.querySelector(sel));
        // pick the first VISIBLE meter (the hidden desktop/mobile variant has width 0)
        const meters = [...document.querySelectorAll('[aria-label="Output level meter"]')].map(rect).filter(Boolean);
        const visibleMeter = meters.find((m) => m.w > 10) || meters[0] || null;
        // Keyboard layout metrics (TX27 parity): white keys are even-width and
        // fill the dock; black keys are narrower and top-aligned.
        const kbdEl = document.querySelector('[aria-label="Playable keyboard"]');
        let keyMetrics = null;
        if (kbdEl) {
          const kb = kbdEl.getBoundingClientRect();
          const keys = [...kbdEl.querySelectorAll('button[aria-label]')];
          const whites = keys.filter((b) => /^[A-G]\\d+$/.test(b.getAttribute('aria-label')));
          const blacks = keys.filter((b) => /#/.test(b.getAttribute('aria-label')));
          const ww = whites.map((b) => b.getBoundingClientRect().width);
          const bw = blacks.map((b) => b.getBoundingClientRect().width);
          const bTops = blacks.map((b) => b.getBoundingClientRect().top - kb.top);
          const bHeights = blacks.map((b) => b.getBoundingClientRect().height);
          keyMetrics = {
            whiteCount: whites.length,
            blackCount: blacks.length,
            whiteWidthSpread: ww.length ? Math.max(...ww) - Math.min(...ww) : null,
            whiteWidthAvg: ww.length ? ww.reduce((a, b) => a + b, 0) / ww.length : null,
            blackWidthAvg: bw.length ? bw.reduce((a, b) => a + b, 0) / bw.length : null,
            blackTopMax: bTops.length ? Math.max(...bTops) : null,
            blackHeightRatio: bHeights.length ? Math.max(...bHeights) / kb.height : null,
          };
        }
        // Preset navigation must stay fully on-screen (header must not clip
        // the Library button on a phone).
        const libEl = [...document.querySelectorAll('button')].find((b) => /library/i.test(b.getAttribute('aria-label') || ''));
        return JSON.stringify({
          dock: one('[aria-label="Performance dock"]'),
          keyboard: one('[aria-label="Playable keyboard"]'),
          meter: visibleMeter,
          editor: one('[data-region="editor"]'),
          keyMetrics,
          library: rect(libEl),
          vw: window.innerWidth, vh: window.innerHeight,
          scrollW: document.documentElement.scrollWidth,
        });
      })()`,
      returnByValue: true,
    });
    const m = JSON.parse(r.result.value);
    log(`${label} ${w}x${h}: dock=${!!m.dock} kbd=${!!m.keyboard} meter=${!!m.meter}`);
    assert(`${label}: performance dock present`, !!m.dock);
    assert(
      `${label}: keyboard present + playable height`,
      m.keyboard && m.keyboard.h >= 60,
      m.keyboard && `h=${m.keyboard.h.toFixed(0)}`,
    );
    assert(`${label}: output meter visible`, m.meter && m.meter.w > 10);
    assert(
      `${label}: dock is within viewport`,
      m.dock && m.dock.bottom <= m.vh + 1,
      m.dock && `bottom=${m.dock.bottom.toFixed(0)} vh=${m.vh}`,
    );
    assert(
      `${label}: no horizontal overflow`,
      m.scrollW <= m.vw + 1,
      `scrollW=${m.scrollW} vw=${m.vw}`,
    );
    if (m.dock && m.editor) {
      assert(
        `${label}: dock does not overlap editor`,
        m.dock.top >= m.editor.bottom - 2,
        `dockTop=${m.dock.top.toFixed(0)} editorBottom=${m.editor.bottom.toFixed(0)}`,
      );
    }

    // ---- Keyboard layout measurements (TX27 parity) ----
    const km = m.keyMetrics;
    assert(
      `${label}: keyboard exposes white + black keys`,
      km && km.whiteCount >= 8 && km.blackCount >= 5,
      km && `white=${km.whiteCount} black=${km.blackCount}`,
    );
    if (km) {
      // White keys must be even width — the JX/TX keybed has no ragged spacing.
      assert(
        `${label}: white keys are even width`,
        km.whiteWidthSpread != null && km.whiteWidthSpread <= 1.5,
        `spread=${km.whiteWidthSpread?.toFixed(2)}px avg=${km.whiteWidthAvg?.toFixed(1)}px`,
      );
      // Black keys sit ~55–70% of a white key's width (classic keybed proportion).
      const ratio = km.whiteWidthAvg ? km.blackWidthAvg / km.whiteWidthAvg : null;
      assert(
        `${label}: black keys narrower than white (keybed proportion)`,
        ratio != null && ratio > 0.4 && ratio < 0.8,
        `black/white=${ratio?.toFixed(2)}`,
      );
      // Black keys are top-aligned and roughly 2/3 height.
      assert(
        `${label}: black keys top-aligned + shorter`,
        km.blackTopMax != null &&
          km.blackTopMax <= 2 &&
          km.blackHeightRatio > 0.5 &&
          km.blackHeightRatio < 0.8,
        `top=${km.blackTopMax?.toFixed(1)}px hRatio=${km.blackHeightRatio?.toFixed(2)}`,
      );
    }
    // Keyboard fills the dock width (a wide, playable keybed — not a strip).
    assert(
      `${label}: keyboard fills dock width`,
      m.keyboard && m.dock && m.keyboard.w >= m.dock.w * 0.55,
      m.keyboard && m.dock && `kbdW=${m.keyboard.w.toFixed(0)} dockW=${m.dock.w.toFixed(0)}`,
    );
    // Preset navigation (Prev/Next/Library) stays fully within the viewport.
    assert(
      `${label}: preset nav Library button not clipped`,
      m.library && m.library.right <= m.vw + 1 && m.library.left >= -1,
      m.library && `libRight=${m.library.right.toFixed(0)} vw=${m.vw}`,
    );
  };

  await measure(393, 852, "portrait"); // iPhone 15 Pro portrait
  await measure(852, 393, "landscape"); // iPhone 15 Pro landscape

  const passed = results.filter((r) => r.ok).length;
  log(`\n${passed}/${results.length} assertions passed`);
  cleanup();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error("[responsive] ERROR", e);
  cleanup();
  process.exit(1);
});
