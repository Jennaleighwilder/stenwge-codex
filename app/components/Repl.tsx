"use client";

import { useEffect, useRef, useState } from "react";
import { lispEvalStrict } from "../lib/lisp";
import { bfwasm } from "../lib/bfwasm";
import { Achievements } from "./Achievements";

/**
 * A terminal overlay. Press backtick (`) to toggle.
 *
 *   :help                  show this
 *   :lisp <expr>           evaluate Lisp
 *   :js   <expr>           evaluate a JS expression (Function())
 *   :bf   <program>        run brainfuck through the WASM JIT
 *   :curl <url>            fetch a URL and dump the body
 *   :cat  /path            same as :curl, relative to the site
 *   :clear                 clear screen
 *   :codex                 codex.help() equivalent
 *
 * Default (no prefix) is treated as Lisp. History with ↑/↓, tab completion
 * for :commands.
 */

const COMMANDS = [":help", ":lisp", ":js", ":bf", ":curl", ":cat", ":clear", ":codex"];

const HISTORY_KEY = "fcri:repl-history";

type Line = { kind: "in" | "out" | "err" | "sys"; text: string };

const HELP = [
  "the forgotten code research institute — repl",
  "",
  "  :lisp (define (fac n) (if (<= n 1) 1 (* n (fac (- n 1)))))",
  "  :lisp (fac 10)                          ; → 3628800",
  "  :bf   ++++++++[>+++++++++<-]>.          ; → Y   (real WASM JIT)",
  "  :js   Math.hypot(3, 4)                  ; → 5",
  "  :curl /api/dream",
  "  :cat  /api/codex",
  "",
  "history: ↑ / ↓          tab: complete a :command",
  "close: ` or esc",
].join("\n");

export default function Repl() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { kind: "sys", text: HELP },
  ]);
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // toggle with backtick / esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (/textarea|select/i.test(tag)) return;
      if (e.key === "`") {
        e.preventDefault();
        setOpen((v) => !v);
        Achievements.unlock("repl-open" as any);
        return;
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // auto-scroll on new output
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  const write = (l: Line | Line[]) => {
    setLines((prev) => prev.concat(Array.isArray(l) ? l : [l]));
  };

  const runCommand = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    // history
    const newHist = [...history.filter((h) => h !== cmd), cmd].slice(-100);
    setHistory(newHist);
    setHistIdx(-1);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
    } catch {}

    write({ kind: "in", text: cmd });

    // parse prefix
    let mode: "lisp" | "js" | "bf" | "curl" | "help" | "clear" | "codex" = "lisp";
    let body = cmd;
    if (cmd.startsWith(":help")) mode = "help";
    else if (cmd === ":clear") mode = "clear";
    else if (cmd.startsWith(":lisp ")) { mode = "lisp"; body = cmd.slice(6); }
    else if (cmd.startsWith(":js ")) { mode = "js"; body = cmd.slice(4); }
    else if (cmd.startsWith(":bf ")) { mode = "bf"; body = cmd.slice(4); }
    else if (cmd.startsWith(":curl ")) { mode = "curl"; body = cmd.slice(6); }
    else if (cmd.startsWith(":cat ")) { mode = "curl"; body = cmd.slice(5); }
    else if (cmd === ":codex") mode = "codex";

    try {
      switch (mode) {
        case "help":
          write({ kind: "sys", text: HELP });
          break;
        case "clear":
          setLines([]);
          break;
        case "lisp": {
          const r = lispEvalStrict(body);
          if (r.log) write({ kind: "out", text: r.log.replace(/\n$/, "") });
          if (r.ok) {
            write({ kind: "out", text: r.value });
            Achievements.unlock("repl-lisp" as any);
          } else {
            write({ kind: "err", text: r.error ?? "error" });
          }
          break;
        }
        case "js": {
          // eslint-disable-next-line no-new-func
          const f = new Function("return (" + body + ")");
          const v = f();
          const str =
            typeof v === "string"
              ? v
              : v === undefined
                ? "undefined"
                : JSON.stringify(v, null, 2);
          write({ kind: "out", text: String(str) });
          Achievements.unlock("repl-js" as any);
          break;
        }
        case "bf": {
          const t0 = performance.now();
          const r = await bfwasm(body);
          const t1 = performance.now();
          const out = r.output.replace(/\r?\n?$/, "");
          write({ kind: "out", text: out || "(no output)" });
          write({
            kind: "sys",
            text: `[wasm: ${r.bytesEmitted} bytes emitted, compile ${r.compileMs.toFixed(1)}ms, exec ${r.execMs.toFixed(1)}ms, total ${(t1 - t0).toFixed(1)}ms]`,
          });
          Achievements.unlock("repl-bf" as any);
          break;
        }
        case "curl": {
          const url = body.trim();
          const res = await fetch(url);
          const ct = res.headers.get("content-type") ?? "";
          const label = `${res.status} ${res.statusText} · ${ct}`;
          write({ kind: "sys", text: label });
          if (ct.includes("application/json")) {
            const j = await res.json();
            write({ kind: "out", text: JSON.stringify(j, null, 2) });
          } else {
            const t = await res.text();
            write({ kind: "out", text: t });
          }
          Achievements.unlock("repl-curl" as any);
          break;
        }
        case "codex": {
          (window as any).codex?.help?.();
          write({
            kind: "sys",
            text: "codex.help() dispatched. see the console.",
          });
          break;
        }
      }
    } catch (e: any) {
      write({ kind: "err", text: e?.message ?? String(e) });
    }
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(input);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!history.length || histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (input.startsWith(":")) {
        const match = COMMANDS.find((c) => c.startsWith(input));
        if (match) setInput(match + " ");
      }
      return;
    }
    if (e.key === "`") {
      // swallow the ` so it doesn't close inside input
      // (toggle is only handled on window keydown, but ` here would enter '`')
      // If we want ` to close from inside, uncomment next line:
      // e.preventDefault(); setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] pointer-events-auto"
      style={{
        height: "min(60vh, 520px)",
      }}
    >
      <div className="h-full mx-auto max-w-4xl bg-stone-950/97 backdrop-blur-sm border-b border-x border-amber-200/25 shadow-2xl flex flex-col rounded-b-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-amber-200/80 font-mono border-b border-stone-800">
          <span className="text-amber-200">●</span>
          <span>codex · repl</span>
          <span className="text-stone-600 ml-auto">` to close · :help</span>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-[1.5] whitespace-pre-wrap"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((l, i) => (
            <div
              key={i}
              className={
                l.kind === "in"
                  ? "text-stone-100"
                  : l.kind === "err"
                    ? "text-rose-300"
                    : l.kind === "sys"
                      ? "text-stone-500"
                      : "text-emerald-200"
              }
            >
              {l.kind === "in" ? "› " : l.kind === "err" ? "! " : "  "}
              {l.text}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-t border-stone-800">
          <span className="text-amber-200/80 font-mono text-[12px]">›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none font-mono text-[12px] text-stone-100 placeholder:text-stone-600"
            placeholder=":help    ↑ ↓ history    tab: complete"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
