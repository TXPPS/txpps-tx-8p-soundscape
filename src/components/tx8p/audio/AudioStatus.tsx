import { getSynthEngine } from "@/engine/SynthEngine";
import { useEngineStatus } from "@/engine/useEngine";
import type { EngineStatus } from "@/engine/SynthEngine";

/** Map the engine lifecycle to a user-facing label + indicator colour. */
export function audioStatusView(status: EngineStatus): {
  label: string;
  color: string;
  clickable: boolean;
} {
  switch (status) {
    case "ready":
      return { label: "READY", color: "var(--led-green-on)", clickable: false };
    case "starting":
      return { label: "STARTING", color: "var(--btn-amber)", clickable: false };
    case "recovering":
      return { label: "RECONNECT", color: "var(--btn-amber)", clickable: true };
    case "suspended":
      return { label: "SUSPENDED", color: "var(--btn-amber)", clickable: true };
    case "failed":
      return { label: "AUDIO ERROR", color: "var(--btn-red)", clickable: true };
    case "locked":
    default:
      return { label: "TAP TO START", color: "oklch(0.6 0 0)", clickable: true };
  }
}

/**
 * Compact audio-status pill. Reflects the real audio lifecycle — never shows
 * READY unless the context is genuinely running. Tapping it (when not ready)
 * unlocks/resumes audio, so it doubles as a recovery affordance.
 */
export function AudioStatus({ compact = false }: { compact?: boolean }) {
  const status = useEngineStatus();
  const { label, color, clickable } = audioStatusView(status);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => void getSynthEngine().unlock()}
      aria-label={`Audio status: ${label}`}
      title={`Audio: ${label}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] font-sans font-semibold"
      style={{
        height: compact ? 20 : 22,
        padding: compact ? "0 6px" : "0 8px",
        fontSize: compact ? 8 : 9,
        letterSpacing: "0.14em",
        color: "var(--engraving-chassis)",
        background: "linear-gradient(180deg, oklch(0.30 0.004 60) 0%, oklch(0.22 0.004 60) 100%)",
        boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.55), inset 0 1px 2px oklch(0 0 0 / 0.45)",
        cursor: clickable ? "pointer" : "default",
      }}
    >
      <span
        aria-hidden
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          background: color,
          boxShadow: `0 0 5px ${color}`,
          animation:
            status === "starting" || status === "recovering"
              ? "tx8p-pulse 1s ease-in-out infinite"
              : undefined,
        }}
      />
      {label}
    </button>
  );
}
