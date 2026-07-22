/**
 * TX-8P SynthEngine — authoritative, singleton, hybrid polyphonic engine.
 *
 * Ownership model (preserved from CP3, do not weaken)
 * ---------------------------------------------------
 * Every press returns a monotonically-increasing `VoiceHandle`. Releases
 * MUST cite that handle; the engine never resolves releases by note number
 * alone. A press requested while the context is suspended is registered as
 * a *pending* note tied to its handle; when the context resumes it triggers
 * only if the caller has not released it in the meantime.
 *
 * On top of that this engine adds: the full hybrid `Voice` DSP, Poly / Mono
 * (last/high/low priority, legato, glide) / Unison (2/3/5/7, detune, spread)
 * voice modes, two global LFOs (incl. S&H + random), a four-slot modulation
 * matrix, sustain + hold, pitch bend / mod wheel / aftertouch, and per-param
 * live application to held voices.
 */

import { getAudioGraph, hasAudioGraph, type AudioGraph } from "./context";
import { getDefaults, LFO_DIVS } from "./params/registry";
import { Voice, type MatrixSlot, type VoiceGlobals } from "./Voice";

/**
 * Authoritative audio-engine lifecycle.
 *  - locked      no context yet / needs a user gesture to start
 *  - starting    resume() in flight
 *  - ready       context exists, state === "running", graph connected, can play
 *  - suspended   browser suspended it (tab hidden, iOS interruption)
 *  - recovering  a resume attempt is in flight after a suspension
 *  - failed      startup/resume errored
 */
export type EngineStatus = "locked" | "starting" | "ready" | "suspended" | "recovering" | "failed";
export type NoteSource = "screen" | "keyboard" | "midi";
export type VoiceHandle = number;

export interface AudioDiagnostics {
  status: EngineStatus;
  lifecycleState: EngineStatus;
  contextState: string;
  rawContextState: string;
  running: boolean;
  destinationConnected: boolean;
  audioGraphGeneration: number;
  sampleRate: number;
  baseLatency: number | null;
  outputLatency: number | null;
  contextsCreated: number;
  startupAttempts: number;
  recoveryAttempts: number;
  lastRecoveryTrigger: string | null;
  stateBeforeResume: string | null;
  resumePromiseResolved: boolean;
  resumePromiseRejected: boolean;
  stateImmediatelyAfterResume: string | null;
  stateAfter50ms: string | null;
  stateAfter250ms: string | null;
  stateAfter1000ms: string | null;
  lastStateChange: string | null;
  unlockSourceStarted: string | null;
  unlockSourceEnded: string | null;
  queuedFirstNote: boolean;
  queuedFirstNoteDispatched: boolean;
  queuedFirstNoteCancelled: boolean;
  lastPointerEventSequence: string | null;
  lastNoteDurationMs: number | null;
  activeVoices: number;
  pendingNotes: number;
  masterGain: number;
  lastNoteOn: string | null;
  lastNoteOff: string | null;
  lastInterruption: string | null;
  lastRecoverySuccess: string | null;
  lastError: string | null;
  visibility: string;
}

interface NoteRecord {
  handle: VoiceHandle;
  midi: number;
  velocity: number;
  source: NoteSource;
  sourceKey: string;
  voices: Voice[];
  pedalHeld: boolean;
}

interface PendingRequest {
  handle: VoiceHandle;
  midi: number;
  velocity: number;
  source: NoteSource;
  sourceKey: string;
  cancelled: boolean;
}

type Listener = () => void;

interface Lfo {
  osc: OscillatorNode;
  oscSel: GainNode;
  sh: ConstantSourceNode;
  shSel: GainNode;
  out: GainNode;
  shTimer: ReturnType<typeof setInterval> | null;
  shape: number;
}

const UNISON_MAP = [2, 3, 5, 7];

class SynthEngineImpl {
  private graph: AudioGraph | undefined;
  private status: EngineStatus = "locked";
  private startupPromise: Promise<void> | undefined;
  private graphConnected = false;

  // --- diagnostics ---
  private contextsCreated = 0;
  private startupAttempts = 0;
  private recoveryAttempts = 0;
  private audioGraphGeneration = 0;
  private lastNoteOn: string | null = null;
  private lastNoteOff: string | null = null;
  private lastInterruption: string | null = null;
  private lastRecoverySuccess: string | null = null;
  private lastError: string | null = null;
  private lastRecoveryTrigger: string | null = null;
  private lastStateChange: string | null = null;
  private stateBeforeResume: string | null = null;
  private resumePromiseResolved = false;
  private resumePromiseRejected = false;
  private stateImmediatelyAfterResume: string | null = null;
  private stateAfter50ms: string | null = null;
  private stateAfter250ms: string | null = null;
  private stateAfter1000ms: string | null = null;
  private unlockSourceStarted: string | null = null;
  private unlockSourceEnded: string | null = null;
  private queuedFirstNote = false;
  private queuedFirstNoteDispatched = false;
  private queuedFirstNoteCancelled = false;
  private lastPointerEventSequence: string | null = null;
  private lastNoteDurationMs: number | null = null;
  private recoveryInstalled = false;
  private readonly pressTimes = new Map<VoiceHandle, number>();

  private nextHandle: VoiceHandle = 1;
  private readonly notes = new Map<VoiceHandle, NoteRecord>();
  private readonly pending = new Map<VoiceHandle, PendingRequest>();
  /** Mono priority stack (most-recent last). */
  private monoStack: NoteRecord[] = [];
  private monoVoices: Voice[] = [];
  private lastMonoHz: number | undefined;

  private readonly params: Record<string, number> = getDefaults();
  private readonly listeners = new Set<Listener>();

  private lfos: Lfo[] = [];
  private sustainOn = false;
  private holdOn = false;
  private readonly paramListeners = new Set<(id: string) => void>();

  /** Subscribe to parameter changes (id of the changed param, or "*" for bulk). */
  onParamChange(cb: (id: string) => void): () => void {
    this.paramListeners.add(cb);
    return () => this.paramListeners.delete(cb);
  }
  private notifyParam(id: string) {
    for (const l of this.paramListeners) l(id);
  }

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

  /** True only when the context genuinely exists and is running. */
  private isRunning(): boolean {
    return !!this.graph && this.graph.ctx.state === "running";
  }

  /**
   * Build the AudioGraph if needed. Synchronous and idempotent — safe to
   * call inside a user-gesture handler. Does NOT resume (that is async).
   */
  private ensureGraph(): AudioGraph {
    if (!this.graph) {
      this.graph = getAudioGraph();
      this.contextsCreated++;
      this.audioGraphGeneration++;
      this.graphConnected = true;
      this.installStateListener();
      this.initLfos();
      this.applyAllGlobalParams();
    }
    return this.graph;
  }

  private installStateListener() {
    if (!this.graph) return;
    const ctx = this.graph.ctx as AudioContext & { onstatechange?: unknown };
    this.graph.ctx.addEventListener("statechange", () => this.reflectContextState());
    // iOS Safari raises "interrupted"/"running" via statechange too.
    ctx.onstatechange = () => this.reflectContextState();
  }

  /**
   * Create + connect + START a one-sample silent buffer, synchronously. On
   * iOS Safari, resume() alone frequently leaves the hardware output muted
   * (and a context stuck "interrupted") until a source is *started within the
   * user gesture* — this is the unlock. Must run before any deferred work.
   */
  private silentUnlock() {
    if (!this.graph) return;
    try {
      const ctx = this.graph.ctx;
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => {
        this.unlockSourceEnded = iso();
      };
      this.unlockSourceStarted = iso();
      src.start(0);
      src.stop(ctx.currentTime + 0.02);
    } catch {
      /* non-fatal */
    }
  }

  /**
   * SYNCHRONOUS recovery — MUST be invoked from a direct user gesture
   * (keyboard pointerdown, status tap). Inside this call, with nothing
   * deferred before it, we create+connect+START the silent unlock source and
   * then call resume(). Only diagnostics/dispatch happen later. Idempotent:
   * never creates a second AudioContext or engine.
   */
  recoverFromGesture(trigger = "gesture"): void {
    this.lastRecoveryTrigger = trigger;
    if (this.isRunning()) {
      this.markReady();
      return;
    }
    const graph = this.ensureGraph(); // synchronous graph build
    // --- unlock source FIRST, synchronously, before anything deferred ---
    this.silentUnlock();
    this.stateBeforeResume = graph.ctx.state;
    this.recoveryAttempts++;
    this.startupAttempts++;
    this.setStatus(this.recoveryAttempts > 1 ? "recovering" : "starting");
    if (this.startupPromise) return; // a resume is already in flight — share it

    this.resumePromiseResolved = false;
    this.resumePromiseRejected = false;
    const p = graph.ctx.state === "running" ? Promise.resolve() : graph.ctx.resume();
    this.startupPromise = p
      .then(() => {
        this.resumePromiseResolved = true;
        this.stateImmediatelyAfterResume = graph.ctx.state;
        // Second unlock settles the iOS output path after resume resolves.
        this.silentUnlock();
        if (this.isRunning()) {
          this.markReady(); // → dispatch the preserved note, mark recovery success
        } else {
          // resume() resolved but the context is still not running (iOS keeps
          // it "interrupted"): stay on RECONNECT and wait for the NEXT direct
          // gesture. Do NOT start an automatic background resume loop.
          this.setStatus("recovering");
        }
        this.sampleResumeStates(graph.ctx);
      })
      .catch((e) => {
        this.resumePromiseRejected = true;
        this.lastError = `resume: ${errMsg(e)}`;
        this.reflectContextState();
      })
      .finally(() => {
        this.startupPromise = undefined;
      });
  }

  /**
   * Diagnostic-only state sampling after a resume. Never calls resume(), so
   * this is not a retry loop; it only READS ctx.state and, as a safety net,
   * dispatches a still-held preserved note if iOS flips to running late
   * without firing statechange.
   */
  private sampleResumeStates(ctx: AudioContext) {
    setTimeout(() => {
      this.stateAfter50ms = ctx.state;
    }, 50);
    setTimeout(() => {
      this.stateAfter250ms = ctx.state;
      if (this.isRunning()) this.markReady();
    }, 250);
    setTimeout(() => {
      this.stateAfter1000ms = ctx.state;
      if (this.isRunning()) this.markReady();
    }, 1000);
  }

  private ensureRunning(): Promise<void> {
    this.recoverFromGesture(this.lastRecoveryTrigger ?? "auto");
    return this.startupPromise ?? Promise.resolve();
  }

  /** Public unlock for a gesture anywhere (status pill / settings). */
  unlock(): Promise<void> {
    return this.ensureRunning();
  }

  private markReady() {
    if (this.isRunning() && this.graphConnected) {
      const was = this.status;
      this.setStatus("ready");
      if (was !== "ready") this.lastRecoverySuccess = iso();
      this.flushPending();
    }
  }

  /** Dispatch every still-held preserved note the instant the context runs. */
  private flushPending() {
    if (!this.isRunning()) return;
    for (const req of Array.from(this.pending.values())) {
      this.pending.delete(req.handle);
      if (req.cancelled) continue;
      this.queuedFirstNoteDispatched = true;
      this.triggerNote({
        handle: req.handle,
        midi: req.midi,
        velocity: req.velocity,
        source: req.source,
        sourceKey: req.sourceKey,
        voices: [],
        pedalHeld: false,
      });
    }
  }

  private reflectContextState() {
    if (!this.graph) return;
    this.lastStateChange = iso();
    const s = this.graph.ctx.state as string;
    if (s === "running") {
      this.markReady(); // dispatches the preserved note on the running transition
    } else if (s === "closed") {
      this.setStatus("failed");
    } else if (s === "interrupted") {
      this.lastInterruption = iso();
      this.setStatus(this.startupPromise ? "recovering" : "suspended");
    } else {
      // "suspended"
      this.setStatus(this.startupPromise ? "recovering" : "suspended");
    }
  }

  /**
   * Visibility/pageshow/focus restore: READ-ONLY re-check (no resume() outside
   * a gesture — iOS would reject it). If already running, promote to READY;
   * otherwise surface RECONNECT and wait for the next direct user gesture.
   */
  attemptRecovery(trigger = "visibility") {
    if (!this.graph) return;
    this.lastRecoveryTrigger = trigger;
    this.reflectContextState();
  }

  /** Report the pointer/touch event sequence for a note (diagnostics). */
  reportPointerSequence(seq: string) {
    this.lastPointerEventSequence = seq;
  }

  /**
   * Document-level recovery as a SECONDARY safety net. The on-screen keyboard
   * calls recoverFromGesture directly in its own handler (primary path); this
   * covers taps outside the keyboard and non-key gestures.
   */
  installRecovery() {
    if (this.recoveryInstalled || typeof window === "undefined") return;
    this.recoveryInstalled = true;
    const gesture = (label: string) => () => {
      if (!this.isRunning()) this.recoverFromGesture(label);
    };
    window.addEventListener("pointerdown", gesture("doc-pointer"), {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchend", gesture("doc-touch"), { capture: true, passive: true });
    window.addEventListener("keydown", gesture("doc-key"), { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.attemptRecovery("visibilitychange");
      else if (this.graph && !this.isRunning()) this.reflectContextState();
    });
    window.addEventListener("pageshow", () => this.attemptRecovery("pageshow"));
    window.addEventListener("focus", () => this.attemptRecovery("focus"));
  }

  getContext(): AudioContext | undefined {
    return this.graph?.ctx;
  }
  getAnalyser(): AnalyserNode | undefined {
    return this.graph?.analyser;
  }
  getMeterAnalysers(): { L: AnalyserNode; R: AnalyserNode } | undefined {
    return this.graph ? { L: this.graph.meterL, R: this.graph.meterR } : undefined;
  }

  getDiagnostics(): AudioDiagnostics {
    const ctx = this.graph?.ctx;
    const rawState = ctx?.state ?? "none";
    return {
      status: this.status,
      lifecycleState: this.status,
      contextState: rawState,
      rawContextState: rawState,
      running: this.isRunning(),
      destinationConnected: this.graphConnected,
      audioGraphGeneration: this.audioGraphGeneration,
      sampleRate: ctx?.sampleRate ?? 0,
      baseLatency: ctx?.baseLatency ?? null,
      outputLatency: (ctx as AudioContext & { outputLatency?: number })?.outputLatency ?? null,
      contextsCreated: this.contextsCreated,
      startupAttempts: this.startupAttempts,
      recoveryAttempts: this.recoveryAttempts,
      lastRecoveryTrigger: this.lastRecoveryTrigger,
      stateBeforeResume: this.stateBeforeResume,
      resumePromiseResolved: this.resumePromiseResolved,
      resumePromiseRejected: this.resumePromiseRejected,
      stateImmediatelyAfterResume: this.stateImmediatelyAfterResume,
      stateAfter50ms: this.stateAfter50ms,
      stateAfter250ms: this.stateAfter250ms,
      stateAfter1000ms: this.stateAfter1000ms,
      lastStateChange: this.lastStateChange,
      unlockSourceStarted: this.unlockSourceStarted,
      unlockSourceEnded: this.unlockSourceEnded,
      queuedFirstNote: this.queuedFirstNote,
      queuedFirstNoteDispatched: this.queuedFirstNoteDispatched,
      queuedFirstNoteCancelled: this.queuedFirstNoteCancelled,
      lastPointerEventSequence: this.lastPointerEventSequence,
      lastNoteDurationMs: this.lastNoteDurationMs,
      activeVoices: this.getActiveVoiceCount(),
      pendingNotes: this.pending.size,
      masterGain: this.graph?.masterGain.gain.value ?? 0,
      lastNoteOn: this.lastNoteOn,
      lastNoteOff: this.lastNoteOff,
      lastInterruption: this.lastInterruption,
      lastRecoverySuccess: this.lastRecoverySuccess,
      lastError: this.lastError,
      visibility: typeof document !== "undefined" ? document.visibilityState : "unknown",
    };
  }

  // ---------------- LFOs ----------------
  private initLfos() {
    if (!this.graph) return;
    const { ctx } = this.graph;
    this.lfos = [0, 1].map((i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = this.params[`lfo${i + 1}.rate`] ?? 2;
      const oscSel = ctx.createGain();
      oscSel.gain.value = 1;
      const sh = ctx.createConstantSource();
      sh.offset.value = 0;
      const shSel = ctx.createGain();
      shSel.gain.value = 0;
      const out = ctx.createGain();
      out.gain.value = this.params[`lfo${i + 1}.depth`] ?? 0.5;
      osc.connect(oscSel).connect(out);
      sh.connect(shSel).connect(out);
      osc.start();
      sh.start();
      const lfo: Lfo = { osc, oscSel, sh, shSel, out, shTimer: null, shape: 0 };
      this.configureLfoShape(i, lfo);
      return lfo;
    });
  }

  private configureLfoShape(i: number, lfo?: Lfo) {
    const l = lfo ?? this.lfos[i];
    if (!l || !this.graph) return;
    const shape = Math.round(this.params[`lfo${i + 1}.shape`] ?? 0);
    l.shape = shape;
    const t = this.graph.ctx.currentTime;
    const types: OscillatorType[] = ["sine", "triangle", "sawtooth", "sawtooth", "square"];
    const stepped = shape === 5 || shape === 6;
    if (l.shTimer) {
      clearInterval(l.shTimer);
      l.shTimer = null;
    }
    if (stepped) {
      l.oscSel.gain.setTargetAtTime(0, t, 0.01);
      l.shSel.gain.setTargetAtTime(1, t, 0.01);
      const smooth = shape === 6;
      const tick = () => {
        if (!this.graph) return;
        const v = Math.random() * 2 - 1;
        const now = this.graph.ctx.currentTime;
        if (smooth) l.sh.offset.setTargetAtTime(v, now, 0.05);
        else l.sh.offset.setValueAtTime(v, now);
      };
      const rate = Math.max(0.02, this.lfoRateHz(i));
      l.shTimer = setInterval(tick, Math.max(20, 1000 / rate));
      tick();
    } else {
      l.oscSel.gain.setTargetAtTime(shape === 3 ? -1 : 1, t, 0.01); // saw-down inverts
      l.shSel.gain.setTargetAtTime(0, t, 0.01);
      l.osc.type = types[shape] ?? "sine";
    }
  }

  private lfoRateHz(i: number): number {
    const sync = (this.params[`lfo${i + 1}.sync`] ?? 0) >= 0.5;
    if (!sync) return this.params[`lfo${i + 1}.rate`] ?? 2;
    const tempo = this.params["master.tempo"] ?? 120;
    const div = Math.round(this.params[`lfo${i + 1}.div`] ?? 2);
    return divToHz(tempo, div);
  }

  private updateLfoRate(i: number) {
    const l = this.lfos[i];
    if (!l || !this.graph) return;
    const hz = this.lfoRateHz(i);
    l.osc.frequency.setTargetAtTime(hz, this.graph.ctx.currentTime, 0.02);
    if (l.shTimer) this.configureLfoShape(i); // reschedule stepped timer at new rate
  }

  // ---------------- parameters ----------------
  setParam(id: string, value: number) {
    this.params[id] = value;
    this.notifyParam(id);
    if (!this.graph) return;
    const section = id.split(".")[0];

    if (id === "master.volume") {
      this.graph.masterGain.gain.setTargetAtTime(value, this.graph.ctx.currentTime, 0.03);
      return;
    }
    if (id === "master.tempo") {
      this.updateLfoRate(0);
      this.updateLfoRate(1);
      return;
    }
    if (section === "lfo1" || section === "lfo2") {
      const i = section === "lfo1" ? 0 : 1;
      const key = id.split(".")[1];
      if (key === "shape") this.configureLfoShape(i);
      else if (key === "rate" || key === "sync" || key === "div") this.updateLfoRate(i);
      else if (key === "depth")
        this.lfos[i]?.out.gain.setTargetAtTime(value, this.graph.ctx.currentTime, 0.02);
      return;
    }
    if (this.isFxSection(section)) {
      for (const e of this.graph.effects) if (e.section === section) e.fx.setParam(id, value);
      return;
    }
    if (section === "matrix" || section === "voice") return; // read at note-on
    // per-voice live params
    for (const v of this.allVoices()) v.applyParam(id);
  }

  getParam(id: string): number {
    return this.params[id];
  }

  private isFxSection(s: string): boolean {
    return (
      s === "drive" ||
      s === "eq" ||
      s === "chorus" ||
      s === "delay" ||
      s === "reverb" ||
      s === "limiter"
    );
  }

  private applyAllGlobalParams() {
    for (const id of Object.keys(this.params)) {
      const s = id.split(".")[0];
      if (this.isFxSection(s) || s === "lfo1" || s === "lfo2" || s === "master")
        this.setParam(id, this.params[id]);
    }
  }

  /** Bulk-load a parameter set (e.g. a preset). */
  loadParams(values: Record<string, number>) {
    this.panic(); // stop sound so we don't retune held notes into a new preset
    for (const [id, v] of Object.entries(values)) if (id in this.params) this.params[id] = v;
    if (this.graph) {
      this.applyAllGlobalParams();
      this.lfos.forEach((_, i) => {
        this.configureLfoShape(i);
        this.updateLfoRate(i);
      });
    }
    this.notifyParam("*");
  }

  snapshotParams(ids: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const id of ids) if (id in this.params) out[id] = this.params[id];
    return out;
  }

  // ---------------- note lifecycle ----------------
  pressNote(source: NoteSource, sourceKey: string, midi: number, velocity = 0.8): VoiceHandle {
    const handle = this.nextHandle++;
    this.pressTimes.set(handle, nowMs());
    this.lastNoteOn = `${midi} (${source}) @ ${iso()}`;

    // Trust the ACTUAL context state, never a cached "ready". This is what
    // fixes the "READY but silent" case after an iOS interruption.
    if (this.isRunning()) {
      this.markReady();
      this.triggerNote({ handle, midi, velocity, source, sourceKey, voices: [], pedalHeld: false });
      return handle;
    }

    // Not running yet — PRESERVE the note. Recovery is kicked here too (belt &
    // suspenders; the keyboard also calls recoverFromGesture first). The note
    // is dispatched by flushPending() the instant the context transitions to
    // running — NOT when resume() resolves (iOS can resolve still-interrupted).
    this.queuedFirstNote = true;
    this.queuedFirstNoteDispatched = false;
    this.queuedFirstNoteCancelled = false;
    this.pending.set(handle, { handle, midi, velocity, source, sourceKey, cancelled: false });
    if (source === "screen") this.recoverFromGesture("note");
    else void this.ensureRunning();
    return handle;
  }

  releaseNote(handle: VoiceHandle) {
    const start = this.pressTimes.get(handle);
    if (start != null) {
      this.lastNoteDurationMs = Math.round(nowMs() - start);
      this.pressTimes.delete(handle);
    }
    this.lastNoteOff = `handle ${handle} @ ${iso()}`;
    const req = this.pending.get(handle);
    if (req) {
      // Released before recovery completed: cancel cleanly — no late/stuck note.
      req.cancelled = true;
      this.pending.delete(handle);
      this.queuedFirstNoteCancelled = true;
      return;
    }
    const rec = this.notes.get(handle);
    if (!rec) return;
    if (this.sustainOn || this.holdOn) {
      rec.pedalHeld = true;
      return;
    }
    this.finishRelease(rec);
  }

  private finishRelease(rec: NoteRecord) {
    if (this.voiceMode() === "MONO") this.monoRelease(rec);
    else for (const v of rec.voices) v.release();
    this.notes.delete(rec.handle);
  }

  // ---------------- triggering ----------------
  private voiceMode(): "POLY" | "MONO" | "UNISON" {
    return (
      (["POLY", "MONO", "UNISON"] as const)[Math.round(this.params["voice.mode"] ?? 0)] ?? "POLY"
    );
  }

  private buildMatrix(): MatrixSlot[] {
    const slots: MatrixSlot[] = [];
    for (const s of [1, 2, 3, 4]) {
      slots.push({
        src: Math.round(this.params[`matrix.s${s}.src`] ?? 0),
        dst: Math.round(this.params[`matrix.s${s}.dst`] ?? 0),
        amt: this.params[`matrix.s${s}.amt`] ?? 0,
        on: (this.params[`matrix.s${s}.on`] ?? 0) >= 0.5,
      });
    }
    return slots;
  }

  private globals(): VoiceGlobals {
    const g = this.graph!;
    return {
      ctx: g.ctx,
      dest: g.voiceBus,
      bank: g.bank,
      lfo1: this.lfos[0].out,
      lfo2: this.lfos[1].out,
      modWheel: g.modWheel,
      aftertouch: g.aftertouch,
      pitchBend: g.pitchBend,
    };
  }

  private newVoice(midi: number, velocity: number, glideFromHz?: number): Voice {
    const v = new Voice(this.globals(), this.params, midi, velocity);
    v.start(this.buildMatrix(), glideFromHz, this.params["voice.glide"] ?? 0);
    return v;
  }

  private triggerNote(rec: NoteRecord) {
    if (!this.graph) return;
    const mode = this.voiceMode();
    if (mode === "MONO") {
      this.monoTrigger(rec);
      return;
    }
    if (mode === "UNISON") {
      const count = UNISON_MAP[Math.round(this.params["voice.uniCount"] ?? 1)] ?? 3;
      const detune = this.params["voice.uniDetune"] ?? 0.3;
      const spread = this.params["voice.uniSpread"] ?? 0.5;
      for (let i = 0; i < count; i++) {
        const v = new Voice(this.globals(), this.params, rec.midi, rec.velocity);
        const off = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
        v.setUnison(off * detune * 25, off * spread, 1 / Math.sqrt(count));
        v.start(this.buildMatrix());
        rec.voices.push(v);
      }
    } else {
      rec.voices.push(this.newVoice(rec.midi, rec.velocity));
    }
    this.notes.set(rec.handle, rec);
    this.enforcePolyphony();
  }

  /** POLY/UNISON: cap total simultaneous notes at 8 with deterministic steal. */
  private enforcePolyphony() {
    const MAX = 8;
    const activeRecords = () =>
      Array.from(this.notes.values()).filter((r) => r.voices.some((v) => !v.dead && !v.releasing));
    let recs = activeRecords();
    while (recs.length > MAX) {
      const victim = recs[0]; // oldest by handle insertion order
      for (const v of victim.voices) v.release(0.03);
      this.notes.delete(victim.handle);
      recs = activeRecords();
    }
  }

  private allVoices(): Voice[] {
    const out: Voice[] = [];
    for (const r of this.notes.values()) for (const v of r.voices) out.push(v);
    for (const v of this.monoVoices) out.push(v);
    return out;
  }

  // ---------------- MONO ----------------
  private monoPriorityNote(): NoteRecord | undefined {
    if (this.monoStack.length === 0) return undefined;
    const prio = (["Last", "High", "Low"] as const)[Math.round(this.params["voice.priority"] ?? 0)];
    if (prio === "Last") return this.monoStack[this.monoStack.length - 1];
    let best = this.monoStack[0];
    for (const r of this.monoStack) {
      if (prio === "High" && r.midi > best.midi) best = r;
      if (prio === "Low" && r.midi < best.midi) best = r;
    }
    return best;
  }

  private monoTrigger(rec: NoteRecord) {
    this.notes.set(rec.handle, rec);
    this.monoStack.push(rec);
    const legato = (this.params["voice.legato"] ?? 0) >= 0.5;
    const sounding = this.monoPriorityNote();
    if (!sounding) return;
    if (legato && this.monoVoices.length > 0 && this.monoStack.length > 1) {
      for (const v of this.monoVoices) v.retune(sounding.midi, this.params["voice.glide"] ?? 0);
    } else {
      this.killMonoVoices(0.02);
      this.monoVoices = [this.newVoice(sounding.midi, sounding.velocity, this.lastMonoHz)];
    }
    this.lastMonoHz = 440 * Math.pow(2, (sounding.midi - 69) / 12);
  }

  private monoRelease(rec: NoteRecord) {
    this.monoStack = this.monoStack.filter((r) => r.handle !== rec.handle);
    const next = this.monoPriorityNote();
    if (!next) {
      this.killMonoVoices();
      return;
    }
    const legato = (this.params["voice.legato"] ?? 0) >= 0.5;
    if (legato && this.monoVoices.length > 0) {
      for (const v of this.monoVoices) v.retune(next.midi, this.params["voice.glide"] ?? 0);
    } else {
      this.killMonoVoices(0.02);
      this.monoVoices = [this.newVoice(next.midi, next.velocity, this.lastMonoHz)];
    }
    this.lastMonoHz = 440 * Math.pow(2, (next.midi - 69) / 12);
  }

  private killMonoVoices(rel?: number) {
    for (const v of this.monoVoices) v.release(rel);
    this.monoVoices = [];
  }

  // ---------------- performance controls ----------------
  setPitchBend(norm: number) {
    if (!this.graph) return;
    const cents = Math.max(-1, Math.min(1, norm)) * (this.params["voice.bendRange"] ?? 2) * 100;
    this.graph.pitchBend.offset.setTargetAtTime(cents, this.graph.ctx.currentTime, 0.008);
  }
  setModWheel(norm: number) {
    if (!this.graph) return;
    this.graph.modWheel.offset.setTargetAtTime(clamp01(norm), this.graph.ctx.currentTime, 0.01);
  }
  setAftertouch(norm: number) {
    if (!this.graph) return;
    this.graph.aftertouch.offset.setTargetAtTime(clamp01(norm), this.graph.ctx.currentTime, 0.02);
  }
  setSustain(on: boolean) {
    this.sustainOn = on;
    if (!on) this.flushPedal();
  }
  setHold(on: boolean) {
    this.holdOn = on;
    if (!on) this.flushPedal();
  }
  private flushPedal() {
    if (this.sustainOn || this.holdOn) return;
    for (const rec of Array.from(this.notes.values())) if (rec.pedalHeld) this.finishRelease(rec);
  }

  // ---------------- panic ----------------
  panic() {
    for (const req of this.pending.values()) req.cancelled = true;
    this.pending.clear();
    for (const rec of this.notes.values()) for (const v of rec.voices) v.panic();
    for (const v of this.monoVoices) v.panic();
    this.notes.clear();
    this.monoStack = [];
    this.monoVoices = [];
    this.sustainOn = false;
    this.holdOn = false;
    if (this.graph)
      this.graph.pitchBend.offset.setTargetAtTime(0, this.graph.ctx.currentTime, 0.01);
  }

  // ---------------- diagnostics ----------------
  getActiveVoiceCount(): number {
    let n = 0;
    for (const r of this.notes.values()) n += r.voices.filter((v) => !v.dead).length;
    return n + this.monoVoices.filter((v) => !v.dead).length;
  }
  getPendingCount(): number {
    return this.pending.size;
  }
  getSampleRate(): number {
    return this.graph?.ctx.sampleRate ?? 0;
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const iso = () => new Date().toISOString();
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function divToHz(tempo: number, divIdx: number): number {
  const beat = 60 / tempo;
  const label = LFO_DIVS[divIdx] ?? "1/4";
  const map: Record<string, number> = {
    "1/1": beat * 4,
    "1/2": beat * 2,
    "1/4": beat,
    "1/4.": beat * 1.5,
    "1/8": beat / 2,
    "1/8T": beat / 3,
    "1/16": beat / 4,
    "1/32": beat / 8,
  };
  return 1 / (map[label] ?? beat);
}

// ---- Singleton ----
let instance: SynthEngineImpl | undefined;

export function getSynthEngine(): SynthEngineImpl {
  if (!instance) {
    instance = new SynthEngineImpl();
    if (typeof window !== "undefined") {
      (window as unknown as { __tx8p?: unknown }).__tx8p = {
        engine: instance,
        getGraph: () => (hasAudioGraph() ? getAudioGraph() : undefined),
      };
      // Install document-level gesture + visibility recovery so the very
      // first touch anywhere unlocks audio, and returning from an
      // interruption re-arms it — never requiring a refresh, preset change,
      // or Panic.
      instance.installRecovery();
    }
  }
  return instance;
}

export function engineHasGraph(): boolean {
  return hasAudioGraph();
}

export type SynthEngine = ReturnType<typeof getSynthEngine>;
