# TX-8P — Claude Takeover Audit

_Senior-engineer takeover of the TXPPS TX-8P browser synthesizer._

## Provenance

| Field | Value |
| --- | --- |
| Repository | `TXPPS/txpps-tx-8p-soundscape` |
| Starting commit | `b34cf956267a4f3b96783430c9bdd76f47b557ce` ("Completed CP2 and CP3") |
| Default branch | `main` |
| Takeover branch | `claude/tx8p-completion-eov6wf` |
| Framework | TanStack Start (SSR) + React 19 + Vite 8 + Tailwind v4 |
| Package manager | Bun (`bun.lock`, `bunfig.toml`) |
| Build target | Nitro → **Cloudflare Workers Static Assets** (auto-generated `wrangler.json`) |
| Node engine | Node 22 (dev tooling) |

## Baseline build/test status (verified from source + runtime)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | ✅ 0 errors |
| `eslint .` | ✅ 0 errors, 8 warnings (all pre-existing shadcn/ui `react-refresh/only-export-components` in `src/components/ui/*`) |
| `vite build` | ✅ succeeds; emits `.output/` with Cloudflare worker + static assets |
| Unit tests | ❌ none present (no test runner configured) |
| Dev server | Boots (`vite dev`) |

## Subsystem classification

Classifications verified against source, not against Lovable's completion report.

| Subsystem | State | Notes |
| --- | --- | --- |
| Singleton `AudioContext` (`engine/context.ts`) | **working** | Lazy singleton, master bus, safety limiter, analyser. Correct. |
| Singleton `SynthEngine` (`engine/SynthEngine.ts`) | **partially working** | Ownership model (handles/pending/panic/first-note) is correct and solid. Voice DSP is CP3-minimal: **one sine oscillator per voice**. |
| First-note guarantee + pending map | **working** | Register-before-resume, cancel-on-early-release. Verified in source. |
| Voice ownership (handles, not note numbers) | **working** | Repeated notes / overlapping touches safe. |
| Panic | **working** | Clears pending + active with click-safe fade. |
| Pointer keyboard (`keyboard/Keyboard.tsx`) | **working** | Pointer Events, per-pointer ownership, capture, blur/visibility cleanup. Fixed octave range (not wired to perf `octave`). |
| Performance deck (pitch/mod/octave/hold) | **visual placeholder** | 3 responsive layouts render, but `pitch`/`mod`/`hold`/`voiceMode` in `perfStore` **drive no DSP**. |
| Parameter registry (`engine/params/registry.ts`) | **partially working** | Real, well-designed schema — but only ~11 params (master, osc1 level/tune, filter cutoff/res, amp ADSR+vel). Missing osc2, sub, noise, mixer, filter modes, mod env, LFOs, matrix, FX, voice. |
| Editor UI (`editors/Editor.tsx`) | **functional placeholder** | All 7 tabs (OSC/FILTER/ENV/LFO/MOD/FX/VOICE) store values in local React state keyed `tab·sub·param`. **No control drives DSP or the registry.** |
| Effects chain | **missing** | Only the master safety limiter exists. No drive/EQ/chorus/delay/reverb. |
| Dual osc / sub / noise / mixer | **missing** | Single sine only. |
| Multimode filter | **missing** | No filter node in the voice path. |
| Mod envelope / LFOs / mod matrix | **missing** | — |
| Voice modes (Mono/Unison) | **missing** | Poly-only with basic 8-voice steal. `perfStore.voiceMode` unused by engine. |
| Computer-keyboard input | **missing** | — |
| Web MIDI + MIDI Learn | **missing** | — |
| Preset library | **functional placeholder** | `presetStore` has only `INIT`. `PresetNav` fakes prev/next. No serialization, no factory bank, no library UI. |
| Settings dialog | **visual placeholder** | Empty shell ("populated in a later milestone"). |
| PWA / service worker / manifest | **missing** | No manifest, no SW, no icons. |
| Cloudflare config in-repo | **missing** | Build auto-emits a worker, but no committed `wrangler` config, deploy scripts, or docs. Auto worker name `txpps-txpps-tx-8p-soundscape` (doubled). |
| CSS / design tokens (`styles.css`) | **working** | Complete JX-8P-influenced design system. Preserve as-is. |
| Test configuration | **missing** | — |

## Lovable branding / builder material found

| Location | Item | Action |
| --- | --- | --- |
| `src/lib/lovable-error-reporting.ts` | Editor telemetry shim (`__lovableEvents`, `__lovableReportRuntimeError`) — the only Lovable code in the shipped client bundle | **Removed**, replaced with neutral no-op error reporter. |
| `src/routes/__root.tsx` | Imports/calls `reportLovableError` | **Rewired** to neutral reporter. |
| `README.md` | "Welcome to your Lovable project" template | **Rewritten** for TXPPS. |
| `AGENTS.md` | `LOVABLE:BEGIN/END` block | **Removed.** |
| `bunfig.toml` | Lovable-branded comment + release-age excludes | Comment neutralised; kept the single build-config exclude. |
| `package.json` | `@lovable.dev/vite-tanstack-config` (dev dep) | **Kept** — technically necessary framework build preset (TanStack Start + Nitro + Cloudflare + Tailwind). Ships **no** runtime badge/script/analytics/telemetry into the client. |
| `vite.config.ts` | Uses the build-config preset | **Kept** (see above). |
| `.lovable/` (`project.json`, `plan.md`) | Lovable builder project link + metadata | **Removed** — severs builder integration; verified the production build still succeeds without it. |

No `lovable.dev`/`lovable.app` links, no "Edit with Lovable" control, no Lovable favicon, no Lovable badge, no `lovable-tagger`, no analytics were present in the app UI. The favicon is a generic placeholder (replaced with TXPPS icons in the PWA phase).

## Visual authority

The current approved TX-8P interface (gray chassis, charcoal strip, cream buttons, muted red/amber/blue accents, smoked-amber LCD, TX27 tab workflow, integrated performance deck, ivory keyboard) is **preserved**. No visual restart. Design tokens in `src/styles.css` are the source of truth.

## Major risks

1. **Enormous remaining scope** — the instrument is a UI shell over a CP3 single-sine engine. The bulk of the spec (DSP, FX, LFO/matrix, voice modes, MIDI, MIDI Learn, presets, PWA) is unbuilt.
2. **UI is disconnected from DSP** — the Editor must be rewired to the registry/engine so controls are real, not cosmetic.
3. **SSR framework** — Web Audio is strictly client-only; every engine touchpoint must guard against SSR. (Existing code already does this correctly.)
4. **Deployment credentials** — no Cloudflare auth provided in-session; staging uses the temporary-claim fallback.
5. **Hardware verification gaps** — physical MIDI controllers and real-device audio/touch cannot be exercised from this environment; those remain manual-test items.

## Preservation decisions

Preserved without rewrite: `context.ts`, the `SynthEngine` ownership model (handles/pending/panic/first-note), the pointer keyboard, the performance-deck layouts, the LCD, and the entire design system. The voice **DSP** is replaced (single sine → full hybrid voice) without changing the ownership API.
