/**
 * Singleton AudioContext + master bus for the TX-8P.
 *
 * Nothing else in the app is allowed to construct an AudioContext.
 * `getAudioGraph()` returns the same singleton on every call, creating
 * it lazily on the first invocation. This module is safe to import from
 * client code only — never call it during SSR / module evaluation.
 */

export interface AudioGraph {
  ctx: AudioContext;
  /** All voices connect here. */
  voiceBus: GainNode;
  /** Post-effects safety limiter feeds this master gain. */
  masterGain: GainNode;
  /** Final safety limiter. */
  limiter: DynamicsCompressorNode;
  /** Analyser for tests and future metering. */
  analyser: AnalyserNode;
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
  voiceBus.gain.value = 1;

  // Placeholder pass-through effects chain (populated in CP6). CP3 uses
  // voiceBus → limiter → masterGain → destination directly.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.75;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  voiceBus.connect(limiter);
  limiter.connect(masterGain);
  masterGain.connect(analyser);
  masterGain.connect(ctx.destination);

  graph = { ctx, voiceBus, masterGain, limiter, analyser };
  return graph;
}

/** Test-only: is a graph already constructed? */
export function hasAudioGraph(): boolean {
  return graph !== undefined;
}
