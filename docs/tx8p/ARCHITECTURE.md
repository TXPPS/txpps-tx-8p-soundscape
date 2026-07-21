# TX-8P — Architecture

## Overview

The TX-8P is a client-side Web Audio synthesizer inside a TanStack Start (SSR)
React app. All audio is strictly client-only; the server only renders the shell.

```
React UI  ──state──►  stores (zustand)  ──calls──►  SynthEngine (singleton)
   ▲                                                     │
   │  useParam / useEngineStatus / useMidi               ▼
   └──────────── param-change notifications ◄──── AudioGraph (singleton)
                                                     Voices + Effects rack
```

Three invariants (enforced, see `AGENTS.md`):

1. **One `AudioContext`** — only `engine/context.ts` (`getAudioGraph()`).
2. **One `SynthEngine`** — `engine/SynthEngine.ts` (`getSynthEngine()`).
3. **One parameter registry** — `engine/params/registry.ts` drives UI, DSP,
   presets, MIDI, MIDI Learn, and the modulation matrix.

## Audio lifecycle

- The context is created lazily on the first press and `resume()`d inside the
  user-gesture call chain.
- **First-note guarantee:** a press while the context is still suspended is
  registered as a *pending* note keyed by its `VoiceHandle`. On resume it
  triggers **only if** the caller hasn't released it. Release-before-startup
  cancels the pending note, so no late note leaks.
- Status (`idle → starting → ready / suspended / error`) is exposed through
  `useEngineStatus()` and reflected in the top-bar pill.

## Voice ownership

- Every press returns a monotonically-increasing `VoiceHandle`. **Releases must
  cite that handle** — the engine never resolves releases by MIDI note number.
  This keeps repeated identical notes, overlapping touches, and MIDI+screen
  input from destroying each other, and lets a release survive an octave change.
- A `NoteRecord` owns the voice(s) a press created (one for Poly, N for Unison,
  or a shared voice for Mono). `panic()` hard-stops every voice, clears pending +
  active + mono stack + unison groups + sustain/hold, and zeroes pitch bend.

## Signal flow

```
            ┌─ OSC1 (wavetable, 2-frame morph) ─┐
            ├─ OSC2 (VA; real PW pulse)         ┤
   per note ┼─ SUB  (sine/square, -1/-2 oct)    ┼─► MIX ─► FILTER ─► AMP ─► PAN ─┐
            └─ NOISE (white/pink/dark + tone)   ┘   (+ring)  (LP/BP/HP/Notch)     │
                                                                                  ▼
   voiceBus ──► DRIVE ──► EQ ──► CHORUS ──► DELAY ──► REVERB ──► LIMITER ──► MASTER ──► ▶ destination
                                                                                  └► analyser (metering/tests)

   Modulation (per voice):  LFO1, LFO2, ModEnv, AmpEnv, Velocity, KeyTrack,
   ModWheel, Aftertouch, Random, Gate  ──[4-slot matrix]──►  Pitch / Osc levels /
   Osc2 PW / Osc1 Position / Cutoff / Resonance / Amp / Pan
```

Modulation of pitch and cutoff is applied in **cents** via each node's `detune`
AudioParam, so it is musical and click-free. Envelopes, LFOs, and matrix sources
connect through per-voice gain nodes at note-on.

## DSP notes

- **OSC1** crossfades two adjacent PeriodicWave "frames" of the selected table by
  `position` for smooth wavetable movement. All 13 tables are generated from
  harmonic recipes — no sampled/copyrighted material.
- **OSC2** pulse uses the difference-of-two-saws method, giving a genuine,
  modulatable pulse width (`osc2.pw` / `osc2.pwm`). No fake hard sync is exposed.
- **Noise** buffers (white/pink/dark) are procedurally generated and cached per
  context; a tone filter shapes them.
- **Filter** is a `BiquadFilterNode` switched between LP/BP/HP/Notch; resonance is
  bounded, key-track/velocity/envelope modulation is summed on `detune`.
- **Effects** each present one input/output with a single dry path and crossfaded
  bypass (no clicks, no duplicated dry signal). Reverb uses a generated impulse
  response per mode/size/damping. The limiter is a safety brick-wall that stays
  in the chain.

## Voice modes

- **Poly** — up to 8 voices, deterministic oldest-first stealing on the 9th note.
- **Mono** — held-note stack with Last/High/Low priority, legato (retune without
  retrigger) and glide.
- **Unison** — 2/3/5/7 voices with detune + stereo spread and full group release.

## Parameter registry

~120 parameters across `osc1, osc2, sub, noise, mixer, filter, amp, modenv,
lfo1, lfo2, matrix, voice, drive, eq, chorus, delay, reverb, limiter, master`.
Each carries: id, section, label, min/max/default, unit, kind
(continuous/enum/toggle), curve/steps, smoothing, MIDI + modulation eligibility,
preset eligibility, editor page/pane, and a display formatter. `normalize` /
`denormalize` map 0..1 MIDI/mod values onto each parameter's unit. The editor
layout is **derived** from `page`/`pane`, so no parameter truth is duplicated.

## Input

- **Touch/mouse** — Pointer Events, per-pointer ownership with capture; releases
  on pointerup/cancel/leave/lostpointercapture, window blur, and visibility hide.
- **Computer keyboard** — `Z S X D C V G B H N J M , L .` / `Q 2 W 3 E R 5 T 6 Y 7 U I`,
  `-`/`=` octave, `Esc` panic; ignores key-repeat and typing in inputs; captures
  the exact MIDI note at keydown.
- **Web MIDI** — see below.

## MIDI + MIDI Learn

`engine/midi.ts` (singleton). Parses Note On/Off (vel-0 = off), 14-bit pitch
bend, CC1 mod, CC64 sustain, CC120/123, channel aftertouch; channel Omni/1–16;
hot-plug. **MIDI Learn** binds a moved CC to any eligible parameter with channel,
range, invert, and takeover (Pickup default, plus Jump/Scale); mappings persist
to localStorage with import/export and sensible CC7/71/72/73/74 defaults. The
synth never fails when Web MIDI is unavailable.

## Presets

`state/presetStore.ts` — 30-preset factory bank (`engine/factoryPresets.ts`, sparse
overrides on defaults) plus user presets in localStorage, favorites, recent,
search, categories. Every sound/voice/mod/FX parameter serializes; save-as,
duplicate, rename, delete (user only), import, export. MIDI device selection is
global (not per-preset).

## PWA

`lib/pwa.ts` + `public/sw.js` + `public/manifest.webmanifest`. Service worker
(production only): network-first navigations with an offline shell fallback,
stale-while-revalidate hashed assets, versioned cache with cleanup, and an
update-available flow. Wavetables and factory presets are generated/bundled in
JS, so the app plays fully offline after one online load. Web MIDI may be
unavailable offline.
