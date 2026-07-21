import { ProgramButton } from "@/components/tx8p/program/ProgramButton";
import { usePresetStore, INIT_PRESET } from "@/state/presetStore";
import { useUiStore } from "@/state/uiStore";

export function PresetNav() {
  const preset = usePresetStore((s) => s.current);
  const setCurrent = usePresetStore((s) => s.setCurrent);
  const setBrowserOpen = useUiStore((s) => s.setBrowserOpen);
  const flash = useUiStore((s) => s.flashLcd);

  const step = (dir: -1 | 1) => {
    const next = {
      ...INIT_PRESET,
      index: Math.max(1, preset.index + dir),
    };
    setCurrent(next);
    flash({ kind: "message", line1: "PRESET", line2: next.name }, 700);
  };

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
