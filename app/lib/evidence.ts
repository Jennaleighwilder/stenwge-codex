/**
 * evidence — runtime enforcement of the evidence contract.
 *
 * A badge typed by hand is a claim about a claim. This module makes the
 * badge answerable to something: the build-time seal in evidence-seal.json,
 * which holds a sha-256 over each cited span of each cited file.
 *
 * The rule, in one line: a claim may present as OBSERVED only if its
 * citation was sealed against a real span of a real file. Anything else is
 * downgraded — automatically, at render time, with the reason attached.
 *
 * This is deliberately unflattering. It is allowed to mark the author's own
 * page UNRESOLVED, and it does. A contract that can only return "pass" is
 * not a contract, it is a badge.
 */

import sealFile from "./evidence-seal.json";

export type Badge =
  | "OBSERVED"
  | "DERIVED"
  | "HEURISTIC"
  | "MODEL-GENERATED"
  | "HUMAN-SUPPLIED"
  | "UNRESOLVED";

export type SealStatus = "SEALED" | "FAIL" | "TESTIMONY";

export type Grade = "stone" | "salt" | "brine";

export type SealEntry = {
  cite: string;
  kind: "line-span" | "section" | "listing" | "code" | "testimony";
  status: SealStatus;
  reason?: string;
  file?: string;
  lines?: [number, number];
  /** which commitment grade this span was sealed under */
  grade?: Grade;
  /** true only for brine: the digest genuinely hides the span */
  hides?: boolean;
  /** the commitment itself, under whatever grade was chosen */
  spanDigest?: string;
  /** published salt — present for salt grade only, never a secret */
  spanSalt?: string;
  /** estimated bits an attacker must search to guess the span */
  spanBits?: number;
  /** plain-language statement of how to reproduce this digest */
  verify?: string;
  spanChars?: number;
  fileSha256?: string;
  fileBytes?: number;
  fileLines?: number;
  section?: string;
  symbol?: string;
};

export type Seal = {
  sealedAt: string;
  algorithm: string;
  sourcesPresent: boolean;
  note: string;
  counts: Record<string, number>;
  sealSha256: string;
  entries: Record<string, SealEntry>;
};

export const SEAL = sealFile as unknown as Seal;

/** Badges that assert a document says something, and so require a seal. */
const FILE_BACKED: Badge[] = ["OBSERVED", "DERIVED"];

export type Verdict = {
  /** what the author wrote */
  claimed: Badge;
  /** what the contract will actually let the page display */
  effective: Badge;
  downgraded: boolean;
  status: SealStatus | "UNSEALED";
  reason?: string;
  entry?: SealEntry;
};

/**
 * Adjudicate one claim. Pure, synchronous, no network — the same verdict
 * renders on the server, in the browser, and in the audit endpoint.
 */
export function adjudicate(claimed: Badge, source: string): Verdict {
  const entry = SEAL.entries[source];

  if (!entry) {
    // An unrecognised citation cannot support a documentary claim.
    if (FILE_BACKED.includes(claimed)) {
      return {
        claimed,
        effective: "UNRESOLVED",
        downgraded: true,
        status: "UNSEALED",
        reason: `citation "${source}" was never sealed; it cannot support ${claimed}`,
      };
    }
    return { claimed, effective: claimed, downgraded: false, status: "UNSEALED" };
  }

  if (entry.status === "SEALED") {
    return {
      claimed,
      effective: claimed,
      downgraded: false,
      status: "SEALED",
      entry,
    };
  }

  if (entry.status === "FAIL") {
    return {
      claimed,
      effective: "UNRESOLVED",
      downgraded: true,
      status: "FAIL",
      reason: entry.reason,
      entry,
    };
  }

  // TESTIMONY: a person's word. Honest as HUMAN-SUPPLIED, never as OBSERVED.
  if (FILE_BACKED.includes(claimed)) {
    return {
      claimed,
      effective: "HUMAN-SUPPLIED",
      downgraded: true,
      status: "TESTIMONY",
      reason:
        "no file backs this claim — it rests on the author's word, so it cannot present as " +
        claimed,
      entry,
    };
  }
  return {
    claimed,
    effective: claimed,
    downgraded: false,
    status: "TESTIMONY",
    entry,
  };
}

/** Short human string for a sealed citation, safe to show publicly. */
export function sealLabel(entry?: SealEntry): string | undefined {
  if (!entry) return undefined;
  if (entry.status !== "SEALED") return undefined;
  if (entry.kind === "line-span" && entry.lines && entry.spanDigest) {
    const alg = entry.grade === "brine" ? "hmac-sha-256" : "sha-256";
    return `${entry.grade} · ${alg}(${entry.file}:${entry.lines[0]}-${entry.lines[1]}) = ${entry.spanDigest.slice(0, 16)}…`;
  }
  if (entry.fileSha256) {
    return `sha-256(${entry.file ?? "source"}) = ${entry.fileSha256.slice(0, 16)}…`;
  }
  return undefined;
}

export type AuditRow = Verdict & { source: string; subject: string };

/** Run the contract over a set of claims and return every verdict. */
export function audit(
  claims: { subject: string; badge: Badge; source: string }[]
): { rows: AuditRow[]; totals: Record<string, number> } {
  const rows = claims.map((c) => ({
    ...adjudicate(c.badge, c.source),
    source: c.source,
    subject: c.subject,
  }));
  const totals = {
    claims: rows.length,
    sealed: rows.filter((r) => r.status === "SEALED").length,
    testimony: rows.filter((r) => r.status === "TESTIMONY").length,
    failed: rows.filter((r) => r.status === "FAIL").length,
    unsealed: rows.filter((r) => r.status === "UNSEALED").length,
    downgraded: rows.filter((r) => r.downgraded).length,
  };
  return { rows, totals };
}
