import { createFileRoute } from "@tanstack/react-router";
import {
  Chassis,
  EngravedLabel,
  IdentityMark,
  ProductPlate,
  StatusLamp,
} from "@/components/tx8p/chassis/Chassis";
import { PresetLCD } from "@/components/tx8p/lcd/PresetLCD";
import { PerfStrip } from "@/components/tx8p/perf/PerfStrip";
import { Keyboard } from "@/components/tx8p/keyboard/Keyboard";
import { ProgramStrip } from "@/components/tx8p/program/ProgramStrip";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";
import { usePresetStore } from "@/state/presetStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TXPPS TX-8P — Hybrid Poly Synthesizer" },
      {
        name: "description",
        content:
          "TX-8P: an 8-voice hybrid wavetable + virtual analog polyphonic synthesizer with an integrated smoked LCD, JX-8P-inspired industrial chassis, and premium browser-based playability. Part of the TXPPS family.",
      },
      { property: "og:title", content: "TXPPS TX-8P — Hybrid Poly Synthesizer" },
      {
        property: "og:description",
        content:
          "An 8-voice hybrid polyphonic synthesizer that plays in your browser and feels like premium 1980s Japanese hardware.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const dirty = usePresetStore((s) => s.dirty);

  return (
    <Chassis>
      {/* ===================== IDENTITY BAR ===================== */}
      <header
        className="identity-panel flex flex-wrap items-center gap-6 px-4 py-4 md:px-8 md:py-5"
        aria-label="Instrument identity"
      >
        <div className="flex flex-col gap-2">
          <IdentityMark />
          <ProductPlate />
          <span
            className="font-sans text-[10px] font-medium tracking-[0.28em]"
            style={{ color: "var(--engraving-chassis-dim)" }}
          >
            HYBRID POLY SYNTHESIZER · 8 VOICES
          </span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <StatusLamp on />
          <PresetLCD />
          <div className="hidden items-center gap-2 md:flex">
            <ProgramButton color="cream" ariaLabel="Write">
              Write
            </ProgramButton>
            <ProgramButton color="cream" ariaLabel="Compare">
              Compare
            </ProgramButton>
            <ProgramButton color="amber" active={dirty} ariaLabel="Edit indicator">
              Edit
            </ProgramButton>
          </div>
        </div>
      </header>

      {/* Chassis seam under identity */}
      <div
        aria-hidden
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(180deg, oklch(0 0 0 / 0.35), oklch(1 0 0 / 0.15))",
        }}
      />

      {/* ===================== CONTROL SURFACE ===================== */}
      <div className="grid gap-3 px-3 py-4 md:px-6 md:py-5 lg:grid-cols-[190px_1fr]">
        <div className="order-2 lg:order-1">
          <PerfStrip />
        </div>
        <div className="order-1 lg:order-2 flex flex-col gap-3">
          <ProgramStrip />
          <div className="flex items-center justify-between px-1">
            <EngravedLabel variant="chassis-dim">
              TXPPS · TX-8P · Hybrid Poly Synth
            </EngravedLabel>
            <EngravedLabel variant="chassis-dim">
              Made in Software · 8P
            </EngravedLabel>
          </div>
        </div>
      </div>

      {/* ===================== KEYBOARD ===================== */}
      <div className="mt-auto">
        <Keyboard startOctave={3} octaveCount={3} />
      </div>
    </Chassis>
  );
}
