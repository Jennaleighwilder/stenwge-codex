"use client";

import { useEffect, useState } from "react";

/**
 * Tiny achievements / discovery tracker. Each easter egg calls Achievements.unlock(id).
 * The panel shows discovered/total in a small chip; clicking expands a list.
 */

export type AchievementId =
  | "banner"
  | "codex-global"
  | "codex-feed"
  | "codex-truce"
  | "codex-bf"
  | "codex-bfwasm"
  | "codex-lisp"
  | "codex-compile"
  | "codex-diff"
  | "konami"
  | "stenwge-typed"
  | "cheatsheet"
  | "chapter-jump"
  | "pause"
  | "restart"
  | "moon-click"
  | "api-codex"
  | "api-teapot"
  | "api-raft"
  | "api-dream"
  | "api-verify"
  | "robots"
  | "security"
  | "bird-page"
  | "idle-cursor"
  | "secret-mode"
  | "repl-open"
  | "repl-lisp"
  | "repl-js"
  | "repl-bf"
  | "repl-curl"
  | "lab-visit"
  | "lab-raft"
  | "lab-gs"
  | "lab-merkle"
  | "lab-dream"
  | "lab-nca"
  | "lab-moon"
  | "lab-shader"
  | "codex-speak"
  | "codex-airdrop"
  | "api-airdrop"
  | "ed25519-verified";

const DESCRIPTIONS: Record<AchievementId, string> = {
  "banner": "opened the console",
  "codex-global": "touched window.codex",
  "codex-feed": "fed the mouse",
  "codex-truce": "ran the truce",
  "codex-bf": "ran brainfuck (interpreter)",
  "codex-bfwasm": "compiled bf → wasm at runtime",
  "codex-lisp": "evaluated a lisp expression",
  "codex-compile": "compiled the codex",
  "codex-diff": "diffed yesterday's tale",
  "konami": "↑↑↓↓←→←→ba",
  "stenwge-typed": "typed stenwge",
  "cheatsheet": "found the cheat sheet",
  "chapter-jump": "jumped a chapter",
  "pause": "paused the variance",
  "restart": "restarted the tale",
  "moon-click": "clicked the moon",
  "api-codex": "fetched the manifest",
  "api-teapot": "found the teapot",
  "api-raft": "ran consensus",
  "api-dream": "made the codex dream",
  "api-verify": "requested a signed manifest",
  "robots": "read the robots poem",
  "security": "read security.txt",
  "bird-page": "found the bird's room",
  "idle-cursor": "stayed perfectly still",
  "secret-mode": "clicked play seven times",
  "repl-open": "opened the repl (` key)",
  "repl-lisp": "evaluated lisp in the repl",
  "repl-js": "evaluated js in the repl",
  "repl-bf": "jit-compiled bf in the repl",
  "repl-curl": "curled a url from the repl",
  "lab-visit": "found /lab",
  "lab-raft": "visited /lab/raft",
  "lab-gs": "watched reaction-diffusion",
  "lab-merkle": "verified the merkle chain",
  "lab-dream": "streamed a dream over sse",
  "lab-nca": "grew neural cellular automata",
  "lab-moon": "ray-marched the moon",
  "lab-shader": "compiled a live shader",
  "codex-speak": "made the codex speak (klatt formants)",
  "codex-airdrop": "downloaded the offline codex",
  "api-airdrop": "requested /api/airdrop",
  "ed25519-verified": "verified an ed25519 signature",
};

const ALL_IDS = Object.keys(DESCRIPTIONS) as AchievementId[];

const STORAGE_KEY = "fcri:achievements";

type Listener = (set: Set<AchievementId>) => void;

class Bus {
  unlocked = new Set<AchievementId>();
  listeners: Listener[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const arr = JSON.parse(raw) as string[];
          for (const a of arr) {
            if (a in DESCRIPTIONS) this.unlocked.add(a as AchievementId);
          }
        }
      } catch {}
    }
  }

  unlock(id: AchievementId) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(Array.from(this.unlocked)),
        );
      } catch {}
    }
    for (const fn of this.listeners) fn(this.unlocked);
    // eslint-disable-next-line no-console
    console.log(
      `%c★ unlocked: ${id}  %c${DESCRIPTIONS[id]}`,
      "color:#f4dca3;font-family:ui-monospace;font-weight:bold",
      "color:#888;font-family:ui-monospace",
    );
  }

  reset() {
    this.unlocked.clear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    for (const fn of this.listeners) fn(this.unlocked);
  }

  subscribe(fn: Listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }
}

function getBus(): Bus {
  if (typeof window !== "undefined") {
    const w = window as any;
    if (!w.__fcriAchievements) {
      w.__fcriAchievements = new Bus();
    }
    return w.__fcriAchievements as Bus;
  }
  return new Bus();
}

export const Achievements: Bus = getBus();

export function AchievementsPanel() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = Achievements.subscribe(() => force((x) => x + 1));
    return unsub;
  }, []);

  // pop a toast when a new one unlocks
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let prevSize = Achievements.unlocked.size;
    const unsub = Achievements.subscribe((s) => {
      if (s.size > prevSize) {
        const newest = Array.from(s).at(-1)!;
        setToast(DESCRIPTIONS[newest]);
        setTimeout(() => setToast(null), 2400);
      }
      prevSize = s.size;
    });
    return unsub;
  }, []);

  const found = Achievements.unlocked.size;
  const total = ALL_IDS.length;

  return (
    <>
      {/* prominent chip — much more visible than before */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          Achievements.unlock("cheatsheet");
        }}
        className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-mono bg-stone-900/80 backdrop-blur border border-amber-200/30 text-stone-100 hover:bg-stone-800 hover:border-amber-200/60 transition pointer-events-auto shadow-lg"
        aria-label="discoveries"
        title="open the discoveries panel"
      >
        <span className="text-amber-200 text-base leading-none">★</span>
        <span className="tabular-nums">
          {found}
          <span className="text-stone-500"> / {total}</span>
        </span>
        <span className="text-stone-400 text-[10px] uppercase tracking-widest pl-1 border-l border-stone-700 ml-1">
          {open ? "close" : "discoveries"}
        </span>
      </button>

      {/* prominent unlock toast — bigger, slower, with shine */}
      {toast && (
        <div className="fixed top-[68px] left-4 z-40 px-4 py-2.5 rounded-md text-[12px] font-mono bg-amber-200 text-stone-950 pointer-events-none animate-[fade_3.4s_ease-out_forwards] shadow-2xl flex items-center gap-2 border border-amber-300">
          <span className="text-base leading-none">★</span>
          <span>
            <span className="font-bold tracking-wide">unlocked</span> · {toast}
          </span>
        </div>
      )}

      {open && (
        <div className="fixed top-[70px] left-4 z-50 w-80 max-h-[70vh] overflow-auto rounded-md border border-amber-200/20 bg-stone-950/97 backdrop-blur p-5 font-mono text-[11px] text-stone-300 pointer-events-auto shadow-2xl">
          <div className="flex items-baseline justify-between mb-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/80">
              discoveries · {found}/{total}
            </div>
            <div className="text-[9px] text-stone-500">{Math.round((found / total) * 100)}%</div>
          </div>
          <div className="h-1 mb-4 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-amber-200/80 transition-all"
              style={{ width: `${(found / total) * 100}%` }}
            />
          </div>
          <ul className="space-y-1.5">
            {ALL_IDS.map((id) => {
              const got = Achievements.unlocked.has(id);
              return (
                <li
                  key={id}
                  className={
                    got
                      ? "text-stone-100"
                      : "text-stone-500"
                  }
                >
                  <span className={got ? "text-amber-200" : "text-stone-700"}>
                    {got ? "★" : "☆"}
                  </span>{" "}
                  {DESCRIPTIONS[id]}
                </li>
              );
            })}
          </ul>
          <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between text-[10px]">
            <span className="text-stone-500">press <span className="text-stone-200">?</span> for keys</span>
            <button
              onClick={() => Achievements.reset()}
              className="uppercase tracking-[0.2em] text-stone-500 hover:text-amber-200"
            >
              reset
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade {
          0% { opacity: 0; transform: translateY(-6px) scale(0.96); }
          8% { opacity: 1; transform: none; }
          88% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
