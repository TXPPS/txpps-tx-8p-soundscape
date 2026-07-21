import { Settings, AlertOctagon } from "lucide-react";
import { useUiStore } from "@/state/uiStore";
import { usePerfStore } from "@/state/perfStore";

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
        // 44px touch target via minWidth/minHeight above; visible via width/height
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

export function TopActions() {
  const openSettings = useUiStore((s) => s.setSettingsOpen);
  const flash = useUiStore((s) => s.flashLcd);
  const panic = usePerfStore((s) => s.panic);

  return (
    <div className="flex items-center gap-1.5">
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
