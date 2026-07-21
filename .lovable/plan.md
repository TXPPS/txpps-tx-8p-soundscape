# TXPPS TX-8P — Definitive Implementation Plan v2

> Authoritative product + engineering plan. Source-of-truth order: **Master Specification → this plan → TX27 reference**. No production code begins until this document is approved.

---

## 0. Product Vision

When a musician opens the TX-8P for the first time, the experience should feel less like a website and more like unboxing a boutique piece of hardware.

The chassis fades in. The green LCD warms up with a brief, tasteful boot sequence — "TXPPS TX-8P / READY". A default preset — musical, immediately playable, flattering to the ear — is already loaded. A single tap anywhere resumes audio, and the first note sounds instantly, at full quality, with no dropouts.

Every knob feels weighted. Every switch clicks with intent. The keyboard tracks fingers precisely, even during fast multi-touch passages. Nothing shifts, nothing flickers, nothing surprises. Presets step cleanly. The LCD reports what changed. Panning to the effects panel is a smooth transition, not a page load.

Within thirty seconds a player should think: *this is a real instrument*. Within five minutes they should want to save a preset. Within an hour they should have forgotten it runs in a browser.

Guiding qualities: **quality, stability, musicality, professionalism, immediate playability, intuitive workflow, premium industrial design.** The TX-8P is unmistakably part of the TXPPS family — a TX27 owner should feel at home in the first second — while clearly representing the next step for the line.

---

## 1. TXPPS Product Identity

Every TXPPS synthesizer shares these principles. The TX-8P evolves them; it does not depart from them.

- **Premium industrial hardware styling** — dark professional chassis, machined surfaces, restrained accents.
- **Vintage-inspired green LCD** — the family signature. Always present, always meaningful.
- **Fast preset workflow** — LCD + Quick Access (prev / next / browse) reachable at all times.
- **Left-side performance controls** — pitch wheel, mod wheel, Hold, octave, voice mode, Panic; anchored on the left in every layout.
- **Professional hardware-inspired control surfaces** — no generic web widgets.
- **Touch-first interaction** — every control designed for finger input, then enhanced for mouse and keyboard.
- **Responsive layouts** — desktop, tablet, phone portrait/landscape, all intentional.
- **Reliable audio startup** — one AudioContext, gesture-unlocked, first note always sounds.
- **Predictable note handling** — pointer-authoritative, no stuck notes, ever.
- **Installable PWA architecture** — offline shell, install prompt, standalone display.
- **Clean typography** — a humanist technical sans for body, a purpose-built mono for LCD, engraved-style labels for the chassis.
- **Consistent spacing** — a shared spacing scale across every panel, control, and layout.
- **Original DSP architecture** — each instrument carries its own engine identity.

**TX-8P's evolution of the identity**: refined chassis material rendering (softer bevels, subtle micro-texture), a slightly deeper LCD green with an amber sub-accent for edited/dirty states, and a chassis badge that reads *TXPPS · TX-8P · Hybrid Poly Synthesizer*.

---

## 2. Industrial Design Philosophy

TX-8P's look is an **original design** in the spirit of mid-1980s Japanese polyphonic synthesizers — nothing about the appearance, branding, panel graphics, silk-screen legends, colorway, or trade dress of any specific commercial instrument is reproduced.

What we capture from the era:

- Understated elegance — surfaces do the work; ornamentation is minimal.
- Dark professional chassis — a warm charcoal with a faint neutral undertone, not pure black.
- Recessed panels — clear delineation of sections via subtle inset shadows.
- Engraved legends — labels look milled/etched into the panel, not printed on top.
- Realistic hardware controls — knobs with visible caps, indicator lines, and shadow; switches with felt travel.
- Restrained accent colors — the green LCD, an amber edit indicator, a warm red for Panic. Nothing else colored.
- Balanced proportions — golden-ratio-ish column widths, generous vertical rhythm.
- Clean visual hierarchy — chassis → sections (recessed) → controls → labels; every level reads at a glance.

The finished interface should look like a product that *could plausibly exist as dedicated hardware*, while remaining unmistakably TXPPS and unmistakably original.

**Design tokens** (defined in `src/styles.css` as `oklch`, no hex in components):

```
--chassis-base, --chassis-highlight, --chassis-shadow, --chassis-microtexture
--panel-recess, --panel-edge-highlight, --panel-edge-shadow
--engraving-fill, --engraving-highlight
--lcd-green, --lcd-green-dim, --lcd-glow, --lcd-scanline
--accent-amber (edit / dirty)
--accent-red (panic)
--led-green-on, --led-green-off, --led-amber-on, --led-amber-off
--knob-face, --knob-face-highlight, --knob-cap, --knob-indicator, --knob-shadow
--switch-body, --switch-cap-on, --switch-cap-off, --switch-shadow
--radius-panel, --radius-control, --radius-cap
--shadow-inset-panel, --shadow-cap, --shadow-cap-pressed, --shadow-chassis
--space-1..8 (4/8/12/16/20/24/32/40)
```

No component ever uses `text-white`, `bg-black`, or a raw hex. Every color and shadow flows from a token.

---

## 3. LCD Display — Integrated Workstation Display

The LCD is not a label. It is the **primary status surface** of the instrument.

Character-cell model: a 2×20 or 2×24 monospaced grid rendered with a real dot-matrix look (dot mask + subtle scanline + soft outer glow). Respects `prefers-reduced-motion` (no pulsing glow, boot sequence collapses to a single frame).

**LCD Modes & States**

| Mode | Line 1 | Line 2 | Trigger |
|---|---|---|---|
| Boot | `TXPPS  TX-8P` | `READY` (after brief self-check ticks) | App mount |
| Preset (idle) | `B01·012 Warm Analog` (bank·index name) | `PAD  OCT +0  POLY` | Any preset loaded |
| Edited | `B01·012 Warm Analog*` (asterisk) | `EDITED — SAVE?` | Any param changed vs preset baseline |
| Parameter feedback | `Cutoff       ` | `▮▮▮▮▮▮▯▯▯▯  62%` (bar + value) | While a control is being adjusted; auto-reverts 900ms after release |
| Bank change | `BANK  FACTORY` | `24 PRESETS` | Bank picker opened |
| Category change | `CATEGORY  BASS` | `9 PRESETS` | Category filter applied |
| Octave change | `OCTAVE  +1` | `C2 – C5` | Octave stepper |
| Voice mode change | `VOICE  UNISON 5` | `DETUNE  22 ct` | Mode toggle |
| Loading | `LOADING…` | `▮▮▮▮▮▮▮▮▮▯` | Preset load / worklet init |
| Saving | `SAVING…` | preset name | Save-as / rename |
| Save confirmation | `SAVED` | preset name | 1.2s hold, then returns to Preset mode |
| Panic | `PANIC` | `ALL NOTES OFF` | Panic pressed; 700ms |
| Diagnostic (dev only, `?debug=1`) | `CPU 4%  VC 3/8` | `SR 48000  LAT 12ms` | Rotating diagnostic lines |
| MIDI Learn | `MIDI LEARN` | `MOVE A CONTROL…` | Long-press knob |
| Error | `ERROR` | short human message (e.g. `AUDIO BLOCKED`) | Unrecoverable transient |

**Behavioral rules**
- Parameter-feedback mode temporarily overrides Preset mode; releases after a short debounce so playing feels calm, not chatty.
- Text is scrolled marquee-style only when it overflows, and only for names — never for status.
- Line switches use a 60ms character-clock fade, not a flash.
- The LCD is a **read-only projection of state** — never the source of truth; state lives in the stores.

---

## 4. User Experience Philosophy

Every interaction is deliberate. Users should feel that someone thought about each one.

- **Knob response** — 1:1 vertical drag by default, fine-adjust with Shift (×0.1), coarse with Alt (×5). Mouse wheel steps by curve-appropriate increments. Double-click restores default. Arrow keys nudge; PageUp/PageDown coarse-step. Value tooltip appears immediately, fades 900ms after release.
- **Wheel movement** — pitch wheel spring-returns to center over 180ms with a subtle ease-out; mod wheel latches. Both support touch drag with pointer capture.
- **Switch feedback** — a 60ms mechanical press-in shadow + LED state change together, not sequenced.
- **Button animation** — 40ms press-in on pointerdown, 120ms release; disabled state has a distinct low-contrast treatment, never grayscale.
- **Preset loading** — LCD shows LOADING briefly only if load exceeds 80ms; the actual param change is ramped over 30ms per param to avoid zipper noise. No visible layout shift.
- **Panel transitions** — 220ms cross-fade + 8px slide, GPU-composited (transform/opacity only). Never a route re-mount on the instrument page.
- **Keyboard response** — <10ms visual key press on pointerdown; audio scheduled on the same event, not after paint.
- **Touch behavior** — `touch-action: none` on all controls; pointer capture on grab; explicit `pointercancel` handlers.
- **Hover behavior** — a subtle 1px inner highlight on knob cap + a slightly brighter engraved label; nothing that moves layout.
- **Focus behavior** — visible focus ring on every interactive element (offset 2px, `--ring` token); focus follows logical panel order for keyboard-only users.

**Non-goals**: bouncy springs, cartoonish scale-ups, gradient hover states, blur pop-ins, page-load spinners.

---

## 5. Commercial UI Quality Standards

Every visible element must satisfy commercial software standards. These are requirements, not aspirations.

- Controls are pixel-aligned on a shared 4px grid.
- Spacing follows the `--space-*` scale exclusively.
- Typography follows the type scale (see §7) — no arbitrary font sizes.
- Margins between sections are consistent within ±1px.
- Every knob in the same class has identical diameter (Large 64, Medium 48, Small 36).
- Panels group related parameters with a labeled recessed frame; groupings are consistent across panels.
- Layouts respond fluidly; there are no dead zones between breakpoints.
- Animations share a global timing set: fast 120ms, base 220ms, slow 320ms; ease `cubic-bezier(0.2, 0.6, 0.2, 1)`.
- Visual hierarchy: chassis → panel → group → control → label → value. Each level is distinguishable at a glance.
- No control ever appears in a half-styled or inconsistent state (e.g. a shadcn default leaking through).

---

## 6. Professional Control Design

Every reusable control has its own design standard and lives in `src/components/tx8p/controls/`. All controls belong to one cohesive hardware-inspired family.

**Rotary Knob** (`Knob`)
- SVG-rendered cap + engraved skirt + indicator line.
- Sizes: Large 64px, Medium 48px, Small 36px.
- States: idle, hover, active (dragging), focused, disabled, mod-learn.
- Behaviors from §4 (drag/wheel/dblclick/keys).
- ARIA: `role="slider"`, `aria-valuemin/max/now/text`, labeled by engraved label element.
- Optional value ring (thin arc) shows current value; unipolar or bipolar depending on param.

**Slider** (`Slider`)
- Vertical (for envelope shapes / mix) or horizontal (for master fader).
- Machined cap with a raised grip line, engraved track with tick marks at 25/50/75%.
- Same interaction spec as Knob.

**Switch** (`ToggleSwitch`)
- Two- or three-position toggle with a mechanical cap.
- Positions engraved beside the switch.
- Press-in shadow + LED state on same frame.

**Wheels** (`PitchWheel`, `ModWheel`)
- Vertical drum with an indicator groove and rubberized texture.
- Pitch wheel: bipolar with center detent; spring-returns.
- Mod wheel: unipolar; latches.

**Button** (`Button`, `LedButton`)
- Rectangular capped button; LED indicator when stateful.
- Press animation per §4.
- Long-press supported for context actions (MIDI Learn, param default).

**LED** (`Led`)
- Green (state on), amber (edit/warn), red (panic/error). Sizes 6/8/10px. Diffuse glow via inset+outer shadow.

**LCD Elements** (`LcdText`, `LcdBar`, `LcdMeter`)
- Character-cell text (§3), a horizontal bar (10 or 20 cells), and a small level meter.

**Meters** (`Meter`)
- Peak/RMS bar with segmented LED look; -inf to +6dB; peak-hold pip.

**Preset Browser Controls** (`Chip`, `ListRow`, `SearchField`, `IconButton`)
- Chips for category/tag filters; list rows with subtle recessed treatment; search field engraved into a small panel; icon buttons match Button family.

Every control ships with a Storybook-style example route (`/dev/controls` behind `?debug=1`) so QA can inspect every state.

---

## 7. Typography & Iconography

**Type stack**
- Chassis labels (engraved): `Inter Tight` or `IBM Plex Sans Condensed`, tracked +40, uppercase, small caps size (11/12/13).
- Body / UI text: `IBM Plex Sans` (400/500/600).
- LCD: `JetBrains Mono` (already in reference `public/fonts/`), loaded via `<link>` in `__root.tsx` head (not `@import` — Tailwind v4 rule).
- Numeric readouts: `JetBrains Mono` with tabular figures.

**Type scale**: 11, 12, 13, 14, 16, 20, 24, 32. No off-scale sizes.

**Iconography**: minimal outline icons at 16/20/24px, stroke 1.5px, from a single set (Lucide, restyled to token colors). No mixed icon families.

---

## 8. Application Architecture

- Framework: **TanStack Start** (existing template), SSR-safe. Client-only wrapper around anything touching `AudioContext` / MIDI.
- Routes:
  - `/` — instrument surface
  - `/presets` — full browser (desktop route; on mobile the same component renders in a bottom sheet without a route change)
  - `/about` — version, credits, install hint, diagnostics link
  - `sitemap.xml`, `robots.txt`
- Providers in `__root.tsx`: `QueryClientProvider`, `ThemeProvider` (dark-locked), `AudioEngineProvider` (lazy, gesture-gated), `PresetLibraryProvider`, `Toaster`.
- Head metadata per §16 (title, description, og:*, twitter:*).

## 9. Audio Architecture

```text
AudioContext (singleton, gesture-unlocked)
 └── MasterBus (analyser → limiter → destination)
      └── FXChain: Drive → EQ → Chorus → Delay → Reverb
           └── VoiceBus
                └── Voice × 8
                     Osc1 (wavetable, AudioWorklet) ─┐
                     Osc2 (VA saw/sq/tri/noise)      ├─► Mixer ─► Filter ─► VCA ─► voiceGain
                     SubNoise ────────────────────────┘             ▲          ▲
                     Env1 (amp) ──────────────────────────────────  ┼──────────┘
                     Env2 (mod) ──────────────────────────────────  ┘
                     LFO1, LFO2 → ModMatrix → any registered param
```

- One `SynthEngine` class owns lifecycle: `init()`, `resume()`, `noteOn`, `noteOff`, `allNotesOff`, `setParam(id, value, timeConstant)`, `dispose()`.
- **Parameter Registry**: single source of truth per param (`id`, `min`, `max`, `default`, `curve`, `unit`, `smoothingMs`). UI knobs bind by id; presets serialize by id; mod matrix targets by id.
- **AudioWorklet** for wavetable osc + soft-clipper drive. Fallback to buffer-source interpolation if unavailable.
- Sample-rate agnostic. All timings expressed in seconds, not samples.

## 10. Folder Structure

```text
src/
  routes/               # / , /presets , /about , api/public/*
  components/tx8p/
    chassis/            # Chassis, Panel, RecessedFrame, EngravedLabel, Badge
    controls/           # Knob, Slider, ToggleSwitch, TxSelect, Button, LedButton, Led, Meter, IconButton, SearchField, Chip
    lcd/                # PresetLCD, LcdText, LcdBar, LcdMeter, LcdBootSequence
    keyboard/           # Keyboard, KeyRow, PointerRouter
    perf/               # PerfStrip, PitchWheel, ModWheel, HoldButton, OctaveStepper, VoiceModeSwitch, PanicButton
    panels/             # OscPanel, FilterPanel, EnvPanel, LfoPanel, ModMatrixPanel, FxPanel
    preset-browser/     # BrowserRoot, CategoryList, PresetList, PresetDetails, Filters, BrowserSheet
    settings/           # SettingsDialog, MidiSettings, AudioSettings, AboutTab, DiagnosticsTab
  audio/
    engine/             # SynthEngine, MasterBus, FxChain, VoiceBus
    voice/              # Voice, VoiceManager, VoiceStealing
    dsp/                # wavetable.worklet.ts, va-osc.ts, filter.ts, envelope.ts, lfo.ts, drive.worklet.ts
    params/             # registry.ts, smoothing.ts, curves.ts
    midi/               # midiInput.ts, cc-mappings.ts, learn.ts
    lifecycle/          # audioUnlock.ts, contextSingleton.ts, visibilityHandler.ts, hmrGuard.ts
  presets/
    factory/            # *.json (bundled, ~48)
    schema/             # preset.schema.ts (zod), migrations/
    library/            # PresetLibrary (in-memory + IndexedDB user layer)
  state/                # zustand: uiStore, engineStore, presetStore, perfStore, meterStore
  hooks/                # useAudioEngine, useParam, useKeyboard, useMidi, useHydrated, useLcd
  lib/                  # utils, error reporting
  styles.css
native-reference/tx8p/  # PARAMETER_CONTRACT.json, STATE_SCHEMA.json, DSP_BEHAVIOR_SPEC.md,
                        # VOICE_ARCHITECTURE.md, PRESET_FORMAT.md, VALIDATION_TESTS.md
docs/tx8p/              # ARCHITECTURE.md, DECISION_LOG.md, QUALITY_GATES.md, MILESTONE_AUDITS/
```

## 11. Component Hierarchy

```text
<App>
  <Chassis>
    <TopBar>       Badge · PresetLCD · PresetQuickAccess (prev/next/browse) · Settings
    <MainPanels>   OscPanel | FilterPanel | EnvPanel | LfoPanel | ModMatrixPanel | FxPanel
    <PerfStrip>    Pitch · Mod · Hold · Octave± · Voice Mode · Panic     (left-anchored)
    <Keyboard>     multitouch; width-adaptive key count
  </Chassis>
  <PresetBrowserPortal />    route on desktop, bottom-sheet on mobile
  <SettingsDialogPortal />
```

## 12. State Management

- **Zustand** stores with selective subscriptions.
  - `engineStore`: param values by id.
  - `perfStore`: pitch, mod, hold, octave, voiceMode, unisonCount, unisonDetune, unisonSpread.
  - `presetStore`: current preset id, baseline snapshot, dirty flag, library snapshot, favorites.
  - `uiStore`: active panel, browser open, settings open, viewport class, LCD mode/message.
  - `meterStore`: throttled RAF-driven meter values (isolated so control panels don't re-render).
- **TanStack Query** only for async preset IO (IndexedDB, future cloud sync).
- Engine ↔ store bridge: store writes → `engine.setParam(id, value)` with per-param smoothing; engine posts meter data → `meterStore` via `requestAnimationFrame` throttled to 30Hz.

## 13. Voice Management

- **8-voice** poly (spec-family default; configurable to 16 later).
- **Modes**: Poly, Mono (legato/retrig configurable), Unison (2/3/5/7 voices, detune ct, spread %).
- **Allocation**: free-list; on exhaustion, steal oldest released → oldest sustaining → lowest-velocity.
- **Note lifecycle**: `noteOn(midi, vel, ts)` → allocate → reset envs → set pitch → ramp at `ts`. `noteOff` → release stage; recycle when `voiceGain < -60 dB` for 50 ms.
- **Hold**: latches active notes until release when Hold toggles off; new notes while Hold on join the latch set.
- **Panic**: cancel all scheduled events, hard-mute voice bus over 5ms, disconnect+reconnect voices to reset worklet state, reset perfStore transient flags, LCD `PANIC / ALL NOTES OFF` for 700ms.

## 14. Audio Lifecycle

- **Lazy creation** on first user gesture (pointerdown on chassis or first key). iOS: silent-buffer trick + `context.resume()`; verify `state === 'running'` before enabling input.
- **Visibility**: suspend after 60s hidden; resume on next gesture.
- **Route changes** never tear down the engine (provider lives above the outlet).
- **Singleton** guarded by a module-level ref; `import.meta.hot?.dispose` tears down cleanly.
- **All AudioNodes disconnected** on dispose; every `addEventListener` paired in `useEffect` cleanup.
- **First note guarantee**: keyboard input is disabled (visually and functionally) until context reports `running`; on unlock, an LCD hint (`READY`) confirms.

## 15. Preset Architecture

- Format v1 (versioned + migratable):
  ```json
  { "schema":"tx8p.preset/1", "id":"uuid", "name":"", "category":"Bass|Lead|Pad|Keys|FX|Perc|Arp|Init",
    "author":"", "tags":[], "params":{ "<paramId>": <number|string> }, "createdAt":"", "updatedAt":"" }
  ```
- **Factory bank**: ~48 curated JSON files (6 per category). Init preset is musical and playable.
- **User bank**: IndexedDB (`idb-keyval`), namespaced `tx8p.presets.user`.
- **Favorites**: separate small store; keyed by preset id (factory + user).
- **Ops**: load, save-as (user), rename (user), duplicate (any → user), delete (user), export/import `.tx8p.json`, export bank `.tx8p-bank.json`.
- **Migrations**: `migrations/1_to_2.ts` pattern; unknown params ignored with warning; missing params filled from Init.
- **Baseline diff**: preset load snapshots baseline; dirty flag is a true diff, not a "touched" flag, so returning a knob to its original value clears the asterisk.

## 16. Responsive Strategy

- Breakpoints: `≤600` phone, `601–1024` tablet, `≥1025` desktop. Fluid within each band.
- **Phone portrait**: TopBar → single Panel (tab strip) → PerfStrip → Keyboard (2 oct, scroll).
- **Phone landscape**: PerfStrip left rail, Keyboard fills, Panel accessible via bottom sheet.
- **Tablet**: two panels side-by-side; keyboard 2.5 oct; PerfStrip inline left.
- **Desktop**: full chassis, all panels visible, keyboard 3–4 oct scaled to width.
- Keyboard key count computed from container width (min white-key 36px phone / 44px desktop).
- `ResizeObserver` on chassis; orientation change re-runs layout with 120ms settle. No layout shift during play.

## 17. UI Implementation Strategy

- Design tokens (§2) in `src/styles.css`; components consume tokens exclusively.
- Head metadata set in `__root.tsx` head(): title `TXPPS TX-8P — Hybrid Poly Synthesizer`; description matching; og:* + twitter:card. Fonts via `<link>` in `__root.tsx` head, not `@import`.
- shadcn used only for Dialog, DropdownMenu, Toast — restyled with tokens so they blend into the chassis.
- Motion: Motion for React for panel transitions and LCD character-clock; kept to transform/opacity; `prefers-reduced-motion` collapses to instant.

## 18. Testing Strategy

- **Unit (vitest)**: param registry, curves, preset migrations, voice-stealing math, mod-matrix routing, LCD state machine.
- **Integration**: engine boot + first note under jsdom mock; preset round-trip; hold/panic invariants; dirty-diff correctness.
- **Playwright** (headless chromium): boot → gesture → key press → AnalyserNode RMS > threshold; 10-pointer stress → active voices returns to 0; orientation swap → no console errors; PWA offline load; iOS UA audio-unlock path.
- **Manual device matrix**: iPhone Safari, iPad Safari, Android Chrome, macOS Chrome/Safari/Firefox, Windows Chrome/Edge/Firefox. Documented in `docs/tx8p/DEVICE_MATRIX.md`.

## 19. Product Polish — Commercial Polish Checklist

Nothing on this list may be outstanding at ship.

- No clipped labels at any breakpoint.
- No overlapping controls in any layout.
- No inconsistent spacing (grid audit tool in `?debug=1`).
- No layout shifts on load, on preset change, on orientation change, or during play.
- No page scroll while adjusting a control (touch-action + pointer capture).
- Smooth panel transitions (transform/opacity only).
- Polished startup (LCD boot sequence, no white flash, dark background from first paint).
- Polished shutdown (context suspend is silent, no click).
- Polished preset changes (per-param smoothing, no zipper, LCD reflects change).
- Consistent animation timing (fast 120 / base 220 / slow 320 ms).
- No shadcn defaults leaking through anywhere.
- Every disabled state has an intentional visual, not just reduced opacity.
- Every error state has a human message on the LCD or a toast.
- Every long-running action (>80ms) reports progress somewhere.

## 20. Delight

Small, tasteful, never distracting.

- **LCD boot sequence** — a two-beat self-check then `READY`.
- **LED breathing** on the Hold LED when latched (very subtle, respects reduced-motion).
- **Knob detent tick** — a 1px indicator jog + tiny opacity flash when passing bipolar center / default.
- **Keyboard velocity glint** — a soft highlight on the pressed key proportional to velocity.
- **Preset-load micro-fade** — the LCD name line performs a 60ms character-swap, not a flash.
- **Panic afterglow** — a brief red LED pulse (single beat) that fades, so the user knows it fired.
- **Default preset** — chosen to sound flattering on laptop speakers and headphones alike; immediate musical satisfaction.
- **Save confirmation** — LCD `SAVED / <name>` for 1.2s, then returns; no modal.
- **Panel switch** — 220ms cross-fade + 8px slide; the panel labels above stay put so context is preserved.
- **Silent honesty** — when audio is blocked, the LCD says so plainly (`AUDIO BLOCKED — TAP TO START`) instead of failing quietly.

## 21. Milestones & Per-Milestone Self-Audit

After every milestone, before starting the next, produce a written self-audit in `docs/tx8p/MILESTONE_AUDITS/M<n>.md` comparing progress against:
1. TXPPS Web Synth Master Specification
2. This implementation plan
3. TX27 reference project (as UX reference only)

The audit lists: what was built, what quality gates passed, deficiencies found, corrections applied. **No milestone is complete until it passes its own quality gates.** If audit finds deficiencies, they are fixed before proceeding.

**Milestones**
1. **Chassis + Tokens + LCD shell + Init preset (no sound)** — design system, boot sequence, LCD state machine.
2. **AudioEngine singleton + one-voice sine** — first-note guarantee, iOS unlock, HMR safety.
3. **Full voice architecture** — dual-osc + filter + envs + LFOs + mod matrix + 8-voice poly.
4. **Keyboard + PerfStrip** — Hold, Panic, Octave, Voice modes, wheels, pointer authority.
5. **Effects rack** — Drive, EQ, Chorus, Delay, Reverb, Limiter.
6. **Preset library** — factory + user + browser + LCD wiring + import/export.
7. **Responsive layouts + PWA + offline shell**.
8. **QA hardening** — full acceptance-test pass, device matrix, validation report.

## 22. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| iOS audio-unlock fails silently | No sound on first load | LCD `AUDIO BLOCKED — TAP TO START`; retry on next gesture |
| Duplicate AudioContexts under HMR | CPU spike, distortion | Module-level singleton + `import.meta.hot?.dispose` teardown |
| Pointer capture lost on iOS scroll | Stuck notes | `touch-action: none`, authoritative pointerId→voiceId map, explicit `pointercancel` |
| AudioWorklet unsupported | No wavetable osc | Feature-detect; fall back to buffer-source with pre-baked mip levels |
| IndexedDB blocked (private mode) | User presets lost | Detect + non-blocking toast; degrade to session-only |
| Preset schema drift | Broken loads | Versioned schema, zod validation, migration pipeline |
| Bundle size (worklets + presets) | Slow first paint | Route-split; worklets loaded on first gesture; presets loaded on browser open |
| Web MIDI in Safari | Missing feature | Detect + hide MIDI UI; document in Settings > About |
| Font FOUT on cold load | Chassis flicker | `font-display: swap` + preload critical weights |
| Reduced-motion users get flashing LCD | Discomfort | LCD collapses boot/pulse to static states |

## 23. Recommendations Beyond the Specification

1. **Undo/Redo** on param changes (ring buffer, 50 steps).
2. **A/B compare** in TopBar — hold to hear alternate state.
3. **MIDI Learn** on right-click / long-press any knob.
4. **Preset tags + fulltext search** in addition to categories.
5. **Deterministic RNG seed** for unison detune / noise so presets sound identical across sessions.
6. **In-memory crash breadcrumb log** dumpable from Diagnostics tab (no telemetry, no network).
7. **Bank export/import** (`.tx8p-bank.json`).
8. **Full keyboard navigation** of every knob; screen-reader labels on every control.
9. **`native-reference/tx8p/` parity contract** kept green from day one — pays off for future VST/JUCE.
10. **`?debug=1` feature flags** — voice-count meter, CPU load, grid overlay, per-node latency.

## 24. Acceptance Standards

The TX-8P is not complete until **every** item is true.

**Correctness / Runtime**
- Zero console errors.
- Zero uncaught exceptions in any tested flow.
- Zero React warnings (including strict-mode double-mount warnings).
- Zero hydration warnings.
- Zero TypeScript errors (`tsgo`).
- Zero lint errors (project eslint config).
- No memory leaks (30 min play+idle loop, heap delta < 5 MB).
- No duplicate event listeners (verified via instrumented dev build).
- No duplicate AudioContexts (verified via singleton assertion).

**Audio**
- No stuck notes (10-min multi-touch stress).
- First note always sounds, every session, every device in matrix.
- Hold verified (latch/unlatch, joining while held, panic clears).
- Poly verified (8 simultaneous notes, correct stealing at 9+).
- Mono verified (legato + retrig modes both correct).
- Unison verified (2/3/5/7 counts, detune + spread audible and stable).
- Panic verified (clears all sound within 20ms, LCD confirms).
- Long-duration stable playback (60 min continuous, no dropouts, no drift).

**Preset & LCD**
- Preset workflow verified: load, save-as, rename, duplicate, delete, favorite, import, export, bank export.
- LCD verified across every mode in §3, including reduced-motion.
- Dirty asterisk is a true diff (returns cleared when values restored).

**Layout & Platform**
- Responsive layouts verified: phone portrait/landscape, tablet portrait/landscape, desktop. No layout shift during play.
- PWA installable; offline shell loads; icons and manifest correct.
- Device matrix (§18) all green.

**Delivery**
- Validation report produced in `docs/tx8p/VALIDATION_REPORT.md`: architecture, files, testing summary, known limitations, acceptance-test results per item above, screenshots per breakpoint.

---

**Status: awaiting approval.** No production code will be written until this plan is approved. On approval I will proceed strictly in milestone order (§21), producing the required per-milestone self-audits, and treating the Master Specification as the primary source of truth, this plan second, TX27 reference third.
