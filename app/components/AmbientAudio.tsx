"use client";

import { useEffect, useRef, useState } from "react";
import type { Progress } from "./StenwgeCodex";

/**
 * Generative ambient audio driven by scroll progress.
 * Two voices: a slow bass drone and a higher choir of sine partials.
 * The "phase" determines which partials are active and the filter cutoff.
 * Requires a user gesture (autoplay restrictions) — we render a small button.
 */
export default function AmbientAudio({
  ready,
  onReady,
  progress,
}: {
  ready: boolean;
  onReady: () => void;
  progress: Progress;
}) {
  const [armed, setArmed] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const partials = useRef<{ osc: OscillatorNode; gain: GainNode; base: number }[]>([]);

  const start = async () => {
    if (armed) return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      await ctx.resume();
      ctxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.0;
      master.connect(ctx.destination);
      masterRef.current = master;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
      filter.Q.value = 0.5;
      filter.connect(master);
      filterRef.current = filter;

      // bass drone
      const baseFreqs = [55, 82.4, 110, 164.8, 220, 329.6, 440];
      for (const f of baseFreqs) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.005);
        const g = ctx.createGain();
        g.gain.value = 0;
        osc.connect(g).connect(filter);
        osc.start();
        partials.current.push({ osc, gain: g, base: f });
      }

      // a subtle noise layer (brine)
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.2;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.012;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1200;
      noiseFilter.Q.value = 0.5;
      noise.connect(noiseFilter).connect(noiseGain).connect(master);
      noise.start();

      // fade in master
      master.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 1.5);

      setArmed(true);
      onReady();
    } catch (e) {
      console.warn("Audio failed to start:", e);
    }
  };

  // animate filter + partials based on chapter
  useEffect(() => {
    if (!armed || !ctxRef.current || !filterRef.current) return;
    const ctx = ctxRef.current;
    const t = progress.chapter + progress.local;

    // filter cutoff sweeps with chapter
    const cutoff = 200 + Math.min(1, t / 7) * 1800 + (t > 6 ? 1500 : 0);
    filterRef.current.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.4);

    // Each partial's gain is keyed to a chapter band — chord-of-the-scene
    const profiles: number[][] = [
      // 55, 82, 110, 164, 220, 329, 440
      [0.06, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], // ch0 void
      [0.05, 0.04, 0.0, 0.0, 0.0, 0.0, 0.0], // ch1 cookie
      [0.05, 0.04, 0.04, 0.0, 0.02, 0.0, 0.0], // ch2 cat
      [0.04, 0.05, 0.05, 0.05, 0.04, 0.02, 0.0], // ch3 boot moon
      [0.06, 0.05, 0.05, 0.04, 0.03, 0.0, 0.0], // ch4 sinking
      [0.05, 0.05, 0.06, 0.05, 0.05, 0.04, 0.0], // ch5 salt sea
      [0.04, 0.04, 0.05, 0.06, 0.06, 0.05, 0.03], // ch6 bird
      [0.04, 0.05, 0.05, 0.04, 0.05, 0.06, 0.05], // ch7 code
    ];
    const i = Math.min(7, Math.max(0, Math.floor(t)));
    const j = Math.min(7, i + 1);
    const a = profiles[i];
    const b = profiles[j];
    const local = t - i;
    partials.current.forEach((p, idx) => {
      const target = a[idx] * (1 - local) + b[idx] * local;
      p.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.3);
    });
  }, [armed, progress.chapter, progress.local]);

  if (!armed) {
    return (
      <button
        onClick={start}
        className="fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-[11px] font-mono bg-stone-900/60 backdrop-blur border border-stone-700 text-stone-200 hover:bg-stone-800/80 transition pointer-events-auto"
        aria-label="Start ambient audio"
      >
        🔊 listen
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-[11px] font-mono bg-stone-900/40 backdrop-blur border border-stone-800 text-stone-400 pointer-events-none">
      ◎ listening
    </div>
  );
}
