import { create } from "zustand";

export type VoiceMode = "POLY" | "MONO" | "UNISON";

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
  setPitch: (v) => set({ pitch: Math.max(-1, Math.min(1, v)) }),
  setMod: (v) => set({ mod: Math.max(0, Math.min(1, v)) }),
  toggleHold: () => set((s) => ({ hold: !s.hold })),
  stepOctave: (d) => set((s) => ({ octave: Math.max(-3, Math.min(3, s.octave + d)) })),
  setVoiceMode: (m) => set({ voiceMode: m }),
  panic: () => set((s) => ({ panicPulse: s.panicPulse + 1 })),
}));
