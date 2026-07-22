import { useEffect } from "react";
import { getSynthEngine } from "@/engine/SynthEngine";
import { getParam, type ParamSection } from "@/engine/params/registry";
import { usePresetStore } from "@/state/presetStore";
import { usePerfStore, type VoiceMode } from "@/state/perfStore";
import { useSettingsStore } from "@/state/settingsStore";
import { useComputerKeyboard } from "@/hooks/useComputerKeyboard";

const VOICE_MODES: VoiceMode[] = ["POLY", "MONO", "UNISON"];
const UNI_COUNTS = [2, 3, 5, 7] as const;
const NON_PRESET_SECTIONS = new Set<ParamSection>(["master"]);

/**
 * Invisible bridge component: wires global input + cross-store sync that
 * shouldn't live in any single visual component.
 *  - computer-keyboard musical typing
 *  - marks the current preset "edited" when a sound parameter changes
 *  - mirrors the engine's voice.mode into the performance store (LCD)
 */
export function AppBridges() {
  const typingKeyboard = useSettingsStore((s) => s.typingKeyboard);
  useComputerKeyboard(typingKeyboard);

  useEffect(() => {
    const eng = getSynthEngine();
    return eng.onParamChange((id) => {
      if (id === "*") return;
      // voice mode → LCD
      if (id === "voice.mode" || id === "voice.uniCount") {
        const vm = VOICE_MODES[Math.round(eng.getParam("voice.mode"))] ?? "POLY";
        const uni = UNI_COUNTS[Math.round(eng.getParam("voice.uniCount"))] ?? 3;
        usePerfStore.getState().syncVoiceMode(vm, uni);
      }
      // dirty tracking (only real sound params)
      const def = safeParam(id);
      if (def && def.preset !== false && !NON_PRESET_SECTIONS.has(def.section)) {
        usePresetStore.getState().markDirty();
      }
    });
  }, []);

  return null;
}

function safeParam(id: string) {
  try {
    return getParam(id);
  } catch {
    return undefined;
  }
}
