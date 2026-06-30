"use client";

import { useEffect, useRef, useState } from "react";
import type { Progress } from "./StenwgeCodex";

/**
 * Generative ambient pad driven by scroll progress.
 *
 * Architecture:
 *   - 4-voice triad pad (warm sawtooth → gentle lowpass)
 *   - very long attack/release per voice (no hum-of-dead-air)
 *   - per-voice slight detune for natural chorus
 *   - a stereo delay net for a soft, reverby tail
 *   - chapter-driven chord progression (Am9 → C/G → F69 → G/B → Em9 → Cmaj9 → Am7 → Csus2)
 *
 * No noise, no sub-bass. Should feel like a gentle exhale, not a haunted house.
 */

// Frequencies in Hz for the chord per chapter. 4 voices each.
// Picked so progression breathes through relative minor → major with no half-step clashes.
const CHORDS: number[][] = [
  // ch0 — Am9 (low, sparse): A2 E3 G3 B3
  [110.0, 164.81, 196.0, 246.94],
  // ch1 — C/G:  G2 C3 E3 G3
  [98.0, 130.81, 164.81, 196.0],
  // ch2 — F6:  F2 A2 C3 D3
  [87.31, 110.0, 130.81, 146.83],
  // ch3 — G/B:  B2 D3 G3 B3
  [123.47, 146.83, 196.0, 246.94],
  // ch4 — Em9: E2 G2 B2 D3
  [82.41, 98.0, 123.47, 146.83],
  // ch5 — Cmaj9: C3 E3 G3 D4
  [130.81, 164.81, 196.0, 293.66],
  // ch6 — Am7:  A2 C3 E3 G3
  [110.0, 130.81, 164.81, 196.0],
  // ch7 — Csus2: C3 D3 G3 C4
  [130.81, 146.83, 196.0, 261.63],
];

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
  const masterRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const voices = useRef<{ osc: OscillatorNode; gain: GainNode; detune: number }[]>([]);

  const start = async () => {
    if (armed) return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      await ctx.resume();
      ctxRef.current = ctx;

      // master with soft fade-in
      const master = ctx.createGain();
      master.gain.value = 0.0;
      master.connect(ctx.destination);
      masterRef.current = master;

      // gentle lowpass to soften the saws
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.4;
      filter.connect(master);
      filterRef.current = filter;

      // a single feedback delay = simple "reverb" tail
      const delayL = ctx.createDelay(2.0);
      const delayR = ctx.createDelay(2.0);
      delayL.delayTime.value = 0.37;
      delayR.delayTime.value = 0.51;
      const fb = ctx.createGain();
      fb.gain.value = 0.45;
      const wet = ctx.createGain();
      wet.gain.value = 0.42;
      const merger = ctx.createChannelMerger(2);
      delayL.connect(merger, 0, 0);
      delayR.connect(merger, 0, 1);
      merger.connect(wet).connect(filter);
      delayL.connect(fb).connect(delayR);
      delayR.connect(fb).connect(delayL);

      // mix bus before filter, sends to dry + wet
      const mix = ctx.createGain();
      mix.gain.value = 0.6;
      mix.connect(filter);
      mix.connect(delayL);
      mix.connect(delayR);

      // 4 voices, sawtooth softened by filter
      const detunes = [-7, 5, -3, 4]; // cents, gentle chorus
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = CHORDS[0][i];
        osc.detune.value = detunes[i];
        const g = ctx.createGain();
        g.gain.value = 0.0;
        osc.connect(g).connect(mix);
        osc.start();
        voices.current.push({ osc, gain: g, detune: detunes[i] });
      }

      // very slow master fade-in (no harsh entry)
      master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 4.0);

      setArmed(true);
      onReady();
    } catch (e) {
      console.warn("Audio failed to start:", e);
    }
  };

  // animate voice freqs (chord lerp), filter cutoff, gentle level swell per voice
  useEffect(() => {
    if (!armed || !ctxRef.current || !filterRef.current) return;
    const ctx = ctxRef.current;
    const t = progress.chapter + progress.local;
    const i = Math.max(0, Math.min(7, Math.floor(t)));
    const j = Math.min(7, i + 1);
    const local = t - i;
    const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

    // chord crossfade — very slow setTargetAtTime so chord changes glide
    const tc = 1.2; // time constant in seconds
    for (let v = 0; v < 4; v++) {
      const f = lerp(CHORDS[i][v], CHORDS[j][v], local);
      voices.current[v].osc.frequency.setTargetAtTime(f, ctx.currentTime, tc);
    }

    // voice levels — slightly per-chapter so it breathes
    // top voice opens later (chapters 4+) for the "sea" sparkle
    const levels = [
      [0.08, 0.07, 0.05, 0.02], // ch0 dim
      [0.09, 0.08, 0.07, 0.03], // ch1
      [0.09, 0.09, 0.08, 0.04], // ch2
      [0.10, 0.10, 0.09, 0.05], // ch3 boot
      [0.10, 0.10, 0.09, 0.07], // ch4 sinking
      [0.09, 0.10, 0.10, 0.10], // ch5 sea
      [0.08, 0.09, 0.10, 0.10], // ch6 bird
      [0.07, 0.08, 0.09, 0.10], // ch7 code
    ];
    for (let v = 0; v < 4; v++) {
      const a = levels[i][v];
      const b = levels[j][v];
      const target = lerp(a, b, local);
      voices.current[v].gain.gain.setTargetAtTime(target, ctx.currentTime, 1.5);
    }

    // filter sweeps gently brighter as story progresses
    const cutoff = 600 + Math.min(1, t / 7) * 1600;
    filterRef.current.frequency.setTargetAtTime(cutoff, ctx.currentTime, 1.2);
  }, [armed, progress.chapter, progress.local]);

  // soften out when user navigates away (best-effort)
  useEffect(() => {
    const onHide = () => {
      const ctx = ctxRef.current;
      const m = masterRef.current;
      if (!ctx || !m) return;
      if (document.hidden) m.gain.setTargetAtTime(0.0, ctx.currentTime, 0.4);
      else m.gain.setTargetAtTime(0.18, ctx.currentTime, 0.6);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [armed]);

  if (!armed) {
    return (
      <button
        onClick={start}
        className="fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-[11px] font-mono bg-stone-900/60 backdrop-blur border border-stone-700 text-stone-200 hover:bg-stone-800/80 transition pointer-events-auto"
        aria-label="Start ambient audio"
      >
        ◎ listen
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        const ctx = ctxRef.current;
        const m = masterRef.current;
        if (!ctx || !m) return;
        // toggle mute
        const isMuted = (m as any)._muted as boolean | undefined;
        if (isMuted) {
          m.gain.setTargetAtTime(0.18, ctx.currentTime, 0.5);
          (m as any)._muted = false;
        } else {
          m.gain.setTargetAtTime(0.0, ctx.currentTime, 0.5);
          (m as any)._muted = true;
        }
      }}
      className="fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-[11px] font-mono bg-stone-900/40 backdrop-blur border border-stone-800 text-stone-400 hover:text-stone-200 transition pointer-events-auto"
      aria-label="Toggle ambient audio"
    >
      ◎ listening
    </button>
  );
}
