#!/usr/bin/env node
/**
 * sign-seal — attest the evidence seal with a key that is actually secret.
 *
 * The codex already ships an Ed25519 pair in app/lib/ed25519-keys.ts, and
 * that file says plainly what it is: a demonstration of the protocol, with
 * the private key committed. Anyone who clones the repository can sign
 * anything with it. For the story chain that is honest and fine. For an
 * evidence seal it would be theatre — a signature that proves only that
 * someone read a public file.
 *
 * So the seal gets its own pair. The private key is generated here, written
 * 0600, and gitignored; it never enters the repository or the deployment.
 * The public key and the signature ship, so anyone can verify that the seal
 * they are holding is the seal that was made — even if this site is gone,
 * the host is gone, and the only surviving copy is a file on a stranger's
 * disk.
 *
 * What a signature does and does not establish, stated so nobody overstates
 * it later: it binds the seal to whoever holds this key. It does not prove
 * the sources are true, and it does not prove the holder is any particular
 * person. It proves the seal has not been altered since it was signed.
 */

import { generateKeyPairSync, sign, createPublicKey } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEY_PATH = join(ROOT, ".evidence-signing.key");
const SEAL_PATH = join(ROOT, "app/lib/evidence-seal.json");
const ATTEST_PATH = join(ROOT, "app/lib/evidence-attestation.json");

function loadOrCreateKey() {
  if (existsSync(KEY_PATH)) {
    return readFileSync(KEY_PATH, "utf8");
  }
  const { privateKey } = generateKeyPairSync("ed25519");
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  writeFileSync(KEY_PATH, pem, { mode: 0o600 });
  try {
    chmodSync(KEY_PATH, 0o600);
  } catch {}
  console.log("  generated a new signing key (0600, gitignored)");
  return pem;
}

function main() {
  if (!existsSync(SEAL_PATH)) {
    console.error("no seal to sign — run the sealer first");
    process.exit(1);
  }

  const seal = JSON.parse(readFileSync(SEAL_PATH, "utf8"));

  // Without the private key we cannot re-attest. That is expected on a
  // deploy host: the committed attestation still stands and still verifies,
  // because the signature travels with the seal rather than being remade.
  if (!existsSync(KEY_PATH) && process.argv.includes("--if-key-present")) {
    console.log("signing key absent — keeping the committed attestation");
    return;
  }

  const pem = loadOrCreateKey();
  const publicKey = createPublicKey(pem);
  const publicRaw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);

  // Sign the seal's own hash: short, stable, and already the thing every
  // page and endpoint quotes as the seal's identity.
  const message = Buffer.from(seal.sealSha256, "utf8");
  const signature = sign(null, message, pem);

  const attestation = {
    algorithm: "Ed25519",
    signed: "sealSha256",
    sealSha256: seal.sealSha256,
    signature: signature.toString("base64"),
    publicKey: publicRaw.toString("base64"),
    signedAt: new Date().toISOString(),
    verify: {
      note: "The signature is over the ASCII of sealSha256, not over raw bytes of the digest.",
      webcrypto:
        "crypto.subtle.verify('Ed25519', pk, sig, new TextEncoder().encode(sealSha256))",
      openssl:
        "printf '%s' \"$SEAL_SHA256\" > /tmp/m; openssl pkeyutl -verify -pubin -inkey pub.pem -rawin -in /tmp/m -sigfile sig.bin",
    },
    establishes:
      "That this seal is byte-for-byte the seal that was signed by the holder of this key.",
    does_not_establish: [
      "That the cited sources are true.",
      "That the key holder is any particular person.",
      "Anything about claims the seal itself marks as testimony or unresolved.",
    ],
    distinct_from:
      "app/lib/ed25519-keys.ts — that pair signs the story chain and has its private key committed on purpose, as a protocol demo. It is not this key and carries no attestation weight.",
  };

  writeFileSync(ATTEST_PATH, JSON.stringify(attestation, null, 2) + "\n");
  console.log(`signed seal ${seal.sealSha256.slice(0, 16)}…`);
  console.log(`  public key: ${attestation.publicKey}`);
}

main();
