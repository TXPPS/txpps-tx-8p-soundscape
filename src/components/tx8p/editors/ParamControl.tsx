import { useCallback, useRef } from "react";
import { useParam } from "@/engine/useParam";
import { useUiStore } from "@/state/uiStore";
import { getMidi } from "@/engine/midi";
import { EngravedLabel } from "@/components/tx8p/chassis/Chassis";
import { ProgramButton } from "@/components/tx8p/program/ProgramButton";

/** Long-press (600ms) or right-click begins MIDI Learn for eligible params. */
function useMidiLearn(
  id: string,
  eligible: boolean | undefined,
  flash: (line1: string, line2: string) => void,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const begin = useCallback(() => {
    if (!eligible) return;
    getMidi().startLearn(id);
    flash("MIDI LEARN", "MOVE A CONTROL");
  }, [id, eligible, flash]);
  return {
    onContextMenu: (e: React.MouseEvent) => {
      if (!eligible) return;
      e.preventDefault();
      begin();
    },
    onPointerDown: () => {
      if (!eligible) return;
      timer.current = setTimeout(begin, 600);
    },
    onPointerUp: () => timer.current && clearTimeout(timer.current),
    onPointerLeave: () => timer.current && clearTimeout(timer.current),
  };
}

/**
 * Contextual value editor for the currently-selected registry parameter.
 * Adapts to the parameter kind (continuous / enum / toggle), drives real
 * DSP through the engine, and flashes the LCD with name + value + unit.
 * Supports touch, mouse, keyboard arrows, fine adjust (Shift), and reset.
 */
export function ParamControl({ id }: { id: string }) {
  const { def, value, norm, display, setRaw, setNorm, reset } = useParam(id);
  const flash = useUiStore((s) => s.flashLcd);

  const doFlash = useCallback(
    (v: number, disp: string) =>
      flash({ kind: "param", label: def.label.toUpperCase(), value: v, display: disp }, 1100),
    [flash, def.label],
  );
  const learn = useMidiLearn(id, def.midiEligible, (l1, l2) =>
    flash({ kind: "message", line1: l1, line2: l2 }, 1400),
  );

  // ---- toggle ----
  if (def.kind === "toggle") {
    const on = value >= 0.5;
    return (
      <div className="flex items-center gap-4" {...learn}>
        <EngravedLabel variant="strip-dim">{def.label}</EngravedLabel>
        <ProgramButton
          color={on ? "amber" : "cream"}
          active={on}
          ariaLabel={`${def.label} ${on ? "on" : "off"}`}
          onClick={() => {
            const nv = on ? 0 : 1;
            setRaw(nv);
            doFlash(nv, def.format ? def.format(nv) : on ? "OFF" : "ON");
          }}
        >
          {display}
        </ProgramButton>
      </div>
    );
  }

  // ---- enum ----
  if (def.kind === "enum" && def.options) {
    const idx = Math.round(value);
    const opts = def.options;
    const step = (dir: -1 | 1) => {
      const ni = Math.max(0, Math.min(opts.length - 1, idx + dir));
      setRaw(ni);
      doFlash(ni / Math.max(1, opts.length - 1), opts[ni]);
    };
    const compact = opts.length <= 5;
    return (
      <div className="flex flex-wrap items-center gap-3" {...learn}>
        <EngravedLabel variant="strip-dim">{def.label}</EngravedLabel>
        {compact ? (
          <div className="flex flex-wrap gap-1.5">
            {opts.map((o, i) => (
              <ProgramButton
                key={o}
                color="cream"
                active={i === idx}
                onClick={() => {
                  setRaw(i);
                  doFlash(i / Math.max(1, opts.length - 1), o);
                }}
              >
                {o}
              </ProgramButton>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ProgramButton
              color="cream"
              ariaLabel={`${def.label} previous`}
              onClick={() => step(-1)}
            >
              ◀
            </ProgramButton>
            <span
              className="min-w-[120px] text-center font-mono text-[12px] tracking-wider"
              style={{ color: "var(--lcd-amber)" }}
            >
              {opts[idx]}
            </span>
            <ProgramButton color="cream" ariaLabel={`${def.label} next`} onClick={() => step(1)}>
              ▶
            </ProgramButton>
          </div>
        )}
      </div>
    );
  }

  // ---- continuous / stepped ----
  const stepPct = def.steps ? 1 / def.steps : 0.01;
  const nudge = (dir: -1 | 1, fine: boolean) => {
    const s = fine ? stepPct / 4 : stepPct;
    const nn = Math.max(0, Math.min(1, norm + dir * s));
    setNorm(nn);
    doFlash(nn, def.format ? def.format(denormPreview(def, nn)) : `${Math.round(nn * 100)}%`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4" {...learn}>
      <div className="flex min-w-[130px] flex-col gap-1">
        <EngravedLabel variant="strip-dim">{def.label}</EngravedLabel>
        <span
          className="font-mono text-[12px] tracking-widest"
          style={{ color: "var(--lcd-amber)" }}
        >
          {display}
        </span>
      </div>
      <div className="flex flex-1 items-center gap-3">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(norm * 1000)}
          onChange={(e) => {
            const nn = Number(e.target.value) / 1000;
            setNorm(nn);
            doFlash(
              nn,
              def.format ? def.format(denormPreview(def, nn)) : `${Math.round(nn * 100)}%`,
            );
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
              e.preventDefault();
              nudge(1, e.shiftKey);
            } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
              e.preventDefault();
              nudge(-1, e.shiftKey);
            }
          }}
          onDoubleClick={() => {
            reset();
            doFlash(0.5, display);
          }}
          data-tx-control
          aria-label={`${def.label} value`}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-[2px]"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.14 0.004 60) 0%, oklch(0.20 0.004 60) 100%)",
            boxShadow: "inset 0 1px 2px oklch(0 0 0 / 0.7), inset 0 0 0 1px oklch(0 0 0 / 0.6)",
            accentColor: "var(--btn-red)",
          }}
        />
        <button
          type="button"
          onClick={() => {
            reset();
            doFlash(0.5, def.format ? def.format(def.default) : "");
          }}
          className="font-mono text-[9px] tracking-wider"
          style={{ color: "var(--engraving-dim)" }}
          aria-label={`Reset ${def.label} to default`}
          title="Reset to default"
        >
          RESET
        </button>
      </div>
    </div>
  );
}

// local denormalize preview (avoids importing engine denorm for display only)
function denormPreview(
  def: { min: number; max: number; curve?: string; steps?: number },
  n: number,
) {
  if (def.steps && def.steps > 0) {
    const s = Math.round(n * def.steps);
    return def.min + (s / def.steps) * (def.max - def.min);
  }
  if (def.curve === "exp") {
    const lo = Math.max(def.min, 1e-4);
    return lo * Math.pow(def.max / lo, n);
  }
  return def.min + n * (def.max - def.min);
}
