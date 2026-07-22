/**
 * A single TX-8P voice — the full hybrid signal path:
 *
 *   OSC1 (wavetable, 2-frame crossfade)  ┐
 *   OSC2 (virtual analog, real PW pulse) ┤
 *   SUB  (sine/square, -1/-2 oct)        ┼─► MIX ─► FILTER ─► AMP ─► PAN ─► voiceBus
 *   NOISE (white/pink/dark + tone)       ┘
 *
 * Pitch, cutoff, and level are AudioParams so the modulation matrix and
 * LFOs/envelopes drive them at audio rate. The engine owns lifecycle
 * (start/release/dispose) and voice-mode routing; the Voice owns DSP.
 */

import { WAVETABLE_FRAMES, getWavetableBank, type WavetableBank } from "./dsp/wavetables";
import { getNoiseBank, getPulseWave } from "./dsp/noise";
import { MOD_DESTS } from "./params/registry";

export interface VoiceGlobals {
  ctx: AudioContext;
  dest: AudioNode;
  bank: WavetableBank;
  lfo1: GainNode;
  lfo2: GainNode;
  modWheel: ConstantSourceNode;
  aftertouch: ConstantSourceNode;
  pitchBend: ConstantSourceNode; // cents
}

export interface MatrixSlot {
  src: number;
  dst: number;
  amt: number;
  on: boolean;
}

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type P = Record<string, number>;

export class Voice {
  readonly g: VoiceGlobals;
  private p: P;
  midi: number;
  velocity: number;
  releasing = false;
  dead = false;
  startedAt: number;

  // nodes
  private osc1a: OscillatorNode;
  private osc1b: OscillatorNode;
  private osc1FrameA: GainNode;
  private osc1FrameB: GainNode;
  private osc1Level: GainNode;

  private osc2Main: OscillatorNode | null = null;
  private osc2SawA: OscillatorNode | null = null;
  private osc2SawB: OscillatorNode | null = null;
  private osc2PulseDelay: DelayNode | null = null;
  private osc2Level: GainNode;
  private osc2Shape = 2;

  private sub: OscillatorNode | null = null;
  private subLevel: GainNode;

  private noise: AudioBufferSourceNode | null = null;
  private noiseTone: BiquadFilterNode;
  private noiseLevel: GainNode;

  private ringGain: GainNode;

  private mixOsc1: GainNode;
  private mixOsc2: GainNode;
  private mixSub: GainNode;
  private mixNoise: GainNode;
  private mixBus: GainNode;

  private filter: BiquadFilterNode;
  private amp: GainNode;
  private pan: StereoPannerNode;

  // modulation source signals
  private modEnvSrc: ConstantSourceNode;
  private modEnvGain: GainNode; // shaped 0..1
  private ampSig: ConstantSourceNode;
  private ampSigGain: GainNode;
  private velSig: ConstantSourceNode;
  private keySig: ConstantSourceNode;
  private randSig: ConstantSourceNode;
  private gateSig: ConstantSourceNode;

  private allDetune: AudioParam[] = [];
  private osc2Detune: AudioParam[] = [];
  private modConns: { g: GainNode }[] = [];
  private started: OscillatorNode[] = [];
  cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  // unison offsets
  private uniDetune = 0;
  private uniPan = 0;
  private uniGain = 1;

  constructor(globals: VoiceGlobals, params: P, midi: number, velocity: number) {
    this.g = globals;
    this.p = params;
    this.midi = midi;
    this.velocity = velocity;
    const { ctx } = globals;
    this.startedAt = ctx.currentTime;

    // ---- OSC1 (wavetable) ----
    this.osc1a = ctx.createOscillator();
    this.osc1b = ctx.createOscillator();
    this.osc1FrameA = ctx.createGain();
    this.osc1FrameB = ctx.createGain();
    this.osc1Level = ctx.createGain();
    this.osc1a.connect(this.osc1FrameA).connect(this.osc1Level);
    this.osc1b.connect(this.osc1FrameB).connect(this.osc1Level);

    // ---- OSC2 (built in configureOsc2) ----
    this.osc2Level = ctx.createGain();

    // ---- SUB ----
    this.subLevel = ctx.createGain();

    // ---- NOISE ----
    this.noiseTone = ctx.createBiquadFilter();
    this.noiseTone.type = "lowpass";
    this.noiseLevel = ctx.createGain();
    this.noiseTone.connect(this.noiseLevel);

    // ---- RING ----
    this.ringGain = ctx.createGain();
    this.ringGain.gain.value = 0;

    // ---- MIX ----
    this.mixOsc1 = ctx.createGain();
    this.mixOsc2 = ctx.createGain();
    this.mixSub = ctx.createGain();
    this.mixNoise = ctx.createGain();
    this.mixBus = ctx.createGain();
    this.osc1Level.connect(this.mixOsc1).connect(this.mixBus);
    this.osc2Level.connect(this.mixOsc2).connect(this.mixBus);
    this.subLevel.connect(this.mixSub).connect(this.mixBus);
    this.noiseLevel.connect(this.mixNoise).connect(this.mixBus);
    this.ringGain.connect(this.mixBus);

    // ---- FILTER / AMP / PAN ----
    this.filter = ctx.createBiquadFilter();
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;
    this.pan = ctx.createStereoPanner();
    this.mixBus.connect(this.filter).connect(this.amp).connect(this.pan).connect(globals.dest);

    // ---- MOD SOURCES ----
    this.modEnvSrc = ctx.createConstantSource();
    this.modEnvGain = ctx.createGain();
    this.modEnvGain.gain.value = 0;
    this.modEnvSrc.connect(this.modEnvGain);
    this.ampSig = ctx.createConstantSource();
    this.ampSigGain = ctx.createGain();
    this.ampSigGain.gain.value = 0;
    this.ampSig.connect(this.ampSigGain);
    this.velSig = ctx.createConstantSource();
    this.velSig.offset.value = velocity;
    this.keySig = ctx.createConstantSource();
    this.keySig.offset.value = (midi - 60) / 60;
    this.randSig = ctx.createConstantSource();
    this.randSig.offset.value = deterministicRandom(midi, this.startedAt);
    this.gateSig = ctx.createConstantSource();
    this.gateSig.offset.value = 1;

    this.allDetune = [this.osc1a.detune, this.osc1b.detune];
  }

  /** Unison placement, applied at start(). Call before start(). */
  setUnison(detuneCents: number, panSpread: number, gainScale: number) {
    this.uniDetune = detuneCents;
    this.uniPan = Math.max(-1, Math.min(1, panSpread));
    this.uniGain = gainScale;
  }

  /** Legato/glide retune without retriggering the envelope. */
  retune(midi: number, glideMs: number) {
    if (this.dead) return;
    this.midi = midi;
    const { ctx } = this.g;
    const t = ctx.currentTime;
    this.keySig.offset.setTargetAtTime((midi - 60) / 60, t, 0.01);
    const glide = (osc: OscillatorNode | null, hz: number) => {
      if (!osc) return;
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(osc.frequency.value, t);
      if (glideMs > 0)
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, hz), t + glideMs / 1000);
      else osc.frequency.setValueAtTime(hz, t);
    };
    const f1 = this.freqFor("osc1");
    glide(this.osc1a, f1);
    glide(this.osc1b, f1);
    const f2 = this.freqFor("osc2");
    glide(this.osc2Main, f2);
    glide(this.osc2SawA, f2);
    glide(this.osc2SawB, f2);
    if (this.sub) glide(this.sub, this.freqFor("sub"));
    this.updateOsc2Pulse(f2);
  }

  /** Build OSC2 sub-graph for the current shape. */
  private configureOsc2() {
    const { ctx } = this.g;
    const shape = Math.round(this.p["osc2.shape"] ?? 2);
    this.osc2Shape = shape;
    // teardown any prior
    for (const n of [this.osc2Main, this.osc2SawA, this.osc2SawB]) {
      if (n) {
        try {
          n.disconnect();
        } catch {
          /* noop */
        }
      }
    }
    this.osc2Main = this.osc2SawA = this.osc2SawB = null;
    this.osc2PulseDelay = null;

    if (shape === 4) {
      // Pulse via difference-of-saws → real, modulatable pulse width.
      const a = ctx.createOscillator();
      const b = ctx.createOscillator();
      a.type = "sawtooth";
      b.type = "sawtooth";
      const inv = ctx.createGain();
      inv.gain.value = -1;
      const delay = ctx.createDelay(0.05);
      a.connect(this.osc2Level);
      b.connect(delay).connect(inv).connect(this.osc2Level);
      this.osc2SawA = a;
      this.osc2SawB = b;
      this.osc2PulseDelay = delay;
      this.osc2Detune = [a.detune, b.detune];
    } else {
      const o = ctx.createOscillator();
      const types: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];
      o.type = types[shape] ?? "sawtooth";
      o.connect(this.osc2Level);
      this.osc2Main = o;
      this.osc2Detune = [o.detune];
    }
    this.allDetune = [this.osc1a.detune, this.osc1b.detune, ...this.osc2Detune];
  }

  private configureSub() {
    const { ctx } = this.g;
    if (this.sub) {
      try {
        this.sub.disconnect();
      } catch {
        /* noop */
      }
      this.sub = null;
    }
    const w = Math.round(this.p["sub.wave"] ?? 1);
    if (w === 0) return;
    const o = ctx.createOscillator();
    o.type = w === 3 || w === 4 ? "square" : "sine";
    o.connect(this.subLevel);
    this.sub = o;
  }

  private configureNoise() {
    const { ctx } = this.g;
    const bank = getNoiseBank(ctx);
    const type = Math.round(this.p["noise.type"] ?? 0);
    const buf = type === 1 ? bank.pink : type === 2 ? bank.dark : bank.white;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.noiseTone);
    this.noise = src;
  }

  /** Compute the base frequency for each source given tuning params. */
  private freqFor(section: "osc1" | "osc2" | "sub"): number {
    const oct = this.p[`${section === "sub" ? "osc1" : section}.oct`] ?? 0;
    const semi = this.p[`${section === "sub" ? "osc1" : section}.semi`] ?? 0;
    const kt = section === "sub" ? 1 : (this.p[`${section}.keytrack`] ?? 1);
    const base = 60 + (this.midi - 60) * kt;
    let n = base + (section === "sub" ? 0 : oct * 12 + semi);
    if (section === "sub") {
      const w = Math.round(this.p["sub.wave"] ?? 1);
      n -= w === 2 || w === 4 ? 24 : 12;
    }
    return midiToHz(n);
  }

  private staticCents(section: "osc1" | "osc2"): number {
    return this.p[`${section}.fine`] ?? 0;
  }

  /** Start the voice: build sources, schedule envelopes, connect mod. */
  start(matrix: MatrixSlot[], glideFromHz?: number, glideMs = 0) {
    const { ctx } = this.g;
    const t = ctx.currentTime;
    const bank = this.g.bank;

    this.configureOsc2();
    this.configureSub();
    this.configureNoise();

    // OSC1 wavetable frames + position
    this.updateOsc1Table();
    this.updateOsc1Position();

    // frequencies + tuning
    const applyFreq = (osc: OscillatorNode | null, hz: number) => {
      if (!osc) return;
      if (glideMs > 0 && glideFromHz) {
        osc.frequency.setValueAtTime(glideFromHz, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, hz), t + glideMs / 1000);
      } else {
        osc.frequency.setValueAtTime(hz, t);
      }
    };
    const f1 = this.freqFor("osc1");
    applyFreq(this.osc1a, f1);
    applyFreq(this.osc1b, f1);
    this.osc1a.detune.value = this.staticCents("osc1") + this.uniDetune;
    this.osc1b.detune.value = this.staticCents("osc1") + this.uniDetune;

    const f2 = this.freqFor("osc2");
    applyFreq(this.osc2Main, f2);
    applyFreq(this.osc2SawA, f2);
    applyFreq(this.osc2SawB, f2);
    for (const d of this.osc2Detune) d.value = this.staticCents("osc2") + this.uniDetune;
    this.updateOsc2Pulse(f2);

    if (this.sub) applyFreq(this.sub, this.freqFor("sub"));

    // pitch bend bus → all oscillators
    for (const d of this.allDetune) this.g.pitchBend.connect(d);

    // levels + mixer + filter
    this.applyStaticParams();

    // start sources
    const startAll = (arr: (AudioScheduledSourceNode | null)[]) => {
      for (const n of arr) {
        if (n) {
          try {
            n.start(t);
            this.started.push(n as OscillatorNode);
          } catch {
            /* already started */
          }
        }
      }
    };
    startAll([
      this.osc1a,
      this.osc1b,
      this.osc2Main,
      this.osc2SawA,
      this.osc2SawB,
      this.sub,
      this.noise,
    ]);
    this.modEnvSrc.start(t);
    this.ampSig.start(t);
    this.velSig.start(t);
    this.keySig.start(t);
    this.randSig.start(t);
    this.gateSig.start(t);

    // envelopes
    this.scheduleAmp(t);
    this.scheduleModEnv(t);
    // ring modulation carrier: osc2 modulates ring gain, osc1 feeds ring input
    this.osc1Level.connect(this.ringGain);
    if (this.osc2Main) this.osc2Main.connect(this.ringGain.gain);

    // modulation matrix
    this.connectMatrix(matrix);
  }

  // --------- envelopes ---------
  private scheduleAmp(t: number) {
    const a = Math.max(0.001, (this.p["amp.attack"] ?? 6) / 1000);
    const d = Math.max(0.001, (this.p["amp.decay"] ?? 240) / 1000);
    const s = this.p["amp.sustain"] ?? 0.8;
    const velAmt = this.p["amp.velocity"] ?? 0.6;
    const curve = this.p["voice.velCurve"] ?? 1;
    const vel = Math.pow(this.velocity, curve);
    const velScale = 1 - velAmt + velAmt * vel;
    const peak = Math.max(0.0001, 0.32 * velScale * this.uniGain);
    const sustain = Math.max(0.0001, peak * s);
    for (const gp of [this.amp.gain, this.ampSigGain.gain]) {
      const top = gp === this.amp.gain ? peak : 1;
      const sus = gp === this.amp.gain ? sustain : s;
      gp.cancelScheduledValues(t);
      gp.setValueAtTime(0.0001, t);
      gp.linearRampToValueAtTime(top, t + a);
      gp.setTargetAtTime(sus, t + a, d / 3 + 0.001);
    }
  }

  private scheduleModEnv(t: number) {
    const a = Math.max(0.001, (this.p["modenv.attack"] ?? 4) / 1000);
    const d = Math.max(0.001, (this.p["modenv.decay"] ?? 320) / 1000);
    const s = this.p["modenv.sustain"] ?? 0;
    const velAmt = this.p["modenv.velocity"] ?? 0.4;
    const scale = 1 - velAmt + velAmt * this.velocity;
    const g = this.modEnvGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(scale, t + a);
    g.setTargetAtTime(s * scale, t + a, d / 3 + 0.001);
  }

  // --------- static params ---------
  private applyStaticParams() {
    const { ctx } = this.g;
    const t = ctx.currentTime;
    const set = (g: GainNode, v: number) => g.gain.setValueAtTime(Math.max(0.0001, v), t);
    set(this.osc1Level, this.p["osc1.level"] ?? 0.8);
    set(this.osc2Level, this.p["osc2.level"] ?? 0);
    set(this.subLevel, this.p["sub.level"] ?? 0);
    set(this.noiseLevel, this.p["noise.level"] ?? 0);
    set(this.mixOsc1, this.p["mixer.osc1"] ?? 0.85);
    set(this.mixOsc2, this.p["mixer.osc2"] ?? 0.85);
    set(this.mixSub, this.p["mixer.sub"] ?? 0.85);
    set(this.mixNoise, this.p["mixer.noise"] ?? 0.85);
    this.ringGain.gain.setValueAtTime(this.p["mixer.ring"] ?? 0, t);
    // noise tone
    const tone = this.p["noise.tone"] ?? 0.5;
    this.noiseTone.type = tone < 0.5 ? "lowpass" : "highpass";
    this.noiseTone.frequency.setValueAtTime(200 + tone * 12000, t);
    this.updateFilter();
    this.pan.pan.setValueAtTime(this.uniPan, t);
  }

  private updateFilter() {
    const { ctx } = this.g;
    const t = ctx.currentTime;
    const modes: BiquadFilterType[] = ["lowpass", "bandpass", "highpass", "notch"];
    this.filter.type = modes[Math.round(this.p["filter.mode"] ?? 0)] ?? "lowpass";
    this.filter.frequency.setValueAtTime(this.p["filter.cutoff"] ?? 14000, t);
    const res = this.p["filter.resonance"] ?? 0.12;
    this.filter.Q.setValueAtTime(0.5 + res * 22, t);
    // static filter detune contributions: keytrack + velocity
    const kt = this.p["filter.keytrack"] ?? 0.3;
    const velAmt = this.p["filter.velAmt"] ?? 0;
    const cents = (this.midi - 60) * kt * 100 + this.velocity * velAmt * 3600;
    this.filter.detune.setValueAtTime(cents, t);
    // envelope amount → filter.detune via modEnv signal
    const envAmt = this.p["filter.envAmt"] ?? 0;
    const envVel = this.p["filter.envVel"] ?? 0;
    const scale = envAmt * (1 - envVel + envVel * this.velocity) * 6000;
    this.filterEnvGain?.disconnect();
    if (Math.abs(scale) > 1) {
      const g = ctx.createGain();
      g.gain.value = scale;
      this.modEnvGain.connect(g).connect(this.filter.detune);
      this.filterEnvGain = g;
    }
  }
  private filterEnvGain: GainNode | null = null;

  private updateOsc1Table() {
    const { bank } = this.g;
    const ti = Math.round(this.p["osc1.table"] ?? 0);
    const frames = bank.frames[Math.max(0, Math.min(bank.frames.length - 1, ti))];
    this.osc1FramesRef = frames;
    this.updateOsc1Position();
  }
  private osc1FramesRef: PeriodicWave[] | null = null;

  private updateOsc1Position() {
    if (!this.osc1FramesRef) return;
    const { ctx } = this.g;
    const t = ctx.currentTime;
    const pos = Math.max(0, Math.min(1, this.p["osc1.pos"] ?? 0));
    const span = WAVETABLE_FRAMES - 1;
    const idx = pos * span;
    const a = Math.floor(idx);
    const b = Math.min(span, a + 1);
    const frac = idx - a;
    this.osc1a.setPeriodicWave(this.osc1FramesRef[a]);
    this.osc1b.setPeriodicWave(this.osc1FramesRef[b]);
    this.osc1FrameA.gain.setTargetAtTime(1 - frac, t, 0.01);
    this.osc1FrameB.gain.setTargetAtTime(frac, t, 0.01);
  }

  private updateOsc2Pulse(freq: number) {
    if (this.osc2Shape !== 4 || !this.osc2PulseDelay) return;
    const pw = Math.max(0.05, Math.min(0.95, this.p["osc2.pw"] ?? 0.5));
    const period = 1 / Math.max(1, freq);
    this.osc2PulseDelay.delayTime.setTargetAtTime(pw * period, this.g.ctx.currentTime, 0.01);
  }

  // --------- modulation matrix ---------
  private sourceNode(src: number): AudioNode | null {
    switch (src) {
      case 1:
        return this.g.lfo1;
      case 2:
        return this.g.lfo2;
      case 3:
        return this.modEnvGain;
      case 4:
        return this.ampSigGain;
      case 5:
        return this.velSig;
      case 6:
        return this.keySig;
      case 7:
        return this.g.modWheel;
      case 8:
        return this.g.aftertouch;
      case 9:
        return this.randSig;
      case 10:
        return this.gateSig;
      default:
        return null;
    }
  }

  /** Returns [param, scale] pairs for a destination. */
  private destTargets(dst: number): Array<[AudioParam, number]> {
    switch (MOD_DESTS[dst]) {
      case "Pitch":
        return this.allDetune.map((d) => [d, 2400] as [AudioParam, number]);
      case "Osc2 Pitch":
        return this.osc2Detune.map((d) => [d, 2400] as [AudioParam, number]);
      case "Osc1 Level":
        return [[this.osc1Level.gain, 0.6]];
      case "Osc2 Level":
        return [[this.osc2Level.gain, 0.6]];
      case "Osc2 PW":
        return this.osc2PulseDelay ? [[this.osc2PulseDelay.delayTime, 0.002]] : [];
      case "Cutoff":
        return [[this.filter.detune, 4800]];
      case "Resonance":
        return [[this.filter.Q, 18]];
      case "Amp":
        return [[this.amp.gain, 0.3]];
      case "Pan":
        return [[this.pan.pan, 1]];
      default:
        return [];
    }
  }

  private connectMatrix(matrix: MatrixSlot[]) {
    const { ctx } = this.g;
    for (const slot of matrix) {
      if (!slot.on || slot.src === 0 || slot.dst === 0 || Math.abs(slot.amt) < 0.001) continue;
      const source = this.sourceNode(slot.src);
      if (!source) continue;
      for (const [param, scale] of this.destTargets(slot.dst)) {
        const g = ctx.createGain();
        g.gain.value = slot.amt * scale;
        try {
          source.connect(g).connect(param);
          this.modConns.push({ g });
        } catch {
          /* incompatible */
        }
      }
    }
  }

  // --------- live param updates for held voices ---------
  applyParam(id: string) {
    if (this.dead) return;
    if (
      id.startsWith("osc1.") ||
      id.startsWith("osc2.") ||
      id.startsWith("sub.") ||
      id.startsWith("noise.") ||
      id.startsWith("mixer.")
    ) {
      if (id === "osc1.table") this.updateOsc1Table();
      else if (id === "osc1.pos") this.updateOsc1Position();
      else this.applyStaticParams();
      if (id === "osc2.pw") this.updateOsc2Pulse(this.freqFor("osc2"));
    } else if (id.startsWith("filter.")) {
      this.updateFilter();
    }
    // envelope/LFO/matrix param changes apply to subsequent notes.
  }

  // --------- release / dispose ---------
  release(releaseSecOverride?: number) {
    if (this.releasing || this.dead) return;
    this.releasing = true;
    const { ctx } = this.g;
    const t = ctx.currentTime;
    const rel = releaseSecOverride ?? Math.max(0.005, (this.p["amp.release"] ?? 300) / 1000);
    const modRel = Math.max(0.005, (this.p["modenv.release"] ?? 320) / 1000);
    this.gateSig.offset.setTargetAtTime(0, t, 0.005);
    for (const gp of [this.amp.gain, this.ampSigGain.gain, this.modEnvGain.gain]) {
      const r = gp === this.modEnvGain.gain ? modRel : rel;
      try {
        gp.cancelScheduledValues(t);
        gp.setValueAtTime(gp.value, t);
        gp.linearRampToValueAtTime(0.0001, t + r);
      } catch {
        /* noop */
      }
    }
    const stopAt = t + Math.max(rel, modRel) + 0.02;
    for (const n of this.started) {
      try {
        n.stop(stopAt);
      } catch {
        /* noop */
      }
    }
    for (const s of [
      this.modEnvSrc,
      this.ampSig,
      this.velSig,
      this.keySig,
      this.randSig,
      this.gateSig,
    ]) {
      try {
        s.stop(stopAt);
      } catch {
        /* noop */
      }
    }
    this.cleanupTimer = setTimeout(() => this.dispose(), (Math.max(rel, modRel) + 0.06) * 1000);
  }

  /** Immediate hard stop (panic). */
  panic() {
    if (this.dead) return;
    const { ctx } = this.g;
    const t = ctx.currentTime;
    try {
      this.amp.gain.cancelScheduledValues(t);
      this.amp.gain.setValueAtTime(this.amp.gain.value, t);
      this.amp.gain.linearRampToValueAtTime(0, t + 0.02);
    } catch {
      /* noop */
    }
    this.releasing = true;
    const stopAt = t + 0.04;
    for (const n of this.started) {
      try {
        n.stop(stopAt);
      } catch {
        /* noop */
      }
    }
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => this.dispose(), 70);
  }

  dispose() {
    if (this.dead) return;
    this.dead = true;
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    const nodes: (AudioNode | null)[] = [
      this.osc1a,
      this.osc1b,
      this.osc1FrameA,
      this.osc1FrameB,
      this.osc1Level,
      this.osc2Main,
      this.osc2SawA,
      this.osc2SawB,
      this.osc2PulseDelay,
      this.osc2Level,
      this.sub,
      this.subLevel,
      this.noise,
      this.noiseTone,
      this.noiseLevel,
      this.ringGain,
      this.mixOsc1,
      this.mixOsc2,
      this.mixSub,
      this.mixNoise,
      this.mixBus,
      this.filter,
      this.amp,
      this.pan,
      this.filterEnvGain,
      this.modEnvSrc,
      this.modEnvGain,
      this.ampSig,
      this.ampSigGain,
      this.velSig,
      this.keySig,
      this.randSig,
      this.gateSig,
      ...this.modConns.map((c) => c.g),
    ];
    for (const n of nodes) {
      if (n) {
        try {
          n.disconnect();
        } catch {
          /* noop */
        }
      }
    }
  }
}

function deterministicRandom(midi: number, t: number): number {
  const x = Math.sin(midi * 12.9898 + t * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export { midiToHz, getWavetableBank };
