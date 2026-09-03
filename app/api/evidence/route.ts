import { NextResponse } from "next/server";
import { audit, SEAL, sealLabel } from "../../lib/evidence";
import { allClaims } from "../../lib/claims";

export const dynamic = "force-dynamic";

/**
 * The contract, machine-readable.
 *
 * Every sourced claim on /wren, adjudicated against the build-time seal.
 * `claimed` is what the author wrote. `effective` is what the page is
 * permitted to display. Where they differ, `reason` says why.
 *
 * No source content is served here — only sha-256 digests over the cited
 * spans. Holding a cited file lets you verify a quotation. Not holding it
 * tells you nothing about what the file says.
 *
 *   curl -s https://<host>/api/evidence | jq '.totals'
 *   curl -s https://<host>/api/evidence | jq '.rows[] | select(.downgraded)'
 */
export async function GET() {
  const claims = allClaims();
  const { rows, totals } = audit(claims);

  const body = {
    contract: {
      rule: "A claim may present as OBSERVED or DERIVED only if its citation was sealed against a real span of a real file. Everything else is downgraded automatically.",
      enforced_by: "app/lib/evidence.ts :: adjudicate()",
      sealed_by: "scripts/seal-evidence.mjs (build step)",
      algorithm: SEAL.algorithm,
      sealed_at: SEAL.sealedAt,
      seal_sha256: SEAL.sealSha256,
      sources_published: false,
      note: SEAL.note,
    },
    totals,
    verify: {
      how: "Recompute sha-256 over the named line span of the cited file and compare to spanSha256.",
      client: "/lab/evidence",
      example:
        "sed -n '120,120p' MASTER_BUILD_PROMPT.md | shasum -a 256",
    },
    rows: rows.map((r) => ({
      subject: r.subject,
      section: claims.find((c) => c.subject === r.subject)?.section,
      claimed: r.claimed,
      effective: r.effective,
      downgraded: r.downgraded,
      status: r.status,
      reason: r.reason,
      citation: r.source,
      seal: r.entry
        ? {
            kind: r.entry.kind,
            file: r.entry.file,
            lines: r.entry.lines,
            span_sha256: r.entry.spanSha256,
            file_sha256: r.entry.fileSha256,
            file_bytes: r.entry.fileBytes,
            label: sealLabel(r.entry),
          }
        : undefined,
    })),
  };

  return NextResponse.json(body, {
    headers: {
      "X-Evidence-Contract": "enforced",
      "X-Seal-Sha256": SEAL.sealSha256,
      "X-Claims-Downgraded": String(totals.downgraded),
    },
  });
}
