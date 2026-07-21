import { type ReactNode } from "react";

export function Chassis({ children }: { children: ReactNode }) {
  return (
    <div className="chassis-surface min-h-screen w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col">
        {children}
      </div>
    </div>
  );
}

export function EngravedLabel({
  children,
  variant = "chassis",
  className = "",
}: {
  children: ReactNode;
  variant?: "chassis" | "chassis-dim" | "strip" | "strip-dim" | "red";
  className?: string;
}) {
  const cls =
    variant === "chassis"
      ? "engraved"
      : variant === "chassis-dim"
        ? "engraved-dim"
        : variant === "strip"
          ? "engraved-light"
          : variant === "strip-dim"
            ? "engraved-light opacity-70"
            : "engraved-red";
  return <span className={`${cls} text-[10px] ${className}`}>{children}</span>;
}

/**
 * TXPPS identity block for the top-left corner of the chassis.
 * Original mark; not a Roland reproduction.
 */
export function IdentityMark() {
  return (
    <div className="flex items-baseline gap-4">
      <div className="flex flex-col leading-none">
        <span
          className="font-sans text-[10px] font-semibold tracking-[0.35em]"
          style={{ color: "var(--engraving-chassis-dim)" }}
        >
          TXPPS
        </span>
        <span
          className="font-sans text-[11px] font-medium tracking-[0.22em]"
          style={{ color: "var(--engraving-chassis-dim)" }}
        >
          POLYPHONIC · SYNTHESIZER
        </span>
      </div>
    </div>
  );
}

/**
 * Big product-name plate. Charcoal "TX-8P" with a small muted-red
 * "HYBRID" secondary mark. Original TXPPS mark inspired by mid-80s
 * Japanese hardware conventions.
 */
export function ProductPlate() {
  return (
    <div className="flex items-end gap-3">
      <span
        className="font-sans font-semibold leading-none"
        style={{
          color: "var(--engraving-chassis)",
          fontSize: "clamp(28px, 4.2vw, 46px)",
          letterSpacing: "0.02em",
        }}
      >
        TX-8P
      </span>
      <span
        className="mb-1 font-sans text-[11px] font-bold tracking-[0.24em]"
        style={{ color: "var(--engraving-red)" }}
      >
        HYBRID
      </span>
    </div>
  );
}

export function StatusLamp({ on = true }: { on?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-2 rounded-full"
        style={{
          background: on ? "var(--led-red-on)" : "var(--led-red-off)",
          boxShadow: on
            ? "0 0 3px var(--led-red-on), inset 0 0 0 1px oklch(0 0 0 / 0.4)"
            : "inset 0 0 0 1px oklch(0 0 0 / 0.4)",
        }}
        aria-hidden
      />
      <span
        className="font-sans text-[9px] font-semibold tracking-[0.18em]"
        style={{ color: "var(--engraving-chassis-dim)" }}
      >
        POWER
      </span>
    </div>
  );
}
