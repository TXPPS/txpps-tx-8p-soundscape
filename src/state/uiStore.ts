import { create } from "zustand";

export type TabId =
  | "OSC"
  | "FILTER"
  | "ENV"
  | "LFO"
  | "MOD"
  | "FX"
  | "VOICE";

export type PanelId = "osc" | "filter" | "env" | "lfo" | "mod" | "fx";

export type LcdMode =
  | { kind: "boot" }
  | { kind: "preset" }
  | { kind: "param"; label: string; value: number; display: string }
  | { kind: "message"; line1: string; line2: string; ttlMs?: number }
  | { kind: "panic" }
  | { kind: "loading"; label: string };

interface UiState {
  activeTab: TabId;
  activeSubTab: Record<TabId, string>;
  browserOpen: boolean;
  settingsOpen: boolean;
  lcdMode: LcdMode;
  lcdReleaseTimer: ReturnType<typeof setTimeout> | null;

  setActiveTab: (t: TabId) => void;
  setSubTab: (t: TabId, sub: string) => void;
  setBrowserOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setLcdMode: (m: LcdMode) => void;
  flashLcd: (m: LcdMode, ttlMs?: number) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeTab: "OSC",
  activeSubTab: {
    OSC: "OSC 1",
    FILTER: "MAIN",
    ENV: "AMP",
    LFO: "LFO 1",
    MOD: "SLOT 1",
    FX: "DRIVE",
    VOICE: "MODE",
  },
  browserOpen: false,
  settingsOpen: false,
  lcdMode: { kind: "boot" },
  lcdReleaseTimer: null,

  setActiveTab: (t) => set({ activeTab: t }),
  setSubTab: (t, sub) =>
    set((s) => ({ activeSubTab: { ...s.activeSubTab, [t]: sub } })),
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
