import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

/**
 * Structured manifest of the codex. Machine-readable for the curious.
 *
 * Each chapter carries a content_hash and a parent_hash forming a git-style
 * hash chain. You can verify the chain client-side (see /lab/merkle).
 *
 *   content_hash(i) = sha256( parent_hash(i) || "\n" || content(i) )
 *   parent_hash(0) = sha256("genesis")
 */

type ChapterInput = { id: number; kicker: string; line: string };

const CHAPTERS_RAW: ChapterInput[] = [
  { id: 1, kicker: "spec", line: "if you give a mouse a cookie." },
  { id: 2, kicker: "bug", line: "but the mouse is lactose intolerant." },
  { id: 3, kicker: "dup bug", line: "and the cat is a vegetarian." },
  { id: 4, kicker: "patch",  line: "so the milk goes to the cat. the cookie stays with the mouse." },
  { id: 5, kicker: "prod",   line: "they run, the rest of their lives, in a worn boot under the moon." },
  { id: 6, kicker: "root cause", line: "you are the strange input. you are the variance." },
  { id: 7, kicker: "commit", line: 'git commit -m "the tale persists"' },
];

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function buildMerkleChain(chapters: ChapterInput[]) {
  const genesis = sha256Hex("genesis");
  const out: (ChapterInput & { parent_hash: string; content_hash: string; canonical: string })[] = [];
  let parent = genesis;
  for (const c of chapters) {
    const canonical = `${c.id}\t${c.kicker}\t${c.line}`;
    const content_hash = sha256Hex(`${parent}\n${canonical}`);
    out.push({ ...c, parent_hash: parent, content_hash, canonical });
    parent = content_hash;
  }
  return { chapters: out, tip: parent, genesis };
}

export async function GET() {
  const chain = buildMerkleChain(CHAPTERS_RAW);

  return NextResponse.json(
    {
      title: "The Forgotten Code Research Institute",
      subtitle: "An interactive artifact built from one strange conversation.",
      thesis:
        "AI tools, given the right strange direction, will invent the behaviour the engineers never wrote.",
      author: "the stenwge bird",
      version: "v5 · the research wing edition",
      manifest_hash_alg: "sha-256",
      genesis: chain.genesis,
      tip: chain.tip,
      verify: {
        method: "recompute sha-256 over parent_hash || '\\n' || canonical, walk chain",
        client: "/lab/merkle",
      },
      chapters: chain.chapters,
      system: {
        mouse: { lactose_intolerant: true, wants_more: true, has_cookie: false },
        cat: { vegetarian: true, tame_level: "limited" },
        boot: "/Users/the_stenwge_bird/in/a/worn/boot/under/the/moon",
        moon: { phase: "always" },
      },
      research: {
        lab: "/lab",
        experiments: [
          { path: "/lab/raft", title: "toy raft consensus, animated" },
          { path: "/lab/gray-scott", title: "gray-scott reaction-diffusion on the GPU" },
          { path: "/lab/lisp", title: "real Lisp interpreter in the browser" },
          { path: "/lab/bf", title: "brainfuck → live WebAssembly JIT" },
          { path: "/lab/merkle", title: "verify the manifest's hash chain" },
          { path: "/lab/dream", title: "SSE-streamed poem generator" },
        ],
      },
      easter_eggs: [
        "` (backtick) — the on-page repl",
        "codex.lisp / codex.bfwasm / codex.help — the console runtime",
        "↑↑↓↓←→←→ba — konami flash",
        'type "stenwge" — jump to ch 06',
        "press ? — the cheat sheet",
        "/robots.txt · /.well-known/security.txt · /the-bird",
      ],
      links: {
        repo: "https://github.com/Jennaleighwilder/stenwge-codex",
        live: "https://forgotten-code-institute.vercel.app",
      },
      colophon:
        "Built in a handful of sittings. Pure WebGL + Web Audio + a song from six stems + a video from a strange bird + a research wing that runs live in your browser.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
        "X-Variance": "true",
        "X-Author": "stenwge-bird",
        "X-Built-With": "the-right-strange-direction",
        "X-Manifest-Tip": chain.tip,
      },
    },
  );
}
