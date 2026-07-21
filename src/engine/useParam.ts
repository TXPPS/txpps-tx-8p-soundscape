import { useCallback, useSyncExternalStore } from "react";
import { getSynthEngine } from "./SynthEngine";
import { getParam, normalize, denormalize, formatParam, type ParamDef } from "./params/registry";

/**
 * Reactive binding between a registry parameter and the engine.
 * Returns the raw value, a normalized 0..1 value, the definition, a
 * formatted display string, and setters (raw or normalized).
 */
export function useParam(id: string) {
  const def = getParam(id);
  const value = useSyncExternalStore(
    (cb) =>
      getSynthEngine().onParamChange((changed) => {
        if (changed === id || changed === "*") cb();
      }),
    () => getSynthEngine().getParam(id),
    () => def.default,
  );

  const setRaw = useCallback(
    (v: number) => {
      const clamped = Math.max(def.min, Math.min(def.max, v));
      getSynthEngine().setParam(id, clamped);
    },
    [id, def.min, def.max],
  );
  const setNorm = useCallback(
    (n: number) => getSynthEngine().setParam(id, denormalize(id, n)),
    [id],
  );
  const reset = useCallback(() => getSynthEngine().setParam(id, def.default), [id, def.default]);

  return {
    def: def as ParamDef,
    value,
    norm: normalize(id, value),
    display: formatParam(id, value),
    setRaw,
    setNorm,
    reset,
  };
}
