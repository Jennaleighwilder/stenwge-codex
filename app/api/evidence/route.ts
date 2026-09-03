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
    grades: {
      note: "Each span is committed under the weakest grade that is still sound for its measured entropy. The grade is published so verification is self-describing.",
      stone: {
        applies_to: "citations whose source file is public (repo code)",
        hides_span: false,
        recipe: "sed -n 'A,Bp' FILE | shasum -a 256",
      },
      salt: {
        applies_to:
          "private sources whose span carries enough entropy that guessing is infeasible",
        hides_span: false,
        purpose:
          "domain separation — identical spans in different citations get unrelated digests, and no precomputed table spans the corpus",
        recipe:
          "{ printf '%s\\n' \"$SALT\"; sed -n 'A,Bp' FILE; } | shasum -a 256",
      },
      brine: {
        applies_to:
          "private sources whose span is short or predictable enough to brute-force against a bare digest",
        hides_span: true,
        purpose:
          "genuine hiding — the key is HMAC(file bytes, domain|citation), derivable only by a holder of the source file, so an attacker without the file has no digest to test guesses against",
        recipe:
          "KEY=$(printf '%s' \"fcri:brine:v1|CITE\" | openssl dgst -sha256 -mac HMAC -macopt hexkey:\"$(xxd -p -c 99999999 FILE | tr -d '\\n')\" | awk '{print $NF}'); sed -n 'A,Bp' FILE | openssl dgst -sha256 -mac HMAC -macopt hexkey:\"$KEY\"",
      },
      no_stored_secret:
        "No key material exists anywhere in this repository or deployment. Brine keys are derived from the source documents themselves.",
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
            grade: r.entry.grade,
            hides_span: r.entry.hides ?? false,
            span_digest: r.entry.spanDigest,
            span_salt: r.entry.spanSalt,
            span_entropy_bits: r.entry.spanBits,
            how_to_verify: r.entry.verify,
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
