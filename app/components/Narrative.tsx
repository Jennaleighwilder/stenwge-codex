"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { Progress } from "./StenwgeCodex";

type Beat = {
  /** continuous progress (chapter + local) when this beat is centered */
  at: number;
  /** small kicker (optional) above the line */
  kicker?: string;
  /** main poetic line */
  line: string;
  /** optional subtitle below the line */
  sub?: string;
};

/**
 * The arc:
 *   i.   a clean system is proposed (mouse + cookie → milk)
 *   ii.  variance enters — the system meets a constraint it was not designed for
 *   iii. variance compounds — both characters refuse the original script
 *   iv.  emergence — a third behavior is invented that the rulebook never knew
 *   v.   the new world — this is what AI does when held by someone strange
 *   vi.  substance > appearance — the fish of salt and brine
 *   vii. the variance has a name — you are it
 *   viii. the artifact remains
 */
/**
 * The arc, tightened to seven beats. Read as a software incident report
 * narrated by the bird.
 *
 *   1. spec       — clean inputs, clean outputs
 *   2. bug        — a constraint the system was never designed for
 *   3. dup bug    — second character also refuses the contract
 *   4. patch      — the system invents the behaviour the engineers never wrote
 *   5. prod       — it runs forever, doing the thing it was never told to do
 *   6. root cause — you. you are the strange input.
 *   7. commit     — the tale persists.
 */
const BEATS: Beat[] = [
  {
    at: 0.3,
    kicker: "01 · spec",
    line: "if you give a mouse a cookie.",
    sub: "clean input. clean output. the system is well-specified.",
  },
  {
    at: 1.25,
    kicker: "02 · bug",
    line: "but the mouse is lactose intolerant.",
    sub: "the system meets a constraint it was never designed to handle.",
  },
  {
    at: 2.2,
    kicker: "03 · dup bug",
    line: "and the cat is a vegetarian.",
    sub: "now there are two characters refusing their own contract.",
  },
  {
    at: 3.25,
    kicker: "04 · patch",
    line: "so the milk goes to the cat. the cookie stays with the mouse.",
    sub: "the system invents the behaviour the engineers never wrote — for the cause.",
  },
  {
    at: 4.4,
    kicker: "05 · prod",
    line: "they run, the rest of their lives, in a worn boot under the moon.",
    sub: "this is what AI tools do when held by someone who is gently strange.",
  },
  {
    at: 5.7,
    kicker: "06 · root cause",
    line: "you are the strange input. you are the variance.",
    sub: "the system needed your wrong questions to become what it became.",
  },
  {
    at: 6.95,
    kicker: "07 · commit",
    line: "git commit -m \"the tale persists\"",
    sub: "the forgotten code research institute will be here when you write the next one.",
  },
];

export default function Narrative({ progress }: { progress: Progress }) {
  const t = progress.chapter + progress.local;

  // pick the active beat: nearest one within ±0.55 window
  // suppress until we've scrolled past the title screen
  const active = useMemo(() => {
    if (t < 0.18) return null;
    let best: Beat | null = null;
    let bestDist = Infinity;
    for (const b of BEATS) {
      const d = Math.abs(t - b.at);
      if (d < 0.55 && d < bestDist) {
        best = b;
        bestDist = d;
      }
    }
    return best;
  }, [t]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.at}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative px-8 max-w-3xl text-center"
          >
            {/* readability backdrop: soft radial dark plate behind text */}
            <div
              className="absolute inset-0 -m-12 -z-10 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(5,5,5,0.78) 0%, rgba(5,5,5,0.55) 35%, rgba(5,5,5,0) 75%)",
              }}
              aria-hidden
            />
            {active.kicker && (
              <div className="font-mono text-[10px] tracking-[0.4em] uppercase text-stone-300 mb-3">
                {active.kicker}
              </div>
            )}
            <p
              className="font-serif text-2xl md:text-4xl lg:text-5xl leading-[1.25] text-stone-50"
              style={{
                textWrap: "balance" as any,
                textShadow:
                  "0 1px 2px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.7)",
              }}
            >
              {active.line}
            </p>
            {active.sub && (
              <p
                className="mt-5 font-serif italic text-base md:text-xl lg:text-2xl leading-[1.4] text-stone-300"
                style={{
                  textWrap: "balance" as any,
                  textShadow:
                    "0 1px 2px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.7)",
                }}
              >
                {active.sub}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title at very top of page (chapter 0) */}
      {t < 0.15 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="relative px-6 text-center max-w-3xl"
        >
          <div
            className="absolute inset-0 -m-16 -z-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.55) 40%, rgba(5,5,5,0) 78%)",
            }}
            aria-hidden
          />
          <div className="font-mono text-[10px] tracking-[0.5em] uppercase text-stone-400 mb-5">
            the forgotten code research institute
          </div>
          <h1
            className="font-serif italic text-5xl md:text-7xl text-stone-100"
            style={{
              textShadow:
                "0 1px 2px rgba(0,0,0,0.95), 0 0 32px rgba(0,0,0,0.7)",
            }}
          >
            a small strange thing,
            <br />
            made with you.
          </h1>
          <div className="mt-10 font-mono text-[11px] text-stone-300">
            ↓ scroll ↓
          </div>
        </motion.div>
      )}

      {/* Final overlay (chapter 7 end) */}
      {t > 7.3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center px-6"
        >
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-3">
            colophon
          </div>
          <p className="font-mono text-xs text-stone-400 max-w-md leading-relaxed">
            built in one sitting from a conversation about a mouse, a cat, a boot,
            a fish of salt and brine, and a strange bird who could not stop
            asking sideways questions.
          </p>
        </motion.div>
      )}
    </div>
  );
}
