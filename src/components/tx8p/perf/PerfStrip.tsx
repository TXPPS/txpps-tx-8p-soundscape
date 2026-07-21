import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { Wheel } from "@/components/tx8p/perf/Wheel";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";

/**
 * Left-hand performance area — narrow vertical column. Levers for
 * pitch/mod, small cream buttons for hold and octave, and a
 * read-only mode indicator. Panic has moved to the top-right of
 * the identity bar; detailed voice-mode editing lives in the
 * VOICE tab.
 */
export function PerfStrip() {
  const {
    pitch,
    mod,
    hold,
    octave,
    voiceMode,
    unisonCount,
    setPitch,
    setMod,
    toggleHold,
    stepOctave,
  } = usePerfStore();
  const flashLcd = useUiStore((s) => s.flashLcd);

  const flashOctave = (next: number) =>
    flashLcd(
      { kind: "message", line1: "OCTAVE", line2: `${next >= 0 ? "+" : ""}${next}` },
      700,
    );

  const modeLabel =
    voiceMode === "UNISON" ? `UNI ${unisonCount}` : voiceMode;

  return (
    <aside
      className="perf-panel flex flex-col gap-4 px-3 py-4"
      aria-label="Performance controls"
    >
      <EngravedLabel variant="chassis-dim" className="text-[9px]">
        Performance
      </EngravedLabel>

      {/* Levers */}
      <div className="flex justify-around">
        <Wheel value={pitch} onChange={setPitch} min={-1} max={1} spring label="Bend" />
        <Wheel value={mod} onChange={setMod} min={0} max={1} label="Mod" />
      </div>

      {/* Octave */}
      <div className="flex flex-col gap-1.5">
        <EngravedLabel variant="chassis-dim">Octave</EngravedLabel>
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
          <div
            className="grid h-[26px] flex-1 place-items-center rounded-[2px] font-mono text-[11px]"
            style={{
              background: "var(--lcd-bg)",
              color: "var(--lcd-amber)",
              boxShadow: "var(--shadow-lcd-inset)",
              textShadow: "0 0 3px var(--lcd-glow)",
            }}
          >
            {octave >= 0 ? `+${octave}` : octave}
          </div>
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
      </div>

      {/* Hold */}
      <div className="flex flex-col gap-1.5">
        <EngravedLabel variant="chassis-dim">Hold</EngravedLabel>
        <ProgramButton color="amber" active={hold} onClick={toggleHold} ariaLabel="Hold">
          Hold
        </ProgramButton>
      </div>

      {/* Compact mode indicator (read-only; edit lives on VOICE tab) */}
      <div className="flex flex-col gap-1.5">
        <EngravedLabel variant="chassis-dim">Mode</EngravedLabel>
        <div
          className="grid h-[26px] place-items-center rounded-[2px] font-mono text-[10px] tracking-widest"
          style={{
            background: "var(--lcd-bg)",
            color: "var(--lcd-amber)",
            boxShadow: "var(--shadow-lcd-inset)",
            textShadow: "0 0 3px var(--lcd-glow)",
          }}
          aria-label={`Current voice mode ${modeLabel}`}
        >
          {modeLabel}
        </div>
      </div>

      <div className="flex-1" />
    </aside>
  );
}
