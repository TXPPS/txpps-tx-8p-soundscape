/** Product version + identity constants for the TXPPS TX-8P. */
export const TX8P_VERSION = "1.0.1";
export const TX8P_PRODUCT = "TXPPS TX-8P";
export const TX8P_TAGLINE = "Eight-voice hybrid polyphonic browser synthesizer by TXPPS.";
export const TX8P_REPO = "https://github.com/TXPPS/txpps-tx-8p-soundscape";

/** Short commit id injected at build time (see vite.config.ts). "dev" locally. */
declare const __TX8P_BUILD__: string | undefined;
export const TX8P_BUILD: string = typeof __TX8P_BUILD__ !== "undefined" ? __TX8P_BUILD__ : "dev";
