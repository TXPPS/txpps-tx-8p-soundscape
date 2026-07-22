import { create } from "zustand";
import { getSynthEngine } from "@/engine/SynthEngine";

export type VoiceMode = "POLY" | "MONO" | "UNISON";

const VOICE_INDEX: Record<VoiceMode, number> = { POLY: 0, MONO: 1, UNISON: 2 };
const UNISON_INDEX: Record<number, number> = { 2: 0, 3: 1, 5: 2, 7: 3 };

interface PerfState {
  pitch: number; // -1..1, spring returns to 0
  mod: number; // 0..1
  hold: boolean;
  octave: number; // -3..+3
  voiceMode: VoiceMode;
  unisonCount: 2 | 3 | 5 | 7;
  panicPulse: number; // increments each panic

  setPitch: (v: number) => void;
  setMod: (v: number) => void;
  toggleHold: () => void;
  stepOctave: (delta: number) => void;
  setVoiceMode: (m: VoiceMode) => void;
  /** Sync from the engine (VOICE tab / preset) without echoing back. */
  syncVoiceMode: (m: VoiceMode, uni?: 2 | 3 | 5 | 7) => void;
  panic: () => void;
}

export const usePerfStore = create<PerfState>((set) => ({
  pitch: 0,
  mod: 0,
  hold: false,
  octave: 0,
  voiceMode: "POLY",
  unisonCount: 3,
  panicPulse: 0,
  setPitch: (v) => {
    const p = Math.max(-1, Math.min(1, v));
    getSynthEngine().setPitchBend(p);
    set({ pitch: p });
  },
  setMod: (v) => {
    const m = Math.max(0, Math.min(1, v));
    getSynthEngine().setModWheel(m);
    set({ mod: m });
  },
  toggleHold: () =>
    set((s) => {
      const next = !s.hold;
      getSynthEngine().setHold(next);
      return { hold: next };
    }),
  stepOctave: (d) => set((s) => ({ octave: Math.max(-3, Math.min(3, s.octave + d)) })),
  setVoiceMode: (m) => {
    getSynthEngine().setParam("voice.mode", VOICE_INDEX[m]);
    set({ voiceMode: m });
  },
  syncVoiceMode: (m, uni) => set(uni ? { voiceMode: m, unisonCount: uni } : { voiceMode: m }),
  panic: () => set((s) => ({ panicPulse: s.panicPulse + 1 })),
}));

export { UNISON_INDEX };
