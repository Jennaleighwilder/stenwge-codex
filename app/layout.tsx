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
  title: "The Stenwge Codex",
  description:
    "An interactive artifact woven from a strange conversation. If you give a mouse a cookie, you give the world a fairy tale.",
  openGraph: {
    title: "The Stenwge Codex",
    description: "A small, strange artifact of human-and-machine storytelling.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${cormorant.variable}`}
    >
      <body className="bg-black text-stone-100 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
