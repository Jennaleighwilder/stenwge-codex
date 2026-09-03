/**
 * salt — three grades of commitment, chosen per citation by what the span
 * actually needs. Named for the corpus they protect.
 *
 *   STONE — no salt. The cited source is public, so there is nothing to
 *           hide and everything to gain from a digest anyone can reproduce
 *           with nothing but the file and `shasum`.
 *
 *   SALT  — a published, deterministically derived per-citation salt mixed
 *           in before hashing. The salt is NOT a secret and does not hide
 *           low-entropy text. What it buys is domain separation: identical
 *           spans in different citations produce unrelated digests, no
 *           precomputed table covers the corpus, and nobody can tell from
 *           the digests alone that two claims quote the same line.
 *
 *   BRINE — a keyed commitment (HMAC-SHA-256) whose key is derived from the
 *           source file's own bytes. This is the only grade that genuinely
 *           hides a short or guessable span: an attacker without the file
 *           cannot derive the key, so there is no digest for them to test
 *           guesses against. A verifier holding the file derives the key
 *           themselves and checks unaided — no secret is stored, shared, or
 *           able to be lost.
 *
 * The grade is assigned by measurement, not by taste — see grade().
 */

import { createHash, createHmac } from "node:crypto";
import { deflateRawSync } from "node:zlib";

export const SALT_DOMAIN = "fcri:salt:v1";
export const BRINE_DOMAIN = "fcri:brine:v1";

/** Bits below which a span is considered guessable and must be brined. */
export const BRINE_THRESHOLD_BITS = 128;

/**
 * Estimate the entropy an attacker must search to guess a span.
 *
 * Deliberately NOT compressed size: deflate expands short inputs, so a
 * 24-character heading scores higher than its own raw length and every span
 * looks safe. That is the wrong direction to be wrong in.
 *
 * Natural-language English runs about 1.0-1.5 bits per character once a
 * guesser models it (Shannon). We take 1.1 bits/char as the working figure,
 * then apply a further discount for structural predictability — a markdown
 * heading or a list item drawn from a known document is far cheaper to guess
 * than free prose, because the attacker already knows the shape.
 *
 * Compression still earns its keep as a floor: text that packs unusually
 * well is repetitive, so it is even more guessable than length suggests.
 */
export function estimateBits(text) {
  const chars = text.length;
  const languageBits = chars * 1.1;

  // Repetitive spans are cheaper to guess than their length implies.
  const raw = Buffer.from(text, "utf8");
  const packed = deflateRawSync(raw, { level: 9 });
  const compressionRatio = Math.min(1, packed.length / Math.max(1, raw.length));
  const repetitionDiscount = Math.min(1, compressionRatio + 0.25);

  // Markdown structure (headings, bullets, numbering) is guessable scaffolding.
  const structural = /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)/m.test(text) ? 0.8 : 1;

  return Math.round(languageBits * repetitionDiscount * structural);
}

/**
 * Choose a grade.
 *   public source                      -> stone   (nothing to hide)
 *   private source, low entropy        -> brine   (must hide)
 *   private source, sufficient entropy -> salt    (domain separation)
 */
export function grade({ isPublicSource, text }) {
  if (isPublicSource) return "stone";
  const bits = estimateBits(text);
  return bits < BRINE_THRESHOLD_BITS ? "brine" : "salt";
}

/** Deterministic, published, per-citation salt. Not a secret. */
export function saltFor(cite) {
  return createHash("sha256").update(`${SALT_DOMAIN}|${cite}`, "utf8").digest("hex");
}

/**
 * Per-citation brine key, derived from the SOURCE FILE ITSELF.
 *
 * The key is HMAC(key = the file's full bytes, msg = domain|citation).
 * This is deliberate on three counts:
 *
 *  1. No stored secret. There is no key file to leak, lose, or forget to
 *     rotate. The document is the key.
 *  2. No coordination. Anyone holding the cited file can derive the key and
 *     verify unaided. Verification needs the file — which a real verifier
 *     has anyway, since checking a quotation without the source is
 *     meaningless.
 *  3. Publishing sha256(file) stays safe. A digest of the key is not the
 *     key, and HMAC is not vulnerable to length extension — so the seal can
 *     keep publishing the file digest for version confirmation without
 *     handing an attacker the means to brute-force a short span.
 *
 * The failed alternative, for the record: using sha256(file) AS the pepper.
 * That pepper is published in this very seal, so it hides nothing. Nor does
 * sha256(file || cite) — SHA-256's Merkle-Damgard construction lets that be
 * computed from the published digest by length extension. HMAC is the
 * primitive that actually holds here.
 */
export function brineKeyFor(fileBytes, cite) {
  return createHmac("sha256", fileBytes)
    .update(`${BRINE_DOMAIN}|${cite}`, "utf8")
    .digest("hex");
}

/**
 * Commit to a span under the chosen grade.
 * Returns the digest plus everything a verifier is allowed to know.
 */
export function commit({ grade: g, cite, text, fileBytes }) {
  if (g === "stone") {
    return {
      grade: "stone",
      digest: createHash("sha256").update(text, "utf8").digest("hex"),
      salt: undefined,
      hides: false,
      verify: "sha-256 over the cited span",
    };
  }

  if (g === "salt") {
    const salt = saltFor(cite);
    return {
      grade: "salt",
      // salt line, then the span — reproducible in a shell without tricks.
      digest: createHash("sha256").update(`${salt}\n${text}`, "utf8").digest("hex"),
      salt,
      hides: false,
      verify: "sha-256 over the published salt line followed by the cited span",
    };
  }

  const key = brineKeyFor(fileBytes, cite);
  return {
    grade: "brine",
    digest: createHmac("sha256", Buffer.from(key, "hex"))
      .update(text, "utf8")
      .digest("hex"),
    salt: undefined,
    hides: true,
    verify:
      "HMAC-SHA-256 over the cited span, keyed by HMAC(file bytes, domain|citation) — derivable by any holder of the source file, by nobody else",
  };
}
