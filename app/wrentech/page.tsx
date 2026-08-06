import type { Metadata } from "next";
import Image from "next/image";
import { Inter, Caveat } from "next/font/google";
import Reveal from "./Reveal";
import InterestForm from "./InterestForm";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

/* ── brand palette, pulled from the Wrentech poster ─────────────────────── */
const PAPER = "#EFE7D3"; // cream background
const PAPER_2 = "#F4EEDE"; // lighter cream
const GREEN = "#37432A"; // deep olive ink
const GREEN_2 = "#3D4A2C"; // band green
const CLAY = "#CE6A4C"; // terracotta accent
const CLAY_SOFT = "#D97C5E";
const GOLD = "#C69A46";
const MUTED = "#5B5647";

export const metadata: Metadata = {
  metadataBase: new URL("https://wrentech.net"),
  title: "WRENTECH — Self Taught. Self Built. | The Wrentech Cohort",
  description:
    "I taught myself to build with AI tools and turned it into $30,000 of client work in four months — from the road, with my kid on my lap. Now I'm teaching a small cohort how to do the same. Building systems. Building freedom.",
  openGraph: {
    title: "WRENTECH — Self Taught. Self Built.",
    description:
      "My tech journey, and the small hands-on cohort where I teach you to build real systems with AI, land real clients, and earn real income. Your future is buildable.",
    type: "website",
    images: [{ url: "/wrentech/poster.png", width: 1024, height: 1536, alt: "The Wrentech Cohort" }],
  },
};

/* small reusable label */
function Eyebrow({ children, color = CLAY }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="text-[11px] font-semibold uppercase"
      style={{ color, letterSpacing: "0.28em", fontFamily: "var(--font-inter)" }}
    >
      {children}
    </span>
  );
}

export default function WrentechPage() {
  return (
    <main
      className={`${inter.variable} ${caveat.variable} relative min-h-screen w-full overflow-x-hidden`}
      style={{ background: PAPER, color: GREEN, fontFamily: "var(--font-inter)" }}
    >
      {/* ══════════════════ NAV ══════════════════ */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="leading-none">
          <div
            className="text-xl font-bold tracking-[0.32em]"
            style={{ color: GREEN, fontFamily: "var(--font-inter)" }}
          >
            WRENTECH
          </div>
          <div className="mt-1 text-[9px] tracking-[0.24em]" style={{ color: CLAY }}>
            BUILDING SYSTEMS. BUILDING FREEDOM.
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] sm:inline-flex"
            style={{ background: "rgba(206,106,76,0.12)", color: CLAY }}
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: CLAY }} />
            9 spots left
          </span>
          <a
            href="#join"
            className="rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#F5EEDF] transition hover:brightness-105"
            style={{ background: GREEN }}
          >
            Join the cohort
          </a>
        </div>
      </header>

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8 sm:pt-10">
        {/* decorative clay blob echoing the poster */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full opacity-30 blur-2xl sm:h-96 sm:w-96"
          style={{ background: CLAY }}
        />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <Eyebrow>AI tools · Real skills · Real clients · Real income</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <h1
                className="mt-5 text-[clamp(3.4rem,11vw,7rem)] font-semibold leading-[0.86]"
                style={{ fontFamily: "var(--font-serif)", color: GREEN, letterSpacing: "-0.01em" }}
              >
                self taught.
                <br />
                self <span style={{ color: CLAY }}>built.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-7 max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>
                No degree. No bootcamp badge. Just a laptop, a stubborn streak,
                and the belief that the future is <em>buildable</em>. I taught
                myself to build with AI — and turned it into a real business from
                the road. Now I&apos;m showing you how.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#join"
                  className="rounded-full px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#F5EEDF] transition hover:brightness-105"
                  style={{ background: CLAY }}
                >
                  Save your spot →
                </a>
                <a
                  href="#journey"
                  className="rounded-full border px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.16em] transition hover:bg-white/40"
                  style={{ borderColor: "rgba(55,67,42,0.3)", color: GREEN }}
                >
                  Read my story
                </a>
              </div>
            </Reveal>
          </div>

          {/* founder photo, framed like a print */}
          <Reveal delay={200}>
            <div className="relative mx-auto w-full max-w-sm">
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-[26px] border-4 shadow-2xl"
                style={{ borderColor: PAPER_2 }}
              >
                <Image
                  src="/wrentech/founder.webp"
                  alt="The founder of Wrentech"
                  fill
                  preload
                  sizes="(max-width: 768px) 90vw, 380px"
                  className="object-cover"
                />
              </div>
              {/* floating result chip */}
              <div
                className="absolute -bottom-5 -left-4 rounded-2xl px-5 py-3 shadow-xl"
                style={{ background: GREEN }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>
                  first 4 months
                </div>
                <div className="text-2xl font-bold" style={{ color: "#F5EEDF", fontFamily: "var(--font-serif)" }}>
                  $30,000
                </div>
                <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "rgba(245,238,223,0.6)" }}>
                  in client work
                </div>
              </div>
              <div
                className="absolute -right-3 -top-3 flex h-16 w-16 rotate-6 items-center justify-center rounded-full text-center text-[10px] font-bold uppercase leading-tight tracking-[0.12em] shadow-lg"
                style={{ background: CLAY, color: "#F5EEDF" }}
              >
                real
                <br />
                clients
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ STAT BAND ══════════════════ */}
      <section className="relative mt-6" style={{ background: GREEN_2 }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-3 sm:px-8">
          {[
            { big: "$30K", small: "in client work, my first 4 months" },
            { big: "0", small: "degrees, bootcamps, or permission slips" },
            { big: "1,600 mi", small: "of highway — built from the road" },
          ].map((s, i) => (
            <Reveal key={s.big} delay={i * 90} className="text-center sm:text-left">
              <div
                className="text-[clamp(2.6rem,7vw,3.6rem)] font-semibold leading-none"
                style={{ fontFamily: "var(--font-serif)", color: i === 0 ? CLAY_SOFT : "#F5EEDF" }}
              >
                {s.big}
              </div>
              <div
                className="mt-2 text-[13px] uppercase tracking-[0.14em]"
                style={{ color: "rgba(245,238,223,0.68)" }}
              >
                {s.small}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════ MY TECH JOURNEY ══════════════════ */}
      <section id="journey" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>My tech journey</Eyebrow>
          <h2
            className="mt-4 text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[0.95]"
            style={{ fontFamily: "var(--font-serif)", color: GREEN }}
          >
            I didn&apos;t come from tech.
            <br />I <span style={{ color: CLAY }}>built my way in.</span>
          </h2>
        </Reveal>

        {/* beat 1 — the start */}
        <div className="mt-16 grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border-4 shadow-xl" style={{ borderColor: PAPER_2 }}>
              <Image
                src="/wrentech/build-with-kid.jpeg"
                alt="Building at the laptop with my son beside me"
                fill
                sizes="(max-width: 768px) 90vw, 520px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                01 — the decision
              </div>
              <h3 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: GREEN }}>
                A laptop, a kid on my lap, and a hard no to waiting.
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed" style={{ color: MUTED }}>
                I started where a lot of people start: convinced tech was for
                other people. But I was tired of trading my hours for someone
                else&apos;s ceiling. So I opened a laptop with my son right there
                beside me and decided I&apos;d learn to build — even if I had to
                figure out every single piece myself.
              </p>
            </div>
          </Reveal>
        </div>

        {/* beat 2 — AI as a co-pilot */}
        <div className="mt-20 grid items-center gap-10 md:grid-cols-2">
          <Reveal className="md:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border-4 shadow-xl" style={{ borderColor: PAPER_2 }}>
              <Image
                src="/wrentech/road-map.png"
                alt="Working across the country — a 1,600 mile route on the map"
                fill
                sizes="(max-width: 768px) 90vw, 520px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={100} className="md:order-1">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                02 — the unlock
              </div>
              <h3 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: GREEN }}>
                AI wasn&apos;t a shortcut. It was my co-builder.
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed" style={{ color: MUTED }}>
                The moment it clicked: I didn&apos;t need to memorize everything —
                I needed to <em>build</em> everything. I learned to use AI tools
                as a partner that never sleeps, turning &ldquo;I don&apos;t know
                how&rdquo; into shipped systems. Real skills, built by doing, from
                whatever town the road put me in that week.
              </p>
            </div>
          </Reveal>
        </div>

        {/* beat 3 — freedom */}
        <div className="mt-20 grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border-4 shadow-xl" style={{ borderColor: PAPER_2 }}>
              <Image
                src="/wrentech/redrock.jpeg"
                alt="Red rock country — the office changes, the work ships"
                fill
                sizes="(max-width: 768px) 90vw, 520px"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                03 — the freedom
              </div>
              <h3 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: GREEN }}>
                $30,000 in client work — and an office that moves.
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed" style={{ color: MUTED }}>
                Four months in, I&apos;d earned $30,000 doing real work for real
                clients. Not a course I bought — a business I built. Red rock out
                the window one week, a new horizon the next. That&apos;s the whole
                point of Wrentech: <strong style={{ color: GREEN }}>building systems so you can build freedom.</strong>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ THE COHORT ══════════════════ */}
      <section id="cohort" className="relative" style={{ background: PAPER_2 }}>
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>The class I&apos;m hosting</Eyebrow>
            <h2
              className="mt-4 text-[clamp(2.6rem,7vw,4.6rem)] font-semibold leading-[0.9]"
              style={{ fontFamily: "var(--font-serif)", color: GREEN }}
            >
              The <span style={{ color: CLAY }}>Wrentech</span> Cohort
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed" style={{ color: MUTED }}>
              A small, hands-on cohort for people who are done waiting for
              permission. I&apos;ll teach you exactly how I did it — building real
              systems with AI, finding real clients, and turning skills into
              income you own.
            </p>
          </Reveal>

          {/* what you'll learn */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: "Build with AI as your partner",
                d: "Use AI tools to design, build, and ship real systems — even if you're starting from zero.",
              },
              {
                t: "Package a real skill",
                d: "Turn what you can build into a service people actually pay for — priced with confidence.",
              },
              {
                t: "Find & close real clients",
                d: "Where the work is, how to pitch it, and how to land paying clients without a portfolio wall.",
              },
              {
                t: "Deliver like a pro",
                d: "Scope, communicate, and ship so clients come back and refer you the next one.",
              },
              {
                t: "Systems for freedom",
                d: "Set up the repeatable systems that let you work from anywhere — a desk, a truck, a trailhead.",
              },
              {
                t: "A room that has your back",
                d: "A small cohort, direct access to me, and builders on the same road as you.",
              },
            ].map((c, i) => (
              <Reveal key={c.t} delay={(i % 3) * 80}>
                <div
                  className="h-full rounded-2xl border bg-white/60 p-6 transition hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: "rgba(55,67,42,0.14)" }}
                >
                  <div
                    className="mb-3 flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold"
                    style={{ background: "rgba(206,106,76,0.14)", color: CLAY }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h4 className="text-[19px] font-semibold" style={{ fontFamily: "var(--font-serif)", color: GREEN }}>
                    {c.t}
                  </h4>
                  <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: MUTED }}>
                    {c.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* who it's for */}
          <Reveal className="mt-14">
            <div
              className="rounded-2xl border px-7 py-8 sm:px-10"
              style={{ borderColor: "rgba(55,67,42,0.14)", background: "rgba(255,255,255,0.5)" }}
            >
              <div className="text-[13px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                Who it&apos;s for
              </div>
              <p className="mt-3 text-[17px] leading-relaxed" style={{ color: MUTED }}>
                Beginners and career-changers. Parents building around a kid&apos;s
                nap schedule. Anyone who wants location-independent income and
                refuses to wait for a gatekeeper to say they&apos;re ready.{" "}
                <strong style={{ color: GREEN }}>No experience required — just the willingness to build.</strong>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ DATES / URGENCY ══════════════════ */}
      <section className="relative" style={{ background: GREEN }}>
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { k: "Deposits due", v: "July 27" },
                { k: "Class starts", v: "August 3" },
                { k: "Cohort size", v: "9 seats" },
              ].map((d) => (
                <Reveal key={d.k}>
                  <div className="border-l-2 pl-4" style={{ borderColor: CLAY }}>
                    <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(245,238,223,0.6)" }}>
                      {d.k}
                    </div>
                    <div className="mt-1 text-3xl font-semibold" style={{ fontFamily: "var(--font-serif)", color: "#F5EEDF" }}>
                      {d.v}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120}>
              <a
                href="#join"
                className="inline-block rounded-full px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.16em] text-[#F5EEDF] transition hover:brightness-105"
                style={{ background: CLAY }}
              >
                Claim one of 9 spots →
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════ JOIN / INTEREST FORM ══════════════════ */}
      <section id="join" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 md:grid-cols-[1fr_1.05fr] md:items-center">
          <Reveal>
            <div>
              <Eyebrow>Save your spot</Eyebrow>
              <h2
                className="mt-4 text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[0.92]"
                style={{ fontFamily: "var(--font-serif)", color: GREEN }}
              >
                Your future is
                <br />
                <span className="relative inline-block">
                  <span style={{ color: CLAY }}>buildable.</span>
                  <span
                    aria-hidden
                    className="absolute -bottom-2 left-0 h-2 w-full rounded-full"
                    style={{ background: "rgba(198,154,70,0.35)" }}
                  />
                </span>
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>
                Nine seats. One cohort. Drop your details and I&apos;ll send you
                everything — the format, the deposit link, and a real reply from
                me. Let&apos;s build the thing that sets you free.
              </p>
              <p
                className="mt-6 text-[26px]"
                style={{ fontFamily: "var(--font-caveat)", color: GREEN }}
              >
                See you in the build room —
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <InterestForm />
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{ background: GREEN_2 }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-12 text-center sm:px-8">
          <div className="text-lg font-bold tracking-[0.32em]" style={{ color: "#F5EEDF" }}>
            WRENTECH
          </div>
          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: CLAY_SOFT }}>
            Building systems. Building freedom.
          </div>
          <div className="text-[26px]" style={{ fontFamily: "var(--font-caveat)", color: "rgba(245,238,223,0.85)" }}>
            your future is buildable.
          </div>
          <a
            href="#join"
            className="mt-2 text-[12px] uppercase tracking-[0.2em] underline-offset-4 hover:underline"
            style={{ color: "rgba(245,238,223,0.55)" }}
          >
            wrentech.net
          </a>
        </div>
      </footer>
    </main>
  );
}
