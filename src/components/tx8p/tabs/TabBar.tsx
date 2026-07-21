import { useUiStore, type TabId } from "@/state/uiStore";

interface TabDef {
  id: TabId;
  short: string;
  long: string;
  accent: "red" | "cream" | "amber" | "blue";
}

export const TABS: TabDef[] = [
  { id: "OSC", short: "OSC", long: "OSCILLATORS", accent: "red" },
  { id: "FILTER", short: "FILTER", long: "FILTER", accent: "cream" },
  { id: "ENV", short: "ENV", long: "ENVELOPES", accent: "cream" },
  { id: "LFO", short: "LFO", long: "LFO", accent: "amber" },
  { id: "MOD", short: "MOD", long: "MOD MATRIX", accent: "amber" },
  { id: "FX", short: "FX", long: "EFFECTS", accent: "blue" },
  { id: "VOICE", short: "VOICE", long: "VOICE", accent: "cream" },
];

const ACCENT_COLOR: Record<TabDef["accent"], string> = {
  red: "var(--btn-red)",
  cream: "var(--btn-cream)",
  amber: "var(--btn-amber)",
  blue: "var(--btn-blue)",
};

export function TabBar() {
  const active = useUiStore((s) => s.activeTab);
  const setTab = useUiStore((s) => s.setActiveTab);
  const flash = useUiStore((s) => s.flashLcd);

  return (
    <div
      role="tablist"
      aria-label="Synthesis section"
      className="tab-bar flex w-full items-stretch overflow-x-auto px-2 py-2 md:px-4"
    >
      <div className="mx-auto flex min-w-full items-stretch gap-1 md:gap-1.5">
        {TABS.map((t) => {
          const isActive = t.id === active;
          const accent = ACCENT_COLOR[t.accent];
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setTab(t.id);
                flash(
                  { kind: "message", line1: "SECTION", line2: t.long },
                  600,
                );
              }}
              className="tab-btn group relative flex flex-1 shrink-0 flex-col items-center justify-center whitespace-nowrap"
              style={{
                minHeight: 40,
                minWidth: 64,
                padding: "6px 12px",
                borderRadius: "var(--radius-control)",
                background: isActive
                  ? "linear-gradient(180deg, var(--panel-strip-top) 0%, var(--panel-strip) 100%)"
                  : "linear-gradient(180deg, var(--chassis-highlight) 0%, var(--chassis-base) 100%)",
                color: isActive
                  ? "var(--engraving-fill)"
                  : "var(--engraving-chassis)",
                boxShadow: isActive
                  ? "inset 0 2px 4px oklch(0 0 0 / 0.55), inset 0 0 0 1px oklch(0 0 0 / 0.5)"
                  : "0 1px 0 oklch(1 0 0 / 0.25) inset, 0 -1px 0 var(--chassis-edge-dark) inset, 0 1px 1px oklch(0 0 0 / 0.25)",
                fontFamily: "var(--font-engraved)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              <span
                aria-hidden
                className="mb-[3px] h-[3px] w-[3px] rounded-full"
                style={{
                  background: isActive ? accent : "oklch(0 0 0 / 0.35)",
                  boxShadow: isActive ? `0 0 5px ${accent}` : "none",
                }}
              />
              <span className="md:hidden">{t.short}</span>
              <span className="hidden md:inline">{t.long}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
