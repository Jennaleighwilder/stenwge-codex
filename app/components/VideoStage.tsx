"use client";

import { useEffect, useRef } from "react";
import type { Progress } from "./StenwgeCodex";

/**
 * The video is portrait (464×688). Render it as a small, clean portrait
 * window in the top-right with a pure black backdrop — no screen blending,
 * no cover-crop, no blow-out. It's a window into the codex, not a wallpaper.
 */
export default function VideoStage({ progress }: { progress: Progress }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // ensure autoplay works (some browsers block until interaction; muted+playsInline helps)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const onClick = () => tryPlay();
    document.addEventListener("click", onClick, { once: true });
    return () => document.removeEventListener("click", onClick);
  }, []);

  // gentle opacity envelope through the chapters; never invisible, never blown out
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const t = progress.chapter + progress.local;
    let opacity = 0.0;
    if (t < 0.25) opacity = (t / 0.25) * 0.6; // fade in during title
    else if (t < 6.8) opacity = 0.92;          // strong but not full white
    else if (t < 7.8) opacity = 0.92 - ((t - 6.8) / 1.0) * 0.5;
    else opacity = 0.42;
    el.style.opacity = String(opacity);
  }, [progress.chapter, progress.local]);

  return (
    <div
      ref={frameRef}
      className="fixed z-[5] pointer-events-none transition-opacity duration-700"
      style={{
        // top-right corner, responsive: ~22vw at desktop, capped sizes
        top: "max(72px, 7vh)",
        right: "max(20px, 2.5vw)",
        width: "min(22vw, 280px)",
        // portrait 464:688 — height = width / aspect
        aspectRatio: "464 / 688",
        opacity: 0,
      }}
      aria-hidden
    >
      {/* black backdrop frame: clean, crisp, doesn't fight the brine */}
      <div
        className="absolute inset-0 rounded-md overflow-hidden"
        style={{
          background: "#000",
          boxShadow:
            "0 0 0 1px rgba(244,220,163,0.15), 0 14px 60px -10px rgba(0,0,0,0.7), 0 0 80px -20px rgba(244,220,163,0.18)",
          border: "1px solid rgba(120,110,90,0.28)",
        }}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "contain", background: "#000" }}
          src="/video/grok.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
        {/* very subtle inner vignette to seat it in the frame */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)",
          }}
        />
      </div>

      {/* tiny film-strip label under the frame */}
      <div
        className="absolute -bottom-5 left-0 right-0 text-center font-mono text-[9px] tracking-[0.35em] uppercase text-stone-500"
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        live · stenwge
      </div>
    </div>
  );
}
