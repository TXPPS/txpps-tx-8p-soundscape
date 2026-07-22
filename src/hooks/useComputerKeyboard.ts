import { useEffect } from "react";
import { getSynthEngine, type VoiceHandle } from "@/engine/SynthEngine";
import { usePerfStore } from "@/state/perfStore";

/**
 * Computer-keyboard musical typing.
 *
 * Two rows of chromatic notes, an octave shortcut, and a Panic key.
 * - Lower row:  Z S X D C V G B H N J M , L .
 * - Upper row:  Q 2 W 3 E R 5 T 6 Y 7 U I
 * - Octave:     "-" down, "=" up
 * - Panic:      Escape
 *
 * Key repeat is ignored (auto-repeat never re-triggers). The exact MIDI
 * note is captured per physical key at keydown, so releasing after an
 * octave change still stops the right note. Typing inside inputs/textareas
 * is ignored.
 */
const LOWER: Record<string, number> = {
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  ",": 12,
  l: 13,
  ".": 14,
};
const UPPER: Record<string, number> = {
  q: 12,
  "2": 13,
  w: 14,
  "3": 15,
  e: 16,
  r: 17,
  "5": 18,
  t: 19,
  "6": 20,
  y: 21,
  "7": 22,
  u: 23,
  i: 24,
};

const BASE_C = 60; // C4 at octave 0

export function useComputerKeyboard(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const active = new Map<string, VoiceHandle>();

    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping()) return;
      const key = e.key.toLowerCase();

      if (key === "escape") {
        getSynthEngine().panic();
        usePerfStore.getState().panic();
        return;
      }
      if (e.key === "-" || e.key === "_") {
        usePerfStore.getState().stepOctave(-1);
        return;
      }
      if (e.key === "=" || e.key === "+") {
        usePerfStore.getState().stepOctave(1);
        return;
      }

      const semi = LOWER[key] ?? UPPER[key];
      if (semi === undefined) return;
      if (active.has(key)) return;
      e.preventDefault();
      const octave = usePerfStore.getState().octave;
      const midi = BASE_C + octave * 12 + semi;
      const handle = getSynthEngine().pressNote("keyboard", key, midi, 0.85);
      active.set(key, handle);
    };

    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const handle = active.get(key);
      if (handle !== undefined) {
        active.delete(key);
        getSynthEngine().releaseNote(handle);
      }
    };

    const releaseAll = () => {
      for (const [, h] of active) getSynthEngine().releaseNote(h);
      active.clear();
    };
    const onVis = () => {
      if (document.hidden) releaseAll();
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVis);
      releaseAll();
    };
  }, [enabled]);
}
