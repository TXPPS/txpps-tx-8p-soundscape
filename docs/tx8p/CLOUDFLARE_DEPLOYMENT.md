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
| Deploy command | `wrangler deploy -c .output/server/wrangler.json --name txpps-tx-8p` |
| Output directory | `.output/` (`server/` Worker + `public/` assets) |

## Deployment

Requires Cloudflare auth (`wrangler login`, or `CLOUDFLARE_API_TOKEN` +
`CLOUDFLARE_ACCOUNT_ID`) against the target account:

```sh
bun run deploy       # vite build && wrangler deploy … --name txpps-tx-8p
```

This deploys directly into the authenticated Cloudflare account as the
permanent `txpps-tx-8p` Worker, alongside `txpps-tx27`, `txpps-tx-80`, and
`txpps-p5ive-review`. Redeploy after each verified checkpoint with the same
command — the Worker name and URL stay stable across redeploys.

## Deployment validation checklist

On the live URL:

- [ ] Home page loads over HTTPS · JS + CSS + fonts + icon load
- [ ] Direct deep-route refresh works (SPA/SSR fallback)
- [ ] Service worker registers (Settings → PWA shows *Registered*)
- [ ] First audio gesture starts sound; touchscreen keyboard renders
- [ ] No console errors, no mixed content, no Lovable branding
- [ ] Mobile viewport (portrait + landscape) works

## Redeploy procedure

1. `git pull` the branch and `bun install` if deps changed.
2. `bun run deploy` — same Worker name, same URL.
3. Re-run the validation checklist.

## Rollback procedure

- `wrangler deployments list --name txpps-tx-8p` then
  `wrangler rollback --name txpps-tx-8p [<version-id>]` to revert to a prior
  version.
- **Git:** check out the previous good commit and `bun run deploy` again.
