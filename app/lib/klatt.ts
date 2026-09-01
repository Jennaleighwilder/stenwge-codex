/**
 * A very small Klatt-style formant synthesizer for the browser.
 *
 * This is NOT a modern neural TTS. It's a hand-rolled 1970s cascade of:
 *   - an impulse/glottal source at F0 (with noise for fricatives)
 *   - 4 biquad bandpass resonators tuned to F1..F4
 *   - a nasal filter for /m/, /n/
 *
 * We approximate 30 English phonemes with hard-coded formant targets.
 * The word-to-phoneme pass is a simple deterministic mapper — no ML — so
 * it mis-pronounces things routinely, which is part of the DECtalk charm.
 *
 * Speech is synthesized OFFLINE into an AudioBuffer, then played through
 * the given AudioContext. Latency: ~200ms for a 3-second utterance.
 */

// ── phoneme table: formant frequencies (Hz), bandwidths (Hz), voiced, dur ─
type PhonemeSpec = {
  f: [number, number, number, number];      // F1..F4
  bw: [number, number, number, number];     // BW1..BW4
  voiced: boolean;
  dur: number;                              // ms
  amp: number;                              // 0..1
  nasal?: boolean;
  fric?: number;                            // fricative noise amount 0..1
};

const PHONEMES: Record<string, PhonemeSpec> = {
  // vowels
  "aa": { f: [730, 1090, 2440, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 180, amp: 0.9 }, // father
  "ae": { f: [660, 1720, 2410, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 180, amp: 0.9 }, // cat
  "ah": { f: [520, 1190, 2390, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 150, amp: 0.9 }, // but
  "ao": { f: [570, 840, 2410, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 200, amp: 0.9 }, // dog
  "eh": { f: [530, 1840, 2480, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 160, amp: 0.9 }, // bed
  "ee": { f: [270, 2290, 3010, 3700], bw: [40, 80, 100, 150], voiced: true, dur: 180, amp: 0.85 }, // see
  "ih": { f: [390, 1990, 2550, 3500], bw: [50, 90, 120, 150], voiced: true, dur: 130, amp: 0.85 }, // sit
  "oh": { f: [450, 800, 2830, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 190, amp: 0.9 }, // no
  "uh": { f: [440, 1020, 2240, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 140, amp: 0.85 }, // good
  "uw": { f: [300, 870, 2240, 3500], bw: [50, 90, 120, 150], voiced: true, dur: 180, amp: 0.85 }, // you
  "er": { f: [490, 1350, 1690, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 200, amp: 0.85 }, // bird
  // consonants (very approximate; nasals + fricatives)
  "m": { f: [280, 900, 2200, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 90, amp: 0.6, nasal: true },
  "n": { f: [280, 1700, 2600, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 90, amp: 0.6, nasal: true },
  "ng": { f: [280, 2300, 2750, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 90, amp: 0.6, nasal: true },
  "l": { f: [360, 1300, 2500, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 90, amp: 0.7 },
  "r": { f: [310, 1060, 1380, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 90, amp: 0.7 },
  "w": { f: [300, 610, 2200, 3500], bw: [60, 90, 120, 150], voiced: true, dur: 80, amp: 0.7 },
  "y": { f: [270, 2290, 3010, 3700], bw: [40, 80, 100, 150], voiced: true, dur: 80, amp: 0.7 },
  "b": { f: [200, 1000, 2200, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 70, amp: 0.5 },
  "d": { f: [200, 1600, 2600, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 70, amp: 0.5 },
  "g": { f: [200, 2000, 2700, 3500], bw: [80, 90, 120, 150], voiced: true, dur: 70, amp: 0.5 },
  "p": { f: [400, 1500, 2500, 3500], bw: [150, 150, 200, 250], voiced: false, dur: 60, amp: 0.4, fric: 0.7 },
  "t": { f: [400, 2000, 3200, 3500], bw: [150, 150, 200, 250], voiced: false, dur: 60, amp: 0.4, fric: 0.9 },
  "k": { f: [400, 2000, 2500, 3500], bw: [150, 150, 200, 250], voiced: false, dur: 60, amp: 0.4, fric: 0.8 },
  "s": { f: [500, 3000, 4500, 5500], bw: [150, 150, 250, 300], voiced: false, dur: 120, amp: 0.35, fric: 1.0 },
  "z": { f: [500, 3000, 4500, 5500], bw: [150, 150, 250, 300], voiced: true, dur: 120, amp: 0.5, fric: 0.8 },
  "sh": { f: [500, 2400, 3200, 4500], bw: [150, 150, 250, 300], voiced: false, dur: 130, amp: 0.35, fric: 1.0 },
  "f": { f: [500, 1600, 2500, 3500], bw: [150, 150, 250, 300], voiced: false, dur: 100, amp: 0.3, fric: 0.9 },
  "v": { f: [500, 1600, 2500, 3500], bw: [150, 150, 250, 300], voiced: true, dur: 100, amp: 0.5, fric: 0.5 },
  "th": { f: [500, 1600, 2500, 3500], bw: [150, 150, 250, 300], voiced: false, dur: 100, amp: 0.3, fric: 0.7 },
  "h": { f: [500, 1500, 2500, 3500], bw: [150, 150, 250, 300], voiced: false, dur: 80, amp: 0.3, fric: 0.6 },
  "ch": { f: [500, 2400, 3200, 4500], bw: [150, 150, 250, 300], voiced: false, dur: 100, amp: 0.35, fric: 0.9 },
  "j": { f: [500, 2400, 3200, 4500], bw: [150, 150, 250, 300], voiced: true, dur: 100, amp: 0.5, fric: 0.5 },
  "_": { f: [500, 1500, 2500, 3500], bw: [60, 90, 120, 150], voiced: false, dur: 80, amp: 0.0 }, // silence
};

// ── word → phonemes (dumb rules; DECtalk-style charm) ────────────────────
function toPhonemes(text: string): string[] {
  const out: string[] = [];
  const s = text.toLowerCase();
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    // digraphs first
    if (rest.startsWith("th")) { out.push("th"); i += 2; continue; }
    if (rest.startsWith("sh")) { out.push("sh"); i += 2; continue; }
    if (rest.startsWith("ch")) { out.push("ch"); i += 2; continue; }
    if (rest.startsWith("ng")) { out.push("ng"); i += 2; continue; }
    if (rest.startsWith("oo")) { out.push("uw"); i += 2; continue; }
    if (rest.startsWith("ee")) { out.push("ee"); i += 2; continue; }
    if (rest.startsWith("ea")) { out.push("ee"); i += 2; continue; }
    if (rest.startsWith("ai")) { out.push("ae"); i += 2; continue; }
    if (rest.startsWith("ay")) { out.push("ae"); i += 2; continue; }
    if (rest.startsWith("ou")) { out.push("aa"); i += 2; continue; }
    if (rest.startsWith("ow")) { out.push("oh"); i += 2; continue; }
    if (rest.startsWith("er")) { out.push("er"); i += 2; continue; }
    if (rest.startsWith("ir")) { out.push("er"); i += 2; continue; }
    if (rest.startsWith("ur")) { out.push("er"); i += 2; continue; }
    if (rest.startsWith("ar")) { out.push("aa"); out.push("r"); i += 2; continue; }
    if (rest.startsWith("or")) { out.push("ao"); out.push("r"); i += 2; continue; }
    if (rest.startsWith("ck")) { out.push("k"); i += 2; continue; }
    if (rest.startsWith("qu")) { out.push("k"); out.push("w"); i += 2; continue; }

    const c = s[i++];
    switch (c) {
      case "a": out.push("ae"); break;
      case "e": out.push("eh"); break;
      case "i": out.push("ih"); break;
      case "o": out.push("oh"); break;
      case "u": out.push("uh"); break;
      case "y": out.push("ee"); break;
      case "c": out.push("k"); break;
      case "x": out.push("k"); out.push("s"); break;
      case "q": out.push("k"); break;
      case "b": case "d": case "f": case "g": case "h":
      case "j": case "k": case "l": case "m": case "n":
      case "p": case "r": case "s": case "t": case "v":
      case "w": case "z":
        out.push(c);
        break;
      case " ":
      case ".":
      case ",":
      case "\n":
      case "\t":
        out.push("_"); break;
      default:
        break;
    }
  }
  return out;
}

// ── DSP: biquad bandpass by center-freq + bandwidth ───────────────────────
function bandpassCoeffs(sr: number, f: number, bw: number) {
  // simple 2-pole resonator: y[n] = x[n] + 2·r·cos(θ)·y[n-1] − r²·y[n-2]
  const theta = (2 * Math.PI * f) / sr;
  const r = Math.exp(-Math.PI * bw / sr);
  const a1 = 2 * r * Math.cos(theta);
  const a2 = -r * r;
  const gain = (1 - r) * Math.sqrt(1 - 2 * r * Math.cos(2 * theta) + r * r);
  return { a1, a2, gain };
}

/** Synthesize an AudioBuffer for the utterance. Sample rate 22050. */
export function synthesize(
  ctx: AudioContext,
  text: string,
  opts?: { f0?: number; rate?: number; jitter?: number },
): AudioBuffer {
  const sr = 22050;
  const f0 = opts?.f0 ?? 130;         // baseline pitch
  const rate = opts?.rate ?? 1.0;
  const jitter = opts?.jitter ?? 0.02;

  const phonemes = toPhonemes(text);
  const totalMs = phonemes.reduce((s, p) => s + (PHONEMES[p]?.dur ?? 80) / rate, 0);
  const totalSamples = Math.ceil((totalMs / 1000) * sr);
  const buf = ctx.createBuffer(1, totalSamples, sr);
  const out = buf.getChannelData(0);

  // resonator state
  const state = [
    { y1: 0, y2: 0 },
    { y1: 0, y2: 0 },
    { y1: 0, y2: 0 },
    { y1: 0, y2: 0 },
  ];
  let coef: ReturnType<typeof bandpassCoeffs>[] = [
    bandpassCoeffs(sr, 500, 60),
    bandpassCoeffs(sr, 1500, 90),
    bandpassCoeffs(sr, 2500, 120),
    bandpassCoeffs(sr, 3500, 150),
  ];

  let curF: [number, number, number, number] = [500, 1500, 2500, 3500];
  let curBW: [number, number, number, number] = [60, 90, 120, 150];
  let curAmp = 0;
  let curVoiced = false;
  let curNasal = false;
  let curFric = 0;

  let cursor = 0;
  let phase = 0;
  const glottal = 1.0 / f0;
  let sinceLast = 0;

  const smoothTicks = Math.floor(0.02 * sr); // 20ms formant slew

  for (const p of phonemes) {
    const spec = PHONEMES[p] ?? PHONEMES["_"];
    const dur = Math.floor(((spec.dur ?? 80) / 1000) * sr / rate);
    // targets
    const tF = spec.f;
    const tBW = spec.bw;
    const tAmp = spec.amp;
    const tVoiced = spec.voiced;
    const tNasal = !!spec.nasal;
    const tFric = spec.fric ?? 0;

    for (let n = 0; n < dur; n++) {
      // slew formants
      const alpha = Math.min(1, (n + 1) / smoothTicks);
      const F: [number, number, number, number] = [
        curF[0] + (tF[0] - curF[0]) * alpha,
        curF[1] + (tF[1] - curF[1]) * alpha,
        curF[2] + (tF[2] - curF[2]) * alpha,
        curF[3] + (tF[3] - curF[3]) * alpha,
      ];
      const BW: [number, number, number, number] = [
        curBW[0] + (tBW[0] - curBW[0]) * alpha,
        curBW[1] + (tBW[1] - curBW[1]) * alpha,
        curBW[2] + (tBW[2] - curBW[2]) * alpha,
        curBW[3] + (tBW[3] - curBW[3]) * alpha,
      ];
      const amp = curAmp + (tAmp - curAmp) * alpha;
      const voiced = alpha > 0.5 ? tVoiced : curVoiced;
      const nasal = alpha > 0.5 ? tNasal : curNasal;
      const fric = curFric + (tFric - curFric) * alpha;

      coef = [
        bandpassCoeffs(sr, F[0], BW[0]),
        bandpassCoeffs(sr, F[1], BW[1]),
        bandpassCoeffs(sr, F[2], BW[2]),
        bandpassCoeffs(sr, F[3], BW[3]),
      ];

      // source
      let src = 0;
      if (voiced) {
        sinceLast += 1 / sr;
        const period = 1 / (f0 * (1 + (Math.random() - 0.5) * jitter));
        if (sinceLast >= period) {
          sinceLast -= period;
          src = 1;  // impulse
        }
      }
      // fricative noise mixed in
      src += fric * (Math.random() * 2 - 1) * 0.3;

      // sum of resonators
      let y = 0;
      for (let k = 0; k < 4; k++) {
        const c = coef[k];
        const s = state[k];
        const newY = c.gain * src + c.a1 * s.y1 + c.a2 * s.y2;
        s.y2 = s.y1;
        s.y1 = newY;
        y += newY * (k === 0 ? 1.0 : k === 1 ? 0.85 : k === 2 ? 0.7 : 0.5);
      }
      if (nasal) y *= 0.65;
      // simple soft clip
      y = Math.tanh(y * 3.0) * amp * 0.9;

      if (cursor < totalSamples) out[cursor++] = y;
    }

    curF = tF;
    curBW = tBW;
    curAmp = tAmp;
    curVoiced = tVoiced;
    curNasal = tNasal;
    curFric = tFric;
  }

  return buf;
}

/** Fire-and-forget: synthesize + play. Returns the underlying source node. */
export async function speak(
  text: string,
  opts?: { f0?: number; rate?: number },
): Promise<AudioBufferSourceNode> {
  const AC = (window.AudioContext ||
    (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx: AudioContext =
    ((window as any).__codexKlattCtx as AudioContext | undefined) ??
    new AC();
  (window as any).__codexKlattCtx = ctx;
  if (ctx.state === "suspended") await ctx.resume();
  const buf = synthesize(ctx, text, opts);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 0.8;
  src.connect(gain).connect(ctx.destination);
  src.start();
  return src;
}
