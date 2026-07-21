/**
 * TX-8P Parameter Registry — authoritative catalog of every user-facing
 * parameter in the instrument.
 *
 * This is the single source of truth. UI controls, presets, MIDI mappings,
 * MIDI Learn, and the modulation matrix ALL resolve through these
 * definitions — never redeclare a parameter elsewhere.
 *
 * Each param carries enough metadata to render its control, format its
 * value, map a 0..1 MIDI/mod value onto its unit, serialize into a preset,
 * and (for continuous params) drive an AudioParam with click-free smoothing.
 *
 * `page` / `pane` place the parameter in the JX-8P-style focused editor so
 * the editor layout is derived from the registry, not duplicated by hand.
 */

export type ParamCurve = "linear" | "exp" | "bipolar";
export type ParamKind = "continuous" | "enum" | "toggle";

export type ParamSection =
  | "osc1"
  | "osc2"
  | "sub"
  | "noise"
  | "mixer"
  | "filter"
  | "amp"
  | "modenv"
  | "lfo1"
  | "lfo2"
  | "matrix"
  | "voice"
  | "drive"
  | "eq"
  | "chorus"
  | "delay"
  | "reverb"
  | "limiter"
  | "master"
  | "perf";

/** Editor tab ids (mirror uiStore TabId). */
export type ParamPage = "OSC" | "FILTER" | "ENV" | "LFO" | "MOD" | "FX" | "VOICE";

export interface ParamDef {
  id: string;
  section: ParamSection;
  label: string;
  min: number;
  max: number;
  default: number;
  unit?: string;
  kind?: ParamKind;
  curve?: ParamCurve;
  /** Discrete continuous params: number of steps between min and max. */
  steps?: number;
  /** Enum labels; the stored value is the option index. */
  options?: string[];
  smoothingMs?: number;
  midiEligible?: boolean;
  modEligible?: boolean;
  /** Whether this param is stored in presets (default true). */
  preset?: boolean;
  /** Editor placement. */
  page?: ParamPage;
  pane?: string;
  format?: (value: number) => string;
}

// ---- formatters ----
const asHz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} kHz` : `${v.toFixed(0)} Hz`);
const asMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(0)} ms`);
const asPct = (v: number) => `${Math.round(v * 100)}%`;
const asBiPct = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
const asSemi = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)} st`;
const asOct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)} oct`;
const asCent = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)} c`;
const asDb = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`;
const asRatio = (v: number) => `${v.toFixed(2)}`;
const on = (v: number) => (v >= 0.5 ? "ON" : "OFF");

// ---- enum option lists (also used by the engine + UI) ----
export const OSC1_TABLES = [
  "Basic Shapes",
  "Sine Harm",
  "Saw Harm",
  "Square Harm",
  "Pulse Harm",
  "Hollow",
  "Bright",
  "Glass",
  "Metallic",
  "Formant",
  "Digital",
  "Sweep",
  "Vintage Hybrid",
] as const;
export const OSC2_SHAPES = ["Sine", "Triangle", "Saw", "Square", "Pulse"] as const;
export const SUB_WAVES = ["Off", "Sine -1", "Sine -2", "Square -1", "Square -2"] as const;
export const NOISE_TYPES = ["White", "Pink", "Dark"] as const;
export const FILTER_MODES = ["Low Pass", "Band Pass", "High Pass", "Notch"] as const;
export const LFO_SHAPES = [
  "Sine",
  "Triangle",
  "Saw Up",
  "Saw Down",
  "Square",
  "S&H",
  "Random",
] as const;
export const LFO_DIVS = ["1/1", "1/2", "1/4", "1/4.", "1/8", "1/8T", "1/16", "1/32"] as const;
export const VOICE_MODES = ["Poly", "Mono", "Unison"] as const;
export const VOICE_PRIORITY = ["Last", "High", "Low"] as const;
export const UNISON_COUNTS = ["2", "3", "5", "7"] as const;
export const CHORUS_MODES = ["I", "II", "I + II", "Custom"] as const;
export const REVERB_MODES = ["Room", "Hall", "Plate", "Dark"] as const;

export const MOD_SOURCES = [
  "None",
  "LFO 1",
  "LFO 2",
  "Mod Env",
  "Amp Env",
  "Velocity",
  "Key Track",
  "Mod Wheel",
  "Aftertouch",
  "Random",
  "Note Gate",
] as const;
export const MOD_DESTS = [
  "None",
  "Pitch",
  "Osc2 Pitch",
  "Osc1 Level",
  "Osc2 Level",
  "Osc2 PW",
  "Osc1 Position",
  "Cutoff",
  "Resonance",
  "Amp",
  "Pan",
  "LFO1 Rate",
  "LFO2 Rate",
] as const;

const P: ParamDef[] = [];
const def = (d: ParamDef) => {
  P.push({
    kind: d.options ? "enum" : (d.kind ?? "continuous"),
    preset: d.preset ?? true,
    ...d,
  });
};
const enumDef = (
  id: string,
  section: ParamSection,
  label: string,
  options: readonly string[],
  def0: number,
  page: ParamPage,
  pane: string,
  extra: Partial<ParamDef> = {},
) =>
  def({
    id,
    section,
    label,
    min: 0,
    max: options.length - 1,
    default: def0,
    steps: options.length - 1,
    options: options as string[],
    page,
    pane,
    format: (v) => options[Math.round(Math.max(0, Math.min(options.length - 1, v)))],
    ...extra,
  });
const toggleDef = (
  id: string,
  section: ParamSection,
  label: string,
  def0: number,
  page: ParamPage,
  pane: string,
  extra: Partial<ParamDef> = {},
) =>
  def({
    id,
    section,
    label,
    min: 0,
    max: 1,
    default: def0,
    steps: 1,
    kind: "toggle",
    format: on,
    page,
    pane,
    ...extra,
  });

// ============================ OSC 1 ============================
enumDef("osc1.table", "osc1", "Wave", OSC1_TABLES, 0, "OSC", "OSC 1", { midiEligible: true });
def({
  id: "osc1.pos",
  section: "osc1",
  label: "Position",
  min: 0,
  max: 1,
  default: 0,
  curve: "linear",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 1",
  format: asPct,
});
def({
  id: "osc1.warp",
  section: "osc1",
  label: "Warp",
  min: 0,
  max: 1,
  default: 0.5,
  curve: "linear",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 1",
  format: asPct,
});
def({
  id: "osc1.oct",
  section: "osc1",
  label: "Octave",
  min: -2,
  max: 2,
  default: 0,
  steps: 4,
  midiEligible: true,
  page: "OSC",
  pane: "OSC 1",
  format: asOct,
});
def({
  id: "osc1.semi",
  section: "osc1",
  label: "Semi",
  min: -12,
  max: 12,
  default: 0,
  steps: 24,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 1",
  format: asSemi,
});
def({
  id: "osc1.fine",
  section: "osc1",
  label: "Fine",
  min: -50,
  max: 50,
  default: 0,
  curve: "bipolar",
  unit: "c",
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 1",
  format: asCent,
});
def({
  id: "osc1.level",
  section: "osc1",
  label: "Level",
  min: 0,
  max: 1,
  default: 0.8,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 1",
  format: asPct,
});
def({
  id: "osc1.keytrack",
  section: "osc1",
  label: "Key Trk",
  min: 0,
  max: 1,
  default: 1,
  page: "OSC",
  pane: "OSC 1",
  format: asPct,
});

// ============================ OSC 2 ============================
enumDef("osc2.shape", "osc2", "Shape", OSC2_SHAPES, 2, "OSC", "OSC 2", { midiEligible: true });
def({
  id: "osc2.pw",
  section: "osc2",
  label: "PW",
  min: 0.05,
  max: 0.95,
  default: 0.5,
  curve: "linear",
  smoothingMs: 15,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 2",
  format: asPct,
});
def({
  id: "osc2.pwm",
  section: "osc2",
  label: "PWM",
  min: 0,
  max: 1,
  default: 0,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 2",
  format: asPct,
});
def({
  id: "osc2.oct",
  section: "osc2",
  label: "Octave",
  min: -2,
  max: 2,
  default: 0,
  steps: 4,
  midiEligible: true,
  page: "OSC",
  pane: "OSC 2",
  format: asOct,
});
def({
  id: "osc2.semi",
  section: "osc2",
  label: "Semi",
  min: -12,
  max: 12,
  default: 0,
  steps: 24,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 2",
  format: asSemi,
});
def({
  id: "osc2.fine",
  section: "osc2",
  label: "Fine",
  min: -50,
  max: 50,
  default: 7,
  curve: "bipolar",
  unit: "c",
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 2",
  format: asCent,
});
def({
  id: "osc2.level",
  section: "osc2",
  label: "Level",
  min: 0,
  max: 1,
  default: 0,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "OSC 2",
  format: asPct,
});
def({
  id: "osc2.keytrack",
  section: "osc2",
  label: "Key Trk",
  min: 0,
  max: 1,
  default: 1,
  page: "OSC",
  pane: "OSC 2",
  format: asPct,
});

// ========================= SUB / NOISE =========================
enumDef("sub.wave", "sub", "Sub Wave", SUB_WAVES, 1, "OSC", "SUB/NOISE", { midiEligible: true });
def({
  id: "sub.level",
  section: "sub",
  label: "Sub Level",
  min: 0,
  max: 1,
  default: 0,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "SUB/NOISE",
  format: asPct,
});
enumDef("noise.type", "noise", "Noise Type", NOISE_TYPES, 0, "OSC", "SUB/NOISE", {
  midiEligible: true,
});
def({
  id: "noise.tone",
  section: "noise",
  label: "Noise Tone",
  min: 0,
  max: 1,
  default: 0.5,
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "SUB/NOISE",
  format: asPct,
});
def({
  id: "noise.level",
  section: "noise",
  label: "Noise Level",
  min: 0,
  max: 1,
  default: 0,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "SUB/NOISE",
  format: asPct,
});

// ============================ MIXER ============================
def({
  id: "mixer.osc1",
  section: "mixer",
  label: "Osc 1",
  min: 0,
  max: 1,
  default: 0.85,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "MIX",
  format: asPct,
});
def({
  id: "mixer.osc2",
  section: "mixer",
  label: "Osc 2",
  min: 0,
  max: 1,
  default: 0.85,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "MIX",
  format: asPct,
});
def({
  id: "mixer.sub",
  section: "mixer",
  label: "Sub",
  min: 0,
  max: 1,
  default: 0.85,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "MIX",
  format: asPct,
});
def({
  id: "mixer.noise",
  section: "mixer",
  label: "Noise",
  min: 0,
  max: 1,
  default: 0.85,
  curve: "exp",
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "MIX",
  format: asPct,
});
def({
  id: "mixer.drive",
  section: "mixer",
  label: "Pre Drive",
  min: 0,
  max: 1,
  default: 0,
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "MIX",
  format: asPct,
});
def({
  id: "mixer.ring",
  section: "mixer",
  label: "Ring Mod",
  min: 0,
  max: 1,
  default: 0,
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "OSC",
  pane: "MIX",
  format: asPct,
});

// ============================ FILTER ============================
enumDef("filter.mode", "filter", "Mode", FILTER_MODES, 0, "FILTER", "MAIN", { midiEligible: true });
def({
  id: "filter.cutoff",
  section: "filter",
  label: "Cutoff",
  min: 30,
  max: 18000,
  default: 14000,
  curve: "exp",
  unit: "Hz",
  smoothingMs: 12,
  midiEligible: true,
  modEligible: true,
  page: "FILTER",
  pane: "MAIN",
  format: asHz,
});
def({
  id: "filter.resonance",
  section: "filter",
  label: "Resonance",
  min: 0,
  max: 1,
  default: 0.12,
  curve: "linear",
  smoothingMs: 18,
  midiEligible: true,
  modEligible: true,
  page: "FILTER",
  pane: "MAIN",
  format: asPct,
});
def({
  id: "filter.drive",
  section: "filter",
  label: "Drive",
  min: 0,
  max: 1,
  default: 0,
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "FILTER",
  pane: "MAIN",
  format: asPct,
});
def({
  id: "filter.envAmt",
  section: "filter",
  label: "Env Amt",
  min: -1,
  max: 1,
  default: 0,
  curve: "bipolar",
  smoothingMs: 15,
  midiEligible: true,
  modEligible: true,
  page: "FILTER",
  pane: "ENV",
  format: asBiPct,
});
def({
  id: "filter.envVel",
  section: "filter",
  label: "Env Vel",
  min: 0,
  max: 1,
  default: 0,
  midiEligible: true,
  page: "FILTER",
  pane: "ENV",
  format: asPct,
});
def({
  id: "filter.keytrack",
  section: "filter",
  label: "Key Trk",
  min: 0,
  max: 1,
  default: 0.3,
  midiEligible: true,
  page: "FILTER",
  pane: "KEY TRK",
  format: asPct,
});
def({
  id: "filter.velAmt",
  section: "filter",
  label: "Vel Amt",
  min: 0,
  max: 1,
  default: 0,
  midiEligible: true,
  page: "FILTER",
  pane: "KEY TRK",
  format: asPct,
});

// ========================= AMP ENVELOPE =========================
def({
  id: "amp.attack",
  section: "amp",
  label: "Attack",
  min: 1,
  max: 8000,
  default: 6,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "AMP",
  format: asMs,
});
def({
  id: "amp.decay",
  section: "amp",
  label: "Decay",
  min: 5,
  max: 8000,
  default: 240,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "AMP",
  format: asMs,
});
def({
  id: "amp.sustain",
  section: "amp",
  label: "Sustain",
  min: 0,
  max: 1,
  default: 0.8,
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "AMP",
  format: asPct,
});
def({
  id: "amp.release",
  section: "amp",
  label: "Release",
  min: 5,
  max: 12000,
  default: 300,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "AMP",
  format: asMs,
});
def({
  id: "amp.velocity",
  section: "amp",
  label: "Velocity",
  min: 0,
  max: 1,
  default: 0.6,
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "AMP",
  format: asPct,
});

// ========================= MOD ENVELOPE =========================
def({
  id: "modenv.attack",
  section: "modenv",
  label: "Attack",
  min: 1,
  max: 8000,
  default: 4,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "MOD",
  format: asMs,
});
def({
  id: "modenv.decay",
  section: "modenv",
  label: "Decay",
  min: 5,
  max: 8000,
  default: 320,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "MOD",
  format: asMs,
});
def({
  id: "modenv.sustain",
  section: "modenv",
  label: "Sustain",
  min: 0,
  max: 1,
  default: 0.0,
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "MOD",
  format: asPct,
});
def({
  id: "modenv.release",
  section: "modenv",
  label: "Release",
  min: 5,
  max: 12000,
  default: 320,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "MOD",
  format: asMs,
});
def({
  id: "modenv.velocity",
  section: "modenv",
  label: "Velocity",
  min: 0,
  max: 1,
  default: 0.4,
  midiEligible: true,
  modEligible: true,
  page: "ENV",
  pane: "MOD",
  format: asPct,
});

// ============================ LFO 1/2 ============================
for (const n of [1, 2] as const) {
  const sec = (n === 1 ? "lfo1" : "lfo2") as ParamSection;
  const pane = `LFO ${n}`;
  enumDef(`lfo${n}.shape`, sec, "Shape", LFO_SHAPES, n === 1 ? 0 : 1, "LFO", pane, {
    midiEligible: true,
  });
  def({
    id: `lfo${n}.rate`,
    section: sec,
    label: "Rate",
    min: 0.02,
    max: 30,
    default: n === 1 ? 4 : 1.5,
    curve: "exp",
    unit: "Hz",
    smoothingMs: 20,
    midiEligible: true,
    modEligible: true,
    page: "LFO",
    pane,
    format: (v) => `${v.toFixed(2)} Hz`,
  });
  toggleDef(`lfo${n}.sync`, sec, "Sync", 0, "LFO", pane);
  enumDef(`lfo${n}.div`, sec, "Division", LFO_DIVS, 2, "LFO", pane);
  def({
    id: `lfo${n}.depth`,
    section: sec,
    label: "Depth",
    min: 0,
    max: 1,
    default: n === 1 ? 0.5 : 0.3,
    smoothingMs: 20,
    midiEligible: true,
    modEligible: true,
    page: "LFO",
    pane,
    format: asPct,
  });
  def({
    id: `lfo${n}.fade`,
    section: sec,
    label: "Fade In",
    min: 0,
    max: 5000,
    default: 0,
    curve: "exp",
    unit: "ms",
    midiEligible: true,
    page: "LFO",
    pane,
    format: asMs,
  });
  toggleDef(`lfo${n}.retrig`, sec, "Retrigger", 0, "LFO", pane);
}

// ========================= MOD MATRIX ==========================
for (const s of [1, 2, 3, 4] as const) {
  const pane = `SLOT ${s}`;
  enumDef(`matrix.s${s}.src`, "matrix", "Source", MOD_SOURCES, 0, "MOD", pane);
  enumDef(`matrix.s${s}.dst`, "matrix", "Dest", MOD_DESTS, 0, "MOD", pane);
  def({
    id: `matrix.s${s}.amt`,
    section: "matrix",
    label: "Amount",
    min: -1,
    max: 1,
    default: 0,
    curve: "bipolar",
    smoothingMs: 15,
    midiEligible: true,
    page: "MOD",
    pane,
    format: asBiPct,
  });
  toggleDef(`matrix.s${s}.on`, "matrix", "Enable", 0, "MOD", pane);
}

// ============================ VOICE ============================
enumDef("voice.mode", "voice", "Mode", VOICE_MODES, 0, "VOICE", "MODE");
enumDef("voice.priority", "voice", "Priority", VOICE_PRIORITY, 0, "VOICE", "MODE");
enumDef("voice.uniCount", "voice", "Count", UNISON_COUNTS, 1, "VOICE", "UNISON");
def({
  id: "voice.uniDetune",
  section: "voice",
  label: "Detune",
  min: 0,
  max: 1,
  default: 0.3,
  midiEligible: true,
  page: "VOICE",
  pane: "UNISON",
  format: asPct,
});
def({
  id: "voice.uniSpread",
  section: "voice",
  label: "Spread",
  min: 0,
  max: 1,
  default: 0.5,
  midiEligible: true,
  page: "VOICE",
  pane: "UNISON",
  format: asPct,
});
def({
  id: "voice.glide",
  section: "voice",
  label: "Glide",
  min: 0,
  max: 2000,
  default: 0,
  curve: "exp",
  unit: "ms",
  midiEligible: true,
  page: "VOICE",
  pane: "GLIDE",
  format: asMs,
});
toggleDef("voice.legato", "voice", "Legato", 0, "VOICE", "GLIDE");
def({
  id: "voice.bendRange",
  section: "voice",
  label: "Bend Range",
  min: 0,
  max: 12,
  default: 2,
  steps: 12,
  midiEligible: true,
  page: "VOICE",
  pane: "RESPONSE",
  format: asSemi,
});
def({
  id: "voice.velCurve",
  section: "voice",
  label: "Vel Curve",
  min: 0.3,
  max: 3,
  default: 1,
  page: "VOICE",
  pane: "RESPONSE",
  format: asRatio,
});

// ============================ FX: DRIVE ============================
toggleDef("drive.on", "drive", "Bypass", 0, "FX", "DRIVE", {
  format: (v) => (v >= 0.5 ? "ON" : "BYPASS"),
});
def({
  id: "drive.amount",
  section: "drive",
  label: "Drive",
  min: 0,
  max: 1,
  default: 0.25,
  smoothingMs: 20,
  midiEligible: true,
  modEligible: true,
  page: "FX",
  pane: "DRIVE",
  format: asPct,
});
def({
  id: "drive.tone",
  section: "drive",
  label: "Tone",
  min: 0,
  max: 1,
  default: 0.5,
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "DRIVE",
  format: asPct,
});
def({
  id: "drive.mix",
  section: "drive",
  label: "Mix",
  min: 0,
  max: 1,
  default: 1,
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "DRIVE",
  format: asPct,
});

// ============================ FX: EQ ============================
toggleDef("eq.on", "eq", "Bypass", 1, "FX", "EQ", { format: (v) => (v >= 0.5 ? "ON" : "BYPASS") });
def({
  id: "eq.low",
  section: "eq",
  label: "Low",
  min: -15,
  max: 15,
  default: 0,
  curve: "bipolar",
  unit: "dB",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "EQ",
  format: asDb,
});
def({
  id: "eq.mid",
  section: "eq",
  label: "Mid",
  min: -15,
  max: 15,
  default: 0,
  curve: "bipolar",
  unit: "dB",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "EQ",
  format: asDb,
});
def({
  id: "eq.midFreq",
  section: "eq",
  label: "Mid Freq",
  min: 200,
  max: 6000,
  default: 1000,
  curve: "exp",
  unit: "Hz",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "EQ",
  format: asHz,
});
def({
  id: "eq.high",
  section: "eq",
  label: "High",
  min: -15,
  max: 15,
  default: 0,
  curve: "bipolar",
  unit: "dB",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "EQ",
  format: asDb,
});

// ============================ FX: CHORUS ============================
toggleDef("chorus.on", "chorus", "Bypass", 0, "FX", "CHORUS", {
  format: (v) => (v >= 0.5 ? "ON" : "BYPASS"),
});
enumDef("chorus.mode", "chorus", "Mode", CHORUS_MODES, 0, "FX", "CHORUS");
def({
  id: "chorus.rate",
  section: "chorus",
  label: "Rate",
  min: 0.05,
  max: 8,
  default: 0.6,
  curve: "exp",
  unit: "Hz",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "CHORUS",
  format: (v) => `${v.toFixed(2)} Hz`,
});
def({
  id: "chorus.depth",
  section: "chorus",
  label: "Depth",
  min: 0,
  max: 1,
  default: 0.4,
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "CHORUS",
  format: asPct,
});
def({
  id: "chorus.mix",
  section: "chorus",
  label: "Mix",
  min: 0,
  max: 1,
  default: 0.5,
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "CHORUS",
  format: asPct,
});

// ============================ FX: DELAY ============================
toggleDef("delay.on", "delay", "Bypass", 0, "FX", "DELAY", {
  format: (v) => (v >= 0.5 ? "ON" : "BYPASS"),
});
toggleDef("delay.sync", "delay", "Sync", 0, "FX", "DELAY");
def({
  id: "delay.time",
  section: "delay",
  label: "Time",
  min: 20,
  max: 1500,
  default: 300,
  curve: "exp",
  unit: "ms",
  smoothingMs: 40,
  midiEligible: true,
  page: "FX",
  pane: "DELAY",
  format: asMs,
});
enumDef("delay.div", "delay", "Division", LFO_DIVS, 4, "FX", "DELAY");
def({
  id: "delay.feedback",
  section: "delay",
  label: "Feedback",
  min: 0,
  max: 0.9,
  default: 0.35,
  smoothingMs: 30,
  midiEligible: true,
  page: "FX",
  pane: "DELAY",
  format: asPct,
});
def({
  id: "delay.tone",
  section: "delay",
  label: "Tone",
  min: 0,
  max: 1,
  default: 0.5,
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "DELAY",
  format: asPct,
});
toggleDef("delay.pingpong", "delay", "Ping-Pong", 0, "FX", "DELAY");
def({
  id: "delay.mix",
  section: "delay",
  label: "Mix",
  min: 0,
  max: 1,
  default: 0.3,
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "DELAY",
  format: asPct,
});

// ============================ FX: REVERB ============================
toggleDef("reverb.on", "reverb", "Bypass", 0, "FX", "REVERB", {
  format: (v) => (v >= 0.5 ? "ON" : "BYPASS"),
});
enumDef("reverb.mode", "reverb", "Mode", REVERB_MODES, 1, "FX", "REVERB");
def({
  id: "reverb.size",
  section: "reverb",
  label: "Size",
  min: 0,
  max: 1,
  default: 0.6,
  smoothingMs: 40,
  midiEligible: true,
  page: "FX",
  pane: "REVERB",
  format: asPct,
});
def({
  id: "reverb.predelay",
  section: "reverb",
  label: "Pre-Delay",
  min: 0,
  max: 120,
  default: 12,
  unit: "ms",
  smoothingMs: 40,
  midiEligible: true,
  page: "FX",
  pane: "REVERB",
  format: asMs,
});
def({
  id: "reverb.damp",
  section: "reverb",
  label: "Damping",
  min: 0,
  max: 1,
  default: 0.5,
  smoothingMs: 30,
  midiEligible: true,
  page: "FX",
  pane: "REVERB",
  format: asPct,
});
def({
  id: "reverb.width",
  section: "reverb",
  label: "Width",
  min: 0,
  max: 1,
  default: 1,
  smoothingMs: 30,
  midiEligible: true,
  page: "FX",
  pane: "REVERB",
  format: asPct,
});
def({
  id: "reverb.mix",
  section: "reverb",
  label: "Mix",
  min: 0,
  max: 1,
  default: 0.25,
  smoothingMs: 30,
  midiEligible: true,
  page: "FX",
  pane: "REVERB",
  format: asPct,
});

// ============================ FX: LIMITER ============================
toggleDef("limiter.on", "limiter", "Bypass", 1, "FX", "LIMITER", {
  format: (v) => (v >= 0.5 ? "ON" : "BYPASS"),
});
def({
  id: "limiter.threshold",
  section: "limiter",
  label: "Threshold",
  min: -24,
  max: 0,
  default: -3,
  unit: "dB",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "LIMITER",
  format: asDb,
});
def({
  id: "limiter.release",
  section: "limiter",
  label: "Release",
  min: 20,
  max: 500,
  default: 120,
  unit: "ms",
  smoothingMs: 20,
  midiEligible: true,
  page: "FX",
  pane: "LIMITER",
  format: asMs,
});
def({
  id: "limiter.ceiling",
  section: "limiter",
  label: "Ceiling",
  min: 0.5,
  max: 1,
  default: 0.95,
  page: "FX",
  pane: "LIMITER",
  format: asPct,
});

// ============================ MASTER / GLOBAL ============================
def({
  id: "master.volume",
  section: "master",
  label: "Master Volume",
  min: 0,
  max: 1,
  default: 0.8,
  curve: "exp",
  smoothingMs: 30,
  midiEligible: true,
  preset: false,
  format: asPct,
});
def({
  id: "master.tempo",
  section: "master",
  label: "Tempo",
  min: 40,
  max: 240,
  default: 120,
  unit: "BPM",
  preset: true,
  format: (v) => `${v.toFixed(0)} BPM`,
});

export const PARAMS: ParamDef[] = P;

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

/** Map a normalized 0..1 value (MIDI CC / mod) onto a param's raw unit. */
export function denormalize(id: string, norm: number): number {
  const p = getParam(id);
  const n = Math.max(0, Math.min(1, norm));
  if (p.steps && p.steps > 0) {
    const step = Math.round(n * p.steps);
    return p.min + (step / p.steps) * (p.max - p.min);
  }
  if (p.curve === "exp") {
    const lo = Math.max(p.min, 1e-4);
    return lo * Math.pow(p.max / lo, n);
  }
  return p.min + n * (p.max - p.min);
}

/** Inverse of denormalize — raw unit back to 0..1 (for UI + MIDI feedback). */
export function normalize(id: string, value: number): number {
  const p = getParam(id);
  const v = Math.max(p.min, Math.min(p.max, value));
  if (p.steps && p.steps > 0)
    return Math.round(((v - p.min) / (p.max - p.min)) * p.steps) / p.steps;
  if (p.curve === "exp") {
    const lo = Math.max(p.min, 1e-4);
    return Math.log(v / lo) / Math.log(p.max / lo);
  }
  return (v - p.min) / (p.max - p.min);
}

export function paramsForPane(page: ParamPage, pane: string): ParamDef[] {
  return PARAMS.filter((p) => p.page === page && p.pane === pane);
}
export function panesForPage(page: ParamPage): string[] {
  const seen: string[] = [];
  for (const p of PARAMS)
    if (p.page === page && p.pane && !seen.includes(p.pane)) seen.push(p.pane);
  return seen;
}
export function presetParamIds(): string[] {
  return PARAMS.filter((p) => p.preset).map((p) => p.id);
}

export { asDb };
