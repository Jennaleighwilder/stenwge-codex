import { NextResponse } from "next/server";
import { createHash, createHmac } from "node:crypto";
import { PUBLIC_KEY_BASE64, RETIRED_PUBLIC_KEY_BASE64 } from "../../lib/ed25519-keys";
import chain from "../../lib/chain-attestation.json";

export const runtime = "nodejs";

/**
 * /api/verify — a signed statement of the manifest's current tip.
 *
 * This route used to sign the tip at request time with a private key that
 * was committed to the public repository. Every clone of this repo held the
 * signing key, so the signature attested to nothing while looking like it
 * did. It is now signed at build time by a key that exists only on the
 * author's machine, and this route serves that stored signature.
 *
 * It also refuses to pass off a stale one: the tip is recomputed from the
 * chapters on every request and compared to the tip that was actually
 * signed. If the story changes and the chain is not re-signed, this says so
 * rather than presenting an old signature as current.
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
    parent = sha256Hex(`${parent}\n${id}\t${kicker}\t${line}`);
  }
  return parent;
}

/**
 * Published on purpose. With the key in the open this is a checksum, not an
 * authentication — it proves the tip travelled intact, never who sent it.
 * It is labelled that way here so nobody mistakes it for a signature.
 */
const CHECKSUM_KEY = "the-tale-persists";

export async function GET() {
  const tip = tipOf();
  const checksum = createHmac("sha256", CHECKSUM_KEY).update(tip).digest("hex");
  const current = chain.tip === tip;

  return NextResponse.json(
    {
      tip,
      checksum: {
        algorithm: "HMAC-SHA-256",
        value: checksum,
        key: CHECKSUM_KEY,
        is_a_signature: false,
        note: "The key is published above, so anyone can compute this. It detects corruption in transit and authenticates nothing. Use the Ed25519 signature below for attestation.",
      },
      ed25519: {
        algorithm: "Ed25519",
        signature: current ? chain.signature : null,
        publicKey: PUBLIC_KEY_BASE64,
        signed_tip: chain.tip,
        current,
        signedAt: chain.signedAt,
        note: current
          ? "verify with WebCrypto: crypto.subtle.verify('Ed25519', pk, sig, new TextEncoder().encode(tip))"
          : "The chapters have changed since this chain was signed. No signature is offered for the current tip rather than presenting a stale one as valid. Re-run `npm run seal`.",
        signed_at_build_time:
          "The signing key is not in this repository and not in the deployment.",
      },
      key_rotation: {
        retired_public_key: RETIRED_PUBLIC_KEY_BASE64,
        why: "Its private half was committed to this public repo, so any clone could forge signatures under it. Anything signed by that key attests to nothing and no longer verifies against the current public key.",
        history_not_rewritten:
          "The retired private key is still in this repository's git history and must be treated as permanently compromised. Rewriting published history was not attempted.",
      },
      note: "the tip is sha-256 over the last chapter's content_hash chain. see /lab/merkle for a live verifier that walks and rebuilds the chain in-browser.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
        "X-Variance": "true",
        "X-Manifest-Tip": tip,
        "X-Signature-Current": String(current),
      },
    },
  );
}
