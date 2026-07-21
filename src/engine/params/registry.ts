/**
 * TX-8P Parameter Registry
 *
 * Authoritative catalog of every user-facing parameter in the
 * instrument. UI controls, presets, MIDI mappings, and the modulation
 * matrix ALL reference these definitions — never redeclare a parameter
 * elsewhere. CP2 seeds the registry with the parameters wired to real
 * DSP in CP3; later checkpoints extend it as each engine section comes
 * online.
 *
 * Design notes
 * ------------
 * - `id` is a stable dotted path (`amp.attack`, `filter.cutoff`) safe
 *   for preset JSON and MIDI-Learn persistence.
 * - `curve` selects the mapping from a 0..1 normalized value (used by
 *   MIDI CCs and mod sources) to the raw parameter unit. Discrete
 *   parameters use `steps`.
 * - `smoothingMs` is a hint to the DSP layer for how aggressively to
 *   ramp writes; the engine still guarantees click-free changes.
 * - `midiEligible` / `modEligible` gate MIDI Learn and modulation-matrix
 *   destination pickers.
 * - `format(value)` produces the human string the LCD flashes.
 *
 * Any new parameter goes here first, then the DSP node reads it via the
 * shared `getDefaults()` / lookup helpers.
 */

export type ParamCurve = "linear" | "exp" | "log" | "bipolar";

export type ParamSection =
  | "osc"
  | "mix"
  | "filter"
  | "amp"
  | "modenv"
  | "lfo"
  | "matrix"
  | "fx"
  | "master"
  | "voice"
  | "perf";

export interface ParamDef {
  id: string;
  section: ParamSection;
  label: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
  curve?: ParamCurve;
  /** If defined, the parameter is discrete with this many steps. */
  steps?: number;
  smoothingMs?: number;
  midiEligible?: boolean;
  modEligible?: boolean;
  /** Producer of the display string (e.g. "440 Hz", "12 ms"). */
  format?: (value: number) => string;
}

const asHz = (v: number) => `${v >= 1000 ? (v / 1000).toFixed(2) + " kHz" : v.toFixed(0) + " Hz"}`;
const asMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(0)} ms`);
const asPct = (v: number) => `${Math.round(v * 100)} %`;
const asSemi = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)} st`;
const asDb = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`;

/** Seed set — grows per checkpoint. Everything wired to DSP in CP3. */
export const PARAMS: ParamDef[] = [
  // ---------- MASTER ----------
  {
    id: "master.volume",
    section: "master",
    label: "Master Volume",
    min: 0,
    max: 1,
    default: 0.75,
    curve: "exp",
    smoothingMs: 30,
    midiEligible: true,
    format: asPct,
  },

  // ---------- OSCILLATOR 1 (CP3: sine only; expanded in CP4) ----------
  {
    id: "osc1.level",
    section: "osc",
    label: "Osc 1 Level",
    min: 0,
    max: 1,
    default: 0.8,
    curve: "exp",
    smoothingMs: 20,
    midiEligible: true,
    modEligible: true,
    format: asPct,
  },
  {
    id: "osc1.tune.semi",
    section: "osc",
    label: "Osc 1 Semitone",
    min: -24,
    max: 24,
    default: 0,
    steps: 49,
    midiEligible: true,
    modEligible: true,
    format: asSemi,
  },
  {
    id: "osc1.tune.fine",
    section: "osc",
    label: "Osc 1 Fine",
    min: -100,
    max: 100,
    default: 0,
    curve: "bipolar",
    unit: "cents",
    midiEligible: true,
    modEligible: true,
    format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)} c`,
  },

  // ---------- FILTER (CP3: fixed LP; expanded in CP4) ----------
  {
    id: "filter.cutoff",
    section: "filter",
    label: "Cutoff",
    min: 20,
    max: 18000,
    default: 12000,
    curve: "exp",
    unit: "Hz",
    smoothingMs: 15,
    midiEligible: true,
    modEligible: true,
    format: asHz,
  },
  {
    id: "filter.resonance",
    section: "filter",
    label: "Resonance",
    min: 0.5,
    max: 12,
    default: 0.9,
    curve: "exp",
    smoothingMs: 20,
    midiEligible: true,
    modEligible: true,
    format: (v) => v.toFixed(2),
  },

  // ---------- AMP ENVELOPE ----------
  {
    id: "amp.attack",
    section: "amp",
    label: "Amp Attack",
    min: 1,
    max: 8000,
    default: 8,
    curve: "exp",
    unit: "ms",
    midiEligible: true,
    modEligible: true,
    format: asMs,
  },
  {
    id: "amp.decay",
    section: "amp",
    label: "Amp Decay",
    min: 5,
    max: 8000,
    default: 200,
    curve: "exp",
    unit: "ms",
    midiEligible: true,
    modEligible: true,
    format: asMs,
  },
  {
    id: "amp.sustain",
    section: "amp",
    label: "Amp Sustain",
    min: 0,
    max: 1,
    default: 0.75,
    midiEligible: true,
    modEligible: true,
    format: asPct,
  },
  {
    id: "amp.release",
    section: "amp",
    label: "Amp Release",
    min: 5,
    max: 12000,
    default: 250,
    curve: "exp",
    unit: "ms",
    midiEligible: true,
    modEligible: true,
    format: asMs,
  },
  {
    id: "amp.velocity",
    section: "amp",
    label: "Amp Velocity",
    min: 0,
    max: 1,
    default: 0.6,
    midiEligible: true,
    modEligible: true,
    format: asPct,
  },
];

// ---- Lookup helpers ----

const BY_ID = new Map<string, ParamDef>(PARAMS.map((p) => [p.id, p]));

export function getParam(id: string): ParamDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown parameter: ${id}`);
  return p;
}

export function tryParam(id: string): ParamDef | undefined {
  return BY_ID.get(id);
}

/** Bulk default snapshot; the SynthEngine seeds itself from this. */
export function getDefaults(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PARAMS) out[p.id] = p.default;
  return out;
}

export function clampToParam(id: string, value: number): number {
  const p = getParam(id);
  return Math.max(p.min, Math.min(p.max, value));
}

export function formatParam(id: string, value: number): string {
  const p = getParam(id);
  return p.format ? p.format(value) : value.toFixed(2);
}

/** Human tick label ignoring extra decimals — used in LCD flashes. */
export { asDb };
