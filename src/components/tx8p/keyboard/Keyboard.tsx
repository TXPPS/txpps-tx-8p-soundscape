import { useCallback, useEffect, useRef, useState } from "react";
import { getSynthEngine, type VoiceHandle } from "@/engine/SynthEngine";
import { usePerfStore } from "@/state/perfStore";

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
  keys.push({
    midi: (startOctave + octaveCount + 1) * 12,
    note: "C",
    black: false,
    octave: startOctave + octaveCount,
  });
  return keys;
}

/**
 * On-screen keyboard.
 *
 * Ownership model — one entry per active pointer, keyed by
 * `pointerId`. Each entry stores the `VoiceHandle` returned by the
 * engine on press so the release is guaranteed to reach the exact
 * voice that was triggered, even for repeated identical notes or
 * overlapping touches.
 *
 * Cleanup surfaces (deliberately NOT pointerleave — with pointer capture a
 * tiny finger movement fires pointerleave and would cut the note at ~80ms,
 * the premature note-off we're fixing):
 *  - pointerup / pointercancel                  → release that pointer
 *  - `lostpointercapture`                       → release that pointer
 *  - window `blur` / `visibilitychange` (hidden)→ release everything
 *  - engine `panic()` (via top bar) will also clear anything we miss
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
  const ownership = useRef<Map<number, { midi: number; handle: VoiceHandle }>>(new Map());
  const octaveRef = useRef(0);
  octaveRef.current = usePerfStore((s) => s.octave);

  const seqRef = useRef<string[]>([]);
  const logSeq = useCallback((name: string, pointerId: number) => {
    const arr = seqRef.current;
    arr.push(`${name}#${pointerId}`);
    if (arr.length > 8) arr.shift();
    getSynthEngine().reportPointerSequence(arr.join(" → "));
  }, []);

  const press = useCallback((pointerId: number, midi: number) => {
    // Guard against duplicate presses from the same pointer — one physical
    // touch owns exactly one note.
    if (ownership.current.has(pointerId)) return;
    // Apply the current performance octave; the exact sounding note is
    // captured in the handle so releases survive octave changes.
    const sounding = midi + octaveRef.current * 12;
    const handle = getSynthEngine().pressNote("screen", `p${pointerId}`, sounding, 0.9);
    ownership.current.set(pointerId, { midi, handle });
    setHeld((prev) => {
      if (prev.has(midi)) return prev;
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
  }, []);

  const release = useCallback((pointerId: number) => {
    const entry = ownership.current.get(pointerId);
    if (!entry) return;
    ownership.current.delete(pointerId);
    getSynthEngine().releaseNote(entry.handle);
    // Only clear visual held state if no other pointer is still holding
    // the same MIDI note (multitouch on repeated notes).
    const stillHeld = Array.from(ownership.current.values()).some((e) => e.midi === entry.midi);
    if (!stillHeld) {
      setHeld((prev) => {
        if (!prev.has(entry.midi)) return prev;
        const next = new Set(prev);
        next.delete(entry.midi);
        return next;
      });
    }
  }, []);

  const releaseAll = useCallback(() => {
    for (const [id] of Array.from(ownership.current.entries())) {
      release(id);
    }
  }, [release]);

  useEffect(() => {
    const onBlur = () => releaseAll();
    const onVis = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      releaseAll();
    };
  }, [releaseAll]);

  const whiteCount = whites.length;
  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Playable keyboard"
      className="relative h-full w-full touch-none select-none"
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
                // Recover audio FIRST, synchronously in this gesture, before
                // any note processing — this is the iOS interrupted unlock.
                getSynthEngine().recoverFromGesture("keyboard");
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                logSeq("down", e.pointerId);
                press(e.pointerId, k.midi);
              }}
              onPointerUp={(e) => {
                logSeq("up", e.pointerId);
                release(e.pointerId);
              }}
              onPointerCancel={(e) => {
                logSeq("cancel", e.pointerId);
                release(e.pointerId);
              }}
              onLostPointerCapture={(e) => {
                logSeq("lostcapture", e.pointerId);
                release(e.pointerId);
              }}
              className="relative flex-1"
              style={{
                touchAction: "none",
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
                  getSynthEngine().recoverFromGesture("keyboard");
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  logSeq("down", e.pointerId);
                  press(e.pointerId, k.midi);
                }}
                onPointerUp={(e) => {
                  logSeq("up", e.pointerId);
                  release(e.pointerId);
                }}
                onPointerCancel={(e) => {
                  logSeq("cancel", e.pointerId);
                  release(e.pointerId);
                }}
                onLostPointerCapture={(e) => {
                  logSeq("lostcapture", e.pointerId);
                  release(e.pointerId);
                }}
                className="pointer-events-auto absolute"
                style={{
                  touchAction: "none",
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
  );
}
