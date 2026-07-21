import { useCallback, useEffect, useRef } from "react";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onRelease?: () => void;
  bipolar?: boolean;
  horizontal?: boolean;
  accent?: string;
}

/**
 * Narrow charcoal hardware track with a thin cream / amber indicator.
 * Replaces the earlier oversized lever. Vertical by default; horizontal
 * mode is used in the phone-portrait compact row. Full-drag pointer
 * handling with capture; touch target is at least 44 px on the drag axis.
 */
export function PitchModStrip({
  label,
  value,
  onChange,
  onRelease,
  bipolar = false,
  horizontal = false,
  accent = "var(--btn-cream)",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragId = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const onReleaseRef = useRef(onRelease);
  onChangeRef.current = onChange;
  onReleaseRef.current = onRelease;

  const min = bipolar ? -1 : 0;
  const max = 1;
  const norm = (value - min) / (max - min);

  const compute = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return value;
      const r = el.getBoundingClientRect();
      const pct = horizontal
        ? (clientX - r.left) / r.width
        : 1 - (clientY - r.top) / r.height;
      const c = Math.max(0, Math.min(1, pct));
      return min + c * (max - min);
    },
    [horizontal, min, max, value],
  );

  const end = useCallback(
    (id: number) => {
      if (id !== dragId.current) return;
      dragId.current = null;
      if (bipolar && onReleaseRef.current) onReleaseRef.current();
    },
    [bipolar],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerId !== dragId.current) return;
      onChangeRef.current(compute(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => end(e.pointerId);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [compute, end]);

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(3))}
      tabIndex={0}
      data-tx-control
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragId.current = e.pointerId;
        onChangeRef.current(compute(e.clientX, e.clientY));
      }}
      onLostPointerCapture={(e) => end(e.pointerId)}
      className={`relative select-none touch-none ${
        horizontal ? "w-full" : "h-full"
      }`}
      style={{
        // visible track is narrow; full box gives a comfortable hit target.
        width: horizontal ? undefined : 22,
        minWidth: horizontal ? undefined : 44,
        height: horizontal ? 22 : undefined,
        minHeight: horizontal ? 44 : undefined,
        borderRadius: 3,
        background:
          "linear-gradient(180deg, oklch(0.14 0.004 60) 0%, oklch(0.22 0.004 60) 100%)",
        boxShadow:
          "inset 0 0 0 1px oklch(0 0 0 / 0.6), inset 0 2px 4px oklch(0 0 0 / 0.55)",
      }}
    >
      {/* center reference for bipolar */}
      {bipolar && (
        <div
          aria-hidden
          className="absolute"
          style={
            horizontal
              ? { left: "50%", top: 3, bottom: 3, width: 1, background: "oklch(1 0 0 / 0.14)" }
              : { top: "50%", left: 3, right: 3, height: 1, background: "oklch(1 0 0 / 0.14)" }
          }
        />
      )}
      {/* indicator */}
      <div
        aria-hidden
        className="absolute rounded-[1px]"
        style={
          horizontal
            ? {
                left: `${norm * 100}%`,
                top: 3,
                bottom: 3,
                width: 3,
                transform: "translateX(-50%)",
                background: accent,
                boxShadow: `0 0 6px ${accent}`,
              }
            : {
                bottom: `${norm * 100}%`,
                left: 3,
                right: 3,
                height: 3,
                transform: "translateY(50%)",
                background: accent,
                boxShadow: `0 0 6px ${accent}`,
              }
        }
      />
      <span
        className="pointer-events-none absolute font-sans font-semibold"
        style={
          horizontal
            ? {
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 8,
                letterSpacing: "0.22em",
                color: "var(--engraving-dim)",
              }
            : {
                bottom: 4,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 8,
                letterSpacing: "0.22em",
                color: "var(--engraving-dim)",
              }
        }
      >
        {label}
      </span>
    </div>
  );
}
