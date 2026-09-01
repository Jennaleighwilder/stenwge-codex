/**
 * Ed25519 key material for the codex.
 *
 * These are static keys used only for signing the manifest. Anyone can
 * verify a signature over the manifest tip using the public key here plus
 * WebCrypto's Ed25519 support (Chrome 113+, Firefox 130+, Safari 17+).
 *
 * DO NOT reuse this key material for anything else — it's here to
 * demonstrate the protocol, not to secure real things.
 *
 * Generated once, offline, with:
 *   const { publicKey, privateKey } = await crypto.subtle.generateKey(
 *     { name: "Ed25519" }, true, ["sign", "verify"]);
 *   const pub = await crypto.subtle.exportKey("raw", publicKey);
 *   const prv = await crypto.subtle.exportKey("pkcs8", privateKey);
 *
 * We ship both as base64. The private key sits ONLY on the server side
 * (imported at request time in the /api/verify route). The public key is
 * safe to publish.
 */

// 32-byte raw public key
export const PUBLIC_KEY_BASE64 =
  "pLcxBmZfEjxrPR3Hkkir+ZLS9wwYXI2iJ5JEhZBtV5g=";

// PKCS8 private key (server-side only; but committed in this demo)
export const PRIVATE_KEY_PKCS8_BASE64 =
  "MC4CAQAwBQYDK2VwBCIEIOtHUt+7zU8GyRA0ClE1Lxohks2K4cOdIaDwj2xYEHXh";

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
