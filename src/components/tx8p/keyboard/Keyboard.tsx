import { useCallback, useRef, useState } from "react";

const OCTAVE_PATTERN = [
  { note: "C", black: false },
  { note: "C#", black: true },
  { note: "D", black: false },
  { note: "D#", black: true },
  { note: "E", black: false },
  { note: "F", black: false },
  { note: "F#", black: true },
  { note: "G", black: false },
  { note: "G#", black: true },
  { note: "A", black: false },
  { note: "A#", black: true },
  { note: "B", black: false },
] as const;

interface Key {
  midi: number;
  note: string;
  black: boolean;
  octave: number;
}

function buildKeys(startOctave: number, octaveCount: number): Key[] {
  const keys: Key[] = [];
  for (let o = 0; o < octaveCount; o++) {
    const octave = startOctave + o;
    OCTAVE_PATTERN.forEach((k, i) => {
      keys.push({
        midi: (octave + 1) * 12 + i,
        note: k.note,
        black: k.black,
        octave,
      });
    });
  }
  keys.push({ midi: (startOctave + octaveCount + 1) * 12, note: "C", black: false, octave: startOctave + octaveCount });
  return keys;
}

/**
 * Wide integrated keyboard. Restrained ivory whites, dark charcoal
 * blacks, subtle recess into the chassis. No oversized rounded
 * corners — a real hardware feel.
 */
export function Keyboard({
  startOctave = 3,
  octaveCount = 3,
}: {
  startOctave?: number;
  octaveCount?: number;
}) {
  const keys = buildKeys(startOctave, octaveCount);
  const whites = keys.filter((k) => !k.black);
  const [held, setHeld] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const press = useCallback((midi: number) => {
    setHeld((prev) => {
      if (prev.has(midi)) return prev;
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
  }, []);
  const release = useCallback((midi: number) => {
    setHeld((prev) => {
      if (!prev.has(midi)) return prev;
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  const whiteCount = whites.length;
  // Slight top recess so keyboard reads as integrated into chassis.
  return (
    <div
      className="w-full"
      style={{
        background: "linear-gradient(180deg, var(--chassis-shadow) 0%, var(--chassis-base) 100%)",
        padding: "8px 10px 14px",
        boxShadow:
          "inset 0 6px 10px -6px oklch(0 0 0 / 0.55), inset 0 -1px 0 var(--chassis-edge-dark)",
      }}
    >
      <div
        ref={containerRef}
        role="group"
        aria-label="Playable keyboard"
        className="relative mx-auto"
        style={{
          height: 140,
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {/* White keys */}
        <div className="flex h-full w-full">
          {whites.map((k) => {
            const active = held.has(k.midi);
            const isC = k.note === "C";
            return (
              <button
                key={k.midi}
                type="button"
                data-tx-control
                aria-label={`${k.note}${k.octave}`}
                aria-pressed={active}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  press(k.midi);
                }}
                onPointerUp={() => release(k.midi)}
                onPointerLeave={() => release(k.midi)}
                onPointerCancel={() => release(k.midi)}
                className="relative flex-1 select-none"
                style={{
                  background: active
                    ? "linear-gradient(180deg, var(--key-white-shadow) 0%, var(--key-white) 90%)"
                    : "linear-gradient(180deg, var(--key-white) 0%, var(--key-white) 88%, var(--key-white-shadow) 100%)",
                  borderRight: "1px solid oklch(0 0 0 / 0.35)",
                  boxShadow: active
                    ? "inset 0 2px 3px oklch(0 0 0 / 0.35)"
                    : "inset 0 -3px 0 oklch(0 0 0 / 0.10)",
                  borderRadius: "0 0 2px 2px",
                }}
              >
                {isC && (
                  <span
                    className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[8px]"
                    style={{ color: "var(--engraving-chassis-dim)" }}
                  >
                    C{k.octave}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Black keys */}
        <div className="pointer-events-none absolute inset-0">
          {(() => {
            const nodes: React.ReactNode[] = [];
            const whiteWidthPct = 100 / whiteCount;
            let whiteIdx = 0;
            keys.forEach((k) => {
              if (!k.black) {
                whiteIdx++;
                return;
              }
              const leftPct = whiteIdx * whiteWidthPct - whiteWidthPct * 0.3;
              const active = held.has(k.midi);
              nodes.push(
                <button
                  key={k.midi}
                  type="button"
                  data-tx-control
                  aria-label={`${k.note}${k.octave}`}
                  aria-pressed={active}
                  onPointerDown={(e) => {
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    press(k.midi);
                  }}
                  onPointerUp={() => release(k.midi)}
                  onPointerLeave={() => release(k.midi)}
                  onPointerCancel={() => release(k.midi)}
                  className="pointer-events-auto absolute"
                  style={{
                    left: `${leftPct}%`,
                    top: 0,
                    width: `${whiteWidthPct * 0.6}%`,
                    height: "62%",
                    borderRadius: "0 0 2px 2px",
                    background: active
                      ? "linear-gradient(180deg, oklch(0.12 0.004 60) 0%, oklch(0.20 0.004 60) 100%)"
                      : "linear-gradient(180deg, var(--key-black-top) 0%, var(--key-black) 70%, oklch(0.12 0.004 60) 100%)",
                    boxShadow: active
                      ? "inset 0 3px 4px oklch(0 0 0 / 0.7)"
                      : "0 2px 3px oklch(0 0 0 / 0.55), inset 0 -2px 0 oklch(0 0 0 / 0.5)",
                  }}
                />,
              );
            });
            return nodes;
          })()}
        </div>
      </div>
    </div>
  );
}
