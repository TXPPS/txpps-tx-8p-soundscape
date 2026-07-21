import { type ReactNode } from "react";

interface LedButtonProps {
  active?: boolean;
  onClick?: () => void;
  color?: "green" | "amber" | "red";
  children: ReactNode;
  ariaLabel?: string;
  compact?: boolean;
}

export function LedButton({
  active = false,
  onClick,
  color = "green",
  children,
  ariaLabel,
  compact = false,
}: LedButtonProps) {
  const ledOn =
    color === "green"
      ? "var(--led-green-on)"
      : color === "amber"
        ? "var(--led-amber-on)"
        : "var(--led-red-on)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`group relative flex items-center gap-2 rounded-[var(--radius-control)] ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      } transition active:translate-y-[1px]`}
      style={{
        background:
          "linear-gradient(180deg, oklch(0.30 0.005 60) 0%, oklch(0.20 0.005 60) 100%)",
        boxShadow:
          "inset 0 1px 0 oklch(1 0 0 / 0.04), 0 2px 4px oklch(0 0 0 / 0.55), 0 1px 0 oklch(0 0 0 / 0.4)",
      }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: active ? ledOn : "var(--led-green-off)",
          boxShadow: active
            ? `0 0 6px ${ledOn}, 0 0 12px ${ledOn}, inset 0 0 2px oklch(1 0 0 / 0.3)`
            : "inset 0 1px 2px oklch(0 0 0 / 0.6)",
          transition: "background 120ms var(--ease-standard), box-shadow 120ms var(--ease-standard)",
        }}
      />
      <span className="engraved text-[10px]">{children}</span>
    </button>
  );
}

export function IconButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick?: () => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid h-8 w-8 place-items-center rounded-[var(--radius-control)] transition active:translate-y-[1px]"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.30 0.005 60) 0%, oklch(0.20 0.005 60) 100%)",
        boxShadow:
          "inset 0 1px 0 oklch(1 0 0 / 0.04), 0 2px 4px oklch(0 0 0 / 0.55)",
        color: "var(--engraving-fill)",
      }}
    >
      {children}
    </button>
  );
}
