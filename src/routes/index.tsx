import { createFileRoute } from "@tanstack/react-router";
import {
  Chassis,
  EngravedLabel,
  IdentityMark,
  ProductPlate,
  StatusLamp,
} from "@/components/tx8p/chassis/Chassis";
import { PresetLCD } from "@/components/tx8p/lcd/PresetLCD";
import { PerformanceDeck } from "@/components/tx8p/perf/PerformanceDeck";
import { TabBar } from "@/components/tx8p/tabs/TabBar";
import { Editor } from "@/components/tx8p/editors/Editor";
import { TopActions } from "@/components/tx8p/topbar/TopActions";
import { PresetNav } from "@/components/tx8p/topbar/PresetNav";
import { SettingsDialog } from "@/components/tx8p/topbar/SettingsDialog";

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
  return (
    <Chassis>
      {/* ===================== IDENTITY BAR ===================== */}
      <header
        className="identity-panel px-3 py-2.5 md:px-6 md:py-3"
        aria-label="Instrument identity"
      >
        {/* Desktop / tablet: single row */}
        <div className="hidden items-center gap-5 md:flex">
          <div className="flex min-w-0 flex-col gap-0.5">
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
            <PresetNav />
            <TopActions />
          </div>
        </div>

        {/* Phone portrait: two rows */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-col leading-tight">
              <span
                className="font-sans text-[9px] font-semibold tracking-[0.3em]"
                style={{ color: "var(--engraving-chassis-dim)" }}
              >
                TXPPS
              </span>
              <span
                className="font-sans font-semibold"
                style={{
                  color: "var(--engraving-chassis)",
                  fontSize: 22,
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                }}
              >
                TX-8P
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <StatusLamp on />
              <TopActions />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PresetLCD />
            <div className="ml-auto">
              <PresetNav />
            </div>
          </div>
        </div>
      </header>

      {/* Chassis seam */}
      <div
        aria-hidden
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(180deg, oklch(0 0 0 / 0.35), oklch(1 0 0 / 0.15))",
        }}
      />

      {/* ===================== PRIMARY TAB ROW ===================== */}
      <TabBar />

      {/* ===================== FOCUSED EDITOR ===================== */}
      <div className="flex flex-col gap-2 px-3 py-3 md:px-6 md:py-3">
        <Editor />
        <div className="flex items-center justify-between px-1">
          <EngravedLabel variant="chassis-dim">
            TXPPS · TX-8P · Hybrid Poly Synth
          </EngravedLabel>
          <EngravedLabel variant="chassis-dim">
            Made in Software · 8P
          </EngravedLabel>
        </div>
      </div>

      {/* ===================== INTEGRATED PERFORMANCE DECK ===================== */}
      <div className="mt-auto">
        <PerformanceDeck />
      </div>

      <SettingsDialog />
    </Chassis>
  );
}
