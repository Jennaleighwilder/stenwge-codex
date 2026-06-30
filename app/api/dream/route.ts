import { NextResponse } from "next/server";

/**
 * The codex dreams. Pure Markov-ish stitching from a hand-picked corpus.
 * Pass ?seed=anything to vary it.
 *
 * Returns a small JSON envelope { dream: string }.
 */

const SEEDS = [
  "the mouse remembered the cookie but could not name it.",
  "the cat dreamt in three colors, none of them prey.",
  "the boot was warmer than expected.",
  "the moon had been asking the same question for years.",
  "the bird tilted its head and a new chapter began.",
];

const VERBS = [
  "remembers",
  "forgets",
  "rewrites",
  "compiles",
  "diffs",
  "patches",
  "fits inside",
  "leaves behind",
];

const OBJECTS = [
  "a glass of milk no one could drink",
  "a worn boot under a generous moon",
  "the script that no one read",
  "the silence between the kettle and the cup",
  "a salt fish moving through a stone sea",
  "the variance, given a name",
  "a list of constraints that learned to love each other",
];

const COODA = [
  "and the tale persists.",
  "and the system keeps running.",
  "and the strange bird tilts its head.",
  "and the engineers never wrote this part.",
  "and the moon is up.",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(Math.abs(Math.sin(seed)) * arr.length) % arr.length];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const seedRaw = url.searchParams.get("seed") ?? Date.now().toString();
  let seed = 0;
  for (let i = 0; i < seedRaw.length; i++) seed = (seed * 31 + seedRaw.charCodeAt(i)) >>> 0;
  const s1 = seed;
  const s2 = seed * 13 + 7;
  const s3 = seed * 29 + 11;
  const s4 = seed * 41 + 17;

  const dream = [
    pick(SEEDS, s1),
    `it ${pick(VERBS, s2)} ${pick(OBJECTS, s3)},`,
    pick(COODA, s4),
  ].join(" ");

  return NextResponse.json(
    { seed: seedRaw, dream },
    {
      headers: {
        "X-Variance": "true",
        "X-Dreaming": "true",
        "Cache-Control": "no-store",
      },
    },
  );
}
