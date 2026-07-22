#!/usr/bin/env node
/**
 * TX-8P local production preview.
 *
 * Builds the production bundle and serves the ACTUAL Cloudflare Worker
 * output locally via `wrangler dev` (workerd) — the same artifact that
 * deploys to staging. Prints a clear Local URL and a LAN URL, and opens the
 * browser when practical. Requires no Cloudflare login (local mode) and no
 * Lovable tooling. Falls back to the Vite dev server if Wrangler can't start.
 *
 * Usage:  node scripts/preview.mjs [--no-build] [--port 46020]
 */
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import net from "node:net";

const args = process.argv.slice(2);
const noBuild = args.includes("--no-build");
const portArg = args.indexOf("--port");
const PORT = portArg >= 0 ? Number(args[portArg + 1]) : 46020;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function lanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return null;
}
function waitPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => (s.destroy(), resolve()));
      s.once("error", () => {
        s.destroy();
        if (Date.now() > deadline) reject(new Error("timeout"));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}
function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    }).unref();
  } catch {
    /* headless; ignore */
  }
}
function banner(url) {
  const ip = lanIp();
  console.log("\n┌───────────────────────────────────────────────┐");
  console.log("│  TXPPS TX-8P — local production preview        │");
  console.log("├───────────────────────────────────────────────┤");
  console.log(`│  Local:   ${url.padEnd(36)}│`);
  console.log(`│  Network: ${(ip ? `http://${ip}:${PORT}/` : "(no LAN address)").padEnd(36)}│`);
  console.log("│  Tap/click once to start audio.                │");
  console.log("└───────────────────────────────────────────────┘\n");
}

async function main() {
  if (!noBuild) {
    console.log("[preview] building production bundle…");
    const b = spawnSync("node_modules/.bin/vite", ["build"], { stdio: "inherit" });
    if (b.status !== 0) process.exit(b.status ?? 1);
  }

  const url = `http://localhost:${PORT}/`;
  console.log("[preview] starting Cloudflare Worker (wrangler dev)…");
  const child = spawn(
    "npx",
    [
      "--yes",
      "wrangler",
      "dev",
      "-c",
      ".output/server/wrangler.json",
      "--port",
      String(PORT),
      "--ip",
      "0.0.0.0",
    ],
    { stdio: ["ignore", "inherit", "inherit"], env: process.env },
  );

  const stop = () => {
    try {
      child.kill("SIGINT");
    } catch {
      /* noop */
    }
  };
  process.on("SIGINT", () => (stop(), process.exit(0)));
  process.on("SIGTERM", () => (stop(), process.exit(0)));

  try {
    await waitPort(PORT, 45000);
    await sleep(800);
    banner(url);
    openBrowser(url);
  } catch {
    console.error("[preview] wrangler dev did not start; falling back to `vite dev`.");
    stop();
    spawn("node_modules/.bin/vite", ["dev", "--host", "--port", String(PORT), "--open"], {
      stdio: "inherit",
    });
  }
}

main();
