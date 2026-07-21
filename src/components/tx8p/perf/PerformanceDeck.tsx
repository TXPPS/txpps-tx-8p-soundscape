import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { Keyboard } from "@/components/tx8p/keyboard/Keyboard";
import { PitchModStrip } from "@/components/tx8p/perf/PitchModStrip";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";
import { useMobilePortrait } from "@/hooks/use-portrait";

/**
 * Integrated performance deck: pitch + mod strips, octave utility
 * column, and keyboard share one recessed chassis bed. Layout tracks
 * the TX27 ergonomics — broad and shallow, keyboard fills all
 * remaining horizontal space.
 *
 * Layouts:
 *  - default (desktop / tablet / landscape phone):
 *      [PITCH][MOD] · [OCT column] · [KEYBOARD flex]
 *  - mobile portrait:
 *      [compact utility row · PITCH horizontal · MOD horizontal] ·
 *      [KEYBOARD anchored to the bottom]
 */
export function PerformanceDeck() {
  const {
    pitch,
    mod,
    hold,
    octave,
    setPitch,
    setMod,
    toggleHold,
    stepOctave,
  } = usePerfStore();
  const flashLcd = useUiStore((s) => s.flashLcd);
  const portrait = useMobilePortrait();

  const flashOctave = (next: number) =>
    flashLcd(
      { kind: "message", line1: "OCTAVE", line2: `${next >= 0 ? "+" : ""}${next}` },
      700,
    );

  const octLcd = (
    <div
      className="grid place-items-center rounded-[2px] font-mono"
      style={{
        background: "var(--lcd-bg)",
        color: "var(--lcd-amber)",
        boxShadow: "var(--shadow-lcd-inset)",
        textShadow: "0 0 3px var(--lcd-glow)",
        fontSize: 11,
        letterSpacing: "0.06em",
        minWidth: 40,
        height: 26,
        padding: "0 6px",
      }}
      aria-label={`Current octave ${octave >= 0 ? "+" : ""}${octave}`}
    >
      {octave >= 0 ? `+${octave}` : octave}
    </div>
  );

  const bedStyle: React.CSSProperties = {
    background:
      "linear-gradient(180deg, oklch(0.20 0.004 60) 0%, oklch(0.14 0.004 60) 100%)",
    borderTop: "1px solid oklch(0 0 0 / 0.55)",
    boxShadow:
      "inset 0 6px 10px -6px oklch(0 0 0 / 0.65), inset 0 -1px 0 var(--chassis-edge-dark)",
  };

  if (portrait) {
    return (
      <div
        aria-label="Performance deck"
        className="flex w-full flex-col gap-2 px-2 pt-2"
        style={{
          ...bedStyle,
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
      >
        {/* Utility row: octave -/display/+, hold */}
        <div className="flex items-center gap-1.5">
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
          {octLcd}
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
          <div className="ml-auto">
            <ProgramButton
              color="amber"
              active={hold}
              onClick={toggleHold}
              ariaLabel="Hold"
            >
              Hold
            </ProgramButton>
          </div>
        </div>

        {/* Horizontal pitch / mod strips */}
        <PitchModStrip
          label="Pitch"
          value={pitch}
          onChange={setPitch}
          onRelease={() => setPitch(0)}
          bipolar
          horizontal
        />
        <PitchModStrip
          label="Mod"
          value={mod}
          onChange={setMod}
          horizontal
          accent="var(--lcd-amber)"
        />

        {/* Keyboard */}
        <div style={{ height: "min(20vh, 150px)", minHeight: 110 }}>
          <Keyboard startOctave={4} octaveCount={2} />
        </div>
      </div>
    );
  }

  // Default row layout (desktop, tablet, landscape phone).
  return (
    <div
      aria-label="Performance deck"
      className="flex w-full items-stretch gap-2 px-2 pt-2 pb-2"
      style={{
        ...bedStyle,
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        height: "clamp(160px, 26vh, 220px)",
      }}
    >
      {/* Pitch + Mod rail */}
      <div className="flex shrink-0 items-stretch gap-1.5" style={{ width: 60 }}>
        <div className="flex-1">
          <PitchModStrip
            label="Pitch"
            value={pitch}
            onChange={setPitch}
            onRelease={() => setPitch(0)}
            bipolar
          />
        </div>
        <div className="flex-1">
          <PitchModStrip
            label="Mod"
            value={mod}
            onChange={setMod}
            accent="var(--lcd-amber)"
          />
        </div>
      </div>

      {/* Octave utility column */}
      <div
        className="flex shrink-0 flex-col gap-1.5"
        style={{ width: 64 }}
      >
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
        {octLcd}
        <ProgramButton
          color="amber"
          active={hold}
          onClick={toggleHold}
          ariaLabel="Hold"
        >
          Hold
        </ProgramButton>
      </div>

      {/* Keyboard */}
      <div className="min-w-0 flex-1">
        <Keyboard startOctave={3} octaveCount={4} />
      </div>
    </div>
  );
}
