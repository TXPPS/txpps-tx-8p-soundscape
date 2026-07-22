# TX-8P — Local & Offline Testing

You need [Node.js 22+](https://nodejs.org) and [Bun](https://bun.sh) (the repo
ships a `bun.lock`; `npm` works too). After `bun install` (or `npm install`),
everything below works with **no** Lovable or Cloudflare login.

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server with HMR. Prints the Local + LAN URL. |
| `bun run build` | Production build → `.output/`. |
| `bun run preview` | Builds, then serves the **production Cloudflare Worker** locally via `wrangler dev`; prints Local + LAN URLs and opens the browser. Falls back to the dev server if Wrangler can't start. |
| `bun run test` | Node logic tests (registry integrity + factory-preset validity). |
| `bun run test:audio` | Headless-Chromium **Web Audio** smoke test (real analyser RMS). |
| `bun run test:all` | Both test suites. |
| `bun run deploy` | Build + deploy to Cloudflare (needs auth). |

**Windows (no command line):** double-click a launcher in `scripts/`:
`start-local.ps1`, `build-preview.ps1`, `test-all.ps1`. (Right-click → *Run with
PowerShell*, or `powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1`.)

## Quick play

```sh
bun install
bun run dev
```

Open the printed URL, **click/tap once** to start audio (browsers require a
gesture), then play with the on-screen keys, your computer keyboard, or MIDI.

## The automated audio test

`bun run test:audio` boots the app in headless Chromium and asserts real audio
through the analyser: first note is audible, release decays to the floor, 20
rapid taps leave no stuck notes, an 8-note chord runs 8 voices and a 9th steals,
Panic clears everything and the next note still sounds. Exit code 0 = all passed.

## Offline (PWA) test

The service worker registers only in a **production** build (so `dev` never
serves stale bundles).

1. `bun run preview` and open the printed Local URL.
2. **Settings → PWA** → *Install App* (or your browser's install button).
3. Stop the preview server (Ctrl-C) or turn off networking.
4. Reload the installed app / the tab.
5. The instrument shell renders and is **playable offline** — on-screen keys,
   computer keyboard, all DSP, and factory presets work. Web MIDI may be
   unavailable offline depending on the browser/device.

## Manual checklist (physical devices)

Some checks need real hardware and cannot be automated here:

- **Multitouch** on a touchscreen (two+ fingers, repeated notes, `pointercancel`,
  rotation, background/foreground).
- **Web MIDI** with a real controller: detection, hot-plug, Note On/Off, velocity,
  pitch bend, mod wheel (CC1), sustain (CC64), MIDI Learn (long-press a control,
  move a knob), Pickup takeover.
- **Responsive** layouts on a real phone: portrait perf row, landscape left rail,
  tablet/desktop; all seven editor tabs reachable at 390px.
