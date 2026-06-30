"use client";

import { useEffect, useRef } from "react";
import type { Progress } from "./StenwgeCodex";

/**
 * Full-bleed portrait video as the visual centerpiece. Sits above the WebGL
 * canvas (brine + moon) and below the narrative text. Always muted (we use
 * the song instead). Looping. Plays the moment the page is interactive.
 *
 * Fades up subtly with chapter progress so it feels like the scene is
 * developing as you scroll.
 */
export default function VideoStage({ progress }: { progress: Progress }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // ease the video's opacity through the chapters (peak in the middle of the experience)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const t = progress.chapter + progress.local;
    // gentle envelope: low at intro, peaks ch 2.5 – 6.5, gracefully tapers at end
    let opacity = 0.0;
    if (t < 0.4) opacity = t / 0.4 * 0.55;
    else if (t < 2.5) opacity = 0.55 + Math.min(1, (t - 0.4) / 2.1) * 0.4;
    else if (t < 6.5) opacity = 0.95;
    else if (t < 7.6) opacity = 0.95 * (1 - (t - 6.5) / 1.1) + 0.35;
    else opacity = 0.35;
    el.style.opacity = String(opacity);
  }, [progress.chapter, progress.local]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[5] pointer-events-none transition-opacity duration-500"
      style={{
        opacity: 0,
        mixBlendMode: "screen",
      }}
      aria-hidden
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "cover" }}
        src="/video/grok.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
      {/* soft vignette to keep edges dark & text readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
