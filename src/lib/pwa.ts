/**
 * PWA registration + install/update tracking (client-only).
 *
 * Registers the service worker in production only (dev never caches, so new
 * builds are always visible). Tracks an available update and the install
 * prompt, exposing a tiny observable store for the Settings → PWA panel.
 */

export interface PwaState {
  supported: boolean;
  registered: boolean;
  installable: boolean;
  installed: boolean;
  updateAvailable: boolean;
  controller: boolean;
}

type Listener = () => void;

let state: PwaState = {
  supported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
  registered: false,
  installable: false,
  installed: false,
  updateAvailable: false,
  controller: false,
};
const listeners = new Set<Listener>();
let waitingWorker: ServiceWorker | null = null;
let deferredPrompt: (Event & { prompt: () => Promise<void> }) | null = null;

function emit() {
  state = { ...state };
  for (const l of listeners) l();
}

export function getPwaState(): PwaState {
  return state;
}
export function subscribePwa(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Only register the SW in production builds.
  if (!import.meta.env.PROD) return;
  // Temporary preview builds set this to guarantee the preview can never load
  // or install a cached (stale/production) app shell during audio testing.
  if (import.meta.env.VITE_TX8P_DISABLE_SW === "1") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as Event & { prompt: () => Promise<void> };
    state.installable = true;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    state.installed = true;
    state.installable = false;
    emit();
  });

  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      state.registered = true;
      state.controller = !!navigator.serviceWorker.controller;
      emit();
      if (reg.waiting) {
        waitingWorker = reg.waiting;
        state.updateAvailable = true;
        emit();
      }
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorker = nw;
            state.updateAvailable = true;
            emit();
          }
        });
      });
    })
    .catch(() => undefined);

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  deferredPrompt = null;
  state.installable = false;
  emit();
}

export function applyUpdate() {
  if (waitingWorker) waitingWorker.postMessage("SKIP_WAITING");
}

export async function getCacheInfo(): Promise<{ caches: number; entries: number }> {
  if (typeof caches === "undefined") return { caches: 0, entries: 0 };
  try {
    const keys = await caches.keys();
    let entries = 0;
    for (const k of keys) {
      const c = await caches.open(k);
      entries += (await c.keys()).length;
    }
    return { caches: keys.length, entries };
  } catch {
    return { caches: 0, entries: 0 };
  }
}
