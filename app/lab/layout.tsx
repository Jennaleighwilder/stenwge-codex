import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "the research wing · fcri",
};

export default function LabLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-stone-200 font-mono">
      <header className="border-b border-stone-800/70 sticky top-0 z-40 bg-black/85 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between text-[11px]">
          <Link
            href="/lab"
            className="text-amber-200 hover:text-amber-100 tracking-[0.3em] uppercase"
          >
            fcri / research
          </Link>
          <nav className="flex items-center gap-4 text-stone-500">
            <Link href="/lab/lisp" className="hover:text-stone-100">lisp</Link>
            <Link href="/lab/bf" className="hover:text-stone-100">bf→wasm</Link>
            <Link href="/lab/raft" className="hover:text-stone-100">raft</Link>
            <Link href="/lab/gray-scott" className="hover:text-stone-100">gray-scott</Link>
            <Link href="/lab/merkle" className="hover:text-stone-100">merkle</Link>
            <Link href="/lab/dream" className="hover:text-stone-100">dream</Link>
            <Link href="/" className="text-stone-400 hover:text-stone-100 border-l border-stone-800 pl-4">← codex</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      <footer className="border-t border-stone-900 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-[10px] text-stone-600 flex justify-between">
          <span>the forgotten code research institute</span>
          <span>everything on this page runs in your browser.</span>
        </div>
      </footer>
    </div>
  );
}
