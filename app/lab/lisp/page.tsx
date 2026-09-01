"use client";

import { useState } from "react";
import { lispEvalStrict } from "../../lib/lisp";

const EXAMPLES = [
  {
    label: "factorial",
    code: `(define (fac n)
  (if (<= n 1) 1
      (* n (fac (- n 1)))))
(fac 10)`,
  },
  {
    label: "fibonacci (closure + counter)",
    code: `(define (make-fib)
  (let ((a 0) (b 1))
    (lambda ()
      (let ((r a))
        (set! a b)
        (set! b (+ r b))
        r))))
(define f (make-fib))
(list (f) (f) (f) (f) (f) (f) (f) (f) (f) (f))`,
  },
  {
    label: "map + higher-order",
    code: `(define (double x) (* x 2))
(map double '(1 2 3 4 5))`,
  },
  {
    label: "filter + fold",
    code: `(define (even? n) (= (mod n 2) 0))
(fold + 0 (filter even? '(1 2 3 4 5 6 7 8 9 10)))`,
  },
  {
    label: "y-combinator-lite (letrec)",
    code: `(letrec ((sum (lambda (n)
                (if (= n 0) 0
                    (+ n (sum (- n 1)))))))
  (sum 100))`,
  },
  {
    label: "codex world",
    code: `(display "the mouse: ")
(display (mouse))
(newline)
(display "the cat:   ")
(display (cat))
(newline)
(if (car (cdr (car (mouse))))
    "lactose intolerant, as specified."
    "the tale changed under your feet.")`,
  },
];

export default function LispLab() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [value, setValue] = useState<string>("");
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [ms, setMs] = useState<number>(0);

  const run = (fresh = false) => {
    const t0 = performance.now();
    const r = lispEvalStrict(code, { fresh });
    const t1 = performance.now();
    setMs(t1 - t0);
    setLog(r.log);
    if (r.ok) {
      setValue(r.value);
      setError("");
    } else {
      setValue("");
      setError(r.error ?? "error");
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 01
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          on the smallest useful lisp
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          A ~600-line Lisp interpreter running in your browser tab. Special
          forms: <code>define</code>, <code>lambda</code>, <code>if</code>,{" "}
          <code>cond</code>, <code>let</code>, <code>let*</code>,{" "}
          <code>letrec</code>, <code>set!</code>, <code>quote</code>,{" "}
          <code>and</code>, <code>or</code>. Numbers, strings, symbols, pairs.
          Closures. First-class functions. <code>map</code>,{" "}
          <code>filter</code>, <code>fold</code>, <code>apply</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
            source
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full h-72 bg-stone-950 border border-stone-800 rounded-md p-4 font-mono text-[12px] text-stone-100 outline-none focus:border-amber-200/50 whitespace-pre"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => run(false)}
              className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
            >
              evaluate
            </button>
            <button
              onClick={() => run(true)}
              className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 text-[11px] font-mono hover:border-stone-500"
              title="reset the environment before running"
            >
              fresh env · evaluate
            </button>
            <span className="ml-auto text-[10px] text-stone-500 tabular-nums">
              {ms > 0 && `${ms.toFixed(2)} ms`}
            </span>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
              result
            </div>
            <pre className="w-full min-h-24 bg-stone-950 border border-stone-800 rounded-md p-4 font-mono text-[12px] whitespace-pre-wrap">
              {error ? (
                <span className="text-rose-300">{"! " + error}</span>
              ) : (
                <>
                  {log && (
                    <span className="text-stone-400">
                      {log.replace(/\n$/, "") + "\n"}
                    </span>
                  )}
                  <span className="text-emerald-200">{value}</span>
                </>
              )}
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
            state persists between runs unless you use{" "}
            <span className="text-stone-400">fresh env</span>. all evaluation
            happens on this page — you can turn off wifi and it still works.
          </p>
        </aside>
      </div>
    </>
  );
}
