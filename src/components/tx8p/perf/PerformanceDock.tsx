import { Keyboard as PianoKeyboard } from "@/components/tx8p/keyboard/Keyboard";
import { useViewportClass } from "@/hooks/use-portrait";
import {
  ControlWell,
  ModControl,
  OctaveControls,
  OctaveDisplay,
  PitchControl,
  SustainControl,
} from "@/components/tx8p/perf/PerformanceControls";
import { usePerfStore } from "@/state/perfStore";
import { useUiStore } from "@/state/uiStore";
import { PitchModStrip } from "@/components/tx8p/perf/PitchModStrip";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";

/**
 * Integrated performance dock — a distinct performance surface docked below
 * the editor. One shared component with three layout variants driven by
 * usable viewport dimensions (not device labels). All variants read the same
 * perfStore state, so rotation never diverges or resets anything.
 *
 *  - portrait:   compact perf row [PITCH][MOD][OCT−][OCT][OCT+][HOLD] above a
 *                docked 2-octave keyboard.
 *  - landscape:  compact left rail (pitch/mod/oct/hold) + wide keyboard.
 *  - wide:       pitch/mod wells + octave stack + big keyboard.
 */
const bed: React.CSSProperties = {
  background: "linear-gradient(180deg, oklch(0.20 0.004 60) 0%, oklch(0.13 0.004 60) 100%)",
  borderTop: "2px solid oklch(0 0 0 / 0.6)",
  boxShadow: "inset 0 8px 12px -8px oklch(0 0 0 / 0.7), 0 -1px 0 var(--chassis-edge-light)",
};

export function PerformanceDock() {
  const cls = useViewportClass();

  if (cls === "mobile-portrait") return <PortraitDock />;
  if (cls === "mobile-landscape") return <LandscapeDock />;
  return <WideDock />;
}

// ---------------------------------------------------------------- portrait
function PortraitDock() {
  return (
    <div
      aria-label="Performance dock"
      className="flex w-full flex-col gap-1.5 px-2 pt-2"
      style={{ ...bed, paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
    >
      <div className="flex items-stretch gap-1.5" style={{ height: 46 }}>
        <CompactStrip label="PITCH" kind="pitch" />
        <CompactStrip label="MOD" kind="mod" />
        <div className="flex flex-1 items-center justify-end gap-1.5">
          <OctaveControls layout="row" compact />
          <SustainControl />
        </div>
      </div>
      <div style={{ height: "min(26vh, 168px)", minHeight: 116 }}>
        <PianoKeyboard startOctave={4} octaveCount={2} />
      </div>
    </div>
  );
}

/** Tiny horizontal-label vertical strip for the portrait perf row. */
function CompactStrip({ label, kind }: { label: string; kind: "pitch" | "mod" }) {
  const pitch = usePerfStore((s) => s.pitch);
  const mod = usePerfStore((s) => s.mod);
  const setPitch = usePerfStore((s) => s.setPitch);
  const setMod = usePerfStore((s) => s.setMod);
  const isPitch = kind === "pitch";
  return (
    <div className="relative flex shrink-0 flex-col items-stretch" style={{ width: 42 }}>
      <span
        className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 font-sans font-semibold"
        style={{ fontSize: 7, letterSpacing: "0.16em", color: "var(--engraving-chassis-dim)" }}
      >
        {label}
      </span>
      <div className="flex-1 pt-[9px]">
        <PitchModStrip
          label=""
          value={isPitch ? pitch : mod}
          onChange={isPitch ? setPitch : setMod}
          onRelease={isPitch ? () => setPitch(0) : undefined}
          bipolar={isPitch}
          accent={isPitch ? "var(--btn-cream)" : "var(--lcd-amber)"}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------------- landscape
function LandscapeDock() {
  return (
    <div
      aria-label="Performance dock"
      className="flex w-full items-stretch gap-1.5 px-1.5 py-1.5"
      style={{
        ...bed,
        height: "clamp(132px, 56vh, 220px)",
        paddingLeft: "max(env(safe-area-inset-left), 6px)",
        paddingRight: "max(env(safe-area-inset-right), 6px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 4px)",
      }}
    >
      <div className="flex shrink-0 flex-col gap-1" style={{ width: 104 }}>
        <div className="flex flex-1 items-stretch gap-1" style={{ minHeight: 0 }}>
          <PitchControl width={36} />
          <ModControl width={36} />
        </div>
        <OctaveControls layout="row" compact />
        <SustainControl />
      </div>
      <div className="min-w-0 flex-1">
        <PianoKeyboard startOctave={3} octaveCount={3} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- wide
function WideDock() {
  return (
    <div
      aria-label="Performance dock"
      className="flex w-full items-stretch gap-2 px-2 pt-2"
      style={{
        ...bed,
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        height: "clamp(168px, 24vh, 224px)",
      }}
    >
      <div className="flex shrink-0 items-stretch gap-2" style={{ width: 116 }}>
        <PitchControl width={52} />
        <ModControl width={52} />
      </div>
      <div className="flex shrink-0 flex-col justify-between" style={{ width: 74 }}>
        <OctaveControls layout="stack" />
        <SustainControl />
      </div>
      <div className="min-w-0 flex-1">
        <PianoKeyboard startOctave={3} octaveCount={4} />
      </div>
    </div>
  );
}

/** Small helper re-exported for a settings hint (unused elsewhere). */
export function PerformanceHint() {
  const flash = useUiStore((s) => s.flashLcd);
  void flash;
  return <OctaveDisplay />;
}

export { PianoKeyboard };
