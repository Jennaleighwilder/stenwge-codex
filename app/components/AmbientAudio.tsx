"use client";

import { useEffect, useRef, useState } from "react";
import type { Progress } from "./StenwgeCodex";
import { AudioState } from "./AudioState";

/**
 * Plays the master mix of the user's song through a Web Audio graph with an
 * AnalyserNode, and continuously publishes RMS / low / high energy to a
 * shared AudioState that the WebGL scenes read from. The song loops.
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
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const fftRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const start = async () => {
    if (armed) return;
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      await ctx.resume();
      ctxRef.current = ctx;

      const audio = new Audio("/audio/song.m4a");
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 1.0;
      audioRef.current = audio;

      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.78;
      analyserRef.current = analyser;
      fftRef.current = new Uint8Array(
        new ArrayBuffer(analyser.frequencyBinCount),
      );
      timeRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));

      const master = ctx.createGain();
      master.gain.value = 0.0;
      masterRef.current = master;

      src.connect(analyser);
      analyser.connect(master);
      master.connect(ctx.destination);

      // gentle fade-in
      master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 1.4);

      await audio.play();
      AudioState.playing = true;
      setArmed(true);
      onReady();

      // start analysis loop
      const loop = () => {
        const a = analyserRef.current;
        const fft = fftRef.current;
        const td = timeRef.current;
        if (!a || !fft || !td) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        a.getByteFrequencyData(fft);
        a.getByteTimeDomainData(td);

        // RMS broadband (time-domain)
        let sum = 0;
        for (let i = 0; i < td.length; i++) {
          const v = (td[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / td.length);

        // low band: 0..6 bins (~ <250 Hz at 44.1k sample rate, fft 1024)
        // high band: bins 80..200 (~ 3.4k..8.6k)
        let lo = 0;
        const loEnd = 8;
        for (let i = 0; i < loEnd; i++) lo += fft[i];
        lo = lo / (loEnd * 255);
        let hi = 0;
        const hiStart = 80;
        const hiEnd = Math.min(200, fft.length);
        for (let i = hiStart; i < hiEnd; i++) hi += fft[i];
        hi = hi / ((hiEnd - hiStart) * 255);

        // smoothed publish — light EMA
        AudioState.level += (Math.min(1, rms * 3.0) - AudioState.level) * 0.25;
        AudioState.lows += (Math.min(1, lo * 1.6) - AudioState.lows) * 0.35;
        AudioState.highs += (Math.min(1, hi * 2.2) - AudioState.highs) * 0.2;

        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      console.warn("Audio failed to start:", e);
    }
  };

  const toggleMute = () => {
    const ctx = ctxRef.current;
    const m = masterRef.current;
    if (!ctx || !m) return;
    const next = !muted;
    setMuted(next);
    m.gain.setTargetAtTime(next ? 0 : 0.85, ctx.currentTime, 0.4);
  };

  // pause/resume on tab visibility
  useEffect(() => {
    const onVis = () => {
      if (!armed || !audioRef.current) return;
      if (document.hidden) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [armed]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
      ctxRef.current?.close().catch(() => {});
      AudioState.playing = false;
    },
    [],
  );

  if (!armed) {
    return (
      <button
        onClick={start}
        className="fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-[11px] font-mono bg-stone-900/60 backdrop-blur border border-stone-700 text-stone-200 hover:bg-stone-800/80 transition pointer-events-auto"
        aria-label="Play the song"
      >
        ▷ play the song
      </button>
    );
  }

  return (
    <button
      onClick={toggleMute}
      className="fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-[11px] font-mono bg-stone-900/40 backdrop-blur border border-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-800/70 transition pointer-events-auto"
      aria-label={muted ? "Unmute song" : "Mute song"}
    >
      {muted ? "▶ unmute" : "❚❚ mute"}
    </button>
  );
}
