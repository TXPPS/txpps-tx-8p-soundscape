
# TX-8P — Full Instrument Build Plan

This is the biggest single request in the project so far: refine the performance deck, then build the entire synth engine, effects rack, preset system, computer-keyboard + Web MIDI + MIDI Learn, PWA behaviors, and a full QA pass. It cannot land in one turn without collapsing under its own weight. Below is the sequenced plan I will execute, checkpoint by checkpoint, without pausing for visual approval between them (per your instruction). Approve the plan and I proceed straight through.

## Guiding rules

- Preserve the approved visual identity: gray chassis, cream buttons, muted accents, amber LCD, TX27-style tabs, top-right Panic/Settings, integrated performance deck. No visual restart.
- One `AudioContext`, one `SynthEngine`, one master bus, one authoritative parameter registry. React only drives UI/state — never DSP timing.
- Every checkpoint ends with: typecheck clean, zero console errors, Playwright smoke on desktop + phone portrait + phone landscape, and audible verification where the checkpoint adds sound.
- Each checkpoint appends a section to `docs/tx8p/MILESTONE_AUDITS/M2.md` … `M9.md` with results, known gaps, and any items requiring physical hardware.

## Checkpoints

### CP1 — Performance deck + tab overflow refinement (Part A)
- Split Pitch and Mod into two visually distinct recessed vertical tracks with independent indicators, labels, and 44px hit targets (no shared track).
- Phone portrait: replace the two full-width horizontal strips with one compact perf row `[PITCH][MOD][OCT-][OCT][OCT+][HOLD]` docked directly above the keyboard, no empty middle gap.
- Phone landscape: dedicated playing layout `[left rail][keyboard]`; editor collapses into a sheet opened from the active tab.
- Tab bar: horizontally scrollable hardware-style strip so `VOICE` is always reachable on 390px viewports.

### CP2 — Parameter registry + engine skeleton (Parts B/D)
- `src/engine/params/registry.ts`: authoritative param definitions (id, section, min/max/default, unit, curve, smoothing, MIDI + modulation eligibility, formatter). Single source used by UI, presets, MIDI, modulation.
- `src/engine/context.ts`: lazy single `AudioContext` + master bus + limiter + analyser.
- `src/engine/SynthEngine.ts`: singleton owning voice manager, effects chain, param smoothing bus.
- `src/engine/startup.ts`: first-note guarantee (register note + ownership → resume ctx → confirm still held → trigger; cancel if released during startup). Compact status states surfaced via LCD/top bar.

### CP3 — Voice manager + first audible note (Parts B/C-lite)
- Unique voice handles (not keyed by MIDI note). Steal order: free → oldest release → oldest sustained → oldest active.
- Single-osc saw + amp env + fixed LP filter wired end-to-end so a screen-key tap makes sound. Panic clears everything.
- Playwright audio smoke: tap key → analyser RMS > threshold → release → RMS decays to floor within release time.

### CP4 — Full oscillator engine + mixer + filter + envelopes (Parts B DSP)
- OSC1 wavetable (original generated tables: basic shapes, sine/saw/square/pulse harmonics, hollow, glass, metallic, formant, digital, sweep, PWM, hybrid) with position/warp.
- OSC2 VA (saw/square/pulse/tri/sine, PW/PWM, hard sync).
- Sub (off/-1/-2 oct, sine/square), Noise (white/pink/dark + tone), mixer with pre-filter drive.
- Multimode filter (LP/BP/HP/Notch + morph where stable), bounded resonance mapping, per-mode gain comp.
- Amp + Filter/Mod envelopes with velocity, curves, click-free release.

### CP5 — LFOs + modulation matrix + play modes (Parts B)
- 2 LFOs (sine/tri/saw±/square/S&H/smooth-random, tempo-sync divisions, fade-in, phase, retrig).
- 4-slot mod matrix with source/dest/bipolar amount/enable, cycle guard.
- POLY / MONO (last-note priority, held stack, legato/retrig, glide) / UNISON (2/3/5/7, detune, spread, full group release).
- Hold + Panic authoritative reset covering all input sources.

### CP6 — Effects rack (Part C)
- Ordered chain Voice→Drive→EQ→Chorus→Delay→Reverb→Limiter→Master with per-effect bypass, wet/dry, gain comp, smooth changes, single dry path.
- Drive (subtle at low), 3-band EQ, chorus modes I/II/I+II/Custom, stereo/ping-pong delay w/ internal tempo, reverb (Room/Hall/Plate/Dark; Shimmer only if stable), safety limiter + master meter.

### CP7 — Input systems (Parts E/F)
- Screen keyboard: Pointer Events only, ownership map (pointerId → gen → note → voiceHandle → state), multitouch, blur/visibility/orientation cleanup.
- Computer keyboard: `Z S X D C V G B H N J M` / `Q 2 W 3 E R 5 T 6 Y 7 U`, octave shortcuts, ignore repeats, ignore while typing, panic shortcut.
- Web MIDI: device list, enable/disable, All Inputs, hot-plug, permission/unsupported graceful, Note On/Off (vel-0 = off), pitch bend (14-bit, ±2 default), CC1 mod, CC64 sustain (separate physical/MIDI/screen/latched sets), CC120/123, channel omni/1-16.
- MIDI Learn: long-press/right-click on any registry-eligible param → bind CC + channel + min/max/invert + takeover (Jump/Pickup/Scale, default Pickup); persist to `localStorage`; export/import.
- Default map: CC1/7/10/64/71/72/73/74 + assignables.
- Diagnostics panel inside Settings → MIDI (not on main surface).

### CP8 — Preset system + factory bank + Settings + PWA (Parts G/H/J)
- Preset schema covering all sound params, FX, voice mode, mod slots; factory read-only, user in `localStorage`, favorites, recently used, search, categories, tags, load/save-as/duplicate/rename/delete/import/export.
- Factory bank: 8 Bass, 8 Lead, 8 Pad, 8 Keys, 6 Pluck, 4 Brass, 4 Strings, 4 FX, 2 Init — each genuinely distinct across osc/filter/env/mod/fx/voice.
- Settings dialog populated: Audio / MIDI / Performance / Display / PWA / About with diagnostic report copy.
- PWA: manifest + icons (manifest-only home-screen support; no offline SW unless you later ask, per Lovable PWA policy). Handle visibility/blur to release physical ownership; keep engine alive across route changes.

### CP9 — Regression + QA + final report (Part K)
- Playwright suite: startup, note lifecycle, play modes, DSP smoke (analyser RMS per section), effects bypass, MIDI simulated via `dispatchEvent` where possible, preset round-trip, responsive matrix (1280×800, 1920×1080, tablet portrait/landscape, 390×844, 844×390).
- 10-minute rapid-play + orientation/background cycles.
- Final report in `docs/tx8p/FINAL_REPORT.md` covering all 23 items you listed, including explicit "requires physical device" flags (real MIDI hardware, iOS Safari install, long-form 60-min run).

## Technical notes

- All DSP inside a single `AudioWorklet` where practical (wavetable + VA + filter + envelopes + LFOs + matrix). Effects use native nodes (`WaveShaper`, `BiquadFilter`, `DelayNode`, convolution or Freeverb-style algo, `DynamicsCompressor` limiter) to keep CPU predictable.
- Parameter smoothing done inside the worklet via per-block linear ramps; UI writes go through `AudioParam.setTargetAtTime` for native params and `port.postMessage` for worklet params.
- Voice handles = monotonically increasing `bigint`-like number; registries keyed by handle, indexed by note for stealing queries.
- Wavetables generated at build/runtime from additive recipes — no copyrighted sample data.
- No `src/pages/`, no react-router-dom. All new routes/components under existing TanStack Start structure. No service worker registration in preview (per PWA policy); manifest-only install.
- Repository: no git commits from my side (harness manages git). "Checkpoint" = a self-contained working state verified before starting the next.

## What I will NOT do without asking

- Change the approved visual identity or reintroduce the standalone perf panel.
- Add offline service worker behavior (manifest-only unless you ask).
- Introduce backend/Cloud (this is a pure client instrument).
- Ship "curated" presets that are just randomized values.

Approve and I start with CP1 immediately and continue straight through the checkpoints, posting a short status + audit link after each.
