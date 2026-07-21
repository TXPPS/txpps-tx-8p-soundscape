import { create } from "zustand";

/** Display + performance preferences, persisted to localStorage. */
interface SettingsState {
  reducedMotion: boolean;
  keyLabels: boolean;
  uiScale: number; // 0.85..1.15
  typingKeyboard: boolean;

  set: (patch: Partial<SettingsState>) => void;
}

const KEY = "tx8p.settings.v1";

function load(): Partial<SettingsState> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SettingsState>;
  } catch {
    return {};
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  reducedMotion: false,
  keyLabels: true,
  uiScale: 1,
  typingKeyboard: true,
  ...load(),
  set: (patch) => {
    set(patch);
    if (typeof localStorage !== "undefined") {
      const { set: _omit, ...rest } = get();
      void _omit;
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...rest, ...patch }));
      } catch {
        /* ignore */
      }
    }
  },
}));
