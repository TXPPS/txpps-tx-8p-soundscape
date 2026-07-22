/**
 * Original wavetable bank for OSC1.
 *
 * Every table is generated from first principles (harmonic amplitude
 * recipes) — no sampled or copyrighted material. Each named table is a
 * short stack of "frames"; OSC1 crossfades between adjacent frames using
 * the `position` parameter for smooth wavetable movement.
 *
 * PeriodicWaves must be built against a live AudioContext, so the bank is
 * cached per context.
 */

import { OSC1_TABLES } from "../params/registry";

const HARMONICS = 64;
const FRAMES = 8;

type FrameFn = (frame: number) => { real: Float32Array; imag: Float32Array };

/** Build a partial spectrum from a per-harmonic amplitude function (sine phase). */
function spectrum(amp: (h: number, frame: number) => number, frame: number) {
  const real = new Float32Array(HARMONICS);
  const imag = new Float32Array(HARMONICS);
  for (let h = 1; h < HARMONICS; h++) imag[h] = amp(h, frame);
  return { real, imag };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Recipes: h = harmonic number (1..N), f = frame position 0..1. */
const TABLE_RECIPES: Record<string, FrameFn> = {
  "Basic Shapes": (fr) => {
    // sine → triangle → saw → square across frames
    const f = fr / (FRAMES - 1);
    return spectrum((h) => {
      const sine = h === 1 ? 1 : 0;
      const tri =
        h % 2 === 1
          ? ((8 / (Math.PI * Math.PI)) * (((h - 1) / 2) % 2 === 0 ? 1 : -1)) / (h * h)
          : 0;
      const saw = 1 / h;
      const sq = h % 2 === 1 ? 1 / h : 0;
      if (f < 0.34) return lerp(sine, tri, f / 0.34);
      if (f < 0.67) return lerp(tri, saw, (f - 0.34) / 0.33);
      return lerp(saw, sq, (f - 0.67) / 0.33);
    }, fr);
  },
  "Sine Harm": (fr) =>
    spectrum((h) => {
      // add successive odd/even harmonics as frame grows
      const reach = 1 + fr * 3;
      return h <= reach ? 1 / h : 0;
    }, fr),
  "Saw Harm": (fr) =>
    spectrum((h) => {
      const rolloff = lerp(1.6, 0.9, fr / (FRAMES - 1));
      return 1 / Math.pow(h, rolloff);
    }, fr),
  "Square Harm": (fr) =>
    spectrum((h) => {
      if (h % 2 === 0) return 0;
      const rolloff = lerp(1.4, 0.95, fr / (FRAMES - 1));
      return 1 / Math.pow(h, rolloff);
    }, fr),
  "Pulse Harm": (fr) =>
    spectrum((h) => {
      const duty = lerp(0.5, 0.1, fr / (FRAMES - 1));
      return (2 / (h * Math.PI)) * Math.abs(Math.sin(Math.PI * h * duty));
    }, fr),
  Hollow: (fr) =>
    spectrum((h) => {
      // strong odd, suppressed even (clarinet-ish), opening up per frame
      const emph = h % 2 === 1 ? 1 : lerp(0.02, 0.3, fr / (FRAMES - 1));
      return (emph / h) * Math.exp(-h / (14 + fr * 8));
    }, fr),
  Bright: (fr) =>
    spectrum((h) => {
      const tilt = lerp(0.6, 0.15, fr / (FRAMES - 1));
      return Math.exp(-h * tilt) * (1 + 0.4 * Math.sin(h));
    }, fr),
  Glass: (fr) =>
    spectrum((h) => {
      // inharmonic-flavoured bell: emphasise 1,3,4,7,11
      const peaks = [1, 3, 4, 7, 11, 13];
      const near = peaks.includes(h) ? 1 : 0.05;
      return (near / Math.sqrt(h)) * lerp(0.8, 1.2, fr / (FRAMES - 1)) * Math.exp(-h / 26);
    }, fr),
  Metallic: (fr) =>
    spectrum((h) => {
      const clang = Math.abs(Math.sin(h * (1.3 + fr * 0.4)));
      return (clang / h) * Math.exp(-h / (30 - fr * 2));
    }, fr),
  Formant: (fr) => {
    // two shifting formant peaks
    const f1 = lerp(4, 9, fr / (FRAMES - 1));
    const f2 = lerp(11, 20, fr / (FRAMES - 1));
    return spectrum((h) => {
      const g1 = Math.exp(-((h - f1) ** 2) / 6);
      const g2 = 0.6 * Math.exp(-((h - f2) ** 2) / 10);
      return (g1 + g2) / h + 0.15 / h;
    }, fr);
  },
  Digital: (fr) =>
    spectrum((h) => {
      // FM-ish comb
      const idx = 1 + fr * 2;
      return (Math.abs(Math.sin(h * idx)) / h) * (h < 40 ? 1 : 0.2);
    }, fr),
  Sweep: (fr) => {
    // moving spectral notch/peak
    const center = lerp(2, 30, fr / (FRAMES - 1));
    return spectrum((h) => (1 / h) * (1 + Math.exp(-((h - center) ** 2) / 8)), fr);
  },
  "Vintage Hybrid": (fr) =>
    spectrum((h) => {
      const saw = 1 / h;
      const sq = h % 2 === 1 ? 1 / h : 0;
      const mix = fr / (FRAMES - 1);
      return lerp(saw, sq, mix) * Math.exp(-h / 40) * (1 + 0.1 * Math.sin(h * 2));
    }, fr),
};

export interface WavetableBank {
  /** frames[tableIndex][frameIndex] */
  frames: PeriodicWave[][];
}

const cache = new WeakMap<BaseAudioContext, WavetableBank>();

export function getWavetableBank(ctx: BaseAudioContext): WavetableBank {
  const existing = cache.get(ctx);
  if (existing) return existing;

  const frames: PeriodicWave[][] = OSC1_TABLES.map((name) => {
    const recipe = TABLE_RECIPES[name] ?? TABLE_RECIPES["Basic Shapes"];
    const out: PeriodicWave[] = [];
    for (let fr = 0; fr < FRAMES; fr++) {
      const { real, imag } = recipe(fr);
      out.push(ctx.createPeriodicWave(real, imag, { disableNormalization: false }));
    }
    return out;
  });

  const bank: WavetableBank = { frames };
  cache.set(ctx, bank);
  return bank;
}

export const WAVETABLE_FRAMES = FRAMES;
