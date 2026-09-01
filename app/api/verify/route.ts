import { NextResponse } from "next/server";
import { createHash, createHmac } from "node:crypto";

export const runtime = "nodejs";

/**
 * /api/verify — an HMAC-signed statement of what the manifest currently is.
 *
 * We compute the merkle tip of the current chapters and return:
 *   { tip, algorithm, signature, publicHint }
 *
 * The signature is HMAC-SHA-256(tip, key). `publicHint` is the same key,
 * exposed intentionally so /lab/merkle can verify the signature in the
 * browser — this is a demonstration of the mechanism, not a security scheme.
 */

const CHAPTERS: [number, string, string][] = [
  [1, "spec", "if you give a mouse a cookie."],
  [2, "bug", "but the mouse is lactose intolerant."],
  [3, "dup bug", "and the cat is a vegetarian."],
  [4, "patch", "so the milk goes to the cat. the cookie stays with the mouse."],
  [5, "prod", "they run, the rest of their lives, in a worn boot under the moon."],
  [6, "root cause", "you are the strange input. you are the variance."],
  [7, "commit", 'git commit -m "the tale persists"'],
];

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function tipOf(): string {
  let parent = sha256Hex("genesis");
  for (const [id, kicker, line] of CHAPTERS) {
    const canonical = `${id}\t${kicker}\t${line}`;
    parent = sha256Hex(`${parent}\n${canonical}`);
  }
  return parent;
}

const HMAC_KEY = "the-tale-persists";

export async function GET() {
  const tip = tipOf();
  const sig = createHmac("sha256", HMAC_KEY).update(tip).digest("hex");
  return NextResponse.json(
    {
      algorithm: "HMAC-SHA-256",
      tip,
      signature: sig,
      publicHint: HMAC_KEY,
      note:
        "Recompute the tip locally (walk the chapters), then HMAC-SHA-256(tip, publicHint) should match `signature`. See /lab/merkle for a live verifier.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
        "X-Variance": "true",
        "X-Manifest-Tip": tip,
      },
    },
  );
}
