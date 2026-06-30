import type { Metadata } from "next";
import { Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "The Forgotten Code Research Institute",
  description:
    "An interactive artifact from the Forgotten Code Research Institute — woven from a strange conversation between a mouse, a cat, a boot under the moon, and the bird who watched it all.",
  openGraph: {
    title: "The Forgotten Code Research Institute",
    description:
      "A small, strange artifact of human-and-machine storytelling.",
    type: "website",
  },
};

const CODEX_MANIFEST = {
  "@context": "https://forgotten-code-institute.vercel.app/api/codex",
  "@type": "Artifact",
  name: "The Forgotten Code Research Institute",
  thesis:
    "AI tools, given the right strange direction, will invent the behaviour the engineers never wrote.",
  protagonist: { type: "Mouse", lactose_intolerant: true, wants_more: true },
  antagonist: { type: "Cat", vegetarian: true, tame_level: "limited" },
  habitat: { type: "Boot", under: "moon" },
  author: "the stenwge bird",
  hint: "open /api/codex for the structured story",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${cormorant.variable}`}
    >
      <head>
        {/* manifesto for the curious view-source diver */}
        {/* eslint-disable-next-line react/no-danger */}
        <script
          type="application/codex+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(CODEX_MANIFEST, null, 2),
          }}
        />
      </head>
      <body className="bg-black text-stone-100 antialiased overflow-x-hidden">
        {/*
          ─────────────────────────────────────────────────────────────────
            the forgotten code research institute
            if you give a mouse a cookie, you give the world a fairy tale.

            this page contains hidden artefacts for the curious:
              · open DevTools — there is a banner.
              · window.codex — there is a runtime.
              · ↑ ↑ ↓ ↓ ← → ← → b a — there is a flash.
              · type "stenwge" — there is a jump.
              · press ? — there is a cheat sheet.
              · /robots.txt — there is a poem.
              · /api/codex — there is a manifest.
              · /api/teapot — there is a teapot.

            the variance is a feature, not a bug. carry on, strange bird.
          ─────────────────────────────────────────────────────────────────
        */}
        {children}
      </body>
    </html>
  );
}
