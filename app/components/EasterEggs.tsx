"use client";

import { useEffect, useState } from "react";

/**
 * Easter eggs for the curious. None of these are required for the experience.
 * Every one is something a developer might stumble across.
 *
 *  - Console banner (open DevTools)
 *  - window.codex (typed playground: codex.feed(), codex.attempt_truce(), codex.help())
 *  - Konami code  ( ↑ ↑ ↓ ↓ ← → ← → b a ) flips a hidden CSS variable + logs
 *  - Type "stenwge" anywhere → instant scroll to chapter 06 and flash the eye
 *  - Press ?  → keyboard cheat sheet
 *  - document.title morphs as you scroll through the chapters
 *  - <meta> + a structured "application/codex+json" script in <head> via api routes
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Browser console banner — ANSI + ASCII art of the boot under the moon
// ────────────────────────────────────────────────────────────────────────────
function logBanner() {
  if (typeof window === "undefined") return;
  if ((window as any).__codexBanner) return;
  (window as any).__codexBanner = true;

  const title =
    "%c the forgotten code research institute ";
  const titleStyle =
    "background:#f4dca3;color:#111;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.3em;padding:4px 10px;border-radius:2px";

  const sub =
    "%cIf you give a mouse a cookie, you give the world a fairy tale.\n" +
    "A small artifact built from one strange conversation.\n";
  const subStyle =
    "color:#bbb;font-family:ui-monospace,monospace;font-size:11px;line-height:1.6;padding:8px 0";

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
    "                 (mouse, cat,                \n" +
    "                  doing exactly what         \n" +
    "                  they were never told.)     \n" +
    "\n";
  const moonStyle =
    "color:#777;font-family:ui-monospace,monospace;font-size:10px;line-height:1.1";

  const help =
    "%cTry:\n" +
    "  codex.help()\n" +
    "  codex.feed('cookie')\n" +
    "  codex.attempt_truce()\n" +
    "  codex.mouse\n" +
    "  codex.cat\n" +
    "  fetch('/api/codex').then(r=>r.json()).then(console.log)\n" +
    "  fetch('/api/teapot')   // it's a teapot\n" +
    "  fetch('/robots.txt').then(r=>r.text()).then(console.log)\n" +
    "\n" +
    "  ↑ ↑ ↓ ↓ ← → ← → b a    konami\n" +
    "  type \"stenwge\"          jump to ch. 06\n" +
    "  press ?                  cheat sheet\n";
  const helpStyle =
    "color:#9ec9ff;font-family:ui-monospace,monospace;font-size:11px;line-height:1.7";

  // eslint-disable-next-line no-console
  console.log(title, titleStyle);
  // eslint-disable-next-line no-console
  console.log(sub, subStyle);
  // eslint-disable-next-line no-console
  console.log("%c" + moon, moonStyle);
  // eslint-disable-next-line no-console
  console.log(help, helpStyle);
}

// ────────────────────────────────────────────────────────────────────────────
// 2. window.codex — typed runtime playground
// ────────────────────────────────────────────────────────────────────────────
function installCodexGlobal() {
  if (typeof window === "undefined") return;
  if ((window as any).codex) return;

  const mouse: Record<string, unknown> = {
    has_cookie: false,
    has_milk: false,
    lactose_intolerant: true,
    wants_more: true,
    feed(item: string) {
      if (item === "cookie") {
        this.has_cookie = true;
        return "Mouse accepts the cookie, then asks for milk.";
      }
      if (item === "milk") {
        if (this.lactose_intolerant) {
          this.has_milk = true;
          return "Mouse accepts the milk… but cannot drink it. He pushes it toward the cat.";
        }
        return "Mouse drinks the milk.";
      }
      return `Mouse considers the ${item} and shrugs.`;
    },
  };

  const cat: Record<string, unknown> = {
    vegetarian: true,
    tame_level: "limited",
    meet(otherMouse: typeof mouse) {
      if (this.vegetarian && otherMouse.lactose_intolerant) {
        return "Cat sees a creature oppressed by dairy. The predator instinct stays sheathed.";
      }
      return "The cat stalks.";
    },
    react_to_milk(m: typeof mouse) {
      if (m.has_milk && this.vegetarian) {
        return "For ethical harm reduction, the cat laps up the milk.";
      }
      return "The cat ignores the milk.";
    },
  };

  const codex: Record<string, unknown> = {
    version: "v3 · the variance edition",
    boot: "/Users/the_stenwge_bird/in/a/worn/boot/under/the/moon",
    mouse,
    cat,
    attempt_truce() {
      mouse.has_milk = true;
      const a = (cat as any).meet(mouse);
      const b = (cat as any).react_to_milk(mouse);
      return [a, b, "They live, the rest of their lives, in a worn boot under the moon."];
    },
    feed(item: string) {
      return (mouse as any).feed(item);
    },
    open(chapter: number) {
      if (typeof chapter !== "number") return "pass a chapter number, 1-7";
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ch = Math.max(1, Math.min(7, chapter));
      const y = ((ch - 1) / 8) * max;
      window.scrollTo({ top: y, behavior: "smooth" });
      return `→ ch ${ch}`;
    },
    help() {
      // eslint-disable-next-line no-console
      console.log(`%ccodex.help()`, "color:#f4dca3;font-weight:bold");
      // eslint-disable-next-line no-console
      console.table({
        "codex.mouse": "the protagonist, lactose intolerant",
        "codex.cat": "the antagonist who refused to antagonize",
        "codex.feed(item)": "give an item to the mouse",
        "codex.attempt_truce()": "run the canonical truce sequence",
        "codex.open(n)": "scroll to chapter n  (1..7)",
        "fetch('/api/codex')": "structured story manifest",
        "fetch('/api/teapot')": "418 I'm a teapot",
        "/robots.txt": "a poem disguised as crawler directives",
      });
      return "🐦 stenwge";
    },
  };

  (window as any).codex = codex;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Konami code + 4. type "stenwge" + 5. "?" cheat sheet
// ────────────────────────────────────────────────────────────────────────────
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export default function EasterEggs() {
  const [cheatOpen, setCheatOpen] = useState(false);
  const [konami, setKonami] = useState(false);

  useEffect(() => {
    logBanner();
    installCodexGlobal();
  }, []);

  // chapter-aware document title morph
  useEffect(() => {
    const titles = [
      "the forgotten code research institute",
      "01 · spec",
      "02 · bug",
      "03 · dup bug",
      "04 · patch",
      "05 · prod",
      "06 · root cause",
      "07 · commit",
      "🐦",
    ];
    let cur = 0;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ch = Math.min(
        titles.length - 1,
        Math.floor((window.scrollY / Math.max(max, 1)) * 8) + 1,
      );
      const idx = window.scrollY < 10 ? 0 : ch;
      if (idx !== cur) {
        cur = idx;
        document.title = titles[idx];
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // keyboard handler
  useEffect(() => {
    let konamiBuffer: string[] = [];
    let typeBuffer = "";
    let typeTimeout: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      // ignore when user is typing in an input
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;

      // ? toggles cheat sheet
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setCheatOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setCheatOpen(false);
      }

      // Konami
      konamiBuffer.push(e.key);
      if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
      const match = KONAMI.every(
        (k, i) =>
          konamiBuffer[i]?.toLowerCase() === k.toLowerCase(),
      );
      if (match) {
        setKonami(true);
        // eslint-disable-next-line no-console
        console.log(
          "%c↑↑↓↓←→←→ba — the variance is awake.",
          "background:#f4dca3;color:#111;padding:3px 8px;font-family:ui-monospace;letter-spacing:0.2em",
        );
        setTimeout(() => setKonami(false), 5000);
        konamiBuffer = [];
      }

      // "stenwge" → ch 06
      if (e.key.length === 1) {
        typeBuffer += e.key.toLowerCase();
        if (typeBuffer.length > 12) typeBuffer = typeBuffer.slice(-12);
        if (typeTimeout) clearTimeout(typeTimeout);
        typeTimeout = setTimeout(() => (typeBuffer = ""), 1200);
        if (typeBuffer.endsWith("stenwge")) {
          (window as any).codex?.open(6);
          // eslint-disable-next-line no-console
          console.log(
            "%c🐦 stenwge: you are the variance.",
            "color:#9ec9ff;font-family:ui-monospace;font-size:12px",
          );
          typeBuffer = "";
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
      {/* Konami visual flash */}
      {konami && (
        <div
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            animation: "konamiFlash 5s ease-out forwards",
            background:
              "radial-gradient(ellipse at center, rgba(244,220,163,0.18) 0%, rgba(244,220,163,0) 60%)",
          }}
        />
      )}

      {/* Cheat sheet overlay (? to toggle) */}
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
              the forgotten code research institute — cheat sheet
            </div>
            <ul className="space-y-2 leading-relaxed">
              <li>
                <span className="text-stone-50">scroll</span> — advance the story
              </li>
              <li>
                <span className="text-stone-50">move</span> — guide the bird (ch 06)
              </li>
              <li>
                <span className="text-stone-50">▷ play the song</span> — top right
              </li>
              <li>
                <span className="text-stone-50">type &quot;stenwge&quot;</span> — jump to ch 06
              </li>
              <li>
                <span className="text-stone-50">↑↑↓↓←→←→ba</span> — konami
              </li>
              <li>
                <span className="text-stone-50">?</span> — toggle this overlay
              </li>
            </ul>
            <div className="mt-5 pt-5 border-t border-stone-800 text-stone-400">
              open the console. there&apos;s a{" "}
              <code className="text-stone-200">codex</code> in there.
              <br />
              also{" "}
              <code className="text-stone-200">
                fetch(&apos;/api/codex&apos;)
              </code>
              ,{" "}
              <code className="text-stone-200">
                fetch(&apos;/api/teapot&apos;)
              </code>
              ,{" "}
              <code className="text-stone-200">/robots.txt</code>.
            </div>
            <div className="mt-5 text-right text-stone-500 text-[10px]">
              esc to close
            </div>
          </div>
        </div>
      )}

      {/* Tiny "?" hint button */}
      <button
        onClick={() => setCheatOpen(true)}
        className="fixed bottom-3 right-20 z-30 w-6 h-6 rounded-full text-[11px] font-mono text-stone-400 hover:text-stone-100 bg-stone-900/40 border border-stone-800 hover:bg-stone-800/70 transition pointer-events-auto"
        title="cheat sheet (?)"
        aria-label="open cheat sheet"
      >
        ?
      </button>

      <style>{`
        @keyframes konamiFlash {
          0% { opacity: 0; }
          15% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
