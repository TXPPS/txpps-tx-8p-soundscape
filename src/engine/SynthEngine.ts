/**
 * TX-8P SynthEngine — CP3 minimum-viable playable engine.
 *
 * Responsibilities
 * ----------------
 * - Own the singleton `AudioGraph`.
 * - Manage the AudioContext lifecycle and surface its status.
 * - Provide the first-note guarantee: a press requested while the
 *   context is still suspended is registered as a *pending* note tied
 *   to a stable voice handle. When the context resumes, the pending
 *   note is triggered if — and only if — the caller has not released
 *   it in the meantime.
 * - Manage a fixed pool of eight voice slots (CP3 uses a single sine
 *   oscillator per voice; CP4 replaces the voice DSP with the full
 *   hybrid engine without changing this ownership API).
 * - Provide Panic that returns all state to zero, deterministically.
 *
 * Handles vs MIDI notes
 * ---------------------
 * Every press returns a monotonically-increasing `VoiceHandle`.
 * Releases MUST cite that handle; the engine never resolves releases
 * by note number alone. This is the property that keeps repeated
 * identical notes, overlapping touches, and MIDI-plus-screen input
 * from destroying each other.
 */

import { getAudioGraph, hasAudioGraph, type AudioGraph } from "./context";
import { getDefaults } from "./params/registry";

export type EngineStatus =
  | "idle" // context not yet constructed
  | "starting" // resume() in flight
  | "ready" // context.state === "running"
  | "suspended" // browser suspended it (tab hidden, etc.)
  | "error";

export type NoteSource = "screen" | "keyboard" | "midi";
export type VoiceHandle = number;

interface Voice {
  handle: VoiceHandle;
  midi: number;
  source: NoteSource;
  sourceKey: string;
  osc: OscillatorNode;
  amp: GainNode;
  /** Set when the release ramp has been scheduled; guards double release. */
  releasing: boolean;
  /** Set when the voice has been fully torn down; guards double cleanup. */
  dead: boolean;
  /** Timer id for the post-release cleanup. */
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  startedAt: number;
}

interface PendingRequest {
  handle: VoiceHandle;
  midi: number;
  velocity: number;
  source: NoteSource;
  sourceKey: string;
  /** Set to true if the caller releases before startup completes. */
  cancelled: boolean;
}

type Listener = () => void;

class SynthEngineImpl {
  private graph: AudioGraph | undefined;
  private status: EngineStatus = "idle";
  private startupPromise: Promise<void> | undefined;

  private nextHandle: VoiceHandle = 1;
  private readonly voices = new Map<VoiceHandle, Voice>();
  private readonly pending = new Map<VoiceHandle, PendingRequest>();

  private readonly params: Record<string, number> = getDefaults();
  private readonly listeners = new Set<Listener>();

  // ---------------- status / subscription ----------------

  getStatus(): EngineStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(next: EngineStatus) {
    if (this.status === next) return;
    this.status = next;
    for (const l of this.listeners) l();
  }

  // ---------------- lifecycle ----------------

  /**
   * Ensure the AudioContext exists and is running. Safe to call from a
   * user gesture. Returns the shared startup promise so multiple
   * simultaneous presses share one resume() call.
   */
  private async ensureRunning(): Promise<void> {
    if (this.status === "ready") return;
    if (this.startupPromise) return this.startupPromise;

    this.setStatus("starting");
    this.startupPromise = (async () => {
      try {
        if (!this.graph) {
          this.graph = getAudioGraph();
          this.graph.ctx.addEventListener("statechange", () => this.reflectContextState());
        }
        if (this.graph.ctx.state !== "running") {
          await this.graph.ctx.resume();
        }
        this.reflectContextState();
      } catch (e) {
        console.error("[TX-8P] AudioContext startup failed", e);
        this.setStatus("error");
        throw e;
      } finally {
        this.startupPromise = undefined;
      }
    })();
    return this.startupPromise;
  }

  private reflectContextState() {
    if (!this.graph) return;
    const s = this.graph.ctx.state;
    if (s === "running") this.setStatus("ready");
    else if (s === "suspended") this.setStatus("suspended");
    else if (s === "closed") this.setStatus("error");
  }

  /** For diagnostics/tests. */
  getContext(): AudioContext | undefined {
    return this.graph?.ctx;
  }

  // ---------------- parameter writes ----------------

  setParam(id: string, value: number) {
    this.params[id] = value;
    if (id === "master.volume" && this.graph) {
      const t = this.graph.ctx.currentTime;
      this.graph.masterGain.gain.setTargetAtTime(value, t, 0.03);
    }
  }

  getParam(id: string): number {
    return this.params[id];
  }

  // ---------------- note lifecycle ----------------

  /**
   * Register a press. Returns a stable handle immediately so the caller
   * can release deterministically even if the context is still
   * resuming. The audible trigger happens as soon as the context is
   * running, unless the caller has already called `releaseNote()` on
   * this handle in the meantime.
   */
  pressNote(source: NoteSource, sourceKey: string, midi: number, velocity = 0.8): VoiceHandle {
    const handle = this.nextHandle++;

    if (this.status === "ready" && this.graph) {
      this.triggerVoice(handle, midi, velocity, source, sourceKey);
      return handle;
    }

    // Register pending BEFORE awaiting startup, so a synchronous
    // release can cancel it.
    this.pending.set(handle, {
      handle,
      midi,
      velocity,
      source,
      sourceKey,
      cancelled: false,
    });

    void this.ensureRunning()
      .then(() => {
        const req = this.pending.get(handle);
        if (!req) return;
        this.pending.delete(handle);
        if (req.cancelled) return;
        if (this.status !== "ready" || !this.graph) return;
        this.triggerVoice(handle, req.midi, req.velocity, req.source, req.sourceKey);
      })
      .catch(() => {
        // Startup error already surfaced via setStatus("error").
        this.pending.delete(handle);
      });

    return handle;
  }

  releaseNote(handle: VoiceHandle) {
    const req = this.pending.get(handle);
    if (req) {
      req.cancelled = true;
      this.pending.delete(handle);
      return;
    }
    const v = this.voices.get(handle);
    if (!v || v.releasing || v.dead) return;
    this.startRelease(v);
  }

  /**
   * Authoritative reset. Cancels every pending note, releases every
   * active voice with a short but audible fade to avoid clicks, then
   * clears all registries.
   */
  panic() {
    for (const req of this.pending.values()) req.cancelled = true;
    this.pending.clear();

    if (!this.graph) {
      this.voices.clear();
      return;
    }
    const t = this.graph.ctx.currentTime;
    for (const v of this.voices.values()) {
      if (v.dead) continue;
      try {
        v.amp.gain.cancelScheduledValues(t);
        v.amp.gain.setValueAtTime(v.amp.gain.value, t);
        v.amp.gain.linearRampToValueAtTime(0, t + 0.03);
        v.osc.stop(t + 0.04);
      } catch {
        /* already stopped */
      }
      if (v.cleanupTimer) clearTimeout(v.cleanupTimer);
      v.cleanupTimer = setTimeout(() => this.disposeVoice(v), 60);
      v.releasing = true;
    }
  }

  // ---------------- internals ----------------

  private triggerVoice(
    handle: VoiceHandle,
    midi: number,
    velocity: number,
    source: NoteSource,
    sourceKey: string,
  ) {
    if (!this.graph) return;
    const ctx = this.graph.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(midiToHz(midi), t);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);

    const attackMs = this.params["amp.attack"];
    const decayMs = this.params["amp.decay"];
    const sustain = this.params["amp.sustain"];
    const velAmt = this.params["amp.velocity"];
    const oscLevel = this.params["osc1.level"];

    const velScale = 1 - velAmt + velAmt * velocity;
    const peak = Math.max(0.0001, oscLevel * velScale * 0.35);
    const sustainLvl = Math.max(0.0001, peak * sustain);

    const attackEnd = t + attackMs / 1000;
    const decayEnd = attackEnd + decayMs / 1000;

    amp.gain.linearRampToValueAtTime(peak, attackEnd);
    amp.gain.setTargetAtTime(sustainLvl, attackEnd, decayMs / 1000 / 3 + 0.001);

    osc.connect(amp);
    amp.connect(this.graph.voiceBus);
    osc.start(t);

    const voice: Voice = {
      handle,
      midi,
      source,
      sourceKey,
      osc,
      amp,
      releasing: false,
      dead: false,
      cleanupTimer: null,
      startedAt: t,
    };
    this.voices.set(handle, voice);

    osc.onended = () => this.disposeVoice(voice);

    // Voice stealing: cap simultaneous voices at 8.
    if (this.voices.size > 8) {
      const oldest = Array.from(this.voices.values()).sort(
        (a, b) => Number(a.releasing) - Number(b.releasing) || a.startedAt - b.startedAt,
      )[0];
      if (oldest && oldest.handle !== handle) this.startRelease(oldest, 0.02);
    }
  }

  private startRelease(v: Voice, releaseSecOverride?: number) {
    if (v.releasing || v.dead || !this.graph) return;
    v.releasing = true;
    const ctx = this.graph.ctx;
    const t = ctx.currentTime;
    const releaseSec = releaseSecOverride ?? Math.max(0.005, this.params["amp.release"] / 1000);
    try {
      v.amp.gain.cancelScheduledValues(t);
      v.amp.gain.setValueAtTime(v.amp.gain.value, t);
      v.amp.gain.linearRampToValueAtTime(0, t + releaseSec);
      v.osc.stop(t + releaseSec + 0.01);
    } catch {
      /* already stopped */
    }
    v.cleanupTimer = setTimeout(() => this.disposeVoice(v), releaseSec * 1000 + 40);
  }

  private disposeVoice(v: Voice) {
    if (v.dead) return;
    v.dead = true;
    if (v.cleanupTimer) {
      clearTimeout(v.cleanupTimer);
      v.cleanupTimer = null;
    }
    try {
      v.osc.disconnect();
    } catch {
      /* noop */
    }
    try {
      v.amp.disconnect();
    } catch {
      /* noop */
    }
    this.voices.delete(v.handle);
  }

  // ---------------- diagnostics ----------------

  /** For tests: count of active (not-yet-disposed) voices. */
  getActiveVoiceCount(): number {
    return this.voices.size;
  }
  getPendingCount(): number {
    return this.pending.size;
  }
}

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// ---- Singleton access ----

let instance: SynthEngineImpl | undefined;

/**
 * Returns the process-wide SynthEngine. Client-only. Do not call
 * during SSR — invoke from an event handler, `useEffect`, or a
 * `useSyncExternalStore` client subscribe fn.
 */
export function getSynthEngine(): SynthEngineImpl {
  if (!instance) {
    instance = new SynthEngineImpl();
    // Expose for automated tests / diagnostics. Read-only surface.
    if (typeof window !== "undefined") {
      (window as unknown as { __tx8p?: unknown }).__tx8p = {
        engine: instance,
        get graph() {
          return instance!.getContext() ? { ctx: instance!.getContext() } : undefined;
        },
      };
    }
  }
  return instance;
}

/** Test-only: is the underlying graph constructed? */
export function engineHasGraph(): boolean {
  return hasAudioGraph();
}

export type SynthEngine = ReturnType<typeof getSynthEngine>;
