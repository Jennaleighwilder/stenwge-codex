import { NextResponse } from "next/server";
import { createHash, createHmac, createPrivateKey, sign } from "node:crypto";
import {
  PUBLIC_KEY_BASE64,
  PRIVATE_KEY_PKCS8_BASE64,
  b64ToBytes,
} from "../../lib/ed25519-keys";

export const runtime = "nodejs";

/**
 * /api/verify — a signed statement of the manifest's current tip.
 *
 * Returns two independent signatures over the tip:
 *   - HMAC-SHA-256 with a public key hint (symbolic, verifiable in browser)
 *   - Ed25519 with a real asymmetric keypair (private key in server env,
 *     public key exposed here for browser verification via WebCrypto).
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
  const hmac = createHmac("sha256", HMAC_KEY).update(tip).digest("hex");

  // ed25519 sign the tip bytes
  const prvDer = Buffer.from(b64ToBytes(PRIVATE_KEY_PKCS8_BASE64));
  const privateKey = createPrivateKey({
    key: prvDer,
    format: "der",
    type: "pkcs8",
  });
  const tipBytes = Buffer.from(tip, "utf8");
  const ed25519Sig = sign(null, tipBytes, privateKey).toString("base64");

  return NextResponse.json(
    {
      tip,
      hmac: {
        algorithm: "HMAC-SHA-256",
        signature: hmac,
        publicHint: HMAC_KEY,
      },
      ed25519: {
        algorithm: "Ed25519",
        signature: ed25519Sig,
        publicKey: PUBLIC_KEY_BASE64,
        note: "verify with WebCrypto: crypto.subtle.verify('Ed25519', pk, sig, utf8(tip))",
      },
      note:
        "the tip is sha-256 over the last chapter's content_hash chain. see /lab/merkle for a live verifier that walks and rebuilds the chain in-browser.",
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
