import { useState } from "react";
import { Panel } from "@/components/tx8p/chassis/Chassis";
import { Knob } from "@/components/tx8p/controls/Knob";

interface KnobGroupProps {
  title: string;
  knobs: { label: string; bipolar?: boolean }[];
}

function KnobGroup({ title, knobs }: KnobGroupProps) {
  const [vals, setVals] = useState<number[]>(() =>
    knobs.map((k) => (k.bipolar ? 0.5 : 0.5)),
  );
  return (
    <Panel title={title}>
      <div className="flex flex-wrap items-end gap-5">
        {knobs.map((k, i) => (
          <Knob
            key={k.label}
            label={k.label}
            value={vals[i]}
            bipolar={k.bipolar}
            onChange={(v) =>
              setVals((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              })
            }
          />
        ))}
      </div>
    </Panel>
  );
}

const PANEL_CONFIG = {
  osc: {
    label: "Oscillators",
    groups: [
      {
        title: "OSC 1 · Wavetable",
        knobs: [
          { label: "Wave" },
          { label: "Shape" },
          { label: "Detune", bipolar: true },
          { label: "Level" },
        ],
      },
      {
        title: "OSC 2 · Virtual Analog",
        knobs: [
          { label: "Shape" },
          { label: "Pulse Width" },
          { label: "Detune", bipolar: true },
          { label: "Level" },
        ],
      },
      {
        title: "Sub · Noise",
        knobs: [{ label: "Sub" }, { label: "Noise" }],
      },
    ],
  },
  filter: {
    label: "Filter",
    groups: [
      {
        title: "Morph Filter",
        knobs: [
          { label: "Cutoff" },
          { label: "Reso" },
          { label: "Morph" },
          { label: "Env Amt", bipolar: true },
          { label: "Key Track" },
          { label: "Drive" },
        ],
      },
    ],
  },
  env: {
    label: "Envelopes",
    groups: [
      {
        title: "Amp Envelope",
        knobs: [
          { label: "Attack" },
          { label: "Decay" },
          { label: "Sustain" },
          { label: "Release" },
        ],
      },
      {
        title: "Mod Envelope",
        knobs: [
          { label: "Attack" },
          { label: "Decay" },
          { label: "Sustain" },
          { label: "Release" },
        ],
      },
    ],
  },
  lfo: {
    label: "LFOs",
    groups: [
      {
        title: "LFO 1",
        knobs: [
          { label: "Rate" },
          { label: "Depth" },
          { label: "Shape" },
          { label: "Delay" },
        ],
      },
      {
        title: "LFO 2",
        knobs: [
          { label: "Rate" },
          { label: "Depth" },
          { label: "Shape" },
          { label: "Delay" },
        ],
      },
    ],
  },
  mod: {
    label: "Mod Matrix",
    groups: [
      {
        title: "Slots",
        knobs: [
          { label: "Slot 1", bipolar: true },
          { label: "Slot 2", bipolar: true },
          { label: "Slot 3", bipolar: true },
          { label: "Slot 4", bipolar: true },
        ],
      },
    ],
  },
  fx: {
    label: "Effects",
    groups: [
      {
        title: "Drive · EQ",
        knobs: [
          { label: "Drive" },
          { label: "Low", bipolar: true },
          { label: "Mid", bipolar: true },
          { label: "High", bipolar: true },
        ],
      },
      {
        title: "Chorus · Delay",
        knobs: [
          { label: "Ch Rate" },
          { label: "Ch Depth" },
          { label: "Dly Time" },
          { label: "Dly Fbk" },
        ],
      },
      {
        title: "Reverb · Master",
        knobs: [
          { label: "Rv Size" },
          { label: "Rv Mix" },
          { label: "Master" },
        ],
      },
    ],
  },
} as const;

export type PanelKey = keyof typeof PANEL_CONFIG;

export function InstrumentPanels({ active }: { active: PanelKey }) {
  const cfg = PANEL_CONFIG[active];
  return (
    <div className="flex flex-col gap-3">
      {cfg.groups.map((g) => (
        <KnobGroup key={g.title} title={g.title} knobs={[...g.knobs]} />
      ))}
    </div>
  );
}

export const PANEL_LIST: { key: PanelKey; label: string }[] = (
  Object.keys(PANEL_CONFIG) as PanelKey[]
).map((k) => ({ key: k, label: PANEL_CONFIG[k].label }));
