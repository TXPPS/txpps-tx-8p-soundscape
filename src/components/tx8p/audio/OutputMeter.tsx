import { useEffect, useRef } from "react";
import { getSynthEngine } from "@/engine/SynthEngine";

/**
 * Compact post-master stereo output meter.
 *
 * Reads real RMS + peak from the two post-master analyser taps (never a
 * decorative animation). Peak-hold decays smoothly. Drawn on a canvas via a
 * single requestAnimationFrame loop for low CPU; shows silence when the
 * output is silent and moves the instant a note sounds. Purely observational
 * — it cannot alter or reroute audio.
 */
export function OutputMeter({
  width = 128,
  height = 26,
  orientation = "horizontal",
}: {
  width?: number;
  height?: number;
  orientation?: "horizontal" | "vertical";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    ctx2d.scale(dpr, dpr);

    // Concrete colours (canvas 2D cannot resolve CSS var()); tuned to theme.
    const C = {
      bg: "#1c1b18",
      green: "#4ec66a",
      amber: "#d9a53a",
      orange: "#e07a3a",
      red: "#c14a42",
      peak: "#efeee6",
    };

    let raf = 0;
    let bufL: Float32Array<ArrayBuffer> | null = null;
    let bufR: Float32Array<ArrayBuffer> | null = null;
    const held = [0, 0];
    const heldAt = [0, 0];
    let frame = 0;

    const rms = (buf: Float32Array) => {
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      return Math.sqrt(s / buf.length);
    };

    const draw = () => {
      frame++;
      const meters = getSynthEngine().getMeterAnalysers();
      const vertical = orientation === "vertical";
      const chW = vertical ? height : width;
      const chH = vertical ? width : height;
      // background
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.fillStyle = C.bg;
      roundRect(ctx2d, 0, 0, width, height, 2);
      ctx2d.fill();

      const levels = [0, 0];
      if (meters) {
        if (!bufL) bufL = new Float32Array(new ArrayBuffer(meters.L.fftSize * 4));
        if (!bufR) bufR = new Float32Array(new ArrayBuffer(meters.R.fftSize * 4));
        meters.L.getFloatTimeDomainData(bufL);
        meters.R.getFloatTimeDomainData(bufR);
        levels[0] = rms(bufL);
        levels[1] = rms(bufR);
        // instantaneous peak from the same buffer
        for (let ch = 0; ch < 2; ch++) {
          const b = ch === 0 ? bufL : bufR;
          let pk = 0;
          for (let i = 0; i < b.length; i++) pk = Math.max(pk, Math.abs(b[i]));
          if (pk >= held[ch]) {
            held[ch] = pk;
            heldAt[ch] = frame;
          } else if (frame - heldAt[ch] > 30) {
            held[ch] = Math.max(0, held[ch] - 0.012); // ~decay after hold
          }
        }
      }

      // map amplitude → dB-ish 0..1 for a musical scale
      const norm = (v: number) => {
        if (v <= 0.0005) return 0;
        const db = 20 * Math.log10(v);
        return Math.max(0, Math.min(1, (db + 60) / 60));
      };

      const laneGap = 2;
      const laneThickness = (chH - laneGap) / 2;
      for (let ch = 0; ch < 2; ch++) {
        const level = norm(levels[ch]);
        const peak = norm(held[ch]);
        const laneOffset = ch * (laneThickness + laneGap);
        // fill gradient green→amber→red
        const grad = vertical
          ? ctx2d.createLinearGradient(0, chW, 0, 0)
          : ctx2d.createLinearGradient(0, 0, chW, 0);
        grad.addColorStop(0, C.green);
        grad.addColorStop(0.7, C.amber);
        grad.addColorStop(0.9, C.orange);
        grad.addColorStop(1, C.red);
        ctx2d.fillStyle = grad;

        if (vertical) {
          const x = laneOffset;
          const h = level * chW;
          ctx2d.fillRect(x, chW - h, laneThickness, h);
          // peak tick
          if (peak > 0.01) {
            ctx2d.fillStyle = C.peak;
            const py = chW - peak * chW;
            ctx2d.fillRect(x, py - 1, laneThickness, 1.5);
          }
        } else {
          const y = laneOffset;
          const w = level * chW;
          ctx2d.fillRect(0, y, w, laneThickness);
          if (peak > 0.01) {
            ctx2d.fillStyle = C.peak;
            const px = peak * chW;
            ctx2d.fillRect(px - 1, y, 1.5, laneThickness);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height, orientation]);

  return (
    <div
      className="relative select-none"
      role="img"
      aria-label="Output level meter"
      style={{
        borderRadius: 3,
        padding: 2,
        background: "linear-gradient(180deg, var(--lcd-bg-top) 0%, var(--lcd-bg) 100%)",
        boxShadow: "var(--shadow-lcd-inset)",
      }}
    >
      <canvas ref={canvasRef} style={{ width, height, display: "block" }} />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
