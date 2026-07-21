import { type ReactNode } from "react";

export type ProgramButtonColor = "cream" | "red" | "amber" | "blue";

interface Props {
  children: ReactNode;
  color?: ProgramButtonColor;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  number?: string | number;
}

/**
 * Small rectangular program button — the primary interactive
 * element of the JX-8P-influenced programming strip. Flat, era-
 * appropriate, restrained. No pill shape, no glow, no gradient
 * saturation. The LED indicator is a tiny dot above the label.
 */
export function ProgramButton({
  children,
  color = "cream",
  active = false,
  onClick,
  ariaLabel,
  number,
}: Props) {
  const palette = {
    cream: {
      top: "var(--btn-cream-top)",
      bot: "var(--btn-cream-bottom)",
      text: "var(--btn-cream-text)",
      led: "var(--led-red-on)",
      ledOff: "var(--led-red-off)",
    },
    red: {
      top: "var(--btn-red-top)",
      bot: "var(--btn-red)",
      text: "var(--btn-red-text)",
      led: "var(--led-amber-on)",
      ledOff: "oklch(0.32 0.05 60)",
    },
    amber: {
      top: "var(--btn-amber-top)",
      bot: "var(--btn-amber)",
      text: "var(--btn-amber-text)",
      led: "var(--led-red-on)",
      ledOff: "oklch(0.32 0.05 60)",
    },
    blue: {
      top: "var(--btn-blue-top)",
      bot: "var(--btn-blue)",
      text: "var(--btn-blue-text)",
      led: "var(--led-amber-on)",
      ledOff: "oklch(0.32 0.05 60)",
    },
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className="group relative inline-flex select-none flex-col items-center justify-center transition-transform active:translate-y-[1px]"
      style={{
        minWidth: 44,
        height: 26,
        padding: "0 8px",
        borderRadius: "var(--radius-control)",
        background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.bot} 100%)`,
        color: palette.text,
        boxShadow: active ? "var(--shadow-cream-btn-down)" : "var(--shadow-cream-btn)",
        fontFamily: "var(--font-engraved)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {number != null && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-[8px] font-medium tracking-widest"
          style={{ color: "var(--engraving-fill)", opacity: 0.75 }}
        >
          {number}
        </span>
      )}
      <span
        aria-hidden
        className="mb-[2px] h-[3px] w-[3px] rounded-full"
        style={{
          background: active ? palette.led : palette.ledOff,
          boxShadow: active ? `0 0 4px ${palette.led}` : "none",
        }}
      />
      <span className="leading-none">{children}</span>
    </button>
  );
}
