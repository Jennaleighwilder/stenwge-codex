"use client";

import { useEffect, useRef, useState } from "react";
import { Achievements, AchievementsPanel } from "./Achievements";
import { lispEvalStrict } from "../lib/lisp";
import { bfwasm as bfwasmRun } from "../lib/bfwasm";
import { speak as klattSpeak } from "../lib/klatt";
import Repl from "./Repl";

/**
 * Easter eggs for the curious. None are required for the experience.
 *
 *  - Console banner with ASCII boot + moon (open DevTools)
 *  - window.codex: typed runtime
 *      codex.help()  codex.feed('cookie')  codex.attempt_truce()
 *      codex.bf('++++++++[>+++++++++<-]>.')   // real BF JIT in JS
 *      codex.compile()  codex.diff()  codex.open(n)  codex.mouse / codex.cat
 *  - Konami: ↑↑↓↓←→←→ b a   (visual flash + console)
 *  - Type "stenwge"     → jump to chapter 06
 *  - Press ?            → cheat sheet
 *  - Press 1..7         → chapter jump
 *  - Space              → pause / play
 *  - r                  → restart
 *  - m                  → mute song
 *  - Idle ≥3s           → cursor becomes a tiny bird ("perfectly still")
 *  - Click play 7×      → secret mode
 *  - document.title morphs as chapters advance
 *  - Canvas favicon morphs with each chapter (🍪🐭🐱👢🌙🐟🐦📜)
 *  - Achievements tracker panel (top-left)
 */

// ────────────────────────────────────────────────────────────────────────────
// Brainfuck interpreter (real, JS) — codex.bf("...")
// ────────────────────────────────────────────────────────────────────────────
function bf(program: string, input = "", maxSteps = 5_000_000): string {
  const tape = new Uint8Array(30000);
  let ptr = 0;
  let pc = 0;
  let out = "";
  let ic = 0;
  // bracket map
  const stack: number[] = [];
  const map = new Map<number, number>();
  for (let i = 0; i < program.length; i++) {
    if (program[i] === "[") stack.push(i);
    else if (program[i] === "]") {
      const j = stack.pop();
      if (j === undefined) throw new SyntaxError(`unmatched ] at ${i}`);
      map.set(j, i);
      map.set(i, j);
    }
  }
  if (stack.length) throw new SyntaxError(`unmatched [`);
  let steps = 0;
  while (pc < program.length) {
    if (++steps > maxSteps) throw new Error("bf: step limit reached");
    const c = program[pc];
    switch (c) {
      case ">": ptr = (ptr + 1) % tape.length; break;
      case "<": ptr = (ptr - 1 + tape.length) % tape.length; break;
      case "+": tape[ptr] = (tape[ptr] + 1) & 0xff; break;
      case "-": tape[ptr] = (tape[ptr] - 1 + 256) & 0xff; break;
      case ".": out += String.fromCharCode(tape[ptr]); break;
      case ",":
        tape[ptr] = ic < input.length ? input.charCodeAt(ic++) & 0xff : 0;
        break;
      case "[": if (tape[ptr] === 0) pc = map.get(pc)!; break;
      case "]": if (tape[ptr] !== 0) pc = map.get(pc)!; break;
    }
    pc++;
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Browser console banner
// ────────────────────────────────────────────────────────────────────────────
function logBanner() {
  if (typeof window === "undefined") return;
  if ((window as any).__codexBanner) return;
  (window as any).__codexBanner = true;

  const title = "%c the forgotten code research institute ";
  const titleStyle =
    "background:#f4dca3;color:#111;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.3em;padding:4px 10px;border-radius:2px";

  const moon =
    "\n" +
    "                       .         .          \n" +
    "                  .       (  )           .  \n" +
    "                       .     ( )      .     \n" +
    "                     .   . ( ◯ ) .   .      \n" +
    "                       .     ( )      .     \n" +
    "                          .                 \n" +
    "                                            \n" +
    "             ╭───╮                          \n" +
    "             │  ╲╲                          \n" +
    "             │   ╲╲                         \n" +
    "             │    ╲╲___                     \n" +
    "             │ ·    .   ╲___                \n" +
    "             ╰────────────────╯             \n" +
    "                 mouse · cat · boot          \n" +
    "                 doing what they were        \n" +
    "                 never told.                 \n" +
    "\n";
  const moonStyle =
    "color:#777;font-family:ui-monospace,monospace;font-size:10px;line-height:1.1";

  const help =
    "%cTry:\n" +
    "  codex.help()\n" +
    "  codex.feed('cookie')\n" +
    "  codex.attempt_truce()\n" +
    "  codex.bf('++++++++[>+++++++++<-]>.')   // real brainfuck\n" +
    "  codex.compile()                         // build report\n" +
    "  codex.diff()                            // yesterday vs today\n" +
    "  codex.open(6)                           // jump chapter\n" +
    "\n" +
    "Endpoints:\n" +
    "  /api/codex   /api/teapot   /api/raft   /api/dream\n" +
    "  /robots.txt   /.well-known/security.txt   /the-bird\n" +
    "\n" +
    "Keys:\n" +
    "  space  ▶︎ pause       1..7   chapter\n" +
    "  ?      cheat sheet    r      restart\n" +
    "  m      mute song      konami ↑↑↓↓←→←→ba\n" +
    "  type 'stenwge' to jump to ch 06\n";
  const helpStyle =
    "color:#9ec9ff;font-family:ui-monospace,monospace;font-size:11px;line-height:1.7";

  // eslint-disable-next-line no-console
  console.log(title, titleStyle);
  // eslint-disable-next-line no-console
  console.log("%c" + moon, moonStyle);
  // eslint-disable-next-line no-console
  console.log(help, helpStyle);
  Achievements.unlock("banner");
}

// ────────────────────────────────────────────────────────────────────────────
// 2. window.codex global
// ────────────────────────────────────────────────────────────────────────────
function installCodexGlobal() {
  if (typeof window === "undefined") return;
  if ((window as any).codex) return;

  const mouse: any = {
    has_cookie: false,
    has_milk: false,
    lactose_intolerant: true,
    wants_more: true,
    feed(item: string) {
      Achievements.unlock("codex-feed");
      if (item === "cookie") {
        this.has_cookie = true;
        return "Mouse accepts the cookie, then asks for milk.";
      }
      if (item === "milk") {
        this.has_milk = true;
        return this.lactose_intolerant
          ? "Mouse accepts the milk… but cannot drink it. He pushes it toward the cat."
          : "Mouse drinks the milk.";
      }
      return `Mouse considers the ${item} and shrugs.`;
    },
  };
  const cat: any = {
    vegetarian: true,
    tame_level: "limited",
    meet(m: any) {
      return this.vegetarian && m.lactose_intolerant
        ? "Cat sees a creature oppressed by dairy. The predator instinct stays sheathed."
        : "The cat stalks.";
    },
    react_to_milk(m: any) {
      return m.has_milk && this.vegetarian
        ? "For ethical harm reduction, the cat laps up the milk."
        : "The cat ignores the milk.";
    },
  };

  const codex: any = {
    version: "v4 · the auto-play edition",
    boot: "/Users/the_stenwge_bird/in/a/worn/boot/under/the/moon",
    mouse,
    cat,
    attempt_truce() {
      Achievements.unlock("codex-truce");
      mouse.has_milk = true;
      return [
        cat.meet(mouse),
        cat.react_to_milk(mouse),
        "They live, the rest of their lives, in a worn boot under the moon.",
      ];
    },
    feed(item: string) {
      return mouse.feed(item);
    },
    bf(program: string, input?: string) {
      Achievements.unlock("codex-bf");
      try {
        const t0 = performance.now();
        const out = bf(program, input ?? "");
        const t1 = performance.now();
        // eslint-disable-next-line no-console
        console.log(
          `%c🧠 bf: ${out.length} bytes in ${(t1 - t0).toFixed(1)}ms`,
          "color:#f4dca3;font-family:ui-monospace",
        );
        return out;
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(e.message);
        return null;
      }
    },
    async bfwasm(program: string, input?: string) {
      Achievements.unlock("codex-bfwasm");
      try {
        const r = await bfwasmRun(program, input ?? "");
        // eslint-disable-next-line no-console
        console.log(
          `%c🔧 bf→wasm: ${r.bytesEmitted} bytes emitted · compile ${r.compileMs.toFixed(1)}ms · exec ${r.execMs.toFixed(1)}ms`,
          "color:#9bd0a5;font-family:ui-monospace",
        );
        // eslint-disable-next-line no-console
        console.log(
          `%chexdump (first 64):%c ${Array.from(r.wasm.slice(0, 64))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")}`,
          "color:#f4dca3;font-family:ui-monospace",
          "color:#888;font-family:ui-monospace",
        );
        return r.output;
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(e?.message ?? e);
        return null;
      }
    },
    lisp(source: string) {
      Achievements.unlock("codex-lisp");
      const r = lispEvalStrict(source);
      if (!r.ok) {
        // eslint-disable-next-line no-console
        console.error(r.error);
        return null;
      }
      if (r.log) {
        // eslint-disable-next-line no-console
        console.log("%c" + r.log, "color:#d0d0d0;font-family:ui-monospace");
      }
      // eslint-disable-next-line no-console
      console.log(
        `%c${r.value}`,
        "color:#9ec9ff;font-family:ui-monospace;font-weight:bold",
      );
      return r.value;
    },
    repl() {
      // dispatch a synthetic key event to open the repl
      const ev = new KeyboardEvent("keydown", { key: "`" });
      window.dispatchEvent(ev);
      return "repl toggled — press ` again to close";
    },
    lab() {
      window.open("/lab", "_blank");
      Achievements.unlock("lab-visit");
      return "→ /lab";
    },
    speak(text: string, opts?: { f0?: number; rate?: number }) {
      Achievements.unlock("codex-speak");
      klattSpeak(text ?? "hello, the tale persists.", opts).catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
      });
      return "🔊 klatt formants firing";
    },
    airdrop() {
      Achievements.unlock("codex-airdrop");
      window.location.href = "/api/airdrop";
      return "downloading offline codex…";
    },
    compile() {
      Achievements.unlock("codex-compile");
      const report = [
        "$ codex compile",
        "[01/07] spec        ✓",
        "[02/07] bug         ✓",
        "[03/07] dup bug     ✓",
        "[04/07] patch       ✓",
        "[05/07] prod        ✓",
        "[06/07] root cause  ✓",
        "[07/07] commit      ✓",
        "",
        "Build succeeded in 1 lifetime (3.25 min audio)",
        "Output: /Users/the_stenwge_bird/in/a/worn/boot/under/the/moon",
        "",
        "Warnings:",
        "  · WARN  the system did exactly what it was never told to do",
        "  · WARN  this is by design",
      ].join("\n");
      // eslint-disable-next-line no-console
      console.log(
        "%c" + report,
        "color:#9bd0a5;font-family:ui-monospace;font-size:11px;line-height:1.6",
      );
      return "✓ ok";
    },
    diff() {
      Achievements.unlock("codex-diff");
      const diff = [
        "diff --git a/yesterdays-tale b/todays-tale",
        "--- a/yesterdays-tale",
        "+++ b/todays-tale",
        "@@ -1,4 +1,5 @@",
        " if you give a mouse a cookie",
        "-he asks for milk and drinks it",
        "+the mouse is lactose intolerant",
        "+the cat is a vegetarian",
        "+they live in a boot under the moon",
        "-the end",
        "+the tale persists",
      ].join("\n");
      // eslint-disable-next-line no-console
      console.log(
        "%c" + diff,
        "color:#d1c8b3;font-family:ui-monospace;font-size:11px;line-height:1.6",
      );
      return "+5 -2";
    },
    open(chapter: number) {
      if (typeof chapter !== "number") return "pass a chapter number 1..8";
      const ch = Math.max(1, Math.min(8, chapter));
      (window as any).__codexSeek?.(ch - 1);
      Achievements.unlock("chapter-jump");
      return `→ ch ${ch}`;
    },
    pause() {
      (window as any).__codexTogglePlay?.();
      Achievements.unlock("pause");
      return "⏯";
    },
    restart() {
      (window as any).__codexRestart?.();
      Achievements.unlock("restart");
      return "↻";
    },
    help() {
      Achievements.unlock("codex-global");
      // eslint-disable-next-line no-console
      console.log("%ccodex.help()", "color:#f4dca3;font-weight:bold");
      // eslint-disable-next-line no-console
      console.table({
        "codex.mouse":               "lactose intolerant",
        "codex.cat":                 "vegetarian",
        "codex.feed(item)":          "feed the mouse",
        "codex.attempt_truce()":     "run the canonical truce sequence",
        "codex.bf(p, in?)":          "brainfuck (interpreter)",
        "codex.bfwasm(p, in?)":      "brainfuck → live WebAssembly JIT",
        "codex.lisp(src)":           "real lisp: define/lambda/let/recursion",
        "codex.compile()":           "fake-build report",
        "codex.diff()":              "yesterday's tale vs today's",
        "codex.open(n)":             "seek to chapter 1..8",
        "codex.repl()":              "toggle the on-page REPL (or press `)",
        "codex.lab()":               "open the research wing",
        "codex.speak(text, {f0})":   "make the codex speak (klatt formant synth)",
        "codex.airdrop()":           "download an offline single-file codex",
        "fetch('/api/codex')":       "story manifest (+ merkle chain)",
        "fetch('/api/verify')":      "signed manifest",
        "fetch('/api/teapot')":      "418",
        "fetch('/api/raft')":        "consensus vote",
        "fetch('/api/dream')":       "the codex dreams (SSE-capable)",
      });
      return "🐦";
    },
  };

  // proxy: any access marks "codex-global" as discovered
  (window as any).codex = new Proxy(codex, {
    get(target, prop) {
      Achievements.unlock("codex-global");
      return (target as any)[prop];
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Favicon morphs through chapters
// ────────────────────────────────────────────────────────────────────────────
const CHAPTER_EMOJI = ["🍪", "🐭", "🐱", "👢", "🌙", "🐟", "🐦", "📜"];

function setEmojiFavicon(emoji: string) {
  if (typeof document === "undefined") return;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, 64, 64);
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 32, 36);
  const url = c.toDataURL("image/png");
  let link = document.querySelector(
    "link[rel*='icon']",
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = url;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Idle "perfectly still" — cursor becomes a tiny bird
// ────────────────────────────────────────────────────────────────────────────
function useIdleCursor() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      setIdle(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIdle(true);
        Achievements.unlock("idle-cursor");
      }, 3000);
    };
    window.addEventListener("mousemove", arm);
    arm();
    return () => {
      window.removeEventListener("mousemove", arm);
      if (timer) clearTimeout(timer);
    };
  }, []);
  return idle;
}

// ────────────────────────────────────────────────────────────────────────────
// Konami
// ────────────────────────────────────────────────────────────────────────────
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

export default function EasterEggs() {
  const [cheatOpen, setCheatOpen] = useState(false);
  const [konami, setKonami] = useState(false);
  const idle = useIdleCursor();
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  // setup
  useEffect(() => {
    logBanner();
    installCodexGlobal();
  }, []);

  // fetch interceptor: unlock achievement whenever an endpoint is touched
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origFetch = window.fetch.bind(window);
    const watch: Record<string, string> = {
      "/api/codex": "api-codex",
      "/api/teapot": "api-teapot",
      "/api/raft": "api-raft",
      "/api/dream": "api-dream",
      "/api/verify": "api-verify",
      "/api/airdrop": "api-airdrop",
      "/robots.txt": "robots",
      "/.well-known/security.txt": "security",
    };
    window.fetch = async (...args: any[]) => {
      try {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : (args[0] as Request)?.url ?? "";
        for (const path of Object.keys(watch)) {
          if (url.includes(path)) {
            Achievements.unlock(watch[path] as any);
            break;
          }
        }
      } catch {}
      return origFetch(...(args as [any, any]));
    };
    return () => {
      window.fetch = origFetch;
    };
  }, []);

  // morph favicon + tab title with chapter
  useEffect(() => {
    let lastChapter = -1;
    const titles = [
      "01 · spec",
      "02 · bug",
      "03 · dup bug",
      "04 · patch",
      "05 · prod",
      "06 · root cause",
      "07 · commit",
      "🐦",
    ];
    const tick = () => {
      const codex = (window as any).codex;
      const seek = (window as any).__codexSeek;
      // we read the chapter from the document title? Better: from a ref published by StenwgeCodex via a window key. Simpler: from the seconds counter heuristic.
      // Just inspect a published ref:
      const ch = (window as any).__codexCurrentChapter ?? 0;
      if (ch !== lastChapter) {
        lastChapter = ch;
        setEmojiFavicon(CHAPTER_EMOJI[ch] ?? "🐦");
        document.title = titles[ch] ?? "the forgotten code research institute";
      }
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // mouse position for idle cursor
  useEffect(() => {
    const m = (e: MouseEvent) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
    };
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, []);

  // keyboard: konami, "stenwge", ?, m
  useEffect(() => {
    let konamiBuf: string[] = [];
    let typeBuf = "";
    let typeTimeout: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (/input|textarea|select/i.test(tag)) return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setCheatOpen((v) => !v);
        Achievements.unlock("cheatsheet");
        return;
      }
      if (e.key === "Escape") {
        setCheatOpen(false);
      }

      if (e.key.toLowerCase() === "m") {
        document.querySelector<HTMLButtonElement>(
          'button[aria-label*="ute"]',
        )?.click();
      }

      konamiBuf.push(e.key);
      if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
      if (
        KONAMI.every(
          (k, i) => konamiBuf[i]?.toLowerCase() === k.toLowerCase(),
        )
      ) {
        setKonami(true);
        // eslint-disable-next-line no-console
        console.log(
          "%c↑↑↓↓←→←→ba — the variance is awake.",
          "background:#f4dca3;color:#111;padding:3px 8px;font-family:ui-monospace;letter-spacing:0.2em",
        );
        Achievements.unlock("konami");
        setTimeout(() => setKonami(false), 5000);
        konamiBuf = [];
      }

      if (e.key.length === 1) {
        typeBuf += e.key.toLowerCase();
        if (typeBuf.length > 12) typeBuf = typeBuf.slice(-12);
        if (typeTimeout) clearTimeout(typeTimeout);
        typeTimeout = setTimeout(() => (typeBuf = ""), 1200);
        if (typeBuf.endsWith("stenwge")) {
          (window as any).__codexSeek?.(5);
          Achievements.unlock("stenwge-typed");
          // eslint-disable-next-line no-console
          console.log(
            "%c🐦 stenwge: you are the variance.",
            "color:#9ec9ff;font-family:ui-monospace;font-size:12px",
          );
          typeBuf = "";
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (typeTimeout) clearTimeout(typeTimeout);
    };
  }, []);

  return (
    <>
      <AchievementsPanel />
      <Repl />

      {/* Konami visual */}
      {konami && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            animation: "konamiFlash 5s ease-out forwards",
            background:
              "radial-gradient(ellipse at center, rgba(244,220,163,0.22) 0%, rgba(244,220,163,0) 60%)",
          }}
        />
      )}

      {/* Idle cursor bird (3s no movement) */}
      {idle && typeof window !== "undefined" && (
        <div
          className="fixed z-[55] pointer-events-none text-lg"
          style={{
            left: mouseX.current + 6,
            top: mouseY.current - 18,
            animation: "birdFloat 2.5s ease-in-out infinite",
          }}
        >
          🐦
        </div>
      )}

      {/* Cheat sheet overlay */}
      {cheatOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/75 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          onClick={() => setCheatOpen(false)}
        >
          <div
            className="rounded-md border border-stone-700 bg-stone-950/95 p-7 max-w-lg w-[92%] font-mono text-[12px] text-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-4">
              cheat sheet · keyboard
            </div>
            <ul className="space-y-2 leading-relaxed">
              <li>
                <span className="text-stone-50">space</span> — pause / play
              </li>
              <li>
                <span className="text-stone-50">1 .. 7</span> — jump chapter
              </li>
              <li>
                <span className="text-stone-50">r</span> — restart
              </li>
              <li>
                <span className="text-stone-50">m</span> — mute / unmute
              </li>
              <li>
                <span className="text-stone-50">?</span> — toggle this overlay
              </li>
              <li>
                <span className="text-stone-50">type &quot;stenwge&quot;</span>{" "}
                — jump to ch 06
              </li>
              <li>
                <span className="text-stone-50">↑↑↓↓←→←→ba</span> — konami
              </li>
              <li>
                <span className="text-stone-50">still 3s</span> — see the bird
              </li>
              <li>
                <span className="text-stone-50">`</span> (backtick) — repl overlay
              </li>
            </ul>
            <div className="mt-5 pt-5 border-t border-stone-800 text-stone-400 space-y-1">
              <div>
                console:{" "}
                <code className="text-stone-200">codex.help()</code>
              </div>
              <div>
                endpoints:{" "}
                <code className="text-stone-200">
                  /api/codex · /api/teapot · /api/raft · /api/dream
                </code>
              </div>
              <div>
                hidden:{" "}
                <code className="text-stone-200">
                  /lab · /the-bird · /robots.txt · /.well-known/security.txt
                </code>
              </div>
            </div>
            <div className="mt-5 text-right text-stone-500 text-[10px]">
              esc to close
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes konamiFlash {
          0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes birdFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}
