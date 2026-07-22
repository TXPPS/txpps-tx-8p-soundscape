#!/usr/bin/env node
/**
 * No-credential Cloudflare staging deploy for the TX-8P.
 *
 * Attempts a Wrangler deploy of the prebuilt Worker. If Cloudflare
 * authentication is available (CLOUDFLARE_API_TOKEN / prior `wrangler login`),
 * it deploys to the stable `txpps-tx-8p` Worker and prints the live URL.
 * If not, it reports exactly what the user needs to do to claim/authenticate,
 * without pretending the deploy is permanent.
 *
 * Run `npm run build` first (the npm script does this for you).
 */
import { spawnSync } from "node:child_process";

const cfg = ".output/server/wrangler.json";
const name = "txpps-tx-8p";

console.log("[deploy] Deploying prebuilt Worker via Wrangler…");
const res = spawnSync("npx", ["--yes", "wrangler", "deploy", "-c", cfg, "--name", name], {
  stdio: "inherit",
  env: process.env,
});

if (res.status === 0) {
  console.log(`\n[deploy] Deployed. Stable Worker: ${name}`);
  console.log("[deploy] Live URL: https://" + name + ".<your-subdomain>.workers.dev");
  process.exit(0);
}

console.log("\n[deploy] Wrangler could not deploy without authentication.");
console.log("[deploy] To deploy the staging build, either:");
console.log("  1) Run `npx wrangler login` (opens a browser to authorize), then `npm run deploy`.");
console.log("  2) Set CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) and run `npm run deploy`.");
console.log("\n[deploy] The production build is ready in .output/ and is deploy-complete.");
process.exit(res.status ?? 1);
