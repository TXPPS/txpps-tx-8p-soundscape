import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUiStore } from "@/state/uiStore";
import { useSettingsStore } from "@/state/settingsStore";
import { getSynthEngine } from "@/engine/SynthEngine";
import { useEngineStatus } from "@/engine/useEngine";
import { getMidi } from "@/engine/midi";
import { useMidiState } from "@/engine/useMidi";
import { tryParam } from "@/engine/params/registry";
import { ParamControl } from "@/components/tx8p/editors/ParamControl";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { TX8P_BUILD, TX8P_PRODUCT, TX8P_REPO, TX8P_TAGLINE, TX8P_VERSION } from "@/lib/version";
import { applyUpdate, getCacheInfo, getPwaState, promptInstall, subscribePwa } from "@/lib/pwa";
import { audioStatusView } from "@/components/tx8p/audio/AudioStatus";

type Section = "AUDIO" | "MIDI" | "PERFORMANCE" | "DISPLAY" | "PWA" | "ABOUT";
const SECTIONS: Section[] = ["AUDIO", "MIDI", "PERFORMANCE", "DISPLAY", "PWA", "ABOUT"];

const panel = {
  background: "var(--panel-strip)",
  color: "var(--engraving-fill)",
  boxShadow: "var(--shadow-strip-inset)",
} as const;

export function SettingsDialog() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const [section, setSection] = useState<Section>("AUDIO");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-xl border-0 p-0"
        style={{
          background:
            "linear-gradient(180deg, var(--chassis-highlight-top) 0%, var(--chassis-base) 100%)",
          color: "var(--engraving-chassis)",
          boxShadow:
            "0 24px 60px -20px oklch(0 0 0 / 0.6), inset 0 1px 0 var(--chassis-edge-light), inset 0 -1px 0 var(--chassis-edge-dark)",
        }}
      >
        <div className="border-b border-black/15 px-5 py-4">
          <DialogHeader>
            <DialogTitle
              className="font-sans"
              style={{ color: "var(--engraving-chassis)", fontSize: 16, letterSpacing: "0.10em" }}
            >
              SETTINGS
            </DialogTitle>
            <DialogDescription
              style={{ color: "var(--engraving-chassis-dim)" }}
              className="text-xs tracking-wider"
            >
              System, audio, MIDI and display preferences.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-wrap gap-1 px-5 pt-4">
          {SECTIONS.map((s) => (
            <ProgramButton
              key={s}
              color={section === s ? "red" : "cream"}
              active={section === s}
              onClick={() => setSection(s)}
            >
              {s}
            </ProgramButton>
          ))}
        </div>

        <div className="max-h-[56vh] overflow-y-auto px-5 py-4">
          {section === "AUDIO" && <AudioPanel />}
          {section === "MIDI" && <MidiPanel />}
          {section === "PERFORMANCE" && <PerformancePanel />}
          {section === "DISPLAY" && <DisplayPanel />}
          {section === "PWA" && <PwaPanel />}
          {section === "ABOUT" && <AboutPanel />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <EngravedLabel variant="chassis-dim">{label}</EngravedLabel>
      <div className="font-mono text-[12px]" style={{ color: "var(--engraving-chassis)" }}>
        {children}
      </div>
    </div>
  );
}

function usePoll(ms = 300) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function pwaMode(): string {
  if (typeof window === "undefined") return "unknown";
  if (window.matchMedia?.("(display-mode: standalone)").matches) return "standalone (PWA)";
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return "standalone (iOS)";
  return "browser";
}

function buildAudioDiagnostics() {
  const eng = getSynthEngine();
  const d = eng.getDiagnostics();
  return {
    product: TX8P_PRODUCT,
    version: TX8P_VERSION,
    build: TX8P_BUILD,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    platform: typeof navigator !== "undefined" ? navigator.platform : "",
    mode: pwaMode(),
    swCacheVersion: getSwVersion(),
    ...d,
  };
}
function getSwVersion(): string {
  // The SW cache is versioned "tx8p-v<n>"; surfaced for cache-mismatch triage.
  return typeof caches !== "undefined" ? "see PWA panel" : "n/a";
}

function AudioPanel() {
  const status = useEngineStatus();
  usePoll(300);
  const view = audioStatusView(status);
  const d = getSynthEngine().getDiagnostics();
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-[3px] p-3" style={panel}>
      <Row label="Status">
        <span style={{ color: view.color }}>{view.label}</span>
      </Row>
      <Row label="Context state">{d.contextState}</Row>
      <Row label="Destination">{d.destinationConnected ? "connected" : "—"}</Row>
      <Row label="Sample rate">
        {d.sampleRate ? `${(d.sampleRate / 1000).toFixed(1)} kHz` : "—"}
      </Row>
      <Row label="Output latency">
        {d.outputLatency != null ? `${(d.outputLatency * 1000).toFixed(1)} ms` : "—"}
      </Row>
      <Row label="Contexts created">{d.contextsCreated}</Row>
      <Row label="Startup attempts">{d.startupAttempts}</Row>
      <Row label="Active voices">{d.activeVoices}</Row>
      <Row label="Pending notes">{d.pendingNotes}</Row>
      <Row label="Master gain">{d.masterGain.toFixed(2)}</Row>
      <Row label="Build">{TX8P_BUILD}</Row>
      <div className="mt-3 flex flex-wrap gap-2">
        <ProgramButton color="cream" onClick={() => void getSynthEngine().unlock()}>
          Resume / Retry
        </ProgramButton>
        <ProgramButton color="red" onClick={() => getSynthEngine().panic()}>
          Panic
        </ProgramButton>
        <ProgramButton
          color="cream"
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(buildAudioDiagnostics(), null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied ✓" : "Copy Audio Diagnostics"}
        </ProgramButton>
      </div>
    </div>
  );
}

function MidiPanel() {
  const st = useMidiState();
  const midi = getMidi();
  const activeRecently = Date.now() - st.lastActivityAt < 400;

  if (!st.supported) {
    return (
      <div className="rounded-[3px] p-3 font-mono text-[11px]" style={panel}>
        Web MIDI is not supported in this browser. The touchscreen and computer keyboard still work.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[3px] p-3" style={panel}>
        {!st.requested || st.permission !== "granted" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px]">
              {st.permission === "denied"
                ? "MIDI permission denied."
                : "MIDI access not requested."}
            </span>
            <ProgramButton color="red" onClick={() => midi.requestAccess()}>
              Request MIDI
            </ProgramButton>
          </div>
        ) : (
          <>
            <Row label="Connection">
              <span
                style={{ color: activeRecently ? "var(--led-green-on)" : "var(--engraving-fill)" }}
              >
                {activeRecently ? "● ACTIVE" : `${st.inputs.length} input(s)`}
              </span>
            </Row>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <EngravedLabel variant="chassis-dim">Input</EngravedLabel>
              <select
                value={st.activeInputId ?? "all"}
                onChange={(e) => midi.setActiveInput(e.target.value)}
                className="rounded-[2px] px-2 py-1 font-mono text-[11px]"
                style={{ background: "var(--lcd-bg)", color: "var(--lcd-amber)" }}
              >
                <option value="all">All Inputs</option>
                {st.inputs.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <EngravedLabel variant="chassis-dim">Channel</EngravedLabel>
              <select
                value={st.channel}
                onChange={(e) => midi.setChannel(Number(e.target.value))}
                className="rounded-[2px] px-2 py-1 font-mono text-[11px]"
                style={{ background: "var(--lcd-bg)", color: "var(--lcd-amber)" }}
              >
                <option value={0}>Omni</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="rounded-[3px] p-3" style={panel}>
        <div className="mb-2 flex items-center justify-between">
          <EngravedLabel variant="chassis-dim">CC Mappings ({st.maps.length})</EngravedLabel>
          {st.learning && (
            <span className="font-mono text-[10px]" style={{ color: "var(--btn-amber)" }}>
              LEARNING — move a control
            </span>
          )}
        </div>
        <div className="max-h-[22vh] overflow-y-auto">
          {st.maps.length === 0 && (
            <div className="font-mono text-[11px]" style={{ color: "var(--engraving-dim)" }}>
              No mappings. Long-press any control to learn.
            </div>
          )}
          {st.maps.map((m) => (
            <div
              key={`${m.channel}:${m.cc}:${m.param}`}
              className="flex items-center gap-2 border-b py-1"
              style={{ borderColor: "oklch(0 0 0 / 0.3)" }}
            >
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--lcd-amber)", minWidth: 52 }}
              >
                CC{m.cc}
              </span>
              <span className="flex-1 font-mono text-[10px]">
                {tryParam(m.param)?.label ?? m.param}
              </span>
              <select
                value={m.takeover}
                onChange={(e) =>
                  midi.updateMap(m.cc, m.channel, {
                    takeover: e.target.value as "pickup" | "jump" | "scale",
                  })
                }
                className="rounded-[2px] px-1 py-0.5 text-[9px]"
                style={{ background: "var(--lcd-bg)", color: "var(--lcd-amber)" }}
              >
                <option value="pickup">Pickup</option>
                <option value="jump">Jump</option>
                <option value="scale">Scale</option>
              </select>
              <button
                onClick={() => midi.updateMap(m.cc, m.channel, { invert: !m.invert })}
                className="px-1 text-[9px]"
                style={{ color: m.invert ? "var(--btn-amber)" : "var(--engraving-dim)" }}
              >
                INV
              </button>
              <button
                onClick={() => midi.removeMap(m.cc, m.channel)}
                className="px-1 text-[9px]"
                style={{ color: "var(--btn-red)" }}
              >
                DEL
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <ProgramButton color="cream" onClick={() => midi.resetDefaults()}>
            Reset Defaults
          </ProgramButton>
          <ProgramButton color="cream" onClick={() => midi.clearMaps()}>
            Clear All
          </ProgramButton>
          <ProgramButton
            color="cream"
            onClick={() => {
              const blob = new Blob([midi.exportMaps()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "tx8p-midi-maps.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </ProgramButton>
          <ProgramButton
            color="cream"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json,.json";
              input.onchange = () => input.files?.[0]?.text().then((t) => midi.importMaps(t));
              input.click();
            }}
          >
            Import
          </ProgramButton>
        </div>
      </div>
    </div>
  );
}

function PerformancePanel() {
  const settings = useSettingsStore();
  return (
    <div className="flex flex-col gap-3 rounded-[3px] p-3" style={panel}>
      {["voice.bendRange", "voice.priority", "voice.glide", "voice.legato", "voice.velCurve"]
        .filter((id) => tryParam(id))
        .map((id) => (
          <ParamControl key={id} id={id} />
        ))}
      <div className="flex items-center justify-between border-t border-black/20 pt-2">
        <EngravedLabel variant="strip-dim">Computer keyboard</EngravedLabel>
        <ProgramButton
          color={settings.typingKeyboard ? "amber" : "cream"}
          active={settings.typingKeyboard}
          onClick={() => settings.set({ typingKeyboard: !settings.typingKeyboard })}
        >
          {settings.typingKeyboard ? "ON" : "OFF"}
        </ProgramButton>
      </div>
    </div>
  );
}

function DisplayPanel() {
  const s = useSettingsStore();
  return (
    <div className="flex flex-col gap-2 rounded-[3px] p-3" style={panel}>
      <div className="flex items-center justify-between py-1">
        <EngravedLabel variant="strip-dim">Reduced motion</EngravedLabel>
        <ProgramButton
          color={s.reducedMotion ? "amber" : "cream"}
          active={s.reducedMotion}
          onClick={() => s.set({ reducedMotion: !s.reducedMotion })}
        >
          {s.reducedMotion ? "ON" : "OFF"}
        </ProgramButton>
      </div>
      <div className="flex items-center justify-between py-1">
        <EngravedLabel variant="strip-dim">Key labels</EngravedLabel>
        <ProgramButton
          color={s.keyLabels ? "amber" : "cream"}
          active={s.keyLabels}
          onClick={() => s.set({ keyLabels: !s.keyLabels })}
        >
          {s.keyLabels ? "ON" : "OFF"}
        </ProgramButton>
      </div>
      <div className="flex items-center justify-between py-1">
        <EngravedLabel variant="strip-dim">UI scale — {Math.round(s.uiScale * 100)}%</EngravedLabel>
        <input
          type="range"
          min={85}
          max={115}
          value={Math.round(s.uiScale * 100)}
          onChange={(e) => s.set({ uiScale: Number(e.target.value) / 100 })}
          aria-label="UI scale"
          style={{ accentColor: "var(--btn-red)" }}
        />
      </div>
    </div>
  );
}

function PwaPanel() {
  const pwa = useSyncExternalStore(subscribePwa, getPwaState, getPwaState);
  const [cache, setCache] = useState<{ caches: number; entries: number }>({
    caches: 0,
    entries: 0,
  });
  useEffect(() => {
    getCacheInfo().then(setCache);
  }, [pwa.registered]);
  return (
    <div className="flex flex-col gap-2 rounded-[3px] p-3" style={panel}>
      <Row label="Service worker">
        {pwa.registered ? "Registered" : pwa.supported ? "Not registered (dev)" : "Unsupported"}
      </Row>
      <Row label="Installed">{pwa.installed ? "Yes" : pwa.installable ? "Available" : "—"}</Row>
      <Row label="Cached entries">{cache.entries}</Row>
      <Row label="Version">{TX8P_VERSION}</Row>
      <div className="mt-2 flex flex-wrap gap-2">
        {pwa.installable && (
          <ProgramButton color="red" onClick={() => promptInstall()}>
            Install App
          </ProgramButton>
        )}
        {pwa.updateAvailable && (
          <ProgramButton color="amber" onClick={() => applyUpdate()}>
            Update Now
          </ProgramButton>
        )}
      </div>
      <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--engraving-chassis-dim)" }}>
        Load once online, then the instrument plays offline. Web MIDI may be unavailable offline.
      </p>
    </div>
  );
}

function AboutPanel() {
  const copyDiag = () => {
    const eng = getSynthEngine();
    const report = {
      product: TX8P_PRODUCT,
      version: TX8P_VERSION,
      status: eng.getStatus(),
      sampleRate: eng.getSampleRate(),
      activeVoices: eng.getActiveVoiceCount(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };
    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
  };
  return (
    <div className="flex flex-col gap-2 rounded-[3px] p-3" style={panel}>
      <div className="font-sans text-[15px] font-semibold" style={{ color: "var(--lcd-amber)" }}>
        {TX8P_PRODUCT}
      </div>
      <div className="font-mono text-[11px]" style={{ color: "var(--engraving-fill)" }}>
        v{TX8P_VERSION}
      </div>
      <p className="font-mono text-[11px]" style={{ color: "var(--engraving-fill)" }}>
        {TX8P_TAGLINE}
      </p>
      <a
        href={TX8P_REPO}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-[11px] underline"
        style={{ color: "var(--btn-blue)" }}
      >
        {TX8P_REPO}
      </a>
      <div className="mt-2">
        <ProgramButton color="cream" onClick={copyDiag}>
          Copy Diagnostic Report
        </ProgramButton>
      </div>
    </div>
  );
}
