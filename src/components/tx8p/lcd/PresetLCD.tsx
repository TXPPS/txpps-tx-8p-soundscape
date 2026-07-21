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
        return [pad("TXPPS  TX-8P"), pad("READY")];
      case "panic":
        return [pad("PANIC"), pad("ALL NOTES OFF")];
      case "loading":
        return [pad("LOADING\u2026"), pad(mode.label)];
      case "message":
        return [pad(mode.line1), pad(mode.line2)];
      case "param": {
        const pct = Math.round(mode.value * 100);
        return [
          pad(mode.label),
          pad(`${bar(mode.value)} ${String(pct).padStart(3, " ")}%`),
        ];
      }
      case "preset":
      default: {
        const bankLabel = preset.bank === "FACTORY" ? "F" : "U";
        const idx = String(preset.index).padStart(3, "0");
        const name = preset.name + (dirty ? "*" : "");
        const line1 = `${bankLabel}${idx} ${name}`;
        const oct = octave >= 0 ? `+${octave}` : `${octave}`;
        const voiceLbl = voiceMode === "UNISON" ? `UNI${unison}` : voiceMode.slice(0, 4);
        const line2 = `${preset.category.padEnd(4, " ")} OCT ${oct}  ${voiceLbl}`;
        return [pad(line1), pad(line2)];
      }
    }
  }, [mode, preset, dirty, octave, voiceMode, unison]);
}

export function PresetLCD() {
  const mode = useUiStore((s) => s.lcdMode);
  const setLcd = useUiStore((s) => s.setLcdMode);
  const [line1, line2] = useLines(mode);

  // Auto-exit boot after brief self-check
  useEffect(() => {
    if (mode.kind === "boot") {
      const t = setTimeout(() => setLcd({ kind: "preset" }), 1200);
      return () => clearTimeout(t);
    }
  }, [mode.kind, setLcd]);

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-control)] px-4 py-2 font-mono select-none"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.28 0.05 145) 0%, var(--lcd-bg) 100%)",
        boxShadow: "var(--shadow-lcd-inset), 0 0 22px oklch(0.82 0.19 145 / 0.12)",
        minWidth: "20ch",
      }}
      role="status"
      aria-live="polite"
      aria-label={`Display: ${line1.trim()} — ${line2.trim()}`}
    >
      {/* scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 2px, var(--lcd-scanline) 2px 3px)",
          mixBlendMode: "multiply",
          opacity: 0.6,
        }}
      />
      <pre
        className="relative m-0 whitespace-pre text-[13px] leading-[1.35] tracking-[0.14em] md:text-[15px]"
        style={{
          color: "var(--lcd-green)",
          textShadow:
            "0 0 6px var(--lcd-glow), 0 0 14px oklch(0.82 0.19 145 / 0.35)",
        }}
      >
        {line1}
        {"\n"}
        {line2}
      </pre>
    </div>
  );
}
