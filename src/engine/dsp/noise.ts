/**
 * Cached noise buffers (white / pink / dark) and OSC2 pulse PeriodicWave
 * generation. All generated procedurally — no samples.
 */

export type NoiseKind = "white" | "pink" | "dark";

interface NoiseBank {
  white: AudioBuffer;
  pink: AudioBuffer;
  dark: AudioBuffer;
}

const cache = new WeakMap<BaseAudioContext, NoiseBank>();

function makeBuffer(
  ctx: BaseAudioContext,
  fill: (i: number, prev: number[]) => number,
): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const state: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < len; i++) data[i] = fill(i, state);
  return buf;
}

export function getNoiseBank(ctx: BaseAudioContext): NoiseBank {
  const existing = cache.get(ctx);
  if (existing) return existing;

  // Deterministic PRNG so builds/tests are reproducible.
  let seed = 0x2f6e2b1;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 0xffffffff) * 2 - 1;
  };

  const white = makeBuffer(ctx, () => rnd());

  const pink = makeBuffer(ctx, (_i, b) => {
    // Paul Kellet pink-noise approximation.
    const w = rnd();
    b[0] = 0.99886 * b[0] + w * 0.0555179;
    b[1] = 0.99332 * b[1] + w * 0.0750759;
    b[2] = 0.969 * b[2] + w * 0.153852;
    b[3] = 0.8665 * b[3] + w * 0.3104856;
    b[4] = 0.55 * b[4] + w * 0.5329522;
    b[5] = -0.7616 * b[5] - w * 0.016898;
    const out = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362;
    b[6] = w * 0.115926;
    return out * 0.11;
  });

  const dark = makeBuffer(ctx, (_i, b) => {
    // heavily low-passed / brownian-ish
    const w = rnd();
    b[0] = (b[0] + 0.02 * w) / 1.02;
    return b[0] * 3.5;
  });

  const bank: NoiseBank = { white, pink, dark };
  cache.set(ctx, bank);
  return bank;
}

/**
 * Build a band-limited pulse PeriodicWave of the given duty cycle.
 * Cached per (ctx, quantized duty) so PW sweeps don't churn allocations.
 */
const pulseCache = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();

export function getPulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const q = Math.max(1, Math.min(99, Math.round(duty * 100)));
  let m = pulseCache.get(ctx);
  if (!m) {
    m = new Map();
    pulseCache.set(ctx, m);
  }
  const hit = m.get(q);
  if (hit) return hit;

  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  const d = q / 100;
  for (let h = 1; h < n; h++) {
    // Fourier series of a pulse of duty d.
    imag[h] = (2 / (h * Math.PI)) * Math.sin(Math.PI * h * d);
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  m.set(q, wave);
  return wave;
}
