# TXPPS TX-8P

**Eight-voice hybrid polyphonic browser synthesizer by TXPPS.**

The TX-8P is a real, playable synthesizer that runs entirely in the browser:
one stable `AudioContext`, one authoritative `SynthEngine`, dual oscillators
(wavetable + virtual analog), sub, noise, a multimode filter, amp/mod
envelopes, two LFOs, a four-slot modulation matrix, a full effects rack
(drive → EQ → chorus → delay → reverb → limiter), eight-voice polyphony with
Mono and Unison modes, touch/mouse/computer-keyboard/Web-MIDI input, MIDI
Learn, a preset library, and an installable offline PWA. The interface is a
JX-8P-era Japanese industrial hardware panel with a TX27-style tab workflow.

## Quick start

Requires [Node.js 22+](https://nodejs.org) and [Bun](https://bun.sh) (the
project uses a `bun.lock`; `npm`/`pnpm` also work for the scripts).

```sh
bun install        # or: npm install
bun run dev        # start the dev server, prints the local + LAN URL
```

Open the printed URL and **click/tap once** to start audio (browsers require a
user gesture), then play with the on-screen keys, your computer keyboard, or a
connected MIDI controller.

### Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server with HMR (prints local + LAN URLs). |
| `bun run build` | Production build → `.output/` (Cloudflare Worker + static assets). |
| `bun run preview` | Serve the **production build** locally (prints local + LAN URLs, opens the browser). |
| `bun run test` | Unit tests (engine lifecycle, voice ownership, registry, presets). |
| `bun run test:audio` | Audio-focused engine tests (first-note, release, panic, polyphony). |
| `bun run deploy` | Build + deploy to Cloudflare (needs `wrangler login` / `CLOUDFLARE_API_TOKEN`). |
| `bun run deploy:temporary` | Build + deploy to a temporary Cloudflare claim URL (no login required). |

Windows users can double-click the launchers in `scripts/`:
`start-local.ps1`, `build-preview.ps1`, `test-all.ps1`.

## Playing

- **Touch / mouse** — the on-screen keyboard (multitouch, per-pointer ownership).
- **Computer keyboard** — musical-typing layout: `Z S X D C V G B H N J M` (lower row)
  and `Q 2 W 3 E R 5 T 6 Y 7 U` (upper row). `Z`/`X` shift the octave. Press
  the panic shortcut to kill all sound.
- **Web MIDI** — connect a controller, enable it in **Settings → MIDI**. Supports
  Note On/Off, velocity, pitch bend (14-bit), CC1 (mod), CC64 (sustain), CC120/123.
- **MIDI Learn** — long-press (or right-click) a control, move a hardware knob, done.

## Panic

The red **!** at the top-right is authoritative: it silences and clears every
note source (touch, keyboard, MIDI, held, sustain, mono stack, unison groups)
and returns the engine to a clean state.

## Documentation

- `docs/tx8p/CLAUDE_TAKEOVER_AUDIT.md` — takeover audit and subsystem status.
- `docs/tx8p/LOCAL_TESTING.md` — local + offline testing workflow.
- `docs/tx8p/CLOUDFLARE_DEPLOYMENT.md` — deployment method, URLs, redeploy/rollback.
- `docs/tx8p/ARCHITECTURE.md` — engine, signal flow, voice ownership, DSP.

## Built with

TanStack Start · React 19 · TypeScript · Vite · Tailwind CSS · Web Audio API ·
Web MIDI API · Cloudflare Workers.
