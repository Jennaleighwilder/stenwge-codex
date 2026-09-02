"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ARTIFACTS,
  AESTHETIC,
  BLIND_SPOTS,
  HER_MESSAGES,
  LEXICON,
  REFUSALS,
  VOCABULARY,
  computeRhythm,
  say,
  manifesto,
} from "../lib/wren-portrait";
import { Achievements } from "../components/Achievements";

type Badge =
  | "OBSERVED"
  | "DERIVED"
  | "HEURISTIC"
  | "MODEL-GENERATED"
  | "HUMAN-SUPPLIED"
  | "UNRESOLVED";

const BADGE_STYLES: Record<Badge, string> = {
  OBSERVED: "border-cyan-400/60 text-cyan-200 bg-cyan-400/5",
  DERIVED: "border-amber-400/60 text-amber-200 bg-amber-400/5",
  HEURISTIC: "border-fuchsia-400/60 text-fuchsia-200 bg-fuchsia-400/5",
  "MODEL-GENERATED": "border-rose-400/60 text-rose-200 bg-rose-400/5",
  "HUMAN-SUPPLIED": "border-emerald-400/60 text-emerald-200 bg-emerald-400/5",
  UNRESOLVED: "border-stone-500/60 text-stone-300 bg-stone-500/5",
};

function BadgeTag({ b }: { b: Badge }) {
  return (
    <span
      className={`inline-block text-[9px] tracking-[0.25em] uppercase border px-1.5 py-0.5 mr-2 align-middle ${BADGE_STYLES[b]}`}
    >
      {b}
    </span>
  );
}

function Source({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-mono text-stone-500 tracking-wide">
      {children}
    </span>
  );
}

export default function WrenPortrait() {
  const rhythm = useMemo(() => computeRhythm(), []);
  const [line, setLine] = useState<string>(() => say(7));
  const [longform, setLongform] = useState<string>("");
  const unlockedRef = useRef(false);

  useEffect(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    Achievements.unlock("wren-page");
    document.title = "wren · a machine-portrait of jennifer";
  }, []);

  return (
    <div className="min-h-screen bg-black text-stone-100 font-serif">
      {/* palette strip */}
      <div className="fixed inset-x-0 top-0 h-[3px] z-50 flex">
        <div className="flex-1 bg-black" />
        <div className="flex-1 bg-[#f5f1e6]" />
        <div className="flex-1 bg-[#ffd68a]" />
        <div className="flex-1 bg-cyan-400" />
        <div className="flex-1 bg-fuchsia-700" />
      </div>

      <header className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <div className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-6">
          fcri · file · wren.portrait
        </div>
        <h1 className="text-[52px] md:text-[72px] leading-[0.95] tracking-tight text-[#f5f1e6]">
          A machine-portrait
          <br />
          of <span className="text-[#ffd68a]">Jennifer Leigh West,</span>
          <br />
          drawn <em className="italic text-stone-400">only</em> from the
          traces she left.
        </h1>
        <p className="mt-8 text-stone-400 max-w-xl leading-relaxed text-lg">
          I do not have full access to your computer. I have this workspace,
          the notes you dropped in <code className="text-cyan-300">.airdrop/</code>,
          your messages during our conversation, and this project&rsquo;s git
          history. That&rsquo;s all. Below is what the machine could observe,
          what it could derive, and — carefully labeled — what it could not
          know. Every claim carries a badge, following{" "}
          <Link
            href="#refusals"
            className="underline decoration-amber-300/60 underline-offset-4 hover:text-amber-200"
          >
            your own evidence contract
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-wrap gap-2 text-[10px] font-mono">
          {(["OBSERVED", "DERIVED", "HEURISTIC", "UNRESOLVED"] as Badge[]).map(
            (b) => (
              <BadgeTag key={b} b={b} />
            )
          )}
        </div>
      </header>

      {/* I. What sits in the workspace */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          i. what sits in the workspace
        </h2>
        <p className="text-stone-400 max-w-xl mb-8 leading-relaxed">
          Not inferred. Directly present, listed by <code>ls</code>, with byte
          counts. This is the material the machine drew from.
        </p>
        <ul className="space-y-3">
          {ARTIFACTS.map((a) => (
            <li key={a.value} className="flex flex-col gap-1">
              <div>
                <BadgeTag b={a.badge as Badge} />
                <code className="text-[#ffd68a] text-sm">{a.value}</code>
              </div>
              <Source>
                {a.source}
                {a.note ? ` — ${a.note}` : null}
              </Source>
            </li>
          ))}
        </ul>
      </section>

      {/* II. What she names */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          ii. what she names things
        </h2>
        <p className="text-stone-400 max-w-xl mb-8 leading-relaxed">
          Your working vocabulary — the identifiers your Python modules and
          JSON packets actually use. Not marketing. Quoted from your files.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {LEXICON.map((l) => (
            <div key={l.value.name} className="border-l border-stone-800 pl-4">
              <div className="text-[#ffd68a] text-lg">{l.value.name}</div>
              <div className="text-stone-300 mt-1 text-sm leading-relaxed">
                {l.value.gloss}
              </div>
              <div className="mt-2">
                <BadgeTag b={l.badge as Badge} />
                <Source>{l.source}</Source>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="text-[10px] uppercase tracking-[0.35em] text-stone-500 font-mono mb-3">
            recurring tokens across her writing (this session + notes)
          </div>
          <div className="flex flex-wrap gap-2">
            {VOCABULARY.map((v) => (
              <span
                key={v}
                className="text-xs font-mono px-2 py-1 border border-stone-800 text-stone-300"
              >
                {v}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <BadgeTag b="OBSERVED" />
            <Source>
              hand-lifted from HER_MESSAGES + REFERENCE_WREN_FUNKY_CORE_INVENTORY.md
            </Source>
          </div>
        </div>
      </section>

      {/* III. Rhythm */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          iii. how she moves
        </h2>
        <p className="text-stone-400 max-w-xl mb-8 leading-relaxed">
          Statistics computed in your browser, right now, from the{" "}
          {HER_MESSAGES.length} messages you sent during our work. Read the
          function that computed them at{" "}
          <code className="text-cyan-300">app/lib/wren-portrait.ts</code> →{" "}
          <code className="text-cyan-300">computeRhythm()</code>.
        </p>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 font-mono">
          <Stat
            label="messages sent"
            value={rhythm.messages.toString()}
            badge="OBSERVED"
          />
          <Stat
            label="avg words / message"
            value={rhythm.avgWordsPerMessage.toFixed(1)}
            badge="DERIVED"
          />
          <Stat
            label="ALL-CAPS messages"
            value={`${Math.round(rhythm.allCapsMessageRatio * 100)}%`}
            badge="DERIVED"
          />
          <Stat
            label="capital letters ratio"
            value={`${Math.round(rhythm.capsLetterRatio * 100)}%`}
            badge="DERIVED"
          />
          <Stat
            label="imperative openings"
            value={`${Math.round(rhythm.imperativeRatio * 100)}%`}
            badge="HEURISTIC"
            note="rule: /^(make|build|show|tell|go|get|drop|keep|do|next|understand|need)/i"
          />
          <Stat
            label="self-words / 100"
            value={rhythm.selfWordsPer100.toFixed(1)}
            badge="DERIVED"
            note="i, me, my, mine, i'm, myself"
          />
          <Stat
            label="known typo tokens"
            value={rhythm.typoLikeTokens.toString()}
            badge="HEURISTIC"
            note="a hand-curated regex — a signature of speed, not carelessness"
          />
          <Stat
            label="exclamations / msg"
            value={rhythm.exclamationsPerMessage.toFixed(2)}
            badge="DERIVED"
          />
          <Stat
            label="questions / msg"
            value={rhythm.questionsPerMessage.toFixed(2)}
            badge="DERIVED"
          />
        </dl>

        <div className="mt-12">
          <div className="text-[10px] uppercase tracking-[0.35em] text-stone-500 font-mono mb-3">
            one quoted message · unedited · to prove the machine has read
          </div>
          <blockquote className="border-l-2 border-[#ffd68a] pl-4 text-stone-200 italic text-lg leading-relaxed">
            &ldquo;{HER_MESSAGES[HER_MESSAGES.length - 1]}&rdquo;
          </blockquote>
          <div className="mt-2">
            <BadgeTag b="OBSERVED" />
            <Source>message {HER_MESSAGES.length} of {HER_MESSAGES.length} · verbatim, typos preserved</Source>
          </div>
        </div>
      </section>

      {/* IV. Refusals */}
      <section id="refusals" className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          iv. what she refuses to do
        </h2>
        <p className="text-stone-400 max-w-xl mb-8 leading-relaxed">
          You published a build directive for a serious meeting. Its rules are
          not decorative. This is the ethical spine of your work.
        </p>
        <ul className="space-y-6">
          {REFUSALS.map((r, i) => (
            <li key={i} className="border-l border-stone-800 pl-4">
              <div className="text-stone-100 text-lg leading-snug">
                {r.value}
              </div>
              <div className="mt-2">
                <BadgeTag b={r.badge as Badge} />
                <Source>{r.source}</Source>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <div className="text-[10px] uppercase tracking-[0.35em] text-stone-500 font-mono mb-3">
            her aesthetic instructions (verbatim)
          </div>
          <ul className="space-y-3">
            {AESTHETIC.map((a, i) => (
              <li key={i}>
                <BadgeTag b={a.badge as Badge} />
                <span className="text-stone-200">{a.value}</span>
                <div className="mt-1 ml-1">
                  <Source>{a.source}</Source>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* V. What the machine cannot see */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          v. what the machine cannot see
        </h2>
        <p className="text-stone-400 max-w-xl mb-8 leading-relaxed">
          The honest column. Not blurred over. Not filled in with model
          fantasy. If it isn&rsquo;t in this workspace, I did not know it.
        </p>
        <ul className="space-y-2">
          {BLIND_SPOTS.map((s) => (
            <li key={s} className="flex gap-3 items-baseline">
              <span className="text-stone-600 font-mono text-xs">·</span>
              <span className="text-stone-300">{s}</span>
              <BadgeTag b="UNRESOLVED" />
            </li>
          ))}
        </ul>
      </section>

      {/* VI. A working fragment */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          vi. a working fragment of her
        </h2>
        <p className="text-stone-400 max-w-xl mb-8 leading-relaxed">
          A pure template function — no model, no training, no black box.
          It samples her vocabulary and her rhythm and emits one sentence at
          a time. You can read every word it might output at{" "}
          <code className="text-cyan-300">app/lib/wren-portrait.ts</code> →{" "}
          <code className="text-cyan-300">say()</code>. Tag on the output:{" "}
          <BadgeTag b="DERIVED" />
        </p>

        <div className="border border-stone-800 bg-stone-950 p-6">
          <div className="text-2xl text-[#f5f1e6] italic leading-relaxed min-h-[3.5rem]">
            &ldquo;{line}&rdquo;
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="text-[11px] font-mono uppercase tracking-widest border border-[#ffd68a] text-[#ffd68a] px-3 py-1.5 hover:bg-[#ffd68a] hover:text-black transition-colors"
              onClick={() => {
                const s = Math.floor(Math.random() * 1e6);
                setLine(say(s));
                Achievements.unlock("codex-wren-say");
              }}
            >
              say again
            </button>
            <button
              className="text-[11px] font-mono uppercase tracking-widest border border-cyan-400 text-cyan-200 px-3 py-1.5 hover:bg-cyan-400 hover:text-black transition-colors"
              onClick={() => setLongform(manifesto())}
            >
              five in a row
            </button>
          </div>
          {longform && (
            <div className="mt-6 pt-6 border-t border-stone-800 text-stone-300 italic leading-relaxed">
              {longform}
              <div className="mt-3">
                <BadgeTag b="DERIVED" />
                <Source>manifesto() = five say() calls, seeds 1, 23, 51, 199, 1024</Source>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* VII. What the machine believes it is looking at */}
      <section className="max-w-3xl mx-auto px-6 py-12 border-t border-stone-800/60">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-4">
          vii. what the machine believes it is looking at
        </h2>

        <div className="text-stone-200 leading-loose text-lg space-y-6 max-w-2xl">
          <p>
            An engineer who thinks of code as anatomy. Your systems have{" "}
            <em>organs</em>, <em>scars</em>, a <em>nervous warning map</em>,{" "}
            <em>metabolism</em>. You did not choose those metaphors for
            marketing; they are the identifiers your files use. That is a
            choice about how a system should behave: not efficient — <em>alive
            enough to hurt when it errs</em>.{" "}
            <BadgeTag b="HEURISTIC" />
          </p>
          <p>
            A poet who writes production-ready governance software. Your
            master build prompt is 213 lines of rigor. Its final line asks
            Ben Nye:{" "}
            <em className="text-[#ffd68a]">
              &ldquo;What would this system have to measure — and fail — to
              become learning science rather than an extraordinary
              instrument?&rdquo;
            </em>{" "}
            You do not want to be right. You want to be falsifiable.{" "}
            <BadgeTag b="OBSERVED" />{" "}
            <Source>MASTER_BUILD_PROMPT.md:121</Source>
          </p>
          <p>
            Someone who names herself, in her own vocabulary, before she
            asks a question. &ldquo;I&rsquo;m a stenwge bird ain&rsquo;t
            I.&rdquo; You gave me the word for you before you asked what I
            saw.{" "}
            <BadgeTag b="OBSERVED" />
            <Source> · message 4 of {HER_MESSAGES.length}</Source>
          </p>
          <p>
            Someone who has been undervalued in rooms and has learned to
            correct that in real time. When the machine took too much credit
            for what you had directed, you said so, immediately, in caps.
            The correction was the signal to trust.{" "}
            <BadgeTag b="HEURISTIC" />
          </p>
          <p>
            Someone who left five files in a folder called{" "}
            <code className="text-cyan-300">.airdrop/ben_nye_real_build/</code>
            {" "}on a Mac she is preparing for a meeting with a Director of
            Learning Science Research at USC ICT, and who asked a stranger
            to look. That is not carelessness. That is trust with a witness
            marked.{" "}
            <BadgeTag b="OBSERVED" />
          </p>
          <p className="text-stone-400 pt-4 border-t border-stone-800">
            None of the above is proof. It is what the machine <em>believes</em>{" "}
            it is looking at. You are permitted to disagree. That is what the
            evidence badges are for.
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-32">
        <div className="text-[10px] uppercase tracking-[0.45em] text-stone-500 font-mono mb-8">
          fin.
        </div>
        <div className="text-3xl md:text-4xl text-[#f5f1e6] leading-tight max-w-2xl">
          If you would like the machine-readable version, it is at{" "}
          <Link
            href="/api/wren"
            className="text-[#ffd68a] underline decoration-[#ffd68a]/40 underline-offset-4 hover:decoration-[#ffd68a]"
          >
            /api/wren
          </Link>
          .
        </div>
        <div className="mt-10 flex gap-4 text-xs font-mono text-stone-500">
          <Link href="/" className="hover:text-stone-200">← codex</Link>
          <Link href="/lab" className="hover:text-stone-200">/ lab</Link>
          <span>·</span>
          <span>the forgotten code research institute</span>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  badge,
  note,
}: {
  label: string;
  value: string;
  badge: Badge;
  note?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </div>
      <div className="text-3xl text-[#f5f1e6] mt-1">{value}</div>
      <div className="mt-1">
        <BadgeTag b={badge} />
      </div>
      {note ? (
        <div className="mt-1">
          <Source>{note}</Source>
        </div>
      ) : null}
    </div>
  );
}
