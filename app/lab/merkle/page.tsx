"use client";

import { useEffect, useState } from "react";

type Chapter = {
  id: number;
  kicker: string;
  line: string;
  canonical: string;
  parent_hash: string;
  content_hash: string;
};

type Manifest = {
  genesis: string;
  tip: string;
  chapters: Chapter[];
};

type Sig = {
  algorithm: string;
  tip: string;
  signature: string;
  publicHint: string;
};

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ChapterCheck = {
  chapter: Chapter;
  recomputed: string;
  ok: boolean;
};

export default function MerkleLab() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [sig, setSig] = useState<Sig | null>(null);
  const [checks, setChecks] = useState<ChapterCheck[] | null>(null);
  const [tipOk, setTipOk] = useState<boolean | null>(null);
  const [sigOk, setSigOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-merkle") === -1) {
        arr.push("lab-merkle");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}
  }, []);

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const m: Manifest = await fetch("/api/codex").then((r) => r.json());
      const s: Sig = await fetch("/api/verify").then((r) => r.json());
      setManifest(m);
      setSig(s);

      // walk the chain, recomputing each hash
      let parent = m.genesis;
      const cs: ChapterCheck[] = [];
      for (const c of m.chapters) {
        const recomputed = await sha256Hex(`${parent}\n${c.canonical}`);
        const ok = recomputed === c.content_hash && c.parent_hash === parent;
        cs.push({ chapter: c, recomputed, ok });
        parent = c.content_hash;
      }
      setChecks(cs);
      setTipOk(parent === m.tip && parent === s.tip);

      const localSig = await hmacSha256Hex(s.publicHint, s.tip);
      setSigOk(localSig === s.signature);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    run();
  }, []);

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 05
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          content-addressed story with a signed tip
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          The manifest is a merkle chain: each chapter&apos;s{" "}
          <code className="text-stone-200">content_hash</code> is{" "}
          <code className="text-stone-200">sha-256(parent_hash || &quot;\n&quot; || canonical)</code>.
          This page fetches <code>/api/codex</code> and <code>/api/verify</code>,
          walks the chain in your browser using WebCrypto, and re-derives every
          hash. Then it verifies the HMAC-SHA-256 signature on the tip.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={run}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100 disabled:opacity-40"
        >
          {busy ? "verifying…" : "re-verify"}
        </button>
        {tipOk === true && sigOk === true && (
          <span className="text-emerald-300 text-[11px] font-mono">
            ✓ chain verified · tip matches · signature verified
          </span>
        )}
        {tipOk === false && (
          <span className="text-rose-300 text-[11px] font-mono">✗ tip mismatch</span>
        )}
        {sigOk === false && (
          <span className="text-rose-300 text-[11px] font-mono">✗ signature mismatch</span>
        )}
        {err && <span className="text-rose-300 text-[11px]">{err}</span>}
      </div>

      {manifest && (
        <div className="mb-6 rounded border border-stone-800 p-4 text-[11px] font-mono">
          <div className="flex justify-between text-stone-500 mb-2">
            <span>genesis</span>
            <code className="text-stone-300">{manifest.genesis}</code>
          </div>
          <div className="flex justify-between text-stone-500">
            <span>tip (server)</span>
            <code className="text-amber-200">{manifest.tip}</code>
          </div>
          {sig && (
            <>
              <div className="flex justify-between text-stone-500 mt-2">
                <span>signature</span>
                <code className="text-stone-300">{sig.signature.slice(0, 48)}…</code>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>algorithm</span>
                <code className="text-stone-300">{sig.algorithm}</code>
              </div>
            </>
          )}
        </div>
      )}

      {checks && (
        <div className="space-y-2">
          {checks.map(({ chapter: c, recomputed, ok }) => (
            <div
              key={c.id}
              className={
                "border rounded-md p-4 " +
                (ok ? "border-stone-800" : "border-rose-500/60")
              }
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.3em] text-stone-500">
                  chapter {c.id} · {c.kicker}
                </div>
                <span
                  className={
                    "text-[10px] font-mono " +
                    (ok ? "text-emerald-300" : "text-rose-300")
                  }
                >
                  {ok ? "✓ verified" : "✗ mismatch"}
                </span>
              </div>
              <div className="text-[12px] text-stone-200 mb-2 font-serif italic">
                {c.line}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-stone-500">
                <div>
                  <div className="text-stone-600">parent_hash</div>
                  <code className="text-stone-300 break-all">{c.parent_hash}</code>
                </div>
                <div>
                  <div className="text-stone-600">recomputed content_hash</div>
                  <code
                    className={
                      "break-all " +
                      (ok ? "text-emerald-300" : "text-rose-300")
                    }
                  >
                    {recomputed}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
