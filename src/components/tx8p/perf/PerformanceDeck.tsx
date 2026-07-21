import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { Keyboard } from "@/components/tx8p/keyboard/Keyboard";
import { PitchModStrip } from "@/components/tx8p/perf/PitchModStrip";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";
import { useViewportClass } from "@/hooks/use-portrait";

/**
 * Integrated performance deck: Pitch + Mod, octave utility, Hold, and
 * the keyboard share one recessed chassis bed. Three responsive layouts:
 *
 *  - `wide` (desktop / tablet):
 *      [PITCH][MOD] · [OCT column] · [KEYBOARD flex]
 *      Pitch and Mod each get their own recessed track with a label
 *      above and independent indicator (no shared visual track).
 *
 *  - `mobile-portrait`:
 *      Single compact row directly above the keyboard:
 *      [PITCH][MOD][OCT-][OCT][OCT+][HOLD] · [KEYBOARD docked below]
 *      No large empty middle area between editor and keyboard.
 *
 *  - `mobile-landscape`:
 *      [narrow left rail: PITCH · MOD · OCT± · HOLD] · [KEYBOARD]
 *      Editor collapses out of the performance area (owned by the
 *      surrounding page layout).
 */
export function PerformanceDeck() {
  const { pitch, mod, hold, octave, setPitch, setMod, toggleHold, stepOctave } = usePerfStore();
  const flashLcd = useUiStore((s) => s.flashLcd);
  const cls = useViewportClass();

  const flashOctave = (next: number) =>
    flashLcd({ kind: "message", line1: "OCTAVE", line2: `${next >= 0 ? "+" : ""}${next}` }, 700);

  const bedStyle: React.CSSProperties = {
    background: "linear-gradient(180deg, oklch(0.20 0.004 60) 0%, oklch(0.14 0.004 60) 100%)",
    borderTop: "1px solid oklch(0 0 0 / 0.55)",
    boxShadow: "inset 0 6px 10px -6px oklch(0 0 0 / 0.65), inset 0 -1px 0 var(--chassis-edge-dark)",
  };

  const octDisplay = (compact = false) => (
    <div
      className="grid place-items-center rounded-[2px] font-mono"
      style={{
        background: "var(--lcd-bg)",
        color: "var(--lcd-amber)",
        boxShadow: "var(--shadow-lcd-inset)",
        textShadow: "0 0 3px var(--lcd-glow)",
        fontSize: compact ? 10 : 11,
        letterSpacing: "0.06em",
        minWidth: compact ? 30 : 40,
        height: compact ? 22 : 26,
        padding: "0 6px",
      }}
      aria-label={`Current octave ${octave >= 0 ? "+" : ""}${octave}`}
    >
      {octave >= 0 ? `+${octave}` : octave}
    </div>
  );

  // ---------- MOBILE PORTRAIT ----------
  if (cls === "mobile-portrait") {
    return (
      <div
        aria-label="Performance deck"
        className="flex w-full flex-col gap-1.5 px-2 pt-2"
        style={{
          ...bedStyle,
          paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
        }}
      >
        {/* Single compact performance row */}
        <div className="flex items-stretch gap-1.5" style={{ height: 44 }}>
          <PerfMiniStrip
            label="PITCH"
            value={pitch}
            onChange={setPitch}
            onRelease={() => setPitch(0)}
            bipolar
          />
          <PerfMiniStrip label="MOD" value={mod} onChange={setMod} accent="var(--lcd-amber)" />
          <ProgramButton
            color="cream"
            onClick={() => {
              stepOctave(-1);
              flashOctave(octave - 1);
            }}
            ariaLabel="Octave down"
          >
            −
          </ProgramButton>
          {octDisplay(true)}
          <ProgramButton
            color="cream"
            onClick={() => {
              stepOctave(1);
              flashOctave(octave + 1);
            }}
            ariaLabel="Octave up"
          >
            +
          </ProgramButton>
          <ProgramButton color="amber" active={hold} onClick={toggleHold} ariaLabel="Hold">
            HOLD
          </ProgramButton>
        </div>

        {/* Keyboard docked directly below */}
        <div style={{ height: "min(22vh, 160px)", minHeight: 120 }}>
          <Keyboard startOctave={4} octaveCount={2} />
        </div>
      </div>
    );
  }

  // ---------- MOBILE LANDSCAPE ----------
  if (cls === "mobile-landscape") {
    return (
      <div
        aria-label="Performance deck"
        className="flex w-full items-stretch gap-1.5 px-1.5 py-1.5"
        style={{
          ...bedStyle,
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Compact left rail */}
        <div className="flex shrink-0 flex-col gap-1" style={{ width: 96 }}>
          <div className="flex flex-1 items-stretch gap-1" style={{ minHeight: 0 }}>
            <RecessedTrack label="PITCH">
              <PitchModStrip
                label="Pitch"
                value={pitch}
                onChange={setPitch}
                onRelease={() => setPitch(0)}
                bipolar
              />
            </RecessedTrack>
            <RecessedTrack label="MOD">
              <PitchModStrip label="Mod" value={mod} onChange={setMod} accent="var(--lcd-amber)" />
            </RecessedTrack>
          </div>
          <div className="flex items-center gap-1">
            <ProgramButton
              color="cream"
              onClick={() => {
                stepOctave(-1);
                flashOctave(octave - 1);
              }}
              ariaLabel="Octave down"
            >
              −
            </ProgramButton>
            {octDisplay(true)}
            <ProgramButton
              color="cream"
              onClick={() => {
                stepOctave(1);
                flashOctave(octave + 1);
              }}
              ariaLabel="Octave up"
            >
              +
            </ProgramButton>
          </div>
          <ProgramButton color="amber" active={hold} onClick={toggleHold} ariaLabel="Hold">
            HOLD
          </ProgramButton>
        </div>

        {/* Keyboard */}
        <div className="min-w-0 flex-1">
          <Keyboard startOctave={3} octaveCount={3} />
        </div>
      </div>
    );
  }

  // ---------- WIDE (desktop / tablet) ----------
  return (
    <div
      aria-label="Performance deck"
      className="flex w-full items-stretch gap-2 px-2 pt-2 pb-2"
      style={{
        ...bedStyle,
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        height: "clamp(170px, 26vh, 230px)",
      }}
    >
      {/* Pitch and Mod, each in its own recessed track with header label */}
      <div className="flex shrink-0 items-stretch gap-2" style={{ width: 108 }}>
        <RecessedTrack label="PITCH">
          <PitchModStrip
            label="Pitch"
            value={pitch}
            onChange={setPitch}
            onRelease={() => setPitch(0)}
            bipolar
          />
        </RecessedTrack>
        <RecessedTrack label="MOD">
          <PitchModStrip label="Mod" value={mod} onChange={setMod} accent="var(--lcd-amber)" />
        </RecessedTrack>
      </div>

      {/* Octave utility column */}
      <div className="flex shrink-0 flex-col gap-1.5" style={{ width: 68 }}>
        <ProgramButton
          color="cream"
          onClick={() => {
            stepOctave(1);
            flashOctave(octave + 1);
          }}
          ariaLabel="Octave up"
        >
          OCT +
        </ProgramButton>
        <ProgramButton
          color="cream"
          onClick={() => {
            stepOctave(-1);
            flashOctave(octave - 1);
          }}
          ariaLabel="Octave down"
        >
          OCT −
        </ProgramButton>
        {octDisplay()}
        <ProgramButton color="amber" active={hold} onClick={toggleHold} ariaLabel="Hold">
          HOLD
        </ProgramButton>
      </div>

      {/* Keyboard fills remaining width */}
      <div className="min-w-0 flex-1">
        <Keyboard startOctave={3} octaveCount={4} />
      </div>
    </div>
  );
}

/**
 * Compact vertical mini-strip used inside the phone-portrait perf row.
 * A tiny recessed track with a top-aligned label and its own indicator.
 * Reuses PitchModStrip's drag logic through a small wrapper — same hit
 * behavior, tight visual footprint.
 */
function PerfMiniStrip({
  label,
  value,
  onChange,
  onRelease,
  bipolar,
  accent = "var(--btn-cream)",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onRelease?: () => void;
  bipolar?: boolean;
  accent?: string;
}) {
  return (
    <div className="relative flex shrink-0 flex-col items-stretch" style={{ width: 40 }}>
      <span
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 font-sans font-semibold"
        style={{
          fontSize: 7,
          letterSpacing: "0.18em",
          color: "var(--engraving-chassis-dim)",
          zIndex: 2,
        }}
      >
        {label}
      </span>
      <div className="flex-1 pt-[9px]">
        <PitchModStrip
          label={label}
          value={value}
          onChange={onChange}
          onRelease={onRelease}
          bipolar={bipolar}
          accent={accent}
        />
      </div>
    </div>
  );
}

/**
 * Wraps a Pitch/Mod strip in an independently recessed frame with a
 * header label. Fixes the earlier "shared track" look where the two
 * strips visually merged.
 */
function RecessedTrack({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-w-0 flex-col items-stretch gap-1">
      <span
        className="text-center font-sans font-semibold"
        style={{
          fontSize: 8,
          letterSpacing: "0.24em",
          color: "var(--engraving-chassis-dim)",
        }}
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
