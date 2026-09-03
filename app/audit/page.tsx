import Link from "next/link";
import type { Metadata } from "next";
import { audit, SEAL, sealLabel } from "../lib/evidence";
import { allClaims } from "../lib/claims";

export const metadata: Metadata = {
  title: "the contract, enforced · fcri",
  description:
    "Every sourced claim on the Wren portrait, adjudicated against a build-time seal. Digests published, sources withheld.",
};

const BADGE: Record<string, string> = {
  OBSERVED: "border-cyan-400/60 text-cyan-200 bg-cyan-400/5",
  DERIVED: "border-amber-400/60 text-amber-200 bg-amber-400/5",
  HEURISTIC: "border-fuchsia-400/60 text-fuchsia-200 bg-fuchsia-400/5",
  "MODEL-GENERATED": "border-rose-400/60 text-rose-200 bg-rose-400/5",
  "HUMAN-SUPPLIED": "border-emerald-400/60 text-emerald-200 bg-emerald-400/5",
  UNRESOLVED: "border-stone-500/60 text-stone-300 bg-stone-500/5",
};

function Tag({ b }: { b: string }) {
  return (
    <span
      className={`inline-block text-[9px] tracking-[0.25em] uppercase border px-1.5 py-0.5 align-middle ${
        BADGE[b] ?? BADGE.UNRESOLVED
      }`}
    >
      {b}
    </span>
  );
}

export default function AuditPage() {
  const claims = allClaims();
  const { rows, totals } = audit(claims);
  const sections = [...new Set(claims.map((c) => c.section))];

  return (
    <div className="min-h-screen bg-black text-stone-100 font-serif">
      <div className="fixed inset-x-0 top-0 h-[3px] z-50 flex">
        <div className="flex-1 bg-black" />
        <div className="flex-1 bg-[#f5f1e6]" />
        <div className="flex-1 bg-[#ffd68a]" />
        <div className="flex-1 bg-cyan-400" />
        <div className="flex-1 bg-fuchsia-700" />
      </div>

      <header className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <div className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-6">
          fcri · file · evidence.audit
        </div>
        <h1 className="text-[46px] md:text-[64px] leading-[0.95] tracking-tight text-[#f5f1e6]">
          The contract,
          <br />
          <span className="text-[#ffd68a]">enforced.</span>
        </h1>
        <p className="mt-8 text-stone-400 max-w-2xl leading-relaxed text-lg">
          The portrait next door cites private files. Publishing them is not an
          option; asking you to take{" "}
          <code className="text-cyan-300 text-base">OBSERVED · FILE:120</code>{" "}
          on faith is not a contract. So each citation is sealed at build time
          with a sha-256 over the exact span it points at, and only the digest
          is published. A claim may present as{" "}
          <span className="text-cyan-200">OBSERVED</span> only if that seal
          resolved. Everything else is downgraded here, automatically, with the
          reason attached.
        </p>
        <p className="mt-5 text-stone-500 max-w-2xl leading-relaxed text-sm">
          This page is permitted to say the author was wrong, and it has. Four
          citations failed the first time it ran: a byte count off by 555, a
          section heading that did not exist, and two quotations pointing at
          blank lines. They were corrected against the files, not around them.
        </p>
      </header>

      <section className="max-w-4xl mx-auto px-6 pb-12">
        <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-8 font-mono border-y border-stone-800/60 py-8">
          {[
            ["claims", totals.claims],
            ["sealed", totals.sealed],
            ["testimony", totals.testimony],
            ["failed", totals.failed],
            ["downgraded", totals.downgraded],
          ].map(([label, n]) => (
            <div key={String(label)}>
              <div className="text-[10px] uppercase tracking-widest text-stone-500">
                {label}
              </div>
              <div className="text-3xl text-[#f5f1e6] mt-1">{String(n)}</div>
            </div>
          ))}
        </dl>
        <div className="mt-4 font-mono text-[10px] text-stone-500 break-all">
          seal sha-256 · {SEAL.sealSha256}
          <br />
          sealed at · {SEAL.sealedAt}
        </div>
      </section>

      {sections.map((section) => {
        const inSection = rows.filter(
          (r) => claims.find((c) => c.subject === r.subject)?.section === section
        );
        if (!inSection.length) return null;
        return (
          <section
            key={section}
            className="max-w-4xl mx-auto px-6 py-10 border-t border-stone-800/60"
          >
            <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-6">
              {section}
            </h2>
            <ul className="space-y-6">
              {inSection.map((r, i) => (
                <li key={`${r.subject}-${i}`} className="flex flex-col gap-2">
                  <div className="text-stone-200 leading-snug">{r.subject}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag b={r.effective} />
                    {r.downgraded ? (
                      <span className="text-[10px] font-mono text-rose-300">
                        ↓ downgraded from {r.claimed}
                      </span>
                    ) : null}
                    <span className="text-[10px] font-mono text-stone-600">
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-stone-500 break-all">
                    {r.source}
                  </div>
                  {sealLabel(r.entry) ? (
                    <div className="text-[10px] font-mono text-cyan-300/70 break-all">
                      {sealLabel(r.entry)}
                    </div>
                  ) : null}
                  {r.reason ? (
                    <div className="text-[11px] text-rose-200/80 leading-relaxed">
                      {r.reason}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="max-w-4xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          verify it yourself
        </h2>
        <p className="text-stone-400 max-w-2xl leading-relaxed mb-5">
          If you hold one of the cited files, you can check any quotation on the
          portrait without anyone publishing its contents. Take the span, hash
          it, compare:
        </p>
        <pre className="text-[11px] font-mono text-cyan-200/90 bg-stone-950 border border-stone-800 p-4 overflow-x-auto">
          {`sed -n '120,120p' MASTER_BUILD_PROMPT.md | shasum -a 256
curl -s /api/evidence | jq -r '.rows[] | select(.citation=="MASTER_BUILD_PROMPT.md:120") | .seal.span_sha256'`}
        </pre>
        <p className="text-stone-500 text-sm mt-5 leading-relaxed">
          The digests match or they do not. If they do not, the portrait is
          misquoting its own sources, and you found it without me handing you
          anything private.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          what this does not prove
        </h2>
        <ul className="text-stone-400 space-y-2 max-w-2xl leading-relaxed list-disc pl-5">
          <li>
            That the cited file is honest. A seal proves a quotation is faithful
            to a document, not that the document is true.
          </li>
          <li>
            That the interpretation is right. Claims badged{" "}
            <span className="text-fuchsia-200">HEURISTIC</span> are readings,
            and a seal on their source does not make them findings.
          </li>
          <li>
            Anything at all about the {totals.testimony} claims badged{" "}
            <span className="text-emerald-200">testimony</span>. Those rest on a
            person&rsquo;s word, and the contract says so instead of dressing
            them up.
          </li>
        </ul>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-stone-800/60 flex flex-wrap gap-4 text-xs font-mono text-stone-500">
        <Link href="/wren" className="hover:text-stone-200">
          ← the portrait
        </Link>
        <Link href="/api/evidence" className="hover:text-stone-200">
          /api/evidence
        </Link>
        <Link href="/lab" className="hover:text-stone-200">
          / lab
        </Link>
        <span>·</span>
        <a
          href="https://wrentech.net"
          className="hover:text-stone-200 underline underline-offset-2"
        >
          wrentech.net
        </a>
      </footer>
    </div>
  );
}
