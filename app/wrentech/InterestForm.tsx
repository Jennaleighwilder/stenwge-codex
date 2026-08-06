"use client";

import { useState } from "react";

const CLAY = "#CE6A4C";
const GREEN = "#37432A";
const INBOX = "Wren@wrentech.net";

/**
 * Interest capture for the Wrentech Cohort. No backend required: it drafts a
 * pre-filled email to the Wrentech inbox and shows an inline confirmation, so
 * the page can be deployed statically and still collect real leads.
 */
export default function InterestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Wrentech Cohort — interest from ${name || "a builder"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nWhat I want to build / why I'm in:\n${goal}\n`,
    );
    // open a pre-filled draft to the Wrentech inbox
    window.location.href = `mailto:${INBOX}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div
        className="rounded-2xl border px-7 py-9 text-center"
        style={{ borderColor: "rgba(55,67,42,0.2)", background: "rgba(255,255,255,0.55)" }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ background: CLAY, color: "#F5EEDF" }}
        >
          ✓
        </div>
        <h3
          className="mb-2 text-3xl"
          style={{ fontFamily: "var(--font-serif)", color: GREEN }}
        >
          Your seat is saved — almost.
        </h3>
        <p className="mx-auto max-w-md text-[15px] leading-relaxed" style={{ color: "#5B5647" }}>
          An email draft just opened. Hit send and it lands in the Wrentech
          inbox — I read every one personally and reply with next steps and the
          deposit link. Spots are first-come.
        </p>
        <p className="mt-4 text-[13px]" style={{ color: "#8A8270" }}>
          Nothing opened? Email me directly at{" "}
          <a className="underline" style={{ color: CLAY }} href={`mailto:${INBOX}`}>
            {INBOX}
          </a>
          .
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border bg-white/70 px-4 py-3 text-[15px] outline-none transition focus:bg-white";
  const fieldStyle = { borderColor: "rgba(55,67,42,0.22)", color: GREEN } as const;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "#8A8270" }}>
            Your name
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            style={fieldStyle}
            placeholder="Jane Builder"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "#8A8270" }}>
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            style={fieldStyle}
            placeholder="you@email.com"
            autoComplete="email"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "#8A8270" }}>
          What do you want to build? <span className="normal-case tracking-normal">(optional)</span>
        </span>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className={field + " min-h-[96px] resize-y"}
          style={fieldStyle}
          placeholder="A location-independent income. A skill I actually own. Freedom."
        />
      </label>
      <button
        type="submit"
        className="group w-full rounded-xl px-6 py-4 text-[15px] font-semibold uppercase tracking-[0.16em] text-[#F5EEDF] transition hover:brightness-105 active:translate-y-px"
        style={{ background: CLAY }}
      >
        Claim my spot in the cohort →
      </button>
      <p className="text-center text-[12.5px]" style={{ color: "#8A8270" }}>
        No spam, ever. Just the details, the deposit link, and a real reply from me.
      </p>
    </form>
  );
}
