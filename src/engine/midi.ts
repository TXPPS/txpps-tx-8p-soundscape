/**
 * Web MIDI + MIDI Learn for the TX-8P.
 *
 * Client-only singleton. Parses Note On/Off (vel-0 = off), 14-bit pitch
 * bend, CC1 (mod wheel), CC64 (sustain), CC120/123 (all sound/notes off),
 * channel aftertouch, and learnable CCs bound to registry parameters.
 * Mappings persist to localStorage with channel / range / invert / takeover
 * (Pickup default) and import/export. The synth never fails when Web MIDI is
 * unavailable — every method degrades gracefully.
 */

import { getSynthEngine, type VoiceHandle } from "./SynthEngine";
import { denormalize, normalize, tryParam } from "./params/registry";

export type Takeover = "pickup" | "jump" | "scale";

export interface CCMapping {
  cc: number;
  param: string;
  channel: number; // 0 = omni
  min: number; // 0..1
  max: number; // 0..1
  invert: boolean;
  takeover: Takeover;
}

export interface MidiInputInfo {
  id: string;
  name: string;
}

export interface MidiState {
  supported: boolean;
  requested: boolean;
  permission: "unknown" | "granted" | "denied";
  inputs: MidiInputInfo[];
  activeInputId: string | "all" | null;
  channel: number; // 0 = omni, 1..16
  learning: string | null; // param id being learned
  lastActivityAt: number;
  maps: CCMapping[];
}

const STORAGE_KEY = "tx8p.midi.maps.v1";

const DEFAULT_MAPS: CCMapping[] = [
  { cc: 7, param: "master.volume", channel: 0, min: 0, max: 1, invert: false, takeover: "pickup" },
  {
    cc: 71,
    param: "filter.resonance",
    channel: 0,
    min: 0,
    max: 1,
    invert: false,
    takeover: "pickup",
  },
  { cc: 72, param: "amp.release", channel: 0, min: 0, max: 1, invert: false, takeover: "pickup" },
  { cc: 73, param: "amp.attack", channel: 0, min: 0, max: 1, invert: false, takeover: "pickup" },
  { cc: 74, param: "filter.cutoff", channel: 0, min: 0, max: 1, invert: false, takeover: "pickup" },
];

type Listener = () => void;

class MidiManager {
  private state: MidiState = {
    supported: typeof navigator !== "undefined" && "requestMIDIAccess" in navigator,
    requested: false,
    permission: "unknown",
    inputs: [],
    activeInputId: "all",
    channel: 0,
    learning: null,
    lastActivityAt: 0,
    maps: [],
  };
  private access: MIDIAccess | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly midiHandles = new Map<number, VoiceHandle>();
  /** Per-cc pickup latch: has this CC "caught" its param yet? */
  private readonly caught = new Map<string, boolean>();

  constructor() {
    this.state.maps = this.loadMaps();
  }

  getState(): MidiState {
    return this.state;
  }
  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private emit() {
    this.state = { ...this.state };
    for (const l of this.listeners) l();
  }

  // -------- persistence --------
  private loadMaps(): CCMapping[] {
    if (typeof localStorage === "undefined") return [...DEFAULT_MAPS];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [...DEFAULT_MAPS];
      const parsed = JSON.parse(raw) as CCMapping[];
      return Array.isArray(parsed) ? parsed : [...DEFAULT_MAPS];
    } catch {
      return [...DEFAULT_MAPS];
    }
  }
  private saveMaps() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.maps));
    } catch {
      /* ignore quota */
    }
  }

  // -------- access --------
  async requestAccess(): Promise<void> {
    this.state.requested = true;
    if (!this.state.supported || typeof navigator === "undefined") {
      this.emit();
      return;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.state.permission = "granted";
      this.access.onstatechange = () => this.refreshInputs();
      this.refreshInputs();
    } catch {
      this.state.permission = "denied";
      this.emit();
    }
  }

  private refreshInputs() {
    if (!this.access) return;
    const inputs: MidiInputInfo[] = [];
    this.access.inputs.forEach((inp) => {
      inputs.push({ id: inp.id, name: inp.name ?? "MIDI Input" });
      inp.onmidimessage = (e) => this.onMessage(inp.id, e as MIDIMessageEvent);
    });
    this.state.inputs = inputs;
    if (
      this.state.activeInputId !== "all" &&
      !inputs.some((i) => i.id === this.state.activeInputId)
    ) {
      this.state.activeInputId = "all";
    }
    this.emit();
  }

  setActiveInput(id: string | "all") {
    this.state.activeInputId = id;
    this.emit();
  }
  setChannel(ch: number) {
    this.state.channel = Math.max(0, Math.min(16, ch));
    this.emit();
  }

  // -------- learn --------
  startLearn(param: string) {
    this.state.learning = param;
    this.emit();
  }
  cancelLearn() {
    this.state.learning = null;
    this.emit();
  }
  removeMap(cc: number, channel: number) {
    this.state.maps = this.state.maps.filter((m) => !(m.cc === cc && m.channel === channel));
    this.saveMaps();
    this.emit();
  }
  removeMapForParam(param: string) {
    this.state.maps = this.state.maps.filter((m) => m.param !== param);
    this.saveMaps();
    this.emit();
  }
  clearMaps() {
    this.state.maps = [];
    this.saveMaps();
    this.emit();
  }
  updateMap(cc: number, channel: number, patch: Partial<CCMapping>) {
    this.state.maps = this.state.maps.map((m) =>
      m.cc === cc && m.channel === channel ? { ...m, ...patch } : m,
    );
    this.saveMaps();
    this.emit();
  }
  exportMaps(): string {
    return JSON.stringify(this.state.maps, null, 2);
  }
  importMaps(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as CCMapping[];
      if (!Array.isArray(parsed)) return false;
      this.state.maps = parsed.filter((m) => tryParam(m.param));
      this.saveMaps();
      this.emit();
      return true;
    } catch {
      return false;
    }
  }
  resetDefaults() {
    this.state.maps = [...DEFAULT_MAPS];
    this.saveMaps();
    this.emit();
  }

  // -------- message parsing --------
  private onMessage(inputId: string, e: MIDIMessageEvent) {
    if (this.state.activeInputId !== "all" && this.state.activeInputId !== inputId) return;
    const data = e.data;
    if (!data || data.length < 1) return;
    const status = data[0] & 0xf0;
    const channel = (data[0] & 0x0f) + 1;
    if (this.state.channel !== 0 && this.state.channel !== channel) {
      // still allow realtime/system; but for channel messages, ignore other channels
      if (status !== 0xf0) return;
    }
    this.state.lastActivityAt = Date.now();
    const eng = getSynthEngine();

    switch (status) {
      case 0x90: {
        const note = data[1];
        const vel = data[2];
        if (vel === 0) {
          this.noteOff(channel, note);
        } else {
          this.noteOn(channel, note, vel / 127);
        }
        break;
      }
      case 0x80:
        this.noteOff(channel, data[1]);
        break;
      case 0xe0: {
        const value = ((data[2] << 7) | data[1]) - 8192;
        eng.setPitchBend(value / 8192);
        break;
      }
      case 0xd0:
        eng.setAftertouch(data[1] / 127);
        break;
      case 0xb0:
        this.onControlChange(channel, data[1], data[2]);
        break;
    }
    // throttle activity re-render
    this.emitActivity();
  }

  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private emitActivity() {
    if (this.activityTimer) return;
    this.activityTimer = setTimeout(() => {
      this.activityTimer = null;
      this.emit();
    }, 120);
  }

  private noteOn(channel: number, note: number, vel: number) {
    const key = (channel << 8) | note;
    const existing = this.midiHandles.get(key);
    if (existing !== undefined) getSynthEngine().releaseNote(existing);
    const handle = getSynthEngine().pressNote("midi", `m${channel}:${note}`, note, vel);
    this.midiHandles.set(key, handle);
  }
  private noteOff(channel: number, note: number) {
    const key = (channel << 8) | note;
    const handle = this.midiHandles.get(key);
    if (handle !== undefined) {
      this.midiHandles.delete(key);
      getSynthEngine().releaseNote(handle);
    }
  }

  private onControlChange(channel: number, cc: number, raw: number) {
    const v = raw / 127;
    const eng = getSynthEngine();

    // MIDI Learn capture
    if (this.state.learning) {
      const param = this.state.learning;
      this.state.learning = null;
      const existingIdx = this.state.maps.findIndex((m) => m.param === param);
      const mapping: CCMapping = {
        cc,
        param,
        channel: this.state.channel,
        min: 0,
        max: 1,
        invert: false,
        takeover: "pickup",
      };
      if (existingIdx >= 0) this.state.maps[existingIdx] = mapping;
      else this.state.maps.push(mapping);
      this.caught.delete(`${channel}:${cc}`);
      this.saveMaps();
      this.emit();
      return;
    }

    // Fixed-function CCs
    if (cc === 1) {
      eng.setModWheel(v);
    }
    if (cc === 64) {
      eng.setSustain(raw >= 64);
    }
    if (cc === 120 || cc === 123) {
      eng.panic();
    }

    // Learned mappings
    for (const m of this.state.maps) {
      if (m.cc !== cc) continue;
      if (m.channel !== 0 && m.channel !== channel) continue;
      this.applyMapping(m, v);
    }
  }

  private applyMapping(m: CCMapping, v: number) {
    const def = tryParam(m.param);
    if (!def) return;
    const eng = getSynthEngine();
    const scaled = m.invert ? 1 - v : v;
    const targetNorm = m.min + scaled * (m.max - m.min);
    const currentNorm = normalize(m.param, eng.getParam(m.param));
    const latchKey = `${m.channel}:${m.cc}`;

    if (m.takeover === "jump") {
      eng.setParam(m.param, denormalize(m.param, targetNorm));
      return;
    }
    if (m.takeover === "scale") {
      // relative nudge toward the incoming value
      const next = currentNorm + (targetNorm - currentNorm) * 0.5;
      eng.setParam(m.param, denormalize(m.param, next));
      return;
    }
    // pickup: only take control once the incoming value crosses the current
    const caught = this.caught.get(latchKey) ?? false;
    if (!caught) {
      if (Math.abs(targetNorm - currentNorm) <= 0.03) {
        this.caught.set(latchKey, true);
      } else {
        return; // not yet caught — ignore to avoid a jump
      }
    }
    eng.setParam(m.param, denormalize(m.param, targetNorm));
  }
}

let instance: MidiManager | undefined;
export function getMidi(): MidiManager {
  if (!instance) instance = new MidiManager();
  return instance;
}
