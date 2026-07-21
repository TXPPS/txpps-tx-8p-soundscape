import { useCallback, useRef, useState } from "react";

interface WheelProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  spring?: boolean;
  label: string;
}

/**
 * Compact vertical hardware lever slider (not a wheel).
 * Narrow travel, flat cap, ivory indicator line. Replaces the
 * previous oversized modern-controller wheel with something
 * closer in feel to a 1980s programming synth's performance strip.
 */
export function Wheel({ value, onChange, min, max, spring, label }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startVal = useRef(0);
  const [dragging, setDragging] = useState(false);

  const range = max - min;
  const t = (value - min) / range; // 0..1
  const y = (1 - t) * 100; // top offset %

  const release = useCallback(() => {
    setDragging(false);
    if (spring) onChange((min + max) / 2);
  }, [spring, onChange, min, max]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={ref}
        data-tx-control
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          startY.current = e.clientY;
          startVal.current = value;
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          const rect = ref.current!.getBoundingClientRect();
          const dy = startY.current - e.clientY;
          const delta = (dy / rect.height) * range;
          onChange(Math.max(min, Math.min(max, startVal.current + delta)));
        }}
        onPointerUp={release}
        onPointerCancel={release}
        className="relative"
        style={{
          width: 18,
          height: 96,
          borderRadius: 2,
          background:
            "linear-gradient(180deg, oklch(0.16 0.004 60) 0%, oklch(0.22 0.004 60) 100%)",
          boxShadow:
            "inset 0 0 0 1px oklch(0 0 0 / 0.6), inset 0 2px 4px oklch(0 0 0 / 0.7)",
        }}
      >
        {/* travel scale ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <div
            key={p}
            aria-hidden
            className="absolute left-full ml-1 h-px w-1.5"
            style={{
              top: `${p * 100}%`,
              background: "var(--engraving-chassis-dim)",
              opacity: p === 0.5 ? 0.9 : 0.5,
            }}
          />
        ))}
        {/* center reference for spring lever */}
        {spring && (
          <div
            aria-hidden
            className="absolute inset-x-0 h-px"
            style={{
              top: "50%",
              background: "oklch(1 0 0 / 0.15)",
            }}
          />
        )}
        {/* lever cap */}
        <div
          className="absolute -left-1 -right-1 h-[10px]"
          style={{
            top: `calc(${y}% - 5px)`,
            borderRadius: 2,
            background:
              "linear-gradient(180deg, oklch(0.38 0.005 60) 0%, oklch(0.26 0.005 60) 50%, oklch(0.16 0.004 60) 100%)",
            boxShadow:
              "0 1px 0 oklch(1 0 0 / 0.10), 0 -1px 0 oklch(0 0 0 / 0.5), inset 0 0 0 1px oklch(0 0 0 / 0.5)",
            transition: dragging ? "none" : "top 180ms var(--ease-standard)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2"
            style={{ background: "var(--key-white)" }}
          />
        </div>
      </div>
      <span
        className="engraved text-[8px]"
        style={{ color: "var(--engraving-chassis)" }}
      >
        {label}
      </span>
    </div>
  );
}
