import { useMemo, useState } from "react";
import { useUiStore, type TabId } from "@/state/uiStore";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { ProgramButton, type ProgramButtonColor } from "@/components/tx8p/program/ProgramButton";

interface SubConfig {
  params: string[];
}

interface TabConfig {
  color: ProgramButtonColor;
  subs: Record<string, SubConfig>;
  subOrder: string[];
}

export const EDITOR_CONFIG: Record<TabId, TabConfig> = {
  OSC: {
    color: "red",
    subOrder: ["OSC 1", "OSC 2", "SUB/NOISE", "MIX"],
    subs: {
      "OSC 1": { params: ["Wave", "Shape", "Detune", "Semi", "PW", "Level"] },
      "OSC 2": { params: ["Wave", "Shape", "Detune", "Semi", "PW", "Level"] },
      "SUB/NOISE": { params: ["Sub Wave", "Sub Level", "Noise Type", "Noise Level"] },
      MIX: { params: ["Osc 1", "Osc 2", "Sub", "Noise", "Ring", "Sync"] },
    },
  },
  FILTER: {
    color: "cream",
    subOrder: ["MAIN", "ENV", "KEY TRK"],
    subs: {
      MAIN: { params: ["Mode", "Cutoff", "Resonance", "Drive"] },
      ENV: { params: ["Env Amt", "Attack", "Decay", "Sustain", "Release"] },
      "KEY TRK": { params: ["Key Trk", "Vel Trk", "LFO Amt"] },
    },
  },
  ENV: {
    color: "cream",
    subOrder: ["AMP", "FILTER"],
    subs: {
      AMP: { params: ["Attack", "Decay", "Sustain", "Release", "Vel"] },
      FILTER: { params: ["Attack", "Decay", "Sustain", "Release", "Amt"] },
    },
  },
  LFO: {
    color: "amber",
    subOrder: ["LFO 1", "LFO 2"],
    subs: {
      "LFO 1": { params: ["Shape", "Rate", "Depth", "Sync", "Fade", "Dest"] },
      "LFO 2": { params: ["Shape", "Rate", "Depth", "Sync", "Fade", "Dest"] },
    },
  },
  MOD: {
    color: "amber",
    subOrder: ["SLOT 1", "SLOT 2", "SLOT 3", "SLOT 4"],
    subs: {
      "SLOT 1": { params: ["Source", "Dest", "Amount", "Polarity", "Enable", "Clear"] },
      "SLOT 2": { params: ["Source", "Dest", "Amount", "Polarity", "Enable", "Clear"] },
      "SLOT 3": { params: ["Source", "Dest", "Amount", "Polarity", "Enable", "Clear"] },
      "SLOT 4": { params: ["Source", "Dest", "Amount", "Polarity", "Enable", "Clear"] },
    },
  },
  FX: {
    color: "blue",
    subOrder: ["DRIVE", "EQ", "CHORUS", "DELAY", "REVERB", "LIMITER"],
    subs: {
      DRIVE: { params: ["Bypass", "Drive", "Tone", "Mix"] },
      EQ: { params: ["Bypass", "Low", "Mid", "High"] },
      CHORUS: { params: ["Bypass", "Rate", "Depth", "Mix"] },
      DELAY: { params: ["Bypass", "Time", "Feedback", "Mix"] },
      REVERB: { params: ["Bypass", "Size", "Damp", "Mix"] },
      LIMITER: { params: ["Bypass", "Threshold", "Release", "Ceiling"] },
    },
  },
  VOICE: {
    color: "cream",
    subOrder: ["MODE", "UNISON", "GLIDE", "RESPONSE"],
    subs: {
      MODE: { params: ["Poly", "Mono", "Unison", "Priority"] },
      UNISON: { params: ["Count", "Detune", "Spread"] },
      GLIDE: { params: ["Time", "Legato", "Mode"] },
      RESPONSE: { params: ["Velocity", "Aftertouch", "Curve"] },
    },
  },
};

import { SubTabs } from "@/components/tx8p/tabs/SubTabs";

export function Editor() {
  const tab = useUiStore((s) => s.activeTab);
  const sub = useUiStore((s) => s.activeSubTab[tab]);
  const flash = useUiStore((s) => s.flashLcd);
  const cfg = EDITOR_CONFIG[tab];
  const subCfg = cfg.subs[sub] ?? cfg.subs[cfg.subOrder[0]];

  const [selectedParam, setSelectedParam] = useState<string>(subCfg.params[0]);
  const [values, setValues] = useState<Record<string, number>>({});

  const paramKey = useMemo(() => `${tab}·${sub}·${selectedParam}`, [tab, sub, selectedParam]);
  const value = values[paramKey] ?? 0.5;

  const setValue = (v: number) => {
    setValues((prev) => ({ ...prev, [paramKey]: v }));
    flash(
      {
        kind: "param",
        label: `${sub}·${selectedParam}`.toUpperCase(),
        value: v,
        display: `${Math.round(v * 100)}%`,
      },
      900,
    );
  };

  const selectParam = (p: string) => {
    setSelectedParam(p);
    const key = `${tab}·${sub}·${p}`;
    const v = values[key] ?? 0.5;
    flash(
      {
        kind: "param",
        label: `${sub}·${p}`.toUpperCase(),
        value: v,
        display: `${Math.round(v * 100)}%`,
      },
      900,
    );
  };

  return (
    <section
      aria-label={`${tab} editor`}
      className="program-strip flex flex-col gap-3 px-3 py-3 md:px-5 md:py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EngravedLabel variant="strip" className="text-[10px]">
          {tab} · {sub}
        </EngravedLabel>
        {cfg.subOrder.length > 1 && <SubTabs tab={tab} options={cfg.subOrder} />}
      </div>

      {/* Parameter buttons */}
      <div className="flex flex-wrap gap-1.5">
        {subCfg.params.map((p) => (
          <ProgramButton
            key={p}
            color={cfg.color}
            active={selectedParam === p}
            onClick={() => selectParam(p)}
          >
            {p}
          </ProgramButton>
        ))}
      </div>

      {/* Divider */}
      <div
        aria-hidden
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0 0 0 / 0.5), transparent)",
        }}
      />

      {/* Value edit */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-[140px] flex-col gap-1">
          <EngravedLabel variant="strip-dim">Parameter</EngravedLabel>
          <span
            className="font-mono text-[12px] tracking-widest"
            style={{ color: "var(--lcd-amber)" }}
          >
            {selectedParam.toUpperCase()}
          </span>
        </div>
        <div className="flex flex-1 items-center gap-3">
          <EngravedLabel variant="strip-dim">Value</EngravedLabel>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(value * 1000)}
            onChange={(e) => setValue(Number(e.target.value) / 1000)}
            data-tx-control
            aria-label={`${selectedParam} value`}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-[2px]"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.14 0.004 60) 0%, oklch(0.20 0.004 60) 100%)",
              boxShadow: "inset 0 1px 2px oklch(0 0 0 / 0.7), inset 0 0 0 1px oklch(0 0 0 / 0.6)",
              accentColor: "var(--btn-red)",
            }}
          />
          <span
            className="w-10 text-right font-mono text-[11px]"
            style={{ color: "var(--engraving-fill)" }}
          >
            {Math.round(value * 100)}
          </span>
        </div>
      </div>
    </section>
  );
}
