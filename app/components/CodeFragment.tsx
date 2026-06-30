"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { Progress } from "./StenwgeCodex";

/**
 * Surfaces a small monospace code/prompt fragment per chapter, in the lower-
 * left, so viewers see the actual AI artifact that produced each visual.
 * These are real lines pulled from the source of this very experience.
 */

type Fragment = {
  at: number;
  label: string;
  code: string;
};

const FRAGMENTS: Fragment[] = [
  {
    at: 0.4,
    label: "the system, in code",
    code: `class Mouse:
  has_cookie = False
  wants = "milk"
  def receive(self, item):
    if isinstance(item, Cookie):
      return "asks for milk"`,
  },
  {
    at: 1.2,
    label: "the constraint",
    code: `mouse.lactose_intolerant = True
# the contract is broken
# the function must be rewritten`,
  },
  {
    at: 2.0,
    label: "the variance compounds",
    code: `cat.vegetarian = True
# the predator refuses to predate
# the prey refuses the gift
# the system has no path. invent one.`,
  },
  {
    at: 3.0,
    label: "emergence",
    code: `def attempt_truce(mouse, cat):
  if cat.vegetarian and mouse.has_milk:
    return "offers milk to cat for the cause"`,
  },
  {
    at: 3.7,
    label: "the new world",
    code: `// signed-distance boot, lofted from a worn outline
const shape = new THREE.Shape(BOOT_PATH);
const boot  = new THREE.Mesh(new ShapeGeometry(shape, 64));`,
  },
  {
    at: 4.65,
    label: "the salt fish, in GLSL",
    code: `// breathe between salt and brine
float t = clamp((uDissolve - aOffset.z) / 0.5, 0.0, 1.0);
vec3 drift = vec3(sin(uTime + h) * .3, .4 + h * .4, 0.);
pos += drift * t;
// substance is the probability between two states.`,
  },
  {
    at: 5.85,
    label: "the bird, in physics",
    code: `head.lerp(targetCursor, 0.12);
// each particle inherits the previous one
for (let i = N-1; i > 0; i--) {
  positions[i] = positions[i-1];
}
positions[0] = head;`,
  },
  {
    at: 6.9,
    label: "the prompt that started it all",
    code: `> if you have a mouse and a cookie
> who gets the milk

> ...wait, the mouse is lactose intolerant
> ...and the cat is a vegetarian

> imagine this story is a system
> and it needs to be written in code`,
  },
  {
    at: 7.6,
    label: "the colophon",
    code: `// built in one sitting from a strange conversation
// between a mouse, a cat, a boot under the moon,
// a fish of salt and brine, and the bird who watched.
// this is what AI tools do, with the right direction.`,
  },
];

export default function CodeFragment({ progress }: { progress: Progress }) {
  const t = progress.chapter + progress.local;

  const active = useMemo(() => {
    let best: Fragment | null = null;
    let bestDist = Infinity;
    for (const f of FRAGMENTS) {
      const d = Math.abs(t - f.at);
      if (d < 0.45 && d < bestDist) {
        best = f;
        bestDist = d;
      }
    }
    return best;
  }, [t]);

  return (
    <div className="fixed bottom-8 left-6 z-25 pointer-events-none max-w-[min(420px,42vw)] hidden md:block">
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.at}
            initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-md border border-stone-800/80 bg-black/55 backdrop-blur px-4 py-3"
          >
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-stone-500 mb-2">
              {active.label}
            </div>
            <pre
              className="font-mono text-[11px] leading-[1.55] text-stone-300/90 whitespace-pre-wrap"
              style={{
                textShadow: "0 1px 1px rgba(0,0,0,0.85)",
              }}
            >
              {active.code}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
