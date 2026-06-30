"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Narrative from "./Narrative";
import AmbientAudio from "./AmbientAudio";
import CodeFragment from "./CodeFragment";
import VideoStage from "./VideoStage";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

export type Progress = {
  /** Total scroll progress through the entire codex, 0-1 */
  total: number;
  /** Current chapter index, 0-based */
  chapter: number;
  /** Progress within current chapter, 0-1 */
  local: number;
  /** Mouse position in normalized device coords, -1 to 1 */
  mouseX: number;
  mouseY: number;
};

const CHAPTERS = 8;

export default function StenwgeCodex() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<Progress>({
    total: 0,
    chapter: 0,
    local: 0,
    mouseX: 0,
    mouseY: 0,
  });
  const [audioReady, setAudioReady] = useState(false);

  // Track scroll progress + mouse position
  useEffect(() => {
    let raf = 0;
    const onScrollOrMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const maxScroll = doc.scrollHeight - window.innerHeight;
        const total = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        const scaled = total * CHAPTERS;
        const chapter = Math.min(CHAPTERS - 1, Math.floor(scaled));
        const local = scaled - chapter;
        setProgress((p) => ({
          ...p,
          total,
          chapter,
          local,
        }));
      });
    };
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      setProgress((p) => ({ ...p, mouseX: x, mouseY: y }));
    };
    window.addEventListener("scroll", onScrollOrMove, { passive: true });
    window.addEventListener("resize", onScrollOrMove);
    window.addEventListener("mousemove", onMouse);
    onScrollOrMove();
    return () => {
      window.removeEventListener("scroll", onScrollOrMove);
      window.removeEventListener("resize", onScrollOrMove);
      window.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* fixed full-viewport WebGL canvas — brine background + moon only */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Scene3D progress={progress} />
      </div>

      {/* video centerpiece, screen-blended over the brine */}
      <VideoStage progress={progress} />

      {/* narrative overlay */}
      <Narrative progress={progress} />

      {/* live code fragments — the actual AI artifact behind each chapter */}
      <CodeFragment progress={progress} />

      {/* spacer divs to drive scroll – each chapter is ~100vh tall */}
      <div className="relative z-10 pointer-events-none">
        {Array.from({ length: CHAPTERS }).map((_, i) => (
          <section
            key={i}
            className="h-screen w-screen"
            data-chapter={i}
            aria-hidden
          />
        ))}
        {/* final breathing room */}
        <section className="h-screen w-screen" aria-hidden />
      </div>

      {/* ambient audio (click to start) */}
      <AmbientAudio
        ready={audioReady}
        onReady={() => setAudioReady(true)}
        progress={progress}
      />

      {/* tiny footer credit */}
      <footer className="fixed bottom-3 left-3 z-30 text-[10px] font-mono text-stone-500 opacity-60 hover:opacity-100 transition">
        <span className="block">the forgotten code research institute</span>
        <span className="block">scroll / move / listen</span>
      </footer>

      {/* progress indicator */}
      <div className="fixed bottom-3 right-3 z-30 text-[10px] font-mono text-stone-500 opacity-60">
        ch {progress.chapter + 1} / {CHAPTERS}
      </div>
    </div>
  );
}
