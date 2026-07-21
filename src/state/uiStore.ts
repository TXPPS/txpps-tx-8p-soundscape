import { create } from "zustand";

export type PanelId = "osc" | "filter" | "env" | "lfo" | "mod" | "fx";

export type LcdMode =
  | { kind: "boot" }
  | { kind: "preset" }
  | { kind: "param"; label: string; value: number; display: string }
  | { kind: "message"; line1: string; line2: string; ttlMs?: number }
  | { kind: "panic" }
  | { kind: "loading"; label: string };

interface UiState {
  activePanel: PanelId;
  browserOpen: boolean;
  settingsOpen: boolean;
  lcdMode: LcdMode;
  lcdReleaseTimer: ReturnType<typeof setTimeout> | null;

  setActivePanel: (p: PanelId) => void;
  setBrowserOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setLcdMode: (m: LcdMode) => void;
  flashLcd: (m: LcdMode, ttlMs?: number) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activePanel: "osc",
  browserOpen: false,
  settingsOpen: false,
  lcdMode: { kind: "boot" },
  lcdReleaseTimer: null,

  setActivePanel: (p) => set({ activePanel: p }),
  setBrowserOpen: (v) => set({ browserOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setLcdMode: (m) => {
    const t = get().lcdReleaseTimer;
    if (t) clearTimeout(t);
    set({ lcdMode: m, lcdReleaseTimer: null });
  },
  flashLcd: (m, ttlMs = 900) => {
    const t = get().lcdReleaseTimer;
    if (t) clearTimeout(t);
    const timer = setTimeout(() => {
      set({ lcdMode: { kind: "preset" }, lcdReleaseTimer: null });
    }, ttlMs);
    set({ lcdMode: m, lcdReleaseTimer: timer });
  },
}));
