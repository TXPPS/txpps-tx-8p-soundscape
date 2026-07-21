import { type ReactNode } from "react";

export function Chassis({ children }: { children: ReactNode }) {
  return (
    <div className="chassis-surface min-h-screen w-full">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-3 p-3 md:gap-4 md:p-6">
        {children}
      </div>
    </div>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel-recessed relative p-4 ${className}`}>
      {title ? (
        <div className="engraved-dim mb-3 text-[11px]">{title}</div>
      ) : null}
      {children}
    </section>
  );
}

export function EngravedLabel({
  children,
  dim = false,
  className = "",
}: {
  children: ReactNode;
  dim?: boolean;
  className?: string;
}) {
  return (
    <span className={`${dim ? "engraved-dim" : "engraved"} text-[11px] ${className}`}>
      {children}
    </span>
  );
}

export function Badge() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-6 w-6 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, var(--lcd-green) 0%, var(--lcd-green-dim) 45%, var(--chassis-shadow) 100%)",
          boxShadow: "inset 0 -1px 2px oklch(0 0 0 / 0.5), 0 0 6px var(--lcd-glow)",
        }}
        aria-hidden
      />
      <div className="flex flex-col leading-tight">
        <span className="engraved text-[10px]">TXPPS</span>
        <span
          className="font-mono text-[15px] tracking-widest"
          style={{ color: "var(--engraving-highlight)" }}
        >
          TX-8P
        </span>
        <span className="engraved-dim text-[9px]">Hybrid Poly Synthesizer</span>
      </div>
    </div>
  );
}
