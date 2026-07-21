import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { LedButton, IconButton } from "@/components/tx8p/controls/LedButton";
import { Wheel } from "@/components/tx8p/perf/Wheel";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";

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

  const onPanic = () => {
    panic();
    flashLcd({ kind: "panic" }, 700);
  };

  return (
    <div
      className="panel-recessed flex flex-wrap items-center gap-4 p-3"
      aria-label="Performance controls"
    >
      <div className="flex items-end gap-3">
        <Wheel value={pitch} onChange={setPitch} min={-1} max={1} spring label="PITCH" />
        <Wheel value={mod} onChange={setMod} min={0} max={1} label="MOD" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1">
          <IconButton
            ariaLabel="Octave down"
            onClick={() => {
              stepOctave(-1);
              flashLcd(
                {
                  kind: "message",
                  line1: `OCTAVE  ${octave - 1 >= 0 ? "+" : ""}${octave - 1}`,
                  line2: "",
                },
                700,
              );
            }}
          >
            <ChevronDown size={16} />
          </IconButton>
          <div
            className="grid h-8 w-10 place-items-center rounded-[var(--radius-control)] font-mono text-[13px]"
            style={{
              background: "var(--lcd-bg)",
              color: "var(--lcd-green)",
              boxShadow: "var(--shadow-lcd-inset)",
              textShadow: "0 0 4px var(--lcd-glow)",
            }}
          >
            {octave >= 0 ? `+${octave}` : octave}
          </div>
          <IconButton
            ariaLabel="Octave up"
            onClick={() => {
              stepOctave(1);
              flashLcd(
                {
                  kind: "message",
                  line1: `OCTAVE  ${octave + 1 >= 0 ? "+" : ""}${octave + 1}`,
                  line2: "",
                },
                700,
              );
            }}
          >
            <ChevronUp size={16} />
          </IconButton>
        </div>
        <EngravedLabel dim>Octave</EngravedLabel>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <LedButton active={hold} onClick={toggleHold} ariaLabel="Hold">
          Hold
        </LedButton>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex gap-1">
          {(["POLY", "MONO", "UNISON"] as const).map((m) => (
            <LedButton
              key={m}
              active={voiceMode === m}
              onClick={() => {
                setVoiceMode(m);
                flashLcd(
                  {
                    kind: "message",
                    line1: `VOICE  ${m === "UNISON" ? `UNISON ${unisonCount}` : m}`,
                    line2: m === "UNISON" ? "DETUNE  15 CT" : "",
                  },
                  700,
                );
              }}
              compact
            >
              {m === "UNISON" ? `UNI ${unisonCount}` : m}
            </LedButton>
          ))}
        </div>
        <EngravedLabel dim>Voice Mode</EngravedLabel>
      </div>

      <div className="ml-auto">
        <LedButton active={false} onClick={onPanic} color="red" ariaLabel="Panic">
          Panic
        </LedButton>
      </div>
    </div>
  );
}
