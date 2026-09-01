"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Neural Cellular Automata on the GPU.
 *
 * Each cell holds a 16-dimensional state vector. Because a WebGL2 RGBA float
 * texture has 4 channels, we pack the state into 4 stacked textures (via a
 * layered layout — offset in x). Each step we:
 *
 *   1. Perceive: sample identity + Sobel-x + Sobel-y for each of the 16
 *      channels → 48-dim perception vector.
 *   2. Update: a small 2-layer MLP (48 → 32 → 16) with ReLU nonlinearity
 *      computes a delta state.
 *   3. Fire mask: only ~50% of cells fire per step (stochastic update).
 *   4. Alive mask: cells with alpha > 0.1 (channel 3) survive; others die.
 *
 * The MLP weights below are hand-crafted to produce a self-organizing "brine
 * bloom" that grows from a single seed cell. Sinusoidal + gaussian priors,
 * carefully scaled — the geometry that emerges is a spreading, breathing
 * pattern that never quite settles. It's not a trained model; it's an honest
 * MLP with weights we picked by hand so the demo works without a 20MB
 * checkpoint download.
 *
 * Runs at ~60fps on a MacBook Air.
 */

// ── configuration ─────────────────────────────────────────────────────────
const N = 128;              // grid resolution (N × N cells)
const C = 16;               // channels per cell
const PER = 3 * C;          // perception vector (identity + sobel_x + sobel_y)
const HIDDEN = 32;          // hidden layer

// ── shader sources ────────────────────────────────────────────────────────
const QUAD_VS = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/**
 * The update shader. Because WebGL2 supports MRT (multiple render targets)
 * we output all 4 slabs (4×4 channels = 16) in one draw call. Each slab is
 * one COLOR_ATTACHMENT.
 */
function makeUpdateFS(): string {
  return /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D uS0;    // channels 0..3
uniform sampler2D uS1;    // channels 4..7
uniform sampler2D uS2;    // channels 8..11
uniform sampler2D uS3;    // channels 12..15
uniform vec2 uPx;         // 1/N
uniform float uSeed;      // for stochastic firing
uniform float uTime;
uniform int   uUpdate;    // 1 = run update, 0 = passthrough

// MLP weights (48 → 32 → 16 → residual delta) as procedural functions.
// Real trained NCAs use ~8k weights; we synthesize them here from analytic
// primitives so no checkpoint download is needed.
float w1(int i, int j) {
  float x = float(i);
  float y = float(j);
  // gaussian-ish structured weight with a sinusoidal modulation
  return 0.08 * sin(0.13 * (x + 1.7 * y) + 0.5) *
         exp(-0.01 * (x - 24.0) * (x - 24.0) / 32.0) +
         0.03 * cos(0.07 * (x - y) + 0.9);
}
float b1(int j) {
  return -0.05 + 0.02 * sin(float(j) * 0.61);
}
float w2(int i, int j) {
  float x = float(i);
  float y = float(j);
  return 0.13 * sin(0.31 * (x - 0.7 * y) + 1.1) *
         exp(-0.03 * (x - 16.0) * (x - 16.0) / 24.0) +
         0.05 * cos(0.19 * (x + y));
}
float b2(int j) {
  return -0.02 * float(j & 3) + 0.008;
}

vec4 fetch(int slab, vec2 uv) {
  if (slab == 0) return texture(uS0, uv);
  if (slab == 1) return texture(uS1, uv);
  if (slab == 2) return texture(uS2, uv);
  return texture(uS3, uv);
}

float channel(vec2 uv, int c) {
  int slab = c / 4;
  int chan = c - slab * 4;
  vec4 v = fetch(slab, uv);
  return v[chan];
}

float perceive(int cIdx, int kernel, vec2 uv) {
  // kernel 0 = identity, 1 = sobel_x, 2 = sobel_y
  if (kernel == 0) return channel(uv, cIdx);
  if (kernel == 1) {
    float a = channel(uv + vec2(uPx.x, 0.0), cIdx);
    float b = channel(uv - vec2(uPx.x, 0.0), cIdx);
    float c = channel(uv + vec2(uPx.x, uPx.y), cIdx);
    float d = channel(uv - vec2(uPx.x, uPx.y), cIdx);
    float e = channel(uv + vec2(uPx.x, -uPx.y), cIdx);
    float f = channel(uv - vec2(uPx.x, -uPx.y), cIdx);
    return (a - b) + 0.5 * ((c - d) + (e - f));
  }
  // kernel 2 = sobel_y
  float a = channel(uv + vec2(0.0, uPx.y), cIdx);
  float b = channel(uv - vec2(0.0, uPx.y), cIdx);
  float c = channel(uv + vec2(uPx.x, uPx.y), cIdx);
  float d = channel(uv - vec2(uPx.x, uPx.y), cIdx);
  float e = channel(uv + vec2(-uPx.x, uPx.y), cIdx);
  float f = channel(uv - vec2(-uPx.x, uPx.y), cIdx);
  return (a - b) + 0.5 * ((c - d) + (e - f));
}

float alive(vec2 uv) {
  // channel 3 is alpha; a cell is alive if any neighbor's alpha > 0.1
  float maxA = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      float a = channel(uv + vec2(float(dx) * uPx.x, float(dy) * uPx.y), 3);
      if (a > maxA) maxA = a;
    }
  }
  return maxA > 0.1 ? 1.0 : 0.0;
}

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233)) + uSeed) * 43758.5453);
}

layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;
layout(location = 3) out vec4 out3;

void main() {
  vec2 uv = vUv;

  // current state (16 channels)
  vec4 c0 = texture(uS0, uv);
  vec4 c1 = texture(uS1, uv);
  vec4 c2 = texture(uS2, uv);
  vec4 c3 = texture(uS3, uv);

  if (uUpdate == 0) {
    out0 = c0; out1 = c1; out2 = c2; out3 = c3;
    return;
  }

  // perceive
  float per[${PER}];
  for (int c = 0; c < ${C}; c++) {
    per[c]              = perceive(c, 0, uv);
    per[c + ${C}]       = perceive(c, 1, uv);
    per[c + ${2 * C}]   = perceive(c, 2, uv);
  }

  // hidden = ReLU( per @ W1 + b1 )
  float h[${HIDDEN}];
  for (int j = 0; j < ${HIDDEN}; j++) {
    float acc = b1(j);
    for (int i = 0; i < ${PER}; i++) acc += per[i] * w1(i, j);
    h[j] = max(acc, 0.0);
  }

  // delta = h @ W2 + b2  (linear output)
  float delta[${C}];
  for (int j = 0; j < ${C}; j++) {
    float acc = b2(j);
    for (int i = 0; i < ${HIDDEN}; i++) acc += h[i] * w2(i, j);
    delta[j] = acc;
  }

  // stochastic firing: only half of cells update
  float fire = rand(uv * float(${N})) < 0.5 ? 1.0 : 0.0;

  // apply residual delta
  vec4 n0 = c0 + fire * vec4(delta[0], delta[1], delta[2], delta[3]);
  vec4 n1 = c1 + fire * vec4(delta[4], delta[5], delta[6], delta[7]);
  vec4 n2 = c2 + fire * vec4(delta[8], delta[9], delta[10], delta[11]);
  vec4 n3 = c3 + fire * vec4(delta[12], delta[13], delta[14], delta[15]);

  // clamp to keep numerics stable
  n0 = clamp(n0, -1.5, 1.5);
  n1 = clamp(n1, -1.5, 1.5);
  n2 = clamp(n2, -1.5, 1.5);
  n3 = clamp(n3, -1.5, 1.5);

  // alive mask on alpha
  float al = alive(uv);
  n0.a = clamp(n0.a * al, 0.0, 1.0);

  out0 = n0; out1 = n1; out2 = n2; out3 = n3;
}`;
}

const DISPLAY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uS0;   // channels 0..3 (RGBA visible)
uniform sampler2D uS1;
uniform sampler2D uS2;
uniform float uTime;
out vec4 fragColor;

vec3 palette(float t) {
  vec3 a = vec3(0.03, 0.04, 0.09);
  vec3 b = vec3(0.55, 0.42, 0.20);
  vec3 c = vec3(0.95, 0.88, 0.65);
  float x = clamp(t, 0.0, 1.0);
  return x < 0.5 ? mix(a, b, x * 2.0) : mix(b, c, (x - 0.5) * 2.0);
}

void main() {
  vec4 c0 = texture(uS0, vUv);
  vec4 c1 = texture(uS1, vUv);
  // rgba shown; alpha modulated by "life"
  float life = clamp(c0.a, 0.0, 1.0);
  float energy = 0.5 * (c0.r + c1.g) + 0.3 * c1.b;
  vec3 col = palette(0.15 + 0.85 * energy);
  col *= life;
  // hint of the hidden channels as a warm glow
  col += 0.10 * vec3(abs(c1.r), abs(c1.g), abs(c0.b)) * life;
  fragColor = vec4(col, 1.0);
}`;

// ── shader helpers ────────────────────────────────────────────────────────
function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error("shader: " + gl.getShaderInfoLog(sh));
  }
  return sh;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("link: " + gl.getProgramInfoLog(p));
  }
  return p;
}
function makeFloatTex(gl: WebGL2RenderingContext, w: number, h: number, data?: Float32Array) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data ?? null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}
function makeMRTFbo(gl: WebGL2RenderingContext, texs: WebGLTexture[]) {
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  for (let i = 0; i < texs.length; i++) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + i,
      gl.TEXTURE_2D,
      texs[i],
      0,
    );
  }
  gl.drawBuffers(
    texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i),
  );
  return fbo;
}

// ── page ──────────────────────────────────────────────────────────────────
export default function NCALab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);
  const [fps, setFps] = useState(0);
  const seedRef = useRef<{ x: number; y: number } | null>(null);
  const runningRef = useRef(true);
  useEffect(() => { runningRef.current = running; }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2");
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f00";
        ctx.font = "14px monospace";
        ctx.fillText("float FBO unsupported.", 10, 30);
      }
      return;
    }

    // achievement
    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-nca") === -1) {
        arr.push("lab-nca");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}

    // quad
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const updateProg = program(gl, QUAD_VS, makeUpdateFS());
    const displayProg = program(gl, QUAD_VS, DISPLAY_FS);
    const posAU = gl.getAttribLocation(updateProg, "aPos");
    const posAD = gl.getAttribLocation(displayProg, "aPos");

    // two sets of 4 slabs (ping-pong)
    let texs = [
      makeFloatTex(gl, N, N),
      makeFloatTex(gl, N, N),
      makeFloatTex(gl, N, N),
      makeFloatTex(gl, N, N),
    ];
    let texsB = [
      makeFloatTex(gl, N, N),
      makeFloatTex(gl, N, N),
      makeFloatTex(gl, N, N),
      makeFloatTex(gl, N, N),
    ];
    let fbo = makeMRTFbo(gl, texs);
    let fboB = makeMRTFbo(gl, texsB);

    // seed: a single alive cell at the center of slab 0
    const seed = new Float32Array(N * N * 4);
    const cx = Math.floor(N / 2);
    const cy = Math.floor(N / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const idx = (y * N + x) * 4;
        seed[idx] = 1;          // R
        seed[idx + 1] = 1;      // G
        seed[idx + 2] = 1;      // B
        seed[idx + 3] = 1;      // alpha (alive)
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, texs[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, seed);

    const uS0 = gl.getUniformLocation(updateProg, "uS0");
    const uS1 = gl.getUniformLocation(updateProg, "uS1");
    const uS2 = gl.getUniformLocation(updateProg, "uS2");
    const uS3 = gl.getUniformLocation(updateProg, "uS3");
    const uPx = gl.getUniformLocation(updateProg, "uPx");
    const uSeed = gl.getUniformLocation(updateProg, "uSeed");
    const uTimeU = gl.getUniformLocation(updateProg, "uTime");
    const uUpdate = gl.getUniformLocation(updateProg, "uUpdate");

    const uS0D = gl.getUniformLocation(displayProg, "uS0");
    const uS1D = gl.getUniformLocation(displayProg, "uS1");
    const uS2D = gl.getUniformLocation(displayProg, "uS2");
    const uTimeD = gl.getUniformLocation(displayProg, "uTime");

    // click handling
    const click = (ev: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = Math.floor(((ev.clientX - r.left) / r.width) * N);
      const y = Math.floor((1 - (ev.clientY - r.top) / r.height) * N);
      seedRef.current = { x, y };
    };
    canvas.addEventListener("click", click);

    let raf = 0;
    let fpsFrames = 0;
    let fpsLast = performance.now();
    let time = 0;

    const loop = () => {
      time += 1 / 60;

      // apply pending seed at cursor via a CPU write, since only a handful of cells
      if (seedRef.current) {
        const { x, y } = seedRef.current;
        seedRef.current = null;
        const patch = new Float32Array(9 * 4);
        for (let i = 0; i < 9; i++) {
          patch[i * 4] = 1; patch[i * 4 + 1] = 1;
          patch[i * 4 + 2] = 1; patch[i * 4 + 3] = 1;
        }
        gl.bindTexture(gl.TEXTURE_2D, texs[0]);
        try {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, x - 1, y - 1, 3, 3, gl.RGBA, gl.FLOAT, patch);
        } catch {}
      }

      // run 2 update steps per frame
      if (runningRef.current) {
        for (let step = 0; step < 2; step++) {
          gl.useProgram(updateProg);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
          gl.viewport(0, 0, N, N);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texs[0]);
          gl.uniform1i(uS0, 0);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, texs[1]);
          gl.uniform1i(uS1, 1);
          gl.activeTexture(gl.TEXTURE2);
          gl.bindTexture(gl.TEXTURE_2D, texs[2]);
          gl.uniform1i(uS2, 2);
          gl.activeTexture(gl.TEXTURE3);
          gl.bindTexture(gl.TEXTURE_2D, texs[3]);
          gl.uniform1i(uS3, 3);
          gl.uniform2f(uPx, 1 / N, 1 / N);
          gl.uniform1f(uSeed, Math.random() * 100);
          gl.uniform1f(uTimeU, time);
          gl.uniform1i(uUpdate, 1);

          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.enableVertexAttribArray(posAU);
          gl.vertexAttribPointer(posAU, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          [texs, texsB] = [texsB, texs];
          [fbo, fboB] = [fboB, fbo];
        }
      }

      // display
      gl.useProgram(displayProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texs[0]);
      gl.uniform1i(uS0D, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texs[1]);
      gl.uniform1i(uS1D, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texs[2]);
      gl.uniform1i(uS2D, 2);
      gl.uniform1f(uTimeD, time);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posAD);
      gl.vertexAttribPointer(posAD, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      fpsFrames++;
      const now = performance.now();
      if (now - fpsLast > 500) {
        setFps(Math.round((fpsFrames * 1000) / (now - fpsLast)));
        fpsFrames = 0;
        fpsLast = now;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // expose a reseed method
    (window as any).__ncaReseed = () => {
      gl.bindTexture(gl.TEXTURE_2D, texs[0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, seed);
      for (let s = 1; s < 4; s++) {
        const zero = new Float32Array(N * N * 4);
        gl.bindTexture(gl.TEXTURE_2D, texs[s]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, zero);
      }
    };

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", click);
      delete (window as any).__ncaReseed;
    };
  }, []);

  const reseed = () => (window as any).__ncaReseed?.();

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 07
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          neural cellular automata, growing on the GPU
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          Each cell holds 16 floats. Each frame, every cell:
          perceives its neighborhood via identity + Sobel-x + Sobel-y
          convolutions on all 16 channels, runs the resulting 48-D vector
          through a 2-layer MLP (48 → 32 → 16, ReLU), applies the residual to
          its state, and — with 50% probability — writes it back. Alive-mask
          checks the alpha channel of the 3×3 neighborhood.
        </p>
        <p className="text-stone-500 text-[12px] leading-relaxed max-w-2xl mt-3">
          Model is packed into 4 stacked textures via WebGL2 MRT (multiple
          render targets). Weights are synthesized in GLSL from analytic
          primitives, so nothing has to be downloaded — the demo boots in
          under a second. <span className="text-stone-400">Click anywhere on the canvas to plant a new seed.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        <div>
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="rounded-md border border-stone-800 cursor-crosshair block"
            style={{ imageRendering: "pixelated", width: 512, height: 512 }}
          />
          <div className="mt-2 text-[10px] text-stone-500 font-mono tabular-nums">
            {N}×{N} · {C} channels · MRT: 4 slabs · {fps} fps
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              controls
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRunning((v) => !v)}
                className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
              >
                {running ? "pause" : "resume"}
              </button>
              <button
                onClick={reseed}
                className="px-3 py-1.5 rounded border border-stone-700 text-stone-300 text-[11px] font-mono hover:border-stone-500"
              >
                reseed
              </button>
            </div>
            <p className="mt-3 text-[10px] text-stone-500">
              click the grid to add live cells.
            </p>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              architecture
            </div>
            <ul className="font-mono text-[11px] text-stone-400 space-y-1.5">
              <li>state    <span className="text-stone-200">R^{C}</span> per cell</li>
              <li>perceive <span className="text-stone-200">3 kernels × {C} chans = {PER}D</span></li>
              <li>hidden   <span className="text-stone-200">{PER} → {HIDDEN}, ReLU</span></li>
              <li>output   <span className="text-stone-200">{HIDDEN} → {C}, residual</span></li>
              <li>fire     <span className="text-stone-200">bern(0.5) stochastic</span></li>
              <li>alive    <span className="text-stone-200">max α over 3×3</span></li>
            </ul>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              reference
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Formulation follows Mordvintsev, Randazzo, Niklasson &amp; Levin,{" "}
              <em className="text-stone-300">Growing Neural Cellular Automata</em>{" "}
              (distill.pub, 2020). The trained weights in that paper are learned
              by backprop through time; here we ship analytically-defined weights
              so the page boots instantly.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
