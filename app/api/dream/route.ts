import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The codex dreams. Markov-ish stitching over a hand-picked corpus.
 *
 * Pass ?seed=anything to vary output.
 * If the Accept header includes `text/event-stream`, or `?stream=1`, the
 * response is streamed as SSE, one token at a time — a live typewriter.
 */

const SEEDS = [
  "the mouse remembered the cookie but could not name it.",
  "the cat dreamt in three colors, none of them prey.",
  "the boot was warmer than expected.",
  "the moon had been asking the same question for years.",
  "the bird tilted its head and a new chapter began.",
  "the salt fish rewrote itself between two shores.",
  "the engineers filed a bug and the system kept refusing.",
];

const VERBS = [
  "remembers", "forgets", "rewrites", "compiles", "diffs", "patches",
  "fits inside", "leaves behind", "learns to love", "borrows from",
  "signs its name on",
];

const OBJECTS = [
  "a glass of milk no one could drink",
  "a worn boot under a generous moon",
  "the script that no one read",
  "the silence between the kettle and the cup",
  "a salt fish moving through a stone sea",
  "the variance, given a name",
  "a list of constraints that learned to love each other",
  "the very small window in which the story fit",
  "a rule about mice that stopped being true at noon",
];

const COODA = [
  "and the tale persists.",
  "and the system keeps running.",
  "and the strange bird tilts its head.",
  "and the engineers never wrote this part.",
  "and the moon is up.",
  "and the salt is patient.",
  "and no one asked it to.",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(Math.abs(Math.sin(seed)) * arr.length) % arr.length];
}

function buildDream(seedRaw: string): string {
  let seed = 0;
  for (let i = 0; i < seedRaw.length; i++)
    seed = (seed * 31 + seedRaw.charCodeAt(i)) >>> 0;
  const s1 = seed;
  const s2 = seed * 13 + 7;
  const s3 = seed * 29 + 11;
  const s4 = seed * 41 + 17;
  return [
    pick(SEEDS, s1),
    `it ${pick(VERBS, s2)} ${pick(OBJECTS, s3)},`,
    pick(COODA, s4),
  ].join(" ");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const seedRaw = url.searchParams.get("seed") ?? String(Date.now());
  const wantsStream =
    url.searchParams.get("stream") === "1" ||
    (req.headers.get("accept") ?? "").includes("text/event-stream");

  const dream = buildDream(seedRaw);

  if (!wantsStream) {
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

  // SSE stream — emit one word at a time on a small interval
  const words = dream.split(/(\s+)/); // keep whitespace
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: open\ndata: ${JSON.stringify({ seed: seedRaw, words: words.length })}\n\n`,
        ),
      );
      for (const w of words) {
        await new Promise((r) => setTimeout(r, 90));
        controller.enqueue(
          encoder.encode(`event: token\ndata: ${JSON.stringify(w)}\n\n`),
        );
      }
      controller.enqueue(
        encoder.encode(
          `event: done\ndata: ${JSON.stringify({ dream })}\n\n`,
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Variance": "true",
    },
  });
}
