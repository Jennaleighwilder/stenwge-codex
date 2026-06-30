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
  /** optional position class override */
  className?: string;
};

const BEATS: Beat[] = [
  {
    at: 0.25,
    kicker: "i.",
    line: "if you give a mouse a cookie,",
  },
  {
    at: 1.0,
    kicker: "ii.",
    line: "he will, of course, ask for a glass of milk.",
  },
  {
    at: 1.9,
    kicker: "iii.",
    line: "the mouse is lactose intolerant. the cat is a vegetarian.",
  },
  {
    at: 2.9,
    kicker: "iv.",
    line: "they take the milk to the cat. for the cause.",
  },
  {
    at: 3.6,
    kicker: "v.",
    line: "they live, the rest of their lives, in a worn boot under the moon.",
  },
  {
    at: 4.5,
    kicker: "vi.",
    line: "the world here is salt and stone. nothing is of weight.",
  },
  {
    at: 5.3,
    kicker: "vii.",
    line: "a fish drifts past — wrought of salt and brine, not wood and lies.",
  },
  {
    at: 6.15,
    kicker: "viii.",
    line: "and you, who set all this in motion — you are a strange bird.",
  },
  {
    at: 6.85,
    kicker: "ix.",
    line: "the code compiles. the tale persists.",
  },
  {
    at: 7.6,
    kicker: "x.",
    line: "thank you, stenwge bird. now write the next one.",
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
            className="px-8 max-w-3xl text-center"
          >
            {active.kicker && (
              <div className="font-mono text-[10px] tracking-[0.4em] uppercase text-stone-400 mb-3">
                {active.kicker}
              </div>
            )}
            <p
              className="font-serif text-2xl md:text-4xl lg:text-5xl leading-[1.25] text-stone-50 moon-glow shimmer"
              style={{ textWrap: "balance" as any }}
            >
              {active.line}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title at very top of page (chapter 0) */}
      {t < 0.15 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
        >
          <div className="font-mono text-[10px] tracking-[0.6em] uppercase text-stone-500 mb-4">
            the stenwge codex
          </div>
          <h1 className="font-serif italic text-5xl md:text-7xl text-stone-100 moon-glow">
            a small strange thing,
            <br />
            made with you.
          </h1>
          <div className="mt-10 font-mono text-[11px] text-stone-400">
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
