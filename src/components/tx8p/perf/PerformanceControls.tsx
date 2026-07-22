import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { PitchModStrip } from "@/components/tx8p/perf/PitchModStrip";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";

/**
 * Shared performance controls used by every layout variant. One
 * authoritative state path (perfStore) drives all of them, so portrait and
 * landscape never diverge. Adapted from the TX27 performance model:
 * compact Pitch (spring-return) + Mod (stays put) + Octave ± with display +
 * Sustain/Hold latch.
 */

/** Recessed frame with a small header label — keeps controls visually distinct. */
export function ControlWell({
  label,
  children,
  width,
}: {
  label: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="flex min-w-0 flex-col items-stretch gap-1"
      style={width ? { width } : undefined}
    >
      <span
        className="text-center font-sans font-semibold"
        style={{ fontSize: 8, letterSpacing: "0.2em", color: "var(--engraving-chassis-dim)" }}
      >
        {label}
      </span>
      <div
        className="flex flex-1 items-stretch justify-center rounded-[3px] px-1 py-1"
        style={{
          background: "linear-gradient(180deg, oklch(0.10 0.004 60) 0%, oklch(0.16 0.004 60) 100%)",
          boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.55), inset 0 2px 3px oklch(0 0 0 / 0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Pitch bend — springs back to centre on release, integrates with MIDI bend. */
export function PitchControl({ width = 40 }: { width?: number }) {
  const pitch = usePerfStore((s) => s.pitch);
  const setPitch = usePerfStore((s) => s.setPitch);
  return (
    <ControlWell label="PITCH" width={width}>
      <PitchModStrip
        label=""
        value={pitch}
        onChange={setPitch}
        onRelease={() => setPitch(0)}
        bipolar
        accent="var(--btn-cream)"
      />
    </ControlWell>
  );
}

/** Modulation — holds its position, integrates with CC1 and the mod matrix. */
export function ModControl({ width = 40 }: { width?: number }) {
  const mod = usePerfStore((s) => s.mod);
  const setMod = usePerfStore((s) => s.setMod);
  return (
    <ControlWell label="MOD" width={width}>
      <PitchModStrip label="" value={mod} onChange={setMod} accent="var(--lcd-amber)" />
    </ControlWell>
  );
}

/** Compact octave display shared by the octave controls. */
export function OctaveDisplay({ compact = false }: { compact?: boolean }) {
  const octave = usePerfStore((s) => s.octave);
  return (
    <div
      className="grid place-items-center rounded-[2px] font-mono"
      style={{
        background: "var(--lcd-bg)",
        color: "var(--lcd-amber)",
        boxShadow: "var(--shadow-lcd-inset)",
        textShadow: "0 0 3px var(--lcd-glow)",
        fontSize: compact ? 10 : 11,
        letterSpacing: "0.04em",
        minWidth: compact ? 30 : 38,
        height: compact ? 24 : 28,
        padding: "0 6px",
      }}
      aria-label={`Current octave ${octave >= 0 ? "+" : ""}${octave}`}
    >
      {octave >= 0 ? `+${octave}` : octave}
    </div>
  );
}

/** OCT − / display / OCT +. `layout` picks row (portrait) or stack (rail). */
export function OctaveControls({
  layout = "row",
  compact = false,
}: {
  layout?: "row" | "stack";
  compact?: boolean;
}) {
  const octave = usePerfStore((s) => s.octave);
  const stepOctave = usePerfStore((s) => s.stepOctave);
  const flash = useUiStore((s) => s.flashLcd);
  const step = (d: number) => {
    stepOctave(d);
    const next = Math.max(-3, Math.min(3, octave + d));
    flash({ kind: "message", line1: "OCTAVE", line2: `${next >= 0 ? "+" : ""}${next}` }, 700);
  };
  const down = (
    <ProgramButton color="cream" onClick={() => step(-1)} ariaLabel="Octave down">
      {compact ? "−" : "OCT −"}
    </ProgramButton>
  );
  const up = (
    <ProgramButton color="cream" onClick={() => step(1)} ariaLabel="Octave up">
      {compact ? "+" : "OCT +"}
    </ProgramButton>
  );
  if (layout === "stack") {
    return (
      <div className="flex flex-col items-stretch gap-1">
        {up}
        <OctaveDisplay compact={compact} />
        {down}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {down}
      <OctaveDisplay compact={compact} />
      {up}
    </div>
  );
}

/** Sustain / Hold latch — one tap on, one tap off; releases held notes off. */
export function SustainControl() {
  const hold = usePerfStore((s) => s.hold);
  const toggleHold = usePerfStore((s) => s.toggleHold);
  return (
    <ProgramButton
      color={hold ? "amber" : "cream"}
      active={hold}
      onClick={toggleHold}
      ariaLabel="Hold / Sustain"
    >
      HOLD
    </ProgramButton>
  );
}
