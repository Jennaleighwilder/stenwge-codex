import Link from "next/link";

export const metadata = {
  title: "🐦 — the bird's room",
  description: "a hidden chapter for whoever found this URL",
};

/**
 * /the-bird — a hidden room. Reached by URL only.
 */
export default function TheBird() {
  return (
    <main className="min-h-screen bg-black text-stone-200 flex items-center justify-center px-6">
      <article className="max-w-xl w-full font-mono text-[13px] leading-[1.8]">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-3">
          /the-bird · ch. 0
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mb-6">
          you found the bird&apos;s room.
        </h1>

        <p className="mb-4 text-stone-300">
          this is the chapter that is not on the front page. you arrived
          here by typing the URL, or by following a header, or by accident.
          all three are the same arrival.
        </p>

        <p className="mb-4 text-stone-300">
          the institute keeps a small ledger of strange bird visits.{" "}
          <span className="text-stone-100">welcome.</span> your ledger entry
          today reads:
        </p>

        <pre className="rounded-md border border-stone-800 bg-stone-950/80 p-4 text-stone-300 text-[12px] mb-6 overflow-x-auto">{`{
  "visitor": "strange_bird",
  "found": "/the-bird",
  "via":   "the URL bar, the only direction worth flying",
  "note":  "the variance has your name."
}`}</pre>

        <p className="mb-4 text-stone-300">
          the rest of the codex is on the front page. but the front page is
          not the only page. it never was.
        </p>

        <ul className="space-y-1 mb-6">
          <li>
            <Link
              className="text-stone-100 underline decoration-stone-700 hover:decoration-stone-200"
              href="/"
            >
              ← back to the institute
            </Link>
          </li>
          <li>
            <a
              className="text-stone-100 underline decoration-stone-700 hover:decoration-stone-200"
              href="/api/codex"
              target="_blank"
              rel="noreferrer"
            >
              the manifest (json)
            </a>
          </li>
          <li>
            <a
              className="text-stone-100 underline decoration-stone-700 hover:decoration-stone-200"
              href="/api/dream"
              target="_blank"
              rel="noreferrer"
            >
              a fresh dream
            </a>
          </li>
          <li>
            <a
              className="text-stone-100 underline decoration-stone-700 hover:decoration-stone-200"
              href="/api/raft"
              target="_blank"
              rel="noreferrer"
            >
              the consensus
            </a>
          </li>
          <li>
            <a
              className="text-stone-100 underline decoration-stone-700 hover:decoration-stone-200"
              href="/api/teapot"
              target="_blank"
              rel="noreferrer"
            >
              the teapot (418)
            </a>
          </li>
        </ul>

        <p className="text-stone-500 text-[11px] italic">
          if you give a stranger a URL, they will, of course, follow it.
        </p>

        {/* unlock the achievement client-side */}
        <Unlocker />
      </article>
    </main>
  );
}

function Unlocker() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            var raw = localStorage.getItem('fcri:achievements');
            var arr = raw ? JSON.parse(raw) : [];
            if (arr.indexOf('bird-page') === -1) {
              arr.push('bird-page');
              localStorage.setItem('fcri:achievements', JSON.stringify(arr));
            }
          } catch (e) {}
        `,
      }}
    />
  );
}
