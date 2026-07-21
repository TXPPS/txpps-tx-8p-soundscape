import { ProgramButton } from "@/components/tx8p/program/ProgramButton";
import { usePresetStore } from "@/state/presetStore";
import { useUiStore } from "@/state/uiStore";

export function PresetNav() {
  const step = usePresetStore((s) => s.step);
  const setBrowserOpen = useUiStore((s) => s.setBrowserOpen);
  const flash = useUiStore((s) => s.flashLcd);

  return (
    <div className="flex items-center gap-1">
      <ProgramButton color="cream" ariaLabel="Previous preset" onClick={() => step(-1)}>
        Prev
      </ProgramButton>
      <ProgramButton color="cream" ariaLabel="Next preset" onClick={() => step(1)}>
        Next
      </ProgramButton>
      <ProgramButton
        color="red"
        ariaLabel="Open preset library"
        onClick={() => {
          setBrowserOpen(true);
          flash({ kind: "message", line1: "LIBRARY", line2: "OPEN" }, 600);
        }}
      >
        Library
      </ProgramButton>
    </div>
  );
}
