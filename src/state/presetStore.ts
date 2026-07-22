import { create } from "zustand";
import { getSynthEngine } from "@/engine/SynthEngine";
import { getDefaults, presetParamIds } from "@/engine/params/registry";
import { FACTORY_PRESETS } from "@/engine/factoryPresets";
import { usePerfStore, type VoiceMode } from "@/state/perfStore";

export type PresetCategory =
  | "BASS"
  | "LEAD"
  | "PAD"
  | "KEYS"
  | "PLUCK"
  | "BRASS"
  | "STRINGS"
  | "FX"
  | "ARP"
  | "INIT";

export interface Preset {
  id: string;
  bank: "FACTORY" | "USER";
  index: number;
  name: string;
  category: PresetCategory;
  tags: string[];
  params: Record<string, number>; // sparse overrides on top of defaults
}

const USER_KEY = "tx8p.presets.user.v1";
const FAV_KEY = "tx8p.presets.favorites.v1";
const RECENT_KEY = "tx8p.presets.recent.v1";

const FACTORY: Preset[] = FACTORY_PRESETS.map((p, i) => ({
  id: `factory:${p.id}`,
  bank: "FACTORY",
  index: i + 1,
  name: p.name,
  category: p.category,
  tags: p.tags,
  params: p.params,
}));

export const INIT_PRESET: Preset = FACTORY.find((p) => p.category === "INIT") ??
  FACTORY[0] ?? {
    id: "factory:init",
    bank: "FACTORY",
    index: 1,
    name: "Init Voice",
    category: "INIT",
    tags: [],
    params: {},
  };

function loadJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJson(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

const VOICE_MODES: VoiceMode[] = ["POLY", "MONO", "UNISON"];
const UNI_COUNTS = [2, 3, 5, 7] as const;

interface PresetState {
  factory: Preset[];
  user: Preset[];
  favorites: string[];
  recent: string[];
  current: Preset;
  dirty: boolean;
  loading: boolean;

  all: () => Preset[];
  load: (id: string) => void;
  step: (dir: -1 | 1) => void;
  saveAs: (name: string, category: PresetCategory) => void;
  overwriteCurrent: () => void;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  exportPreset: (id: string) => string;
  importPreset: (json: string) => boolean;
  markDirty: () => void;
  setCurrent: (p: Preset) => void;
  setDirty: (v: boolean) => void;
}

export const usePresetStore = create<PresetState>((set, get) => {
  const applyToEngine = (p: Preset) => {
    const full = { ...getDefaults(), ...p.params };
    set({ loading: true });
    getSynthEngine().loadParams(full);
    const vm = VOICE_MODES[Math.round(full["voice.mode"] ?? 0)] ?? "POLY";
    const uni = UNI_COUNTS[Math.round(full["voice.uniCount"] ?? 1)] ?? 3;
    usePerfStore.getState().syncVoiceMode(vm, uni);
    set({ loading: false });
  };

  const pushRecent = (id: string) => {
    const recent = [id, ...get().recent.filter((r) => r !== id)].slice(0, 12);
    set({ recent });
    saveJson(RECENT_KEY, recent);
  };

  return {
    factory: FACTORY,
    user: loadJson<Preset[]>(USER_KEY, []),
    favorites: loadJson<string[]>(FAV_KEY, []),
    recent: loadJson<string[]>(RECENT_KEY, []),
    current: INIT_PRESET,
    dirty: false,
    loading: false,

    all: () => [...get().factory, ...get().user],

    load: (id) => {
      const p = get()
        .all()
        .find((x) => x.id === id);
      if (!p) return;
      applyToEngine(p);
      set({ current: p, dirty: false });
      pushRecent(id);
    },

    step: (dir) => {
      const list = get().all();
      if (list.length === 0) return;
      const idx = list.findIndex((p) => p.id === get().current.id);
      const ni = (idx + dir + list.length) % list.length;
      get().load(list[ni].id);
    },

    saveAs: (name, category) => {
      const params = getSynthEngine().snapshotParams(presetParamIds());
      const user = get().user;
      const preset: Preset = {
        id: `user:${slug(name)}:${user.length + 1}`,
        bank: "USER",
        index: user.length + 1,
        name: name.slice(0, 16),
        category,
        tags: [],
        params,
      };
      const next = [...user, preset];
      set({ user: next, current: preset, dirty: false });
      saveJson(USER_KEY, next);
      pushRecent(preset.id);
    },

    overwriteCurrent: () => {
      const cur = get().current;
      if (cur.bank !== "USER") return;
      const params = getSynthEngine().snapshotParams(presetParamIds());
      const next = get().user.map((p) => (p.id === cur.id ? { ...p, params } : p));
      set({ user: next, dirty: false, current: { ...cur, params } });
      saveJson(USER_KEY, next);
    },

    rename: (id, name) => {
      const nm = name.slice(0, 16);
      const next = get().user.map((p) => (p.id === id ? { ...p, name: nm } : p));
      set({ user: next });
      saveJson(USER_KEY, next);
      if (get().current.id === id) set({ current: { ...get().current, name: nm } });
    },

    duplicate: (id) => {
      const src = get()
        .all()
        .find((p) => p.id === id);
      if (!src) return;
      const user = get().user;
      const copy: Preset = {
        ...src,
        id: `user:${slug(src.name)}:${Date.now() % 100000}`,
        bank: "USER",
        index: user.length + 1,
        name: `${src.name} 2`.slice(0, 16),
        params: { ...src.params },
      };
      const next = [...user, copy];
      set({ user: next });
      saveJson(USER_KEY, next);
    },

    remove: (id) => {
      const p = get().user.find((x) => x.id === id);
      if (!p) return;
      const next = get().user.filter((x) => x.id !== id);
      set({ user: next });
      saveJson(USER_KEY, next);
      if (get().current.id === id) get().load(INIT_PRESET.id);
    },

    toggleFavorite: (id) => {
      const favorites = get().favorites.includes(id)
        ? get().favorites.filter((f) => f !== id)
        : [...get().favorites, id];
      set({ favorites });
      saveJson(FAV_KEY, favorites);
    },

    exportPreset: (id) => {
      const p =
        get()
          .all()
          .find((x) => x.id === id) ?? get().current;
      return JSON.stringify(
        { name: p.name, category: p.category, tags: p.tags, params: p.params },
        null,
        2,
      );
    },

    importPreset: (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<Preset>;
        if (!parsed.params || typeof parsed.params !== "object") return false;
        const user = get().user;
        const preset: Preset = {
          id: `user:${slug(parsed.name ?? "import")}:${Date.now() % 100000}`,
          bank: "USER",
          index: user.length + 1,
          name: (parsed.name ?? "Imported").slice(0, 16),
          category: (parsed.category as PresetCategory) ?? "KEYS",
          tags: parsed.tags ?? [],
          params: parsed.params as Record<string, number>,
        };
        const next = [...user, preset];
        set({ user: next });
        saveJson(USER_KEY, next);
        return true;
      } catch {
        return false;
      }
    },

    markDirty: () => {
      if (!get().loading && !get().dirty) set({ dirty: true });
    },
    setCurrent: (p) => set({ current: p, dirty: false }),
    setDirty: (v) => set({ dirty: v }),
  };
});

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "preset"
  );
}
