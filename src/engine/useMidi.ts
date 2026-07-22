import { useSyncExternalStore } from "react";
import { getMidi, type MidiState } from "./midi";

const SSR_STATE: MidiState = {
  supported: false,
  requested: false,
  permission: "unknown",
  inputs: [],
  activeInputId: "all",
  channel: 0,
  learning: null,
  lastActivityAt: 0,
  maps: [],
};

export function useMidiState(): MidiState {
  return useSyncExternalStore(
    (cb) => getMidi().subscribe(cb),
    () => getMidi().getState(),
    () => SSR_STATE,
  );
}
