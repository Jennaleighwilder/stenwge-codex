"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Narrative from "./Narrative";
import AmbientAudio from "./AmbientAudio";
import CodeFragment from "./CodeFragment";
import VideoStage from "./VideoStage";
import EasterEggs from "./EasterEggs";
import { Achievements } from "./Achievements";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

export type Progress = {
  /** Total progress through the entire codex, 0-1 */
  total: number;
  /** Current chapter index, 0-based */
  chapter: number;
  /** Progress within current chapter, 0-1 */
  local: number;
  /** Mouse position in normalized device coords, -1 to 1 */
  mouseX: number;
  mouseY: number;
};

/** 8 chapters of story = 7 beats + a final breath. ~12s per chapter = ~96s total. */
const CHAPTERS = 8;
const SECONDS_PER_CHAPTER = 12;
const TOTAL_SECONDS = CHAPTERS * SECONDS_PER_CHAPTER;

export default function StenwgeCodex() {
  const [progress, setProgress] = useState<Progress>({
    total: 0,
    chapter: 0,
    local: 0,
    mouseX: 0,
    mouseY: 0,
  });
  const [playing, setPlaying] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  // timer-driven progress (auto-play)
  const tRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing) {
        tRef.current = (tRef.current + dt) % TOTAL_SECONDS;
      }
      const total = tRef.current / TOTAL_SECONDS;
      const scaled = total * CHAPTERS;
      const chapter = Math.min(CHAPTERS - 1, Math.floor(scaled));
      const local = scaled - chapter;
      (window as any).__codexCurrentChapter = chapter;
      setProgress((p) => ({ ...p, total, chapter, local }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // mouse tracking for parallax / bird trail (still useful w/o scroll)
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      setProgress((p) => ({ ...p, mouseX: x, mouseY: y }));
    };
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  // expose seek + togglePlay imperatively for easter eggs and shortcut handlers
  useEffect(() => {
    (window as any).__codexSeek = (chapterIndex: number) => {
      tRef.current =
        Math.max(0, Math.min(CHAPTERS - 1, chapterIndex)) *
        SECONDS_PER_CHAPTER;
    };
    (window as any).__codexTogglePlay = () => setPlaying((p) => !p);
    (window as any).__codexRestart = () => {
      tRef.current = 0;
    };
    return () => {
      delete (window as any).__codexSeek;
      delete (window as any).__codexTogglePlay;
      delete (window as any).__codexRestart;
    };
  }, []);

  // global keyboard shortcuts: 1-7 jump chapters, space play/pause, r restart
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (/input|textarea|select/i.test(tag)) return;

      if (e.key >= "1" && e.key <= "8") {
        const ch = parseInt(e.key, 10) - 1;
        tRef.current = ch * SECONDS_PER_CHAPTER;
        Achievements.unlock("chapter-jump");
        return;
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
        Achievements.unlock("pause");
        return;
      }
      if (e.key.toLowerCase() === "r") {
        tRef.current = 0;
        Achievements.unlock("restart");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
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

      {/* ambient audio (click to start) */}
      <AmbientAudio
        ready={audioReady}
        onReady={() => setAudioReady(true)}
        progress={progress}
      />

      {/* the curious-coder layer: console banner, window.codex, konami, ? */}
      <EasterEggs />

      {/* progress bar + play/pause */}
      <PlayBar
        progress={progress}
        playing={playing}
        onToggle={() => setPlaying((p) => !p)}
        onSeek={(t) => {
          tRef.current = t * TOTAL_SECONDS;
        }}
      />

      {/* visible keyboard hint bar — always there, intentional & legible */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-3 px-3 py-1.5 text-[10px] font-mono text-stone-400">
        <KeyHint label="space">pause</KeyHint>
        <KeyHint label="1–8">chapter</KeyHint>
        <KeyHint label="?">keys</KeyHint>
        <KeyHint label="r">restart</KeyHint>
        <KeyHint label="m">mute</KeyHint>
        <span className="text-stone-600">·</span>
        <span className="text-stone-500">
          devtools → <span className="text-stone-200">codex.help()</span>
        </span>
      </div>

      {/* footer credit, lower-left */}
      <footer className="fixed bottom-3 left-3 z-30 text-[9px] font-mono text-stone-600 opacity-70 pointer-events-none">
        the forgotten code research institute
      </footer>

      {/* chapter indicator */}
      <div className="fixed bottom-3 right-3 z-30 text-[10px] font-mono text-stone-500 opacity-70 pointer-events-none tabular-nums">
        ch {progress.chapter + 1} / {CHAPTERS}
      </div>

      {/* first-load tutorial banner — auto-dismisses */}
      <TutorialBanner />
    </div>
  );
}

function KeyHint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 rounded border border-stone-700 bg-stone-900/70 text-stone-200 text-[9px] font-mono">
        {label}
      </kbd>
      <span className="text-stone-500">{children}</span>
    </span>
  );
}

const TUTORIAL_KEY = "fcri:tutorial-seen";

function TutorialBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(TUTORIAL_KEY);
      if (!seen) {
        setShow(true);
        const t = setTimeout(() => {
          setShow(false);
          try {
            localStorage.setItem(TUTORIAL_KEY, "1");
          } catch {}
        }, 9000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] max-w-xl w-[92%] rounded-md border border-amber-200/30 bg-stone-950/95 backdrop-blur px-5 py-4 font-mono text-[12px] text-stone-200 shadow-2xl pointer-events-auto"
      style={{ animation: "tutSlide 9s ease-out forwards" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-amber-200 text-lg leading-none">★</span>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/80 mb-1.5">
            welcome to the codex
          </div>
          <p className="text-stone-300 leading-relaxed">
            the story plays itself — <span className="text-stone-100">no scrolling</span>.{" "}
            <span className="text-stone-100">23 things</span> are hidden across this site.
            press{" "}
            <kbd className="px-1.5 py-0.5 rounded border border-stone-700 bg-stone-900 text-stone-100 text-[10px]">
              ?
            </kbd>{" "}
            for keys, click the{" "}
            <span className="text-amber-200">★</span> top-left for the list, or
            open DevTools and type{" "}
            <code className="text-amber-100">codex.help()</code>.
          </p>
        </div>
        <button
          onClick={() => {
            setShow(false);
            try {
              localStorage.setItem(TUTORIAL_KEY, "1");
            } catch {}
          }}
          className="text-stone-500 hover:text-stone-100 text-sm leading-none"
          aria-label="dismiss"
        >
          ×
        </button>
      </div>
      <style>{`
        @keyframes tutSlide {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          5% { opacity: 1; transform: translate(-50%, 0); }
          90% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -8px); }
        }
      `}</style>
    </div>
  );
}

function PlayBar({
  progress,
  playing,
  onToggle,
  onSeek,
}: {
  progress: Progress;
  playing: boolean;
  onToggle: () => void;
  onSeek: (t: number) => void;
}) {
  const clickCount = useRef(0);
  const [secret, setSecret] = useState(false);
  return (
    <div className="fixed bottom-9 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-full bg-stone-900/40 backdrop-blur border border-stone-800">
      <button
        onClick={() => {
          onToggle();
          Achievements.unlock("pause");
          clickCount.current++;
          if (clickCount.current === 7) {
            setSecret(true);
            Achievements.unlock("secret-mode");
            // eslint-disable-next-line no-console
            console.log(
              "%c🐦 secret mode unlocked. you clicked play seven times.",
              "background:#f4dca3;color:#111;padding:3px 8px;font-family:ui-monospace;letter-spacing:0.2em",
            );
            // visual hint: gold ring + auto-clear after a bit
            setTimeout(() => setSecret(false), 6000);
            clickCount.current = 0;
          }
        }}
        className={
          "w-7 h-7 rounded-full text-stone-900 flex items-center justify-center text-[10px] font-mono transition " +
          (secret
            ? "bg-amber-200 ring-2 ring-amber-300"
            : "bg-stone-100/90 hover:bg-stone-100")
        }
        aria-label={playing ? "pause" : "play"}
        title={playing ? "pause (space)" : "play (space)"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div
        className="h-1 w-[min(48vw,360px)] rounded-full bg-stone-700/60 relative cursor-pointer"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          onSeek(t);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-stone-100/90"
          style={{ width: `${progress.total * 100}%` }}
        />
      </div>
      <div className="text-[10px] font-mono text-stone-400 w-16 text-right tabular-nums">
        {Math.floor(progress.total * 96)}s / 96s
      </div>
    </div>
  );
}
