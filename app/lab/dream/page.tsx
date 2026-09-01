"use client";

import { useEffect, useRef, useState } from "react";

type Log = { at: number; kind: "open" | "token" | "done" | "err"; text: string };

export default function DreamLab() {
  const [seed, setSeed] = useState<string>(() => String(Date.now()));
  const [running, setRunning] = useState(false);
  const [text, setText] = useState<string>("");
  const [logs, setLogs] = useState<Log[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-dream") === -1) {
        arr.push("lab-dream");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}
  }, []);

  const start = () => {
    if (esRef.current) esRef.current.close();
    setText("");
    setLogs([]);
    setRunning(true);
    const t0 = performance.now();
    const url = `/api/dream?stream=1&seed=${encodeURIComponent(seed)}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.addEventListener("open", (ev: any) => {
      setLogs((l) => l.concat({ at: performance.now() - t0, kind: "open", text: ev.data ?? "" }));
    });
    es.addEventListener("token", (ev: any) => {
      const w = JSON.parse(ev.data) as string;
      setText((t) => t + w);
      setLogs((l) => l.concat({ at: performance.now() - t0, kind: "token", text: JSON.stringify(w) }));
    });
    es.addEventListener("done", (ev: any) => {
      setLogs((l) => l.concat({ at: performance.now() - t0, kind: "done", text: ev.data ?? "" }));
      setRunning(false);
      es.close();
      esRef.current = null;
    });
    es.onerror = () => {
      setLogs((l) => l.concat({ at: performance.now() - t0, kind: "err", text: "connection closed" }));
      setRunning(false);
      es.close();
      esRef.current = null;
    };
  };

  const stop = () => {
    esRef.current?.close();
    esRef.current = null;
    setRunning(false);
  };

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 06
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          streaming dreams over server-sent events
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          <code className="text-stone-200">GET /api/dream?stream=1</code>{" "}
          returns a <code>text/event-stream</code> and emits{" "}
          <code>open</code>, <code>token</code>, and <code>done</code> events
          with a 90ms cadence. Below, the browser consumes them via{" "}
          <code>EventSource</code>. This is the same pattern LLM APIs use to
          stream tokens.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          className="flex-1 max-w-xs bg-stone-950 border border-stone-800 rounded px-3 py-1.5 font-mono text-[12px] text-stone-100 outline-none focus:border-amber-200/50"
          placeholder="seed"
        />
        <button
          onClick={running ? stop : start}
          className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
        >
          {running ? "stop" : "dream"}
        </button>
        <button
          onClick={() => setSeed(String(Date.now()))}
          className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 text-[11px] font-mono hover:border-stone-500"
        >
          new seed
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
            the dream
          </div>
          <div
            className="min-h-40 rounded-md border border-stone-800 bg-stone-950 p-6 font-serif text-2xl text-stone-100 leading-[1.5]"
            style={{
              textShadow: "0 0 24px rgba(244,220,163,0.08)",
            }}
          >
            {text}
            {running && <span className="inline-block w-2 h-6 bg-amber-200 ml-1 animate-pulse align-middle" />}
          </div>
        </div>

        <div className="lg:w-80">
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-stone-500">
            events
          </div>
          <div className="rounded-md border border-stone-800 bg-stone-950 max-h-96 overflow-y-auto p-3 font-mono text-[10px] leading-[1.6]">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-stone-600 tabular-nums w-14">
                  {l.at.toFixed(0)}ms
                </span>
                <span
                  className={
                    l.kind === "open"
                      ? "text-sky-300"
                      : l.kind === "token"
                        ? "text-emerald-200"
                        : l.kind === "done"
                          ? "text-amber-200"
                          : "text-rose-300"
                  }
                >
                  {l.kind.padEnd(5, " ")}
                </span>
                <span className="text-stone-400 break-all">{l.text}</span>
              </div>
            ))}
            {!logs.length && (
              <span className="text-stone-600">no events yet — press dream</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
