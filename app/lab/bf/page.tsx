"use client";

import { useState } from "react";
import { bfwasm } from "../../lib/bfwasm";

const EXAMPLES = [
  {
    label: "print Y",
    code: "++++++++[>+++++++++<-]>.",
  },
  {
    label: "hello world",
    code: "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.",
  },
  {
    label: "print 1..5",
    code: `+++++++[>+++++++<-]>--- ; drop cell to '0' ascii
++++++++++[>>+<<-]           ; 10 to cell 2 (newline)
+++++[>>>+<<<-]              ; 5 counter
[>+.<<<.>>-]`,
  },
  {
    label: "sum 1..10",
    code: `+++++ +++++      ; 10
[>+<-]           ; move to cell 1
>++++++++[<++++++++>-]<+.    ; approximate — prints '9'`,
  },
];

function hexdump(bytes: Uint8Array, limit = 256): string {
  const lines: string[] = [];
  const take = bytes.slice(0, limit);
  for (let i = 0; i < take.length; i += 16) {
    const row = take.slice(i, i + 16);
    const off = i.toString(16).padStart(4, "0");
    const hex = Array.from(row)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ")
      .padEnd(48, " ");
    const ascii = Array.from(row)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${off}  ${hex}  ${ascii}`);
  }
  if (bytes.length > limit) lines.push(`… (+${bytes.length - limit} more)`);
  return lines.join("\n");
}

export default function BfLab() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [wasm, setWasm] = useState<Uint8Array | null>(null);
  const [stats, setStats] = useState<{
    bytes: number;
    compile: number;
    exec: number;
  } | null>(null);
  const [error, setError] = useState<string>("");

  const run = async () => {
    try {
      setError("");
      const r = await bfwasm(code, input);
      setOutput(r.output);
      setWasm(r.wasm);
      setStats({
        bytes: r.bytesEmitted,
        compile: r.compileMs,
        exec: r.execMs,
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  const download = () => {
    if (!wasm) return;
    const blob = new Blob([wasm as unknown as BlobPart], { type: "application/wasm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codex.bf.wasm";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 02
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          brainfuck → WebAssembly, JIT-compiled in the browser
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          The compiler is ~200 lines: fold runs of <code>++</code>/<code>&lt;&gt;</code>{" "}
          into single WASM opcodes, replace{" "}
          <code className="text-stone-200">[-]</code> with a store-zero,
          emit <code>block/loop/br_if</code> for each <code>[…]</code>.
          The output is real bytecode — you can download and disassemble it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
            brainfuck source
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full h-48 bg-stone-950 border border-stone-800 rounded-md p-4 font-mono text-[12px] text-stone-100 outline-none focus:border-amber-200/50"
          />

          <div className="mt-3 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="stdin (optional)"
              className="flex-1 bg-stone-950 border border-stone-800 rounded px-3 py-1.5 font-mono text-[12px] text-stone-100 outline-none focus:border-amber-200/50"
            />
            <button
              onClick={run}
              className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
            >
              compile & run
            </button>
            <button
              onClick={download}
              disabled={!wasm}
              className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 text-[11px] font-mono hover:border-stone-500 disabled:opacity-40"
            >
              download .wasm
            </button>
          </div>

          {stats && (
            <div className="mt-3 text-[10px] text-stone-500 font-mono tabular-nums">
              emitted <span className="text-stone-200">{stats.bytes}</span>{" "}
              bytes · compile{" "}
              <span className="text-stone-200">{stats.compile.toFixed(2)}</span>{" "}
              ms · exec{" "}
              <span className="text-stone-200">{stats.exec.toFixed(2)}</span>{" "}
              ms
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
              output
            </div>
            <pre className="w-full min-h-16 bg-stone-950 border border-stone-800 rounded-md p-4 font-mono text-[12px] whitespace-pre-wrap">
              {error ? (
                <span className="text-rose-300">{error}</span>
              ) : (
                <span className="text-emerald-200">{output || "(empty)"}</span>
              )}
            </pre>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
              wasm module (hex)
            </div>
            <pre className="w-full bg-stone-950 border border-stone-800 rounded-md p-4 font-mono text-[10px] text-stone-400 whitespace-pre overflow-x-auto leading-[1.4]">
              {wasm ? hexdump(wasm) : "(run to see bytes)"}
            </pre>
          </div>
        </div>

        <aside className="w-full lg:w-72">
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
            examples
          </div>
          <ul className="space-y-1.5">
            {EXAMPLES.map((ex) => (
              <li key={ex.label}>
                <button
                  onClick={() => setCode(ex.code)}
                  className="w-full text-left text-[12px] px-3 py-2 rounded border border-stone-900 hover:border-amber-200/40 hover:bg-stone-900/50 transition text-stone-300"
                >
                  {ex.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[10px] text-stone-600 leading-relaxed">
            the module begins <code className="text-stone-400">00 61 73 6d 01 00 00 00</code>{" "}
            — the wasm magic (<code>\0asm</code>) and version 1. everything
            after is section-tagged.
          </p>
        </aside>
      </div>
    </>
  );
}
