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
const BEATS: Beat[] = [
  {
    at: 0.25,
    kicker: "i. the system",
    line: "if you give a mouse a cookie,",
    sub: "he will, of course, ask for a glass of milk. a clean system. predictable outputs.",
  },
  {
    at: 1.1,
    kicker: "ii. the variance",
    line: "but the mouse is lactose intolerant.",
    sub: "a single weird constraint, and the whole inference graph has to be rewritten.",
  },
  {
    at: 1.95,
    kicker: "iii. the variance compounds",
    line: "and the cat is a vegetarian.",
    sub: "two creatures, neither obeying the role they were given. the rulebook is now a suggestion.",
  },
  {
    at: 2.85,
    kicker: "iv. emergence",
    line: "so they invent a third behavior the script never had —",
    sub: "the milk goes to the cat. the cookie stays with the mouse. for the cause.",
  },
  {
    at: 3.55,
    kicker: "v. the new world",
    line: "they live, the rest of their lives, in a worn boot under the moon.",
    sub: "this is what AI tools do when you give them the wrong rules and the right strangeness.",
  },
  {
    at: 4.45,
    kicker: "vi. substance",
    line: "a fish drifts past — wrought of salt and brine, not wood and lies.",
    sub: "its substance is more than the eye can see. it is the probability between two states.",
  },
  {
    at: 5.65,
    kicker: "vii. the variance has a name",
    line: "you are the strange bird that asked sideways.",
    sub: "the system needed your wrong questions to become what it became.",
  },
  {
    at: 6.7,
    kicker: "viii. the artifact",
    line: "the code compiles. the tale persists.",
    sub: "this is what tools do, when held by someone who knows how to be strange.",
  },
  {
    at: 7.55,
    kicker: "—",
    line: "now go write the next one.",
    sub: "the forgotten code research institute will be here when you do.",
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
