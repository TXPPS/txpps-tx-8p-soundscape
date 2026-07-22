import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUiStore } from "@/state/uiStore";
import { usePresetStore, type Preset, type PresetCategory } from "@/state/presetStore";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";

type Filter = "FACTORY" | "USER" | "FAVORITES" | "RECENT";
const CATEGORIES: (PresetCategory | "ALL")[] = [
  "ALL",
  "BASS",
  "LEAD",
  "PAD",
  "KEYS",
  "PLUCK",
  "BRASS",
  "STRINGS",
  "FX",
  "ARP",
  "INIT",
];

export function PresetLibrary() {
  const open = useUiStore((s) => s.browserOpen);
  const setOpen = useUiStore((s) => s.setBrowserOpen);
  const store = usePresetStore();
  const [filter, setFilter] = useState<Filter>("FACTORY");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<PresetCategory | "ALL">("ALL");
  const [saveName, setSaveName] = useState("");
  const [saveCat, setSaveCat] = useState<PresetCategory>("KEYS");

  const list = useMemo(() => {
    let items: Preset[];
    if (filter === "FACTORY") items = store.factory;
    else if (filter === "USER") items = store.user;
    else if (filter === "FAVORITES")
      items = store.all().filter((p) => store.favorites.includes(p.id));
    else
      items = store.recent
        .map((id) => store.all().find((p) => p.id === id))
        .filter(Boolean) as Preset[];
    if (cat !== "ALL") items = items.filter((p) => p.category === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q)),
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter,
    cat,
    search,
    store.factory,
    store.user,
    store.favorites,
    store.recent,
    store.current,
  ]);

  const exportPreset = (id: string) => {
    const json = store.exportPreset(id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.all().find((p) => p.id === id)?.name ?? "preset"}.tx8p.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importPreset = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      f.text().then((txt) => store.importPreset(txt) && setFilter("USER"));
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-2xl border-0 p-0"
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
              PRESET LIBRARY
            </DialogTitle>
            <DialogDescription
              style={{ color: "var(--engraving-chassis-dim)" }}
              className="text-xs tracking-wider"
            >
              {store.factory.length} factory · {store.user.length} user
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          {/* filter + search row */}
          <div className="flex flex-wrap items-center gap-2">
            {(["FACTORY", "USER", "FAVORITES", "RECENT"] as Filter[]).map((f) => (
              <ProgramButton
                key={f}
                color={filter === f ? "red" : "cream"}
                active={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </ProgramButton>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="ml-auto rounded-[2px] px-2 py-1 font-mono text-[12px]"
              style={{
                background: "var(--panel-strip)",
                color: "var(--engraving-fill)",
                boxShadow: "var(--shadow-strip-inset)",
              }}
            />
          </div>

          {/* category chips */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="rounded-[2px] px-2 py-0.5 font-sans text-[9px] font-semibold tracking-wider"
                style={{
                  background: cat === c ? "var(--btn-amber)" : "oklch(0.30 0.004 60)",
                  color: cat === c ? "var(--btn-amber-text)" : "var(--engraving-fill)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* list */}
          <div
            className="max-h-[38vh] overflow-y-auto rounded-[3px]"
            style={{ background: "var(--panel-strip)", boxShadow: "var(--shadow-strip-inset)" }}
          >
            {list.length === 0 && (
              <div
                className="px-3 py-6 text-center font-mono text-[11px]"
                style={{ color: "var(--engraving-dim)" }}
              >
                No presets.
              </div>
            )}
            {list.map((p) => {
              const isCurrent = p.id === store.current.id;
              const fav = store.favorites.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 border-b px-3 py-1.5"
                  style={{
                    borderColor: "oklch(0 0 0 / 0.35)",
                    background: isCurrent ? "oklch(0.34 0.02 60)" : "transparent",
                  }}
                >
                  <button
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => store.load(p.id)}
                    aria-label={`Load ${p.name}`}
                  >
                    <span
                      className="font-mono text-[12px]"
                      style={{ color: "var(--lcd-amber)", minWidth: 130 }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="font-sans text-[9px] tracking-wider"
                      style={{ color: "var(--engraving-dim)" }}
                    >
                      {p.category}
                    </span>
                    {p.bank === "USER" && (
                      <span className="font-sans text-[8px]" style={{ color: "var(--btn-blue)" }}>
                        USER
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => store.toggleFavorite(p.id)}
                    aria-label="Toggle favorite"
                    title="Favorite"
                    className="px-1 text-[13px]"
                    style={{ color: fav ? "var(--btn-amber)" : "var(--engraving-dim)" }}
                  >
                    {fav ? "★" : "☆"}
                  </button>
                  <button
                    onClick={() => store.duplicate(p.id)}
                    aria-label="Duplicate"
                    title="Duplicate"
                    className="px-1 font-sans text-[9px]"
                    style={{ color: "var(--engraving-fill)" }}
                  >
                    DUP
                  </button>
                  <button
                    onClick={() => exportPreset(p.id)}
                    aria-label="Export"
                    title="Export"
                    className="px-1 font-sans text-[9px]"
                    style={{ color: "var(--engraving-fill)" }}
                  >
                    EXP
                  </button>
                  {p.bank === "USER" && (
                    <>
                      <button
                        onClick={() => {
                          const nm = prompt("Rename preset", p.name);
                          if (nm) store.rename(p.id, nm);
                        }}
                        className="px-1 font-sans text-[9px]"
                        style={{ color: "var(--engraving-fill)" }}
                      >
                        REN
                      </button>
                      <button
                        onClick={() => store.remove(p.id)}
                        aria-label="Delete"
                        title="Delete"
                        className="px-1 font-sans text-[9px]"
                        style={{ color: "var(--btn-red)" }}
                      >
                        DEL
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* save-as row */}
          <div className="flex flex-wrap items-center gap-2 border-t border-black/15 pt-3">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="New preset name"
              className="rounded-[2px] px-2 py-1 font-mono text-[12px]"
              style={{
                background: "var(--panel-strip)",
                color: "var(--engraving-fill)",
                boxShadow: "var(--shadow-strip-inset)",
              }}
            />
            <select
              value={saveCat}
              onChange={(e) => setSaveCat(e.target.value as PresetCategory)}
              className="rounded-[2px] px-2 py-1 font-sans text-[10px]"
              style={{ background: "var(--panel-strip)", color: "var(--engraving-fill)" }}
            >
              {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ProgramButton
              color="cream"
              onClick={() => {
                if (saveName.trim()) {
                  store.saveAs(saveName.trim(), saveCat);
                  setSaveName("");
                  setFilter("USER");
                }
              }}
            >
              Save As
            </ProgramButton>
            {store.current.bank === "USER" && (
              <ProgramButton color="amber" onClick={() => store.overwriteCurrent()}>
                Overwrite
              </ProgramButton>
            )}
            <ProgramButton color="cream" onClick={importPreset}>
              Import
            </ProgramButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
