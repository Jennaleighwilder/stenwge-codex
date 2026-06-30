import { NextResponse } from "next/server";

/**
 * Structured manifest of the codex. Machine-readable for the curious.
 *   GET /api/codex
 */
export async function GET() {
  return NextResponse.json(
    {
      title: "The Forgotten Code Research Institute",
      subtitle:
        "An interactive artifact built from one strange conversation.",
      thesis:
        "AI tools, given the right strange direction, will invent the behaviour the engineers never wrote.",
      author: "the stenwge bird",
      version: "v3 · the variance edition",
      chapters: [
        { id: 1, kicker: "spec", line: "if you give a mouse a cookie." },
        {
          id: 2,
          kicker: "bug",
          line: "but the mouse is lactose intolerant.",
        },
        {
          id: 3,
          kicker: "dup bug",
          line: "and the cat is a vegetarian.",
        },
        {
          id: 4,
          kicker: "patch",
          line: "so the milk goes to the cat. the cookie stays with the mouse.",
        },
        {
          id: 5,
          kicker: "prod",
          line: "they run, the rest of their lives, in a worn boot under the moon.",
        },
        {
          id: 6,
          kicker: "root cause",
          line: "you are the strange input. you are the variance.",
        },
        {
          id: 7,
          kicker: "commit",
          line: 'git commit -m "the tale persists"',
        },
      ],
      system: {
        mouse: { lactose_intolerant: true, wants_more: true, has_cookie: false },
        cat: { vegetarian: true, tame_level: "limited" },
        boot: "/Users/the_stenwge_bird/in/a/worn/boot/under/the/moon",
        moon: { phase: "always" },
      },
      easter_eggs: [
        "open DevTools — there is a banner",
        "window.codex — there is a runtime",
        "↑↑↓↓←→←→ba — there is a flash",
        'type "stenwge" — there is a jump',
        "press ? — there is a cheat sheet",
        "/robots.txt — there is a poem",
        "/api/teapot — there is a teapot",
      ],
      links: {
        repo: "https://github.com/Jennaleighwilder/stenwge-codex",
        live: "https://forgotten-code-institute.vercel.app",
      },
      colophon:
        "Built in one sitting. Pure WebGL + Web Audio + a song from six stems + a video from a strange bird.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
        "X-Variance": "true",
        "X-Author": "stenwge-bird",
        "X-Built-With": "the-right-strange-direction",
      },
    },
  );
}
