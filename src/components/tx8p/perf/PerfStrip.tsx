import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { Wheel } from "@/components/tx8p/perf/Wheel";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";

/**
 * Left-hand performance area — narrow vertical column, hardware-
 * style. Levers for pitch/mod, small cream buttons for hold/octave/
 * voice mode, and a separated red PANIC at the bottom so it can't
 * be hit by accident.
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
    setVoiceMode,
    panic,
  } = usePerfStore();
  const flashLcd = useUiStore((s) => s.flashLcd);

  const flashOctave = (next: number) =>
    flashLcd(
      { kind: "message", line1: "OCTAVE", line2: `${next >= 0 ? "+" : ""}${next}` },
      700,
    );

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

      {/* Voice mode */}
      <div className="flex flex-col gap-1.5">
        <EngravedLabel variant="chassis-dim">Voice</EngravedLabel>
        <div className="flex flex-col gap-1">
          {(["POLY", "MONO", "UNISON"] as const).map((m) => (
            <ProgramButton
              key={m}
              color="cream"
              active={voiceMode === m}
              onClick={() => {
                setVoiceMode(m);
                flashLcd(
                  {
                    kind: "message",
                    line1: "VOICE",
                    line2: m === "UNISON" ? `UNISON ${unisonCount}` : m,
                  },
                  700,
                );
              }}
              ariaLabel={`Voice mode ${m}`}
            >
              {m === "UNISON" ? `UNI ${unisonCount}` : m}
            </ProgramButton>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Panic — visually separated, red, at the very bottom */}
      <div className="flex flex-col items-stretch gap-1.5 pt-3">
        <EngravedLabel variant="red">Emergency</EngravedLabel>
        <ProgramButton
          color="red"
          onClick={() => {
            panic();
            flashLcd({ kind: "panic" }, 700);
          }}
          ariaLabel="Panic — all notes off"
        >
          Panic
        </ProgramButton>
      </div>
    </aside>
  );
}
