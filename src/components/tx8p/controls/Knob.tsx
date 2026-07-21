import { useCallback, useEffect, useRef, useState } from "react";
import { useUiStore } from "@/state/uiStore";

interface KnobProps {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  bipolar?: boolean;
  size?: "sm" | "md" | "lg";
  displayValue?: string;
}

const SIZE: Record<NonNullable<KnobProps["size"]>, number> = {
  sm: 36,
  md: 48,
  lg: 64,
};

export function Knob({
  label,
  value,
  onChange,
  bipolar = false,
  size = "md",
  displayValue,
}: KnobProps) {
  const px = SIZE[size];
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startVal = useRef(0);
  const [dragging, setDragging] = useState(false);
  const flashLcd = useUiStore((s) => s.flashLcd);

  // Rotation: -135° at 0, +135° at 1
  const angle = -135 + Math.max(0, Math.min(1, value)) * 270;

  const commitLcd = useCallback(
    (v: number) => {
      flashLcd(
        {
          kind: "param",
          label,
          value: v,
          display: displayValue ?? `${Math.round(v * 100)}%`,
        },
        900,
      );
    },
    [flashLcd, label, displayValue],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    startVal.current = value;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dy = startY.current - e.clientY;
    const scale = e.shiftKey ? 0.001 : e.altKey ? 0.02 : 0.005;
    const next = Math.max(0, Math.min(1, startVal.current + dy * scale));
    onChange(next);
    commitLcd(next);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragging(false);
  };
  const onDoubleClick = () => {
    const def = bipolar ? 0.5 : 0;
    onChange(def);
    commitLcd(def);
  };
  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const step = e.shiftKey ? 0.002 : 0.02;
    const dir = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(0, Math.min(1, value + dir * step));
    onChange(next);
    commitLcd(next);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    let d = 0;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") d = 0.02;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") d = -0.02;
    if (e.key === "PageUp") d = 0.1;
    if (e.key === "PageDown") d = -0.1;
    if (d !== 0) {
      e.preventDefault();
      const next = Math.max(0, Math.min(1, value + d));
      onChange(next);
      commitLcd(next);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        data-tx-control
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={displayValue ?? `${Math.round(value * 100)}%`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        className="relative cursor-ns-resize outline-none"
        style={{ width: px, height: px }}
      >
        {/* skirt / ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, var(--knob-face-highlight) 0%, var(--knob-face) 45%, var(--chassis-shadow) 100%)",
            boxShadow:
              "inset 0 1px 0 oklch(1 0 0 / 0.05), inset 0 -2px 4px oklch(0 0 0 / 0.5), 0 2px 6px oklch(0 0 0 / 0.55)",
          }}
        />
        {/* cap */}
        <div
          className="absolute rounded-full"
          style={{
            inset: px * 0.12,
            background:
              "radial-gradient(circle at 40% 30%, oklch(0.30 0.005 60) 0%, var(--knob-cap) 60%, oklch(0.10 0.004 60) 100%)",
            boxShadow: "var(--shadow-cap)",
            transform: `rotate(${angle}deg)`,
            transition: dragging ? "none" : "transform 120ms var(--ease-standard)",
          }}
        >
          {/* indicator line */}
          <div
            className="absolute left-1/2 top-[8%] h-[38%] w-[2px] -translate-x-1/2 rounded-full"
            style={{
              background: "var(--knob-indicator)",
              boxShadow: "0 0 4px oklch(0.90 0.010 80 / 0.4)",
            }}
          />
        </div>
      </div>
      <span className="engraved text-[10px] leading-none">{label}</span>
    </div>
  );
}
