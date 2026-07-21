import { useState } from "react";
import { ProgramButton, type ProgramButtonColor } from "./ProgramButton";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { useUiStore } from "@/state/uiStore";
import { usePresetStore, INIT_PRESET } from "@/state/presetStore";

interface Group {
  title: string;
  color: ProgramButtonColor;
  items: string[];
}

const GROUPS: Group[] = [
  { title: "Patch", color: "red", items: ["Bank", "Number", "Prev", "Next", "Library"] },
  { title: "Oscillator", color: "cream", items: ["Osc 1", "Osc 2", "Sub", "Noise", "Mix"] },
  { title: "Filter", color: "cream", items: ["Mode", "Cutoff", "Reso", "Env", "Key Trk"] },
  { title: "Envelope", color: "cream", items: ["Amp", "Filter", "Attack", "Decay", "Sustain", "Release"] },
  { title: "Modulation", color: "amber", items: ["LFO 1", "LFO 2", "Matrix", "Rate", "Depth"] },
  { title: "Effects", color: "blue", items: ["Drive", "Chorus", "Delay", "Reverb", "EQ"] },
];

export function ProgramStrip() {
  const [selected, setSelected] = useState<string>("Osc 1");
  const [value, setValue] = useState<number>(0.5);
  const flashLcd = useUiStore((s) => s.flashLcd);
  const setCurrent = usePresetStore((s) => s.setCurrent);
  const preset = usePresetStore((s) => s.current);

  const select = (group: Group, item: string) => {
    setSelected(item);
    if (group.title === "Patch") {
      if (item === "Prev" || item === "Next") {
        const dir = item === "Prev" ? -1 : 1;
        const next = { ...INIT_PRESET, index: Math.max(1, preset.index + dir) };
        setCurrent(next);
        flashLcd({ kind: "message", line1: "PRESET", line2: next.name }, 700);
        return;
      }
      flashLcd({ kind: "message", line1: item.toUpperCase(), line2: "READY" }, 700);
      return;
    }
    flashLcd(
      { kind: "param", label: `${group.title.toUpperCase()}·${item.toUpperCase()}`, value, display: `${Math.round(value * 100)}%` },
      900,
    );
  };

  const onValue = (v: number) => {
    setValue(v);
    flashLcd(
      { kind: "param", label: selected.toUpperCase(), value: v, display: `${Math.round(v * 100)}%` },
      900,
    );
  };

  return (
    <div className="program-strip flex flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
      {/* Section groups */}
      <div className="flex flex-wrap items-stretch gap-x-5 gap-y-4">
        {GROUPS.map((g) => (
          <div key={g.title} className="flex flex-col gap-1.5">
            <EngravedLabel variant="strip-dim" className="pl-[2px]">
              {g.title}
            </EngravedLabel>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((item) => (
                <ProgramButton
                  key={item}
                  color={g.color}
                  active={selected === item}
                  onClick={() => select(g, item)}
                >
                  {item}
                </ProgramButton>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div
        aria-hidden
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0 0 0 / 0.5), transparent)",
        }}
      />

      {/* Value edit row: selected parameter + slider */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-[140px] flex-col gap-1">
          <EngravedLabel variant="strip-dim">Selected</EngravedLabel>
          <span
            className="font-mono text-[12px] tracking-widest"
            style={{ color: "var(--lcd-amber)" }}
          >
            {selected.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <EngravedLabel variant="strip-dim">Value</EngravedLabel>
          <ValueSlider value={value} onChange={onValue} />
          <span
            className="w-10 text-right font-mono text-[11px]"
            style={{ color: "var(--engraving-fill)" }}
          >
            {Math.round(value * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ValueSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={0}
      max={1000}
      value={Math.round(value * 1000)}
      onChange={(e) => onChange(Number(e.target.value) / 1000)}
      data-tx-control
      aria-label="Parameter value"
      className="h-2 flex-1 cursor-pointer appearance-none rounded-[2px]"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.14 0.004 60) 0%, oklch(0.20 0.004 60) 100%)",
        boxShadow:
          "inset 0 1px 2px oklch(0 0 0 / 0.7), inset 0 0 0 1px oklch(0 0 0 / 0.6)",
        accentColor: "var(--btn-red)",
      }}
    />
  );
}
