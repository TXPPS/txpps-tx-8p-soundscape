import { useSyncExternalStore } from "react";
import { getSynthEngine, type EngineStatus, type SynthEngine } from "./SynthEngine";

/**
 * React binding around the singleton SynthEngine. `subscribe` is
 * client-only — `getServerSnapshot` returns the SSR-safe `"idle"`
 * value so the first render is stable.
 */
export function useEngineStatus(): EngineStatus {
  return useSyncExternalStore(
    (cb) => getSynthEngine().subscribe(cb),
    () => getSynthEngine().getStatus(),
    () => "locked" as EngineStatus,
  );
}

export function useEngine(): SynthEngine {
  // Same singleton every render; no state needed.
  return getSynthEngine();
}
