import { createFileRoute } from "@tanstack/react-router";
import { useUiStore, type LcdMode } from "@/state/uiStore";
import { Chassis, Badge, EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { PresetLCD } from "@/components/tx8p/lcd/PresetLCD";
import { PerfStrip } from "@/components/tx8p/perf/PerfStrip";
import { Keyboard } from "@/components/tx8p/keyboard/Keyboard";
import {
  InstrumentPanels,
  PANEL_LIST,
  type PanelKey,
} from "@/components/tx8p/panels/InstrumentPanels";
import { IconButton, LedButton } from "@/components/tx8p/controls/LedButton";
import { ChevronLeft, ChevronRight, List, Settings } from "lucide-react";
import { usePresetStore, INIT_PRESET } from "@/state/presetStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TXPPS TX-8P — Hybrid Poly Synthesizer" },
      {
        name: "description",
        content:
          "TX-8P: an 8-voice hybrid wavetable + virtual analog polyphonic synthesizer with a vintage green LCD, industrial hardware feel, and premium browser-based playability. Part of the TXPPS family.",
      },
      { property: "og:title", content: "TXPPS TX-8P — Hybrid Poly Synthesizer" },
      {
        property: "og:description",
        content:
          "An 8-voice hybrid polyphonic synthesizer that plays in your browser and feels like premium hardware.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const activePanel = useUiStore((s) => s.activePanel);
  const setPanel = useUiStore((s) => s.setActivePanel);
  const flashLcd = useUiStore((s) => s.flashLcd);
  const setCurrent = usePresetStore((s) => s.setCurrent);
  const dirty = usePresetStore((s) => s.dirty);

  const stepPreset = (dir: 1 | -1) => {
    // M1: placeholder — real library in M6
    const next = { ...INIT_PRESET, index: Math.max(1, INIT_PRESET.index + dir) };
    setCurrent(next);
    flashLcd(
      { kind: "message", line1: "PRESET", line2: next.name } as LcdMode,
      600,
    );
  };

  return (
    <Chassis>
      {/* Top bar */}
      <header className="panel-recessed flex flex-wrap items-center gap-3 p-3">
        <Badge />
        <div className="flex flex-1 items-center justify-center">
          <PresetLCD />
        </div>
        <div className="flex items-center gap-2">
          <IconButton ariaLabel="Previous preset" onClick={() => stepPreset(-1)}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton ariaLabel="Next preset" onClick={() => stepPreset(1)}>
            <ChevronRight size={16} />
          </IconButton>
          <IconButton ariaLabel="Browse presets">
            <List size={16} />
          </IconButton>
          <IconButton ariaLabel="Settings">
            <Settings size={16} />
          </IconButton>
        </div>
      </header>

      {/* Panel tabs */}
      <nav
        aria-label="Panels"
        className="flex flex-wrap gap-2"
      >
        {PANEL_LIST.map(({ key, label }) => (
          <LedButton
            key={key}
            active={activePanel === (key as PanelKey)}
            onClick={() => setPanel(key)}
            ariaLabel={`${label} panel`}
            compact
          >
            {label}
          </LedButton>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <EngravedLabel dim>
            {dirty ? "Edited" : "Clean"}
          </EngravedLabel>
        </div>
      </nav>

      {/* Main working area: perf strip + panels */}
      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <div className="order-2 lg:order-1">
          <PerfStrip />
        </div>
        <div className="order-1 lg:order-2">
          <InstrumentPanels active={activePanel} />
        </div>
      </div>

      {/* Keyboard */}
      <div className="mt-auto">
        <Keyboard />
      </div>
    </Chassis>
  );
}
