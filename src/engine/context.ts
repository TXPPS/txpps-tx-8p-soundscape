/**
 * Singleton AudioContext + master bus + effects rack for the TX-8P.
 *
 * Nothing else in the app is allowed to construct an AudioContext.
 * `getAudioGraph()` returns the same singleton on every call, creating it
 * lazily on the first invocation. Client-only — never call during SSR.
 *
 * Signal flow:
 *   voiceBus → Drive → EQ → Chorus → Delay → Reverb → Limiter → masterGain
 *            → analyser + destination
 *
 * Global control buses (modWheel, aftertouch, pitchBend) are ConstantSource
 * nodes the voices tap for modulation; they are started once here.
 */

import {
  createChorus,
  createDelay,
  createDrive,
  createEq,
  createLimiter,
  createReverb,
  type Effect,
} from "./dsp/effects";
import { getWavetableBank, type WavetableBank } from "./dsp/wavetables";

export interface AudioGraph {
  ctx: AudioContext;
  /** All voices connect here. */
  voiceBus: GainNode;
  /** Post-effects master gain. */
  masterGain: GainNode;
  /** Analyser for tests + metering. */
  analyser: AnalyserNode;
  /** Ordered effects, each keyed by its registry section for param routing. */
  effects: { section: string; fx: Effect }[];
  /** Global modulation control buses. */
  modWheel: ConstantSourceNode;
  aftertouch: ConstantSourceNode;
  pitchBend: ConstantSourceNode; // cents
  /** Generated wavetable bank. */
  bank: WavetableBank;
}

let graph: AudioGraph | undefined;

export function getAudioGraph(): AudioGraph {
  if (graph) return graph;
  if (typeof window === "undefined") {
    throw new Error("AudioContext is not available during SSR");
  }
  const Ctor: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio API not supported in this browser");

  const ctx = new Ctor({ latencyHint: "interactive" });

  const voiceBus = ctx.createGain();
  voiceBus.gain.value = 0.85;

  // ---- effects rack ----
  const drive = createDrive(ctx);
  const eq = createEq(ctx);
  const chorus = createChorus(ctx);
  const delay = createDelay(ctx);
  const reverb = createReverb(ctx);
  const limiter = createLimiter(ctx);

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.8;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  voiceBus.connect(drive.input);
  drive.output.connect(eq.input);
  eq.output.connect(chorus.input);
  chorus.output.connect(delay.input);
  delay.output.connect(reverb.input);
  reverb.output.connect(limiter.input);
  limiter.output.connect(masterGain);
  masterGain.connect(analyser);
  masterGain.connect(ctx.destination);

  // ---- global control buses ----
  const modWheel = ctx.createConstantSource();
  modWheel.offset.value = 0;
  const aftertouch = ctx.createConstantSource();
  aftertouch.offset.value = 0;
  const pitchBend = ctx.createConstantSource();
  pitchBend.offset.value = 0;
  modWheel.start();
  aftertouch.start();
  pitchBend.start();

  graph = {
    ctx,
    voiceBus,
    masterGain,
    analyser,
    effects: [
      { section: "drive", fx: drive },
      { section: "eq", fx: eq },
      { section: "chorus", fx: chorus },
      { section: "delay", fx: delay },
      { section: "reverb", fx: reverb },
      { section: "limiter", fx: limiter },
    ],
    modWheel,
    aftertouch,
    pitchBend,
    bank: getWavetableBank(ctx),
  };
  return graph;
}

/** Test-only: is a graph already constructed? */
export function hasAudioGraph(): boolean {
  return graph !== undefined;
}
