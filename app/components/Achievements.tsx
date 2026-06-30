"use client";

import { useEffect, useState } from "react";

/**
 * Tiny achievements / discovery tracker. Each easter egg calls Achievements.unlock(id).
 * The panel shows discovered/total in a small chip; clicking expands a list.
 */

export type AchievementId =
  | "banner"           // opened devtools / banner saw load
  | "codex-global"     // touched window.codex (we patch get)
  | "codex-feed"       // called codex.feed
  | "codex-truce"      // called codex.attempt_truce
  | "codex-bf"         // ran codex.bf(...)
  | "codex-compile"    // ran codex.compile()
  | "codex-diff"       // ran codex.diff()
  | "konami"           // entered the konami code
  | "stenwge-typed"    // typed "stenwge"
  | "cheatsheet"       // pressed ?
  | "chapter-jump"     // pressed a chapter key
  | "pause"            // toggled play/pause
  | "restart"          // pressed r
  | "moon-click"       // clicked the moon (chapter 5 jump)
  | "api-codex"        // fetched /api/codex
  | "api-teapot"       // fetched /api/teapot
  | "api-raft"         // fetched /api/raft
  | "api-dream"        // fetched /api/dream
  | "robots"           // fetched /robots.txt
  | "security"         // fetched /.well-known/security.txt
  | "bird-page"        // visited /the-bird
  | "idle-cursor"      // sat still long enough to see the cursor-bird
  | "secret-mode";     // 7 clicks on play button

const DESCRIPTIONS: Record<AchievementId, string> = {
  "banner": "opened the console",
  "codex-global": "touched window.codex",
  "codex-feed": "fed the mouse",
  "codex-truce": "ran the truce",
  "codex-bf": "ran brainfuck in-browser",
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
  "robots": "read the robots poem",
  "security": "read security.txt",
  "bird-page": "found the bird's room",
  "idle-cursor": "stayed perfectly still",
  "secret-mode": "clicked play seven times",
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
      <button
        onClick={() => {
          setOpen((v) => !v);
          Achievements.unlock("cheatsheet");
        }}
        className="fixed top-4 left-4 z-40 px-2.5 py-1.5 rounded-full text-[10px] font-mono bg-stone-900/40 backdrop-blur border border-stone-800 text-stone-400 hover:text-stone-100 hover:bg-stone-800/70 transition pointer-events-auto"
        aria-label="discoveries"
        title="discoveries"
      >
        ★ {found} / {total}
      </button>

      {toast && (
        <div className="fixed top-16 left-4 z-40 px-3 py-2 rounded text-[11px] font-mono bg-stone-900/85 backdrop-blur border border-stone-700 text-stone-100 pointer-events-none animate-[fade_2.4s_ease-out_forwards]">
          ★ {toast}
        </div>
      )}

      {open && (
        <div
          className="fixed top-14 left-4 z-50 w-72 max-h-[70vh] overflow-auto rounded-md border border-stone-700 bg-stone-950/95 backdrop-blur p-4 font-mono text-[11px] text-stone-300 pointer-events-auto"
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-3">
            discoveries · {found}/{total}
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
                      : "text-stone-600 line-through decoration-stone-700"
                  }
                >
                  {got ? "★" : "☆"} {DESCRIPTIONS[id]}
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => Achievements.reset()}
            className="mt-4 text-[9px] uppercase tracking-[0.2em] text-stone-500 hover:text-stone-300"
          >
            reset
          </button>
        </div>
      )}

      <style>{`
        @keyframes fade {
          0% { opacity: 0; transform: translateY(-4px); }
          10% { opacity: 1; transform: none; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
