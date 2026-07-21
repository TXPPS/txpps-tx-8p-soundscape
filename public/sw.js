/*
 * TXPPS TX-8P service worker.
 *
 * - Navigations: network-first (so new deploys are seen) with an offline
 *   fallback to the cached app shell. Never traps users on a stale build.
 * - Same-origin static assets (hashed JS/CSS/fonts/icons/manifest):
 *   stale-while-revalidate for instant offline reloads.
 * - Versioned cache; old caches are pruned on activate.
 * - Wavetables + factory presets are generated/bundled in JS, so caching
 *   the app shell + hashed bundles is enough to play fully offline.
 * - Never caches MIDI/microphone permissions (those are not fetches).
 */
const VERSION = "tx8p-v1";
const CORE_CACHE = `${VERSION}-core`;
const ASSET_CACHE = `${VERSION}-assets`;
const CORE = ["/", "/manifest.webmanifest", "/icons/tx8p-icon.svg", "/fonts/JetBrainsMono.woff2"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((c) => c.addAll(CORE))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations → network-first, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CORE_CACHE);
          cache.put("/", fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cache = await caches.open(CORE_CACHE);
          return (await cache.match("/")) || (await cache.match(req)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    })(),
  );
});
