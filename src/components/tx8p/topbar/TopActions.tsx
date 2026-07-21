import { Settings, AlertOctagon } from "lucide-react";
import { useUiStore } from "@/state/uiStore";
import { usePerfStore } from "@/state/perfStore";
import { getSynthEngine } from "@/engine/SynthEngine";
import { useEngineStatus } from "@/engine/useEngine";

interface HardwareIconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  title: string;
  tone?: "neutral" | "danger";
  children: React.ReactNode;
}

function HardwareIconButton({
  onClick,
  ariaLabel,
  title,
  tone = "neutral",
  children,
}: HardwareIconButtonProps) {
  const isDanger = tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className="relative inline-grid place-items-center transition-transform active:translate-y-[1px]"
      style={{
        minWidth: 44,
        minHeight: 44,
        width: 32,
        height: 32,
        borderRadius: "var(--radius-control)",
        background: isDanger
          ? "linear-gradient(180deg, var(--btn-red-top) 0%, var(--btn-red) 100%)"
          : "linear-gradient(180deg, var(--btn-cream-top) 0%, var(--btn-cream-bottom) 100%)",
        color: isDanger ? "var(--btn-red-text)" : "var(--btn-cream-text)",
        boxShadow: isDanger
          ? "0 1px 0 oklch(1 0 0 / 0.25) inset, 0 -1px 0 oklch(0 0 0 / 0.35) inset, 0 1px 2px oklch(0 0 0 / 0.55)"
          : "var(--shadow-cream-btn)",
        border: isDanger
          ? "1px solid oklch(0.32 0.10 22)"
          : "1px solid oklch(0 0 0 / 0.35)",
      }}
    >
      {children}
    </button>
  );
}

/** Compact status pill reflecting real AudioContext state. */
function EngineStatusPill() {
  const status = useEngineStatus();
  const label =
    status === "idle"
      ? "START AUDIO"
      : status === "starting"
        ? "STARTING"
        : status === "ready"
          ? "READY"
          : status === "suspended"
            ? "SUSPENDED"
            : "ERROR — RETRY";
  const dotColor =
    status === "ready"
      ? "var(--lcd-amber)"
      : status === "error"
        ? "var(--btn-red)"
        : status === "starting"
          ? "var(--btn-amber)"
          : "oklch(0.55 0 0)";
  const clickable = status !== "ready" && status !== "starting";
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => {
        // Prod an idempotent press+release to force resume.
        const eng = getSynthEngine();
        const h = eng.pressNote("screen", "status-tap", 60, 0);
        eng.releaseNote(h);
      }}
      aria-label={`Audio engine ${label}`}
      title={`Audio engine ${label}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2 font-sans font-semibold"
      style={{
        height: 22,
        fontSize: 9,
        letterSpacing: "0.16em",
        color: "var(--engraving-chassis)",
        background:
          "linear-gradient(180deg, oklch(0.30 0.004 60) 0%, oklch(0.22 0.004 60) 100%)",
        boxShadow:
          "inset 0 0 0 1px oklch(0 0 0 / 0.55), inset 0 1px 2px oklch(0 0 0 / 0.45)",
        cursor: clickable ? "pointer" : "default",
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: dotColor,
          boxShadow: `0 0 4px ${dotColor}`,
        }}
      />
      {label}
    </button>
  );
}

export function TopActions() {
  const openSettings = useUiStore((s) => s.setSettingsOpen);
  const flash = useUiStore((s) => s.flashLcd);
  const panic = usePerfStore((s) => s.panic);

  return (
    <div className="flex items-center gap-1.5">
      <EngineStatusPill />
      <HardwareIconButton
        onClick={() => openSettings(true)}
        ariaLabel="Settings"
        title="Settings"
      >
        <Settings size={14} strokeWidth={2.25} />
      </HardwareIconButton>
      <HardwareIconButton
        tone="danger"
        onClick={() => {
          getSynthEngine().panic();
          panic();
          flash({ kind: "panic" }, 700);
        }}
        ariaLabel="Panic — Stop All Notes"
        title="Panic — Stop All Notes"
      >
        <AlertOctagon size={14} strokeWidth={2.5} />
      </HardwareIconButton>
    </div>
  );
}
