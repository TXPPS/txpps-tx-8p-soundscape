import { useEffect, useMemo, useRef, useState } from "react";
import { usePerfStore } from "@/state/perfStore";

// Simple visual keyboard (no sound in M1 — audio in M2).
// Multi-touch, pointer-authoritative pattern established here for reuse.

const WHITE_PATTERN = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
const BLACK_PATTERN: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // maps semitone -> white index

interface KeyInfo {
  midi: number;
  isBlack: boolean;
  whiteIndex: number;
}

function buildKeys(startMidi: number, whiteCount: number): KeyInfo[] {
  const keys: KeyInfo[] = [];
  let midi = startMidi;
  let whitesEmitted = 0;
  while (whitesEmitted < whiteCount) {
    const pc = ((midi % 12) + 12) % 12;
    if (WHITE_PATTERN.includes(pc)) {
      keys.push({ midi, isBlack: false, whiteIndex: whitesEmitted });
      whitesEmitted++;
    } else {
      keys.push({ midi, isBlack: true, whiteIndex: whitesEmitted - 1 });
    }
    midi++;
  }
  return keys;
}

export function Keyboard() {
  const octave = usePerfStore((s) => s.octave);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointers = useRef(new Map<number, number>()); // pointerId -> midi
  const [pressed, setPressed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const whiteWidth = 44;
  const whiteCount = Math.max(7, Math.floor(width / whiteWidth));
  const startMidi = 48 + octave * 12; // C3 baseline

  const keys = useMemo(
    () => buildKeys(startMidi, whiteCount),
    [startMidi, whiteCount],
  );
  const totalWidth = whiteCount * whiteWidth;

  const setKey = (midi: number, on: boolean) => {
    setPressed((prev) => {
      const next = new Set(prev);
      if (on) next.add(midi);
      else next.delete(midi);
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent, midi: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, midi);
    setKey(midi, true);
    // TODO M2: engine.noteOn(midi, vel)
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    // Slide-to-play across keys
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!el) return;
    const nextMidi = Number(el.dataset.midi);
    if (!nextMidi) return;
    const prevMidi = activePointers.current.get(e.pointerId)!;
    if (nextMidi !== prevMidi) {
      setKey(prevMidi, false);
      setKey(nextMidi, true);
      activePointers.current.set(e.pointerId, nextMidi);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const midi = activePointers.current.get(e.pointerId);
    if (midi !== undefined) {
      setKey(midi, false);
      activePointers.current.delete(e.pointerId);
    }
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="panel-recessed relative overflow-hidden p-2"
      style={{ touchAction: "none" }}
    >
      <div
        className="relative mx-auto"
        style={{ width: totalWidth, height: 150 }}
        onPointerMove={onPointerMove}
      >
        {/* white keys */}
        {keys
          .filter((k) => !k.isBlack)
          .map((k) => {
            const isPressed = pressed.has(k.midi);
            return (
              <button
                key={k.midi}
                data-midi={k.midi}
                data-tx-control
                onPointerDown={(e) => onPointerDown(e, k.midi)}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-label={`Note ${k.midi}`}
                className="absolute top-0 rounded-b-[3px] transition-[transform,filter] duration-75"
                style={{
                  left: k.whiteIndex * whiteWidth,
                  width: whiteWidth - 1,
                  height: 150,
                  background: isPressed
                    ? "linear-gradient(180deg, oklch(0.90 0.02 80) 0%, oklch(0.72 0.02 80) 100%)"
                    : "linear-gradient(180deg, oklch(0.94 0.008 80) 0%, oklch(0.80 0.008 80) 100%)",
                  boxShadow:
                    "inset 0 -3px 0 oklch(0 0 0 / 0.25), inset 0 0 0 1px oklch(0 0 0 / 0.35), 0 2px 3px oklch(0 0 0 / 0.4)",
                  transform: isPressed ? "translateY(1px)" : "none",
                }}
              />
            );
          })}
        {/* black keys */}
        {keys
          .filter((k) => k.isBlack)
          .map((k) => {
            const pc = ((k.midi % 12) + 12) % 12;
            const wIdx = BLACK_PATTERN[pc];
            if (wIdx === undefined) return null;
            const left = (k.whiteIndex + 1) * whiteWidth - whiteWidth * 0.35;
            const isPressed = pressed.has(k.midi);
            return (
              <button
                key={k.midi}
                data-midi={k.midi}
                data-tx-control
                onPointerDown={(e) => onPointerDown(e, k.midi)}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                aria-label={`Note ${k.midi}`}
                className="absolute top-0 rounded-b-[3px]"
                style={{
                  left,
                  width: whiteWidth * 0.7,
                  height: 95,
                  background: isPressed
                    ? "linear-gradient(180deg, oklch(0.28 0.004 60) 0%, oklch(0.18 0.004 60) 100%)"
                    : "linear-gradient(180deg, oklch(0.20 0.004 60) 0%, oklch(0.10 0.004 60) 100%)",
                  boxShadow:
                    "inset 0 -2px 0 oklch(0 0 0 / 0.6), 0 2px 3px oklch(0 0 0 / 0.7), inset 0 0 0 1px oklch(0 0 0 / 0.6)",
                  transform: isPressed ? "translateY(1px)" : "none",
                }}
              />
            );
          })}
      </div>
    </div>
  );
}
