import * as React from "react";

/**
 * Viewport class detection for the TX-8P performance deck layouts.
 *
 * - `mobile-portrait`: narrow width + portrait orientation. Compact
 *   perf row + docked keyboard.
 * - `mobile-landscape`: narrow (short) height + landscape orientation
 *   (phone held sideways). Dedicated playing layout: left rail + big
 *   keyboard, editor collapses into a sheet.
 * - `wide`: everything else (tablet portrait/landscape, desktop). Full
 *   row layout with Pitch/Mod rail + octave column + keyboard.
 *
 * SSR-safe: initial value is `wide`.
 */
export type ViewportClass = "mobile-portrait" | "mobile-landscape" | "wide";

export function useViewportClass(): ViewportClass {
  const [cls, setCls] = React.useState<ViewportClass>("wide");

  React.useEffect(() => {
    const portraitMQ = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    // Phone landscape: short viewport in landscape orientation. We key on
    // height rather than width because a landscape phone is ~844x390.
    const landscapeMQ = window.matchMedia("(max-height: 500px) and (orientation: landscape)");
    const update = () => {
      if (portraitMQ.matches) setCls("mobile-portrait");
      else if (landscapeMQ.matches) setCls("mobile-landscape");
      else setCls("wide");
    };
    update();
    portraitMQ.addEventListener("change", update);
    landscapeMQ.addEventListener("change", update);
    return () => {
      portraitMQ.removeEventListener("change", update);
      landscapeMQ.removeEventListener("change", update);
    };
  }, []);

  return cls;
}

/**
 * Back-compat: returns true when the viewport is narrow AND portrait.
 * Existing components that only need the portrait branch keep working.
 */
export function useMobilePortrait() {
  return useViewportClass() === "mobile-portrait";
}
