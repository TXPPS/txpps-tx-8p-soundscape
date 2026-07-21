import * as React from "react";

/**
 * Returns true when the viewport is BOTH narrow (mobile-class width)
 * AND in portrait orientation. Landscape phones use the desktop-style
 * row layout instead. SSR-safe: initial value is false.
 */
export function useMobilePortrait(maxWidth = 768) {
  const [portrait, setPortrait] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(
      `(max-width: ${maxWidth - 1}px) and (orientation: portrait)`,
    );
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidth]);

  return portrait;
}
