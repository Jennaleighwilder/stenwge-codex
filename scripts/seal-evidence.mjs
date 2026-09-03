#!/usr/bin/env node
/**
 * seal-evidence — build-time provenance sealing for the evidence contract.
 *
 * The portrait cites private files. Publishing those files is not an option;
 * asking a reader to take "OBSERVED · FILE:121" on faith is not a contract.
 *
 * So we seal instead of disclose. For every citation we can resolve, we
 * compute sha-256 over the exact cited span and over the whole file, and we
 * publish ONLY the digests. Anyone holding the source file can recompute the
 * same digest and confirm the quoted span is real. Nobody who lacks the file
 * learns its contents.
 *
 * Citations that do NOT resolve are recorded as failures — with the reason —
 * and the runtime downgrades their claims to UNRESOLVED. The seal is allowed
 * to report that the author was wrong. That is the entire point of it.
 *
 * Output: app/lib/evidence-seal.json  (digests + verdicts, no source content)
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  grade,
  commit,
  estimateBits,
  fileTag,
  band,
  BRINE_THRESHOLD_BITS,
} from "./lib/salt.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE_ROOT = join(ROOT, ".airdrop", "ben_nye_real_build");

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/** Files the portrait is allowed to cite, by basename. */
function sourceIndex() {
  const idx = new Map();
  if (existsSync(PRIVATE_ROOT)) {
    for (const f of readdirSync(PRIVATE_ROOT)) {
      if (f.endsWith(".md")) idx.set(f, join(PRIVATE_ROOT, f));
    }
  }
  return idx;
}

/** Scan the TS modules for every citation string actually shipped. */
function collectCitations() {
  const files = [
    "app/lib/wren-portrait.ts",
    "app/api/wren/route.ts",
    "app/wren/page.tsx",
  ];
  const cites = new Set();
  const artifactClaims = [];

  for (const rel of files) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");

    for (const m of src.matchAll(/source:\s*"([^"]+)"/g)) cites.add(m[1]);

    // ARTIFACTS entries pair a file path with an `ls (N bytes[, M lines])`
    // claim. Those byte counts are assertions about the real files, so they
    // get checked too, not just hashed.
    for (const m of src.matchAll(
      /value:\s*"(\.airdrop\/[^"]+?\/([A-Z_0-9]+\.md))"[\s\S]{0,200}?source:\s*"(ls[^"]*)"/g
    )) {
      artifactClaims.push({ cite: m[3], path: m[1], basename: m[2] });
    }
  }
  return { cites: [...cites], artifactClaims };
}

function parseLineSpan(cite) {
  // "FILE.md:121"  |  "FILE.md:24-28"  |  "FILE.md:153 (trailing note)"
  const m = cite.match(/^([A-Za-z0-9_.-]+\.md):(\d+)(?:-(\d+))?/);
  if (!m) return null;
  return { file: m[1], from: +m[2], to: m[3] ? +m[3] : +m[2] };
}

function sealLineSpan(cite, idx) {
  const span = parseLineSpan(cite);
  if (!span) return null;
  const path = idx.get(span.file);
  if (!path) {
    return {
      cite,
      kind: "line-span",
      status: "FAIL",
      reason: `cited file "${span.file}" is not present in the sealed source set`,
    };
  }
  const lines = readFileSync(path, "utf8").split("\n");
  if (span.from < 1 || span.to > lines.length) {
    return {
      cite,
      kind: "line-span",
      status: "FAIL",
      reason: `cited lines ${span.from}-${span.to} exceed ${span.file} (${lines.length} lines)`,
    };
  }
  // Canonical span form: the cited lines, newline-terminated — byte-identical
  // to `sed -n 'from,top' FILE`. The published recipe has to be one a reader
  // can actually run, so the seal matches the tool, not the other way round.
  const text = lines.slice(span.from - 1, span.to).join("\n") + "\n";
  if (!text.trim()) {
    return {
      cite,
      kind: "line-span",
      status: "FAIL",
      reason: `cited span ${span.from}-${span.to} of ${span.file} is blank`,
    };
  }
  const whole = readFileSync(path, "utf8");

  // The cited file is private, so the span is graded by how guessable it is.
  const g = grade({ isPublicSource: false, text });
  const sealedSpan = commit({
    grade: g,
    cite,
    text,
    fileBytes: readFileSync(path),
  });

  return {
    cite,
    kind: "line-span",
    status: "SEALED",
    file: span.file,
    lines: [span.from, span.to],
    grade: sealedSpan.grade,
    hides: sealedSpan.hides,
    spanDigest: sealedSpan.digest,
    spanSalt: sealedSpan.salt,
    verify: sealedSpan.verify,
    // Banded, not exact: a precise character count fingerprints text that
    // nobody outside was given. The band justifies the grade and stops there.
    spanBand: band(text.length),
    bitsBand: band(estimateBits(text), [32, 64, 128, 256, 512, 1024]),
    // Keyed file tag rather than sha-256(file): a holder confirms their copy,
    // an outsider gets a value that cross-references against nothing.
    fileTag: fileTag(readFileSync(path), span.file),
  };
}

function sealSectionRef(cite, idx) {
  // "FILE.md § 'Evidence contract'"  |  "FILE.md § 1-9"
  const m = cite.match(/^([A-Za-z0-9_.-]+\.md)\s*§\s*'?([^']+?)'?$/);
  if (!m) return null;
  const path = idx.get(m[1]);
  if (!path) {
    return {
      cite,
      kind: "section",
      status: "FAIL",
      reason: `cited file "${m[1]}" is not present in the sealed source set`,
    };
  }
  const whole = readFileSync(path, "utf8");
  const needle = m[2].trim();
  // A section citation resolves only if the heading text is actually in the file.
  const found = whole.toLowerCase().includes(needle.toLowerCase());
  return {
    cite,
    kind: "section",
    status: found ? "SEALED" : "FAIL",
    file: m[1],
    section: needle,
    reason: found ? undefined : `section "${needle}" not found in ${m[1]}`,
    grade: "brine",
    hides: true,
    fileTag: fileTag(readFileSync(path), m[1]),
  };
}

function sealArtifactClaim({ cite, basename }, idx) {
  // "ls  (11971 bytes, 213 lines)" — an assertion about the real file.
  const bytes = cite.match(/\((\d+) bytes/);
  const lines = cite.match(/,\s*(\d+) lines/);
  const path = idx.get(basename);
  if (!path) {
    return {
      cite,
      kind: "listing",
      status: "FAIL",
      reason: `${basename} is not present in the sealed source set`,
    };
  }
  const whole = readFileSync(path, "utf8");
  const realBytes = Buffer.byteLength(whole, "utf8");
  const realLines = whole.split("\n").length;

  const problems = [];
  if (bytes && +bytes[1] !== realBytes)
    problems.push(`claims ${bytes[1]} bytes, file is ${realBytes}`);
  if (lines && Math.abs(+lines[1] - realLines) > 1)
    problems.push(`claims ${lines[1]} lines, file is ${realLines}`);

  return {
    cite,
    kind: "listing",
    file: basename,
    status: problems.length ? "FAIL" : "SEALED",
    reason: problems.length ? problems.join("; ") : undefined,
    grade: "brine",
    hides: true,
    // These two are published deliberately: the portrait itself asserts
    // "(641 bytes, 10 lines)" on the page, so withholding them here would
    // hide nothing and only break the check that caught the 1196/641 error.
    fileBytes: realBytes,
    fileLines: realLines,
    fileTag: fileTag(readFileSync(path), basename),
  };
}

function sealCodeRef(cite) {
  // Repo code is public on GitHub: stone grade, nothing to hide.
  // "app/lib/wren-portrait.ts :: say()"
  const m = cite.match(/^([\w/.\-]+\.tsx?)\s*::\s*(\w+)/);
  if (!m) return null;
  const p = join(ROOT, m[1]);
  if (!existsSync(p))
    return { cite, kind: "code", status: "FAIL", reason: `${m[1]} does not exist` };
  const src = readFileSync(p, "utf8");
  const has = new RegExp(`(function|const)\\s+${m[2]}\\b`).test(src);
  return {
    cite,
    kind: "code",
    status: has ? "SEALED" : "FAIL",
    file: m[1],
    symbol: m[2],
    grade: "stone",
    hides: false,
    verify: "sha-256 over the public repo file",
    reason: has ? undefined : `symbol ${m[2]} not found in ${m[1]}`,
    fileSha256: sha256(src),
  };
}

function main() {
  const idx = sourceIndex();
  const { cites, artifactClaims } = collectCitations();
  const entries = {};

  for (const cite of cites) {
    const sealed =
      sealLineSpan(cite, idx) ?? sealSectionRef(cite, idx) ?? sealCodeRef(cite);
    if (sealed) {
      entries[cite] = sealed;
    } else {
      // Conversation quotes and author statements have no file behind them.
      // We do not pretend otherwise; we mark them as testimony so the audit
      // can say plainly which claims rest on a person's word.
      entries[cite] = {
        cite,
        kind: "testimony",
        status: "TESTIMONY",
        reason: "no file backs this claim; it rests on the author's word",
      };
    }
  }

  for (const a of artifactClaims) {
    entries[a.cite] = sealArtifactClaim(a, idx);
  }

  const list = Object.values(entries);
  const counts = list.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  // The seal itself is hashed so a reader can pin the exact audit they read.
  const canonical = JSON.stringify(entries, Object.keys(entries).sort());
  const seal = {
    sealedAt: new Date().toISOString(),
    algorithm: "sha-256",
    sourcesPresent: idx.size > 0,
    note:
      "Digests only. No source content is published here. Anyone holding a " +
      "cited file can recompute sha-256 over the named line span and compare.",
    counts,
    sealSha256: sha256(canonical),
    entries,
  };

  const outPath = join(ROOT, "app/lib/evidence-seal.json");

  // The deploy host has no private sources. Re-sealing there would replace a
  // seal made with the files by one made without them — every file-backed
  // claim would "fail" for the wrong reason, and the audit would lie in the
  // pessimistic direction. Sealing only happens where the sources are.
  if (!idx.size && existsSync(outPath)) {
    console.log(
      "sealed 0 citations → private sources absent; keeping committed seal."
    );
    return;
  }

  writeFileSync(outPath, JSON.stringify(seal, null, 2) + "\n");

  const fails = list.filter((e) => e.status === "FAIL");
  console.log(
    `sealed ${list.length} citations →`,
    Object.entries(counts).map(([k, v]) => `${k}:${v}`).join("  ")
  );
  for (const f of fails) console.log(`  FAIL  ${f.cite}\n        ${f.reason}`);

  if (!idx.size) {
    // Deploy hosts do not have the private sources. That is expected and is
    // not a failure: the seal committed from a machine that DID hold them
    // still stands, and the runtime keeps enforcing it.
    console.log(
      "  note: private sources absent here — keeping the committed seal as-is."
    );
    return;
  }

  if (fails.length && process.argv.includes("--strict")) {
    console.error(
      `\n  refusing to build: ${fails.length} citation(s) do not resolve against` +
        ` the sources.\n  fix the citation or drop the claim — do not ship it badged OBSERVED.`
    );
    process.exit(1);
  }
}

main();
