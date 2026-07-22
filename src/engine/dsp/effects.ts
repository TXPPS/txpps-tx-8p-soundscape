/**
 * Effects rack for the TX-8P.
 *
 * Chain order: Drive → EQ → Chorus → Delay → Reverb → Limiter → Master.
 *
 * Every effect exposes a uniform interface: a single `input` and `output`
 * node, a `setParam(id, value)` that resolves registry ids to AudioParams
 * with click-free ramps, and a single dry path (no duplicated dry signal).
 * Bypass crossfades wet→dry rather than reconnecting the graph, so toggling
 * never clicks.
 */

export interface Effect {
  input: GainNode;
  output: GainNode;
  setParam(id: string, value: number): void;
}

const T = 0.02;
const ramp = (p: AudioParam, v: number, ctx: BaseAudioContext, t = T) =>
  p.setTargetAtTime(v, ctx.currentTime, t);
const db2lin = (db: number) => Math.pow(10, db / 40);

// ---- wet/dry helper ---------------------------------------------------
function wetDry(ctx: BaseAudioContext) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry).connect(output);
  wet.connect(output);
  return { input, output, dry, wet };
}

// ======================================================================
// DRIVE
// ======================================================================
export function createDrive(ctx: BaseAudioContext): Effect {
  const { input, output, dry, wet } = wetDry(ctx);
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.oversample = "4x";
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 8000;
  const post = ctx.createGain();
  input.connect(pre).connect(shaper).connect(tone).connect(post).connect(wet);

  let bypassed = true;
  let amount = 0.25;
  let mix = 1;

  // Smooth tanh soft-saturation. `k` stays small at low `amount` so drive is
  // genuinely subtle there (the old `1 + a*60` was near hard-clipping even at
  // 0.3, which grossly distorted polyphonic material). Normalised so the curve
  // passes through ±1.
  const buildCurve = (a: number) => {
    const n = 1024;
    const curve = new Float32Array(n);
    const k = 0.5 + a * 4;
    const norm = Math.tanh(k);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / norm;
    }
    return curve;
  };
  const applyMix = () => {
    const m = bypassed ? 0 : mix;
    ramp(wet.gain, m, ctx);
    ramp(dry.gain, 1 - m, ctx);
    // output compensation: pull back as drive rises
    ramp(post.gain, bypassed ? 1 : 1 / (1 + amount * 0.7), ctx);
  };
  shaper.curve = buildCurve(amount);
  applyMix();

  return {
    input,
    output,
    setParam(id, v) {
      switch (id) {
        case "drive.on":
          bypassed = v < 0.5;
          applyMix();
          break;
        case "drive.amount":
          amount = v;
          shaper.curve = buildCurve(v);
          ramp(pre.gain, 1 + v * 1.2, ctx);
          applyMix();
          break;
        case "drive.tone":
          ramp(tone.frequency, 800 + v * 12000, ctx);
          break;
        case "drive.mix":
          mix = v;
          applyMix();
          break;
      }
    },
  };
}

// ======================================================================
// EQ (3-band)
// ======================================================================
export function createEq(ctx: BaseAudioContext): Effect {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const low = ctx.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 220;
  const mid = ctx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1000;
  mid.Q.value = 0.9;
  const high = ctx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 3500;
  input.connect(low).connect(mid).connect(high).connect(output);

  let on = true;
  const gains = { low: 0, mid: 0, high: 0 };
  const apply = () => {
    ramp(low.gain, on ? gains.low : 0, ctx);
    ramp(mid.gain, on ? gains.mid : 0, ctx);
    ramp(high.gain, on ? gains.high : 0, ctx);
  };
  return {
    input,
    output,
    setParam(id, v) {
      switch (id) {
        case "eq.on":
          on = v >= 0.5;
          apply();
          break;
        case "eq.low":
          gains.low = v;
          apply();
          break;
        case "eq.mid":
          gains.mid = v;
          apply();
          break;
        case "eq.midFreq":
          ramp(mid.frequency, v, ctx);
          break;
        case "eq.high":
          gains.high = v;
          apply();
          break;
      }
    },
  };
}

// ======================================================================
// CHORUS
// ======================================================================
export function createChorus(ctx: BaseAudioContext): Effect {
  const { input, output, dry, wet } = wetDry(ctx);
  const merger = ctx.createChannelMerger(2);
  const voices = [0, 1].map((i) => {
    const d = ctx.createDelay(0.05);
    d.delayTime.value = 0.012 + i * 0.006;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.6 * (i === 0 ? 1 : 1.3);
    const depth = ctx.createGain();
    depth.gain.value = 0.003;
    lfo.connect(depth).connect(d.delayTime);
    input.connect(d);
    d.connect(merger, 0, i);
    lfo.start();
    return { d, lfo, depth };
  });
  merger.connect(wet);

  let on = false;
  let depthAmt = 0.4;
  let mix = 0.5;
  const applyMix = () => {
    ramp(wet.gain, on ? mix : 0, ctx);
    ramp(dry.gain, on ? 1 - mix * 0.4 : 1, ctx);
  };
  applyMix();
  return {
    input,
    output,
    setParam(id, v) {
      switch (id) {
        case "chorus.on":
          on = v >= 0.5;
          applyMix();
          break;
        case "chorus.mode": {
          // I=slow single, II=faster, I+II=dual, Custom=wide
          const rates = [
            [0.5, 0.65],
            [1.1, 1.4],
            [0.5, 1.4],
            [0.2, 0.9],
          ];
          const r = rates[Math.round(v)] ?? rates[0];
          voices.forEach((vo, i) => ramp(vo.lfo.frequency, r[i], ctx));
          break;
        }
        case "chorus.rate":
          voices.forEach((vo, i) => ramp(vo.lfo.frequency, v * (i === 0 ? 1 : 1.3), ctx));
          break;
        case "chorus.depth":
          depthAmt = v;
          voices.forEach((vo) => ramp(vo.depth.gain, 0.001 + v * 0.006, ctx));
          break;
        case "chorus.mix":
          mix = v;
          applyMix();
          break;
      }
    },
  };
}

// ======================================================================
// DELAY (stereo / ping-pong, feedback tone)
// ======================================================================
export function createDelay(ctx: BaseAudioContext): Effect {
  const { input, output, dry, wet } = wetDry(ctx);
  const splitIn = ctx.createGain();
  input.connect(splitIn);

  const dL = ctx.createDelay(2);
  const dR = ctx.createDelay(2);
  dL.delayTime.value = 0.3;
  dR.delayTime.value = 0.3;
  const fbL = ctx.createGain();
  const fbR = ctx.createGain();
  fbL.gain.value = 0.35;
  fbR.gain.value = 0.35;
  const toneL = ctx.createBiquadFilter();
  const toneR = ctx.createBiquadFilter();
  toneL.type = toneR.type = "lowpass";
  toneL.frequency.value = toneR.frequency.value = 6000;
  const merger = ctx.createChannelMerger(2);

  let pingpong = false;
  const wire = () => {
    try {
      fbL.disconnect();
      fbR.disconnect();
    } catch {
      /* noop */
    }
    dL.connect(toneL).connect(fbL);
    dR.connect(toneR).connect(fbR);
    if (pingpong) {
      fbL.connect(dR);
      fbR.connect(dL);
    } else {
      fbL.connect(dL);
      fbR.connect(dR);
    }
  };
  splitIn.connect(dL);
  splitIn.connect(dR);
  dL.connect(merger, 0, 0);
  dR.connect(merger, 0, 1);
  merger.connect(wet);
  wire();

  let on = false;
  let mix = 0.3;
  const applyMix = () => {
    ramp(wet.gain, on ? mix : 0, ctx);
    ramp(dry.gain, 1, ctx);
  };
  applyMix();
  return {
    input,
    output,
    setParam(id, v) {
      switch (id) {
        case "delay.on":
          on = v >= 0.5;
          applyMix();
          break;
        case "delay.time":
          ramp(dL.delayTime, v / 1000, ctx, 0.05);
          ramp(dR.delayTime, (v / 1000) * (pingpong ? 1 : 1), ctx, 0.05);
          break;
        case "delay.feedback":
          ramp(fbL.gain, v, ctx);
          ramp(fbR.gain, v, ctx);
          break;
        case "delay.tone":
          ramp(toneL.frequency, 500 + v * 11000, ctx);
          ramp(toneR.frequency, 500 + v * 11000, ctx);
          break;
        case "delay.pingpong":
          pingpong = v >= 0.5;
          wire();
          break;
        case "delay.mix":
          mix = v;
          applyMix();
          break;
      }
    },
  };
}

// ======================================================================
// REVERB (generated IR)
// ======================================================================
function buildIR(ctx: BaseAudioContext, mode: number, size: number, damp: number): AudioBuffer {
  const decaySec = 0.4 + size * 4.5;
  const len = Math.max(1, Math.floor(ctx.sampleRate * decaySec));
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  let seed = 0x9e3779b1 ^ (mode * 2654435761);
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 0xffffffff) * 2 - 1;
  };
  // mode shapes the early/late balance & tone
  const bright = [0.6, 0.8, 1.0, 0.3][mode] ?? 0.7;
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, 2 + size * 2);
      let s = rnd() * env;
      // progressive damping via one-pole lowpass, more as damp rises
      const a = 1 - bright * (1 - damp) * 0.9;
      lp = lp + a * (s - lp);
      s = lp;
      // plate mode = metallic early reflections
      if (mode === 2 && i < len * 0.15) s += rnd() * env * 0.4;
      data[i] = s;
    }
  }
  return ir;
}

export function createReverb(ctx: BaseAudioContext): Effect {
  const { input, output, dry, wet } = wetDry(ctx);
  const predelay = ctx.createDelay(0.2);
  const conv = ctx.createConvolver();
  const damping = ctx.createBiquadFilter();
  damping.type = "lowpass";
  damping.frequency.value = 9000;
  input.connect(predelay).connect(conv).connect(damping).connect(wet);

  let on = false;
  let mix = 0.25;
  let mode = 1;
  let size = 0.6;
  let damp = 0.5;
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  const rebuild = () => {
    conv.buffer = buildIR(ctx, mode, size, damp);
  };
  rebuild();
  const scheduleRebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 80);
  };
  const applyMix = () => {
    ramp(wet.gain, on ? mix : 0, ctx);
    ramp(dry.gain, 1, ctx);
  };
  applyMix();
  return {
    input,
    output,
    setParam(id, v) {
      switch (id) {
        case "reverb.on":
          on = v >= 0.5;
          applyMix();
          break;
        case "reverb.mode":
          mode = Math.round(v);
          scheduleRebuild();
          break;
        case "reverb.size":
          size = v;
          scheduleRebuild();
          break;
        case "reverb.predelay":
          ramp(predelay.delayTime, v / 1000, ctx, 0.05);
          break;
        case "reverb.damp":
          damp = v;
          ramp(damping.frequency, 1500 + (1 - v) * 12000, ctx);
          scheduleRebuild();
          break;
        case "reverb.mix":
          mix = v;
          applyMix();
          break;
      }
    },
  };
}

// ======================================================================
// LIMITER (safety, always in chain)
// ======================================================================
export function createLimiter(ctx: BaseAudioContext): Effect {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -3;
  comp.knee.value = 3;
  comp.ratio.value = 20;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  const ceiling = ctx.createGain();
  ceiling.gain.value = 0.95;
  input.connect(comp).connect(ceiling).connect(output);

  return {
    input,
    output,
    setParam(id, v) {
      switch (id) {
        case "limiter.on":
          // bypass just relaxes the limiter; it always stays for safety
          ramp(comp.threshold, v >= 0.5 ? -3 : -0.5, ctx);
          ramp(comp.ratio, v >= 0.5 ? 20 : 2, ctx);
          break;
        case "limiter.threshold":
          ramp(comp.threshold, v, ctx);
          break;
        case "limiter.release":
          ramp(comp.release, v / 1000, ctx);
          break;
        case "limiter.ceiling":
          ramp(ceiling.gain, v, ctx);
          break;
      }
    },
  };
}

export { db2lin };
