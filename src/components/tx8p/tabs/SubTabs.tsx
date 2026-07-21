import { useUiStore, type TabId } from "@/state/uiStore";

export function SubTabs({ tab, options }: { tab: TabId; options: string[] }) {
  const current = useUiStore((s) => s.activeSubTab[tab]);
  const setSub = useUiStore((s) => s.setSubTab);

  return (
    <div
      role="tablist"
      aria-label={`${tab} sections`}
      className="flex flex-wrap items-center gap-1"
    >
      {options.map((opt) => {
        const isActive = opt === current;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={isActive}
            onClick={() => setSub(tab, opt)}
            className="whitespace-nowrap"
            style={{
              minHeight: 26,
              padding: "3px 10px",
              borderRadius: "var(--radius-control)",
              background: isActive
                ? "linear-gradient(180deg, var(--btn-cream-top), var(--btn-cream-bottom))"
                : "linear-gradient(180deg, oklch(0.22 0.005 60), oklch(0.16 0.005 60))",
              color: isActive
                ? "var(--btn-cream-text)"
                : "var(--engraving-fill)",
              boxShadow: isActive
                ? "var(--shadow-cream-btn)"
                : "inset 0 0 0 1px oklch(0 0 0 / 0.55), inset 0 1px 2px oklch(0 0 0 / 0.55)",
              fontFamily: "var(--font-engraved)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
