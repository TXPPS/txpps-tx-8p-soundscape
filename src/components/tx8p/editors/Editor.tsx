import { useEffect, useMemo, useState } from "react";
import { useUiStore, type TabId } from "@/state/uiStore";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { ProgramButton, type ProgramButtonColor } from "@/components/tx8p/program/ProgramButton";
import { SubTabs } from "@/components/tx8p/tabs/SubTabs";
import { ParamControl } from "@/components/tx8p/editors/ParamControl";
import { paramsForPane, panesForPage, type ParamPage } from "@/engine/params/registry";

/** Per-tab accent, mirroring the approved hardware colour coding. */
const TAB_COLOR: Record<TabId, ProgramButtonColor> = {
  OSC: "red",
  FILTER: "cream",
  ENV: "cream",
  LFO: "amber",
  MOD: "amber",
  FX: "blue",
  VOICE: "cream",
};

/**
 * Focused, JX-8P-style editor. The entire layout is derived from the
 * parameter registry: panes come from `panesForPage`, parameter buttons
 * from `paramsForPane`. Selecting a parameter shows its contextual editor
 * (ParamControl), which drives real DSP and flashes the LCD. No parameter
 * truth is duplicated here.
 */
export function Editor() {
  const tab = useUiStore((s) => s.activeTab);
  const storedSub = useUiStore((s) => s.activeSubTab[tab]);

  const panes = useMemo(() => panesForPage(tab as ParamPage), [tab]);
  const pane = panes.includes(storedSub) ? storedSub : panes[0];

  const params = useMemo(() => paramsForPane(tab as ParamPage, pane), [tab, pane]);
  const [selectedId, setSelectedId] = useState<string>(params[0]?.id ?? "");

  // Keep a valid selection when tab/pane changes.
  useEffect(() => {
    if (!params.some((p) => p.id === selectedId)) setSelectedId(params[0]?.id ?? "");
  }, [params, selectedId]);

  const selected = params.find((p) => p.id === selectedId) ?? params[0];
  const color = TAB_COLOR[tab];

  return (
    <section
      aria-label={`${tab} editor`}
      className="program-strip flex flex-1 flex-col gap-3 px-3 py-3 md:px-5 md:py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EngravedLabel variant="strip" className="text-[10px]">
          {tab} · {pane}
        </EngravedLabel>
        {panes.length > 1 && <SubTabs tab={tab} options={panes} />}
      </div>

      {/* Parameter selector buttons */}
      <div className="flex flex-wrap gap-1.5">
        {params.map((p) => (
          <ProgramButton
            key={p.id}
            color={color}
            active={selectedId === p.id}
            onClick={() => setSelectedId(p.id)}
          >
            {p.label}
          </ProgramButton>
        ))}
      </div>

      <div
        aria-hidden
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent, oklch(0 0 0 / 0.5), transparent)",
        }}
      />

      {/* Contextual value editor for the selected parameter */}
      <div className="min-h-[52px]">{selected && <ParamControl id={selected.id} />}</div>
    </section>
  );
}
