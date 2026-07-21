import { create } from "zustand";

export interface Preset {
  id: string;
  bank: "FACTORY" | "USER";
  index: number;
  name: string;
  category: "BASS" | "LEAD" | "PAD" | "KEYS" | "FX" | "PERC" | "ARP" | "INIT";
}

export const INIT_PRESET: Preset = {
  id: "init",
  bank: "FACTORY",
  index: 1,
  name: "Init Voice",
  category: "INIT",
};

interface PresetState {
  current: Preset;
  dirty: boolean;
  setCurrent: (p: Preset) => void;
  setDirty: (v: boolean) => void;
}

export const usePresetStore = create<PresetState>((set) => ({
  current: INIT_PRESET,
  dirty: false,
  setCurrent: (p) => set({ current: p, dirty: false }),
  setDirty: (v) => set({ dirty: v }),
}));
