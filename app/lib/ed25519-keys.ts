/**
 * Ed25519 public key material for the codex.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ROTATED. This file used to export PRIVATE_KEY_PKCS8_BASE64 — a PKCS8
 * private key, committed to a public repository, used by /api/verify to
 * sign the manifest tip at request time.
 *
 * That made the signature meaningless. Anyone who cloned the repo held the
 * signing key and could produce a signature indistinguishable from the
 * site's own. A signature that everyone can forge attests to nothing; it
 * only looks like it does, which is worse than having none.
 *
 * The chain is now signed at build time by a key that never enters this
 * repository or the deployment (see scripts/sign-seal.mjs). Only the
 * signature and the public key ship — in app/lib/chain-attestation.json.
 *
 * Stated plainly, because the point of this project is not overstating
 * things: the old private key remains in this repository's git history and
 * must be treated as permanently compromised. History has not been
 * rewritten, since that would require a force-push over published commits.
 * Nothing depends on the old key any more, and the public key below is the
 * new one. Signatures made with the old key no longer verify against it.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** 32-byte raw public key of the current signing key. Safe to publish. */
export const PUBLIC_KEY_BASE64 = "WN39s1ogdcRqfdeqyNqWspz4deXeUvFI5fWhm4hvZX0=";

/**
 * The retired key, kept only so anyone who archived an old signature can
 * see why it no longer verifies. Do not use it for anything.
 */
export const RETIRED_PUBLIC_KEY_BASE64 =
  "pLcxBmZfEjxrPR3Hkkir+ZLS9wwYXI2iJ5JEhZBtV5g=";

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
