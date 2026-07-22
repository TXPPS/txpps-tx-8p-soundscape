# TX-8P — Cloudflare Deployment

## Method

The production build targets **Cloudflare Workers Static Assets** (modern; never
deprecated Workers Sites). `vite build` runs Nitro, which emits the Worker and a
concrete config at `.output/server/wrangler.json`:

- **Worker entry:** `.output/server/index.mjs` (SSR)
- **Static assets:** `.output/public` (bound as `ASSETS`)
- **compatibility_date:** `2026-07-21` · **flags:** `nodejs_compat`

The canonical settings (name, compat date, asset dir) live in the committed
root `wrangler.jsonc`. Deploys use the generated config with a stable name.

| Field | Value |
| --- | --- |
| Deployment method | Cloudflare Workers (Static Assets) via Wrangler |
| Worker name | `txpps-tx-8p` |
| Build command | `vite build` |
| Deploy command (authed) | `wrangler deploy -c .output/server/wrangler.json --name txpps-tx-8p` |
| Deploy command (no login) | `wrangler deploy -c .output/server/wrangler.json --name txpps-tx-8p --temporary` |
| Output directory | `.output/` (`server/` Worker + `public/` assets) |

## Authenticated deployment

If Cloudflare auth is available (`wrangler login`, or `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID`):

```sh
bun run deploy       # vite build && wrangler deploy … --name txpps-tx-8p
```

This keeps one stable staging Worker (`txpps-tx-8p`) and its URL across
redeploys. Redeploy after each verified checkpoint with the same command.

## No-credential (temporary claim) deployment

Used when no Cloudflare auth is present:

```sh
bun run deploy:temporary     # vite build && wrangler deploy … --temporary
```

Wrangler provisions a temporary account, deploys, and prints:

- a **live preview URL** (`https://txpps-tx-8p.<subdomain>.workers.dev`), and
- a **claim URL** (`https://dash.cloudflare.com/claim-preview?claimToken=…`),
  valid for **60 minutes**, which moves the Worker into your own Cloudflare
  account.

The deployment is **not permanent until you claim it**. If the claim window
expires, just run `bun run deploy:temporary` again for a fresh live + claim URL.

## Last deployed

| Field | Value |
| --- | --- |
| Deployed commit | see `git log` on `claude/tx8p-completion-eov6wf` |
| Live URL | `https://txpps-tx-8p.omniscient-mare.workers.dev` (temporary account) |
| Claim URL | printed by `deploy:temporary` (60-minute window; re-run for a fresh one) |
| Method | `wrangler deploy --temporary` (no credentials were available in-session) |

> **Verification note.** The deployed artifact is validated locally under the
> real Workers runtime (`wrangler dev`): `/`, `/sw.js`, `/manifest.webmanifest`,
> `/icons/tx8p-icon.svg`, `/assets/*` all return 200 with SSR HTML and zero
> Lovable references. Fetching the public URL **from this build environment**
> returns Cloudflare's managed bot-challenge interstitial (the sandbox egresses
> through a datacenter proxy that Cloudflare challenges), so final in-browser
> validation of the public URL should be done from a normal network.

## Deployment validation checklist

On the live URL (from a normal browser/network):

- [ ] Home page loads over HTTPS · JS + CSS + fonts + icon load
- [ ] Direct deep-route refresh works (SPA/SSR fallback)
- [ ] Service worker registers (Settings → PWA shows *Registered*)
- [ ] First audio gesture starts sound; touchscreen keyboard renders
- [ ] No console errors, no mixed content, no Lovable branding
- [ ] Mobile viewport (portrait + landscape) works

## Redeploy procedure

1. `git pull` the branch and `bun install` if deps changed.
2. `bun run deploy` (authed) — same Worker name, same URL.
3. Re-run the validation checklist.

## Rollback procedure

- **Authenticated:** `wrangler deployments list --name txpps-tx-8p` then
  `wrangler rollback --name txpps-tx-8p [<version-id>]` to revert to a prior
  version.
- **Git:** check out the previous good commit and `bun run deploy` again.
- **Temporary account:** redeploy from the last good commit with
  `bun run deploy:temporary` for a fresh live + claim URL.
