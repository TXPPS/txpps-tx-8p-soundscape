import { useCallback, useRef, useState } from "react";

interface WheelProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  spring?: boolean;
  label: string;
}

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
    <div className="flex flex-col items-center gap-1.5">
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
        className="relative overflow-hidden"
        style={{
          width: 30,
          height: 110,
          borderRadius: 6,
          background:
            "linear-gradient(90deg, oklch(0.14 0.004 60) 0%, oklch(0.22 0.004 60) 50%, oklch(0.14 0.004 60) 100%)",
          boxShadow:
            "inset 0 0 0 1px oklch(0 0 0 / 0.6), inset 0 2px 4px oklch(0 0 0 / 0.5)",
        }}
      >
        {/* wheel indicator groove */}
        <div
          className="absolute left-0 right-0 h-[14px]"
          style={{
            top: `calc(${y}% - 7px)`,
            background:
              "linear-gradient(180deg, oklch(0.36 0.006 60) 0%, oklch(0.22 0.005 60) 50%, oklch(0.12 0.004 60) 100%)",
            boxShadow:
              "0 1px 0 oklch(1 0 0 / 0.05), 0 -1px 0 oklch(0 0 0 / 0.6), inset 0 0 0 1px oklch(0 0 0 / 0.4)",
            transition: dragging ? "none" : "top 180ms var(--ease-standard)",
          }}
        />
        {/* center marker for pitch */}
        {spring && (
          <div
            aria-hidden
            className="absolute inset-x-0 h-px"
            style={{
              top: "50%",
              background: "var(--engraving-dim)",
              opacity: 0.4,
            }}
          />
        )}
      </div>
      <span className="engraved text-[9px]">{label}</span>
    </div>
  );
}
