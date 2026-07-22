# Agent notes — TXPPS TX-8P

Guidance for automated contributors working on this repository.

## Architecture invariants (do not violate)

- **One `AudioContext`** — constructed only by `src/engine/context.ts`
  (`getAudioGraph()`). Nothing else may `new AudioContext()`.
- **One `SynthEngine`** — the singleton from `src/engine/SynthEngine.ts`
  (`getSynthEngine()`). React drives UI/state only, never DSP timing.
- **One parameter registry** — `src/engine/params/registry.ts` is the single
  source of truth for parameter IDs, ranges, curves, formatting, and MIDI/mod
  eligibility. UI, presets, MIDI Learn, and the modulation matrix all resolve
  through it. Never redeclare a parameter elsewhere.
- **Voice ownership by handle** — presses return a `VoiceHandle`; releases must
  cite that handle. Never resolve releases by MIDI note number alone.
- **Client-only audio** — never touch Web Audio during SSR/module evaluation.

## Conventions

- Preserve the approved visual identity (gray chassis, cream buttons, muted
  accents, amber LCD, TX27 tabs). Design tokens live in `src/styles.css`.
- Keep `tsc --noEmit` and `eslint .` clean before committing.
