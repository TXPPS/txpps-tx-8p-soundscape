import { useEffect, useMemo } from "react";
import { useUiStore, type LcdMode } from "@/state/uiStore";
import { usePresetStore } from "@/state/presetStore";
import { usePerfStore } from "@/state/perfStore";

const COLS = 20;

function pad(s: string, n = COLS) {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}

function bar(value: number, cells = 10) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * cells);
  return "\u25AE".repeat(filled) + "\u25AF".repeat(cells - filled);
}

function useLines(mode: LcdMode): [string, string] {
  const preset = usePresetStore((s) => s.current);
  const dirty = usePresetStore((s) => s.dirty);
  const octave = usePerfStore((s) => s.octave);
  const voiceMode = usePerfStore((s) => s.voiceMode);
  const unison = usePerfStore((s) => s.unisonCount);

  return useMemo(() => {
    switch (mode.kind) {
      case "boot":
        return [pad("TXPPS  TX-8P"), pad("SELFTEST  OK")];
      case "panic":
        return [pad("PANIC"), pad("ALL NOTES OFF")];
      case "loading":
        return [pad("LOADING\u2026"), pad(mode.label)];
      case "message":
        return [pad(mode.line1), pad(mode.line2)];
      case "param": {
        const pct = Math.round(mode.value * 100);
        return [pad(mode.label), pad(`${bar(mode.value)} ${String(pct).padStart(3, " ")}%`)];
      }
      case "preset":
      default: {
        const bankLabel = preset.bank === "FACTORY" ? "F" : "U";
        const idx = String(preset.index).padStart(3, "0");
        const name = preset.name + (dirty ? "*" : "");
        const line1 = `${bankLabel}${idx}  ${name}`;
        const oct = octave >= 0 ? `+${octave}` : `${octave}`;
        const voiceLbl = voiceMode === "UNISON" ? `UNI${unison}` : voiceMode.slice(0, 4);
        const line2 = `${voiceLbl.padEnd(5, " ")} OCT ${oct}`;
        return [pad(line1), pad(line2)];
      }
    }
  }, [mode, preset, dirty, octave, voiceMode, unison]);
}

/**
 * Compact smoked-glass LCD. Amber phosphor character.
 * Deliberately small and restrained — an integrated hardware
 * display, not a neon centerpiece.
 */
export function PresetLCD() {
  const mode = useUiStore((s) => s.lcdMode);
  const setLcd = useUiStore((s) => s.setLcdMode);
  const [line1, line2] = useLines(mode);

  useEffect(() => {
    if (mode.kind === "boot") {
      const t = setTimeout(() => setLcd({ kind: "preset" }), 1200);
      return () => clearTimeout(t);
    }
  }, [mode.kind, setLcd]);

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        borderRadius: 3,
        padding: "6px 10px",
        background: "linear-gradient(180deg, var(--lcd-bg-top) 0%, var(--lcd-bg) 100%)",
        boxShadow: "var(--shadow-lcd-inset), 0 1px 0 oklch(1 0 0 / 0.35), 0 0 10px var(--lcd-glow)",
        minWidth: "22ch",
      }}
      role="status"
      aria-live="polite"
      aria-label={`Display: ${line1.trim()} — ${line2.trim()}`}
    >
      {/* subtle scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 2px, var(--lcd-scanline) 2px 3px)",
          mixBlendMode: "multiply",
          opacity: 0.55,
        }}
      />
      {/* glass sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, oklch(1 0 0 / 0.06) 0%, transparent 40%)",
        }}
      />
      <pre
        className="relative m-0 whitespace-pre font-mono text-[11px] leading-[1.3] tracking-[0.16em]"
        style={{
          color: "var(--lcd-amber)",
          textShadow: "0 0 4px var(--lcd-glow)",
        }}
      >
        {line1}
        {"\n"}
        {line2}
      </pre>
    </div>
  );
}
