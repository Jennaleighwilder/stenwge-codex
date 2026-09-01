"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Gray-Scott reaction-diffusion on the GPU with raw WebGL2.
 *
 * State texture: two channels (U, V) at 512x512, float32.
 * Each frame we ping-pong two FBOs, running the update fragment shader:
 *
 *   Uₜ = Dᵤ ∇²U − U V² + F(1 − U)
 *   Vₜ = Dᵥ ∇²V + U V² − (F + k) V
 *
 * A second fragment shader renders V as a colored gradient to the screen.
 * Click/drag to inject V; drag the sliders to change feed and kill rates.
 */

// ── shaders ────────────────────────────────────────────────────────────────
const QUAD_VS = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const UPDATE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uState;   // rg = (U,V)
uniform vec2 uPx;
uniform float uFeed;
uniform float uKill;
uniform float uDu;
uniform float uDv;
uniform float uDt;
uniform vec2 uBrush;    // xy in [0,1], -1 to disable
uniform float uBrushR;  // radius in px units
out vec4 fragColor;

void main() {
  vec2 uv = vUv;
  vec2 c = texture(uState, uv).rg;

  vec2 n = texture(uState, uv + vec2(0.0, uPx.y)).rg;
  vec2 s = texture(uState, uv + vec2(0.0, -uPx.y)).rg;
  vec2 e = texture(uState, uv + vec2(uPx.x, 0.0)).rg;
  vec2 w = texture(uState, uv + vec2(-uPx.x, 0.0)).rg;

  vec2 lap = n + s + e + w - 4.0 * c;

  float U = c.x;
  float V = c.y;
  float uvv = U * V * V;

  float dU = uDu * lap.x - uvv + uFeed * (1.0 - U);
  float dV = uDv * lap.y + uvv - (uFeed + uKill) * V;

  U += dU * uDt;
  V += dV * uDt;

  if (uBrush.x >= 0.0) {
    float d = distance(uv, uBrush);
    if (d < uBrushR) {
      V = 1.0;
      U = 0.5;
    }
  }

  U = clamp(U, 0.0, 1.0);
  V = clamp(V, 0.0, 1.0);
  fragColor = vec4(U, V, 0.0, 1.0);
}`;

const DISPLAY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uState;
out vec4 fragColor;

vec3 palette(float t) {
  // warm brine → salt palette
  vec3 a = vec3(0.02, 0.03, 0.06);
  vec3 b = vec3(0.55, 0.42, 0.20);
  vec3 c = vec3(0.95, 0.88, 0.65);
  vec3 d = vec3(1.00, 0.98, 0.94);
  float x = clamp(t, 0.0, 1.0);
  vec3 col;
  if (x < 0.33)       col = mix(a, b, x / 0.33);
  else if (x < 0.66)  col = mix(b, c, (x - 0.33) / 0.33);
  else                col = mix(c, d, (x - 0.66) / 0.34);
  return col;
}

void main() {
  float v = texture(uState, vUv).g;
  vec3 col = palette(v);
  fragColor = vec4(col, 1.0);
}`;

// ── shader helpers ─────────────────────────────────────────────────────────
function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error("shader: " + gl.getShaderInfoLog(sh));
  }
  return sh;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("link: " + gl.getProgramInfoLog(p));
  }
  return p;
}
function makeFloatTex(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}
function makeFbo(gl: WebGL2RenderingContext, tex: WebGLTexture): WebGLFramebuffer {
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return fbo;
}

// ── preset feed/kill combinations ─────────────────────────────────────────
const PRESETS = [
  { name: "coral",     feed: 0.0545, kill: 0.062 },
  { name: "spots",     feed: 0.030,  kill: 0.062 },
  { name: "worms",     feed: 0.078,  kill: 0.061 },
  { name: "mitosis",   feed: 0.0367, kill: 0.0649 },
  { name: "fingerprint", feed: 0.055, kill: 0.062 },
  { name: "meander",   feed: 0.046,  kill: 0.063 },
];

const SIZE = 512;

export default function GrayScottLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feed, setFeed] = useState(PRESETS[0].feed);
  const [kill, setKill] = useState(PRESETS[0].kill);
  const [running, setRunning] = useState(true);
  const stateRef = useRef({
    feed: PRESETS[0].feed,
    kill: PRESETS[0].kill,
    running: true,
    brush: [-1, -1] as [number, number],
  });

  useEffect(() => { stateRef.current.feed = feed; }, [feed]);
  useEffect(() => { stateRef.current.kill = kill; }, [kill]);
  useEffect(() => { stateRef.current.running = running; }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2");
    if (!gl) return;
    if (!gl.getExtension("EXT_color_buffer_float")) {
      // fall back — this lab needs float FBOs; report gracefully
      const ctx2 = canvas.getContext("2d");
      if (ctx2) {
        ctx2.fillStyle = "#000";
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
        ctx2.fillStyle = "#f00";
        ctx2.font = "14px monospace";
        ctx2.fillText("your browser doesn't support float FBOs.", 10, 30);
      }
      return;
    }

    // quad
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const updateProg = program(gl, QUAD_VS, UPDATE_FS);
    const displayProg = program(gl, QUAD_VS, DISPLAY_FS);
    const posAU = gl.getAttribLocation(updateProg, "aPos");
    const posAD = gl.getAttribLocation(displayProg, "aPos");

    // ping-pong textures
    let texA = makeFloatTex(gl, SIZE, SIZE);
    let texB = makeFloatTex(gl, SIZE, SIZE);
    let fboA = makeFbo(gl, texA);
    let fboB = makeFbo(gl, texB);

    // seed: fill U=1, V=0; drop a splash of V in the center
    const seed = new Float32Array(SIZE * SIZE * 4);
    for (let i = 0; i < SIZE * SIZE; i++) {
      seed[i * 4] = 1;      // U
      seed[i * 4 + 1] = 0;  // V
    }
    for (let dy = -20; dy < 20; dy++) {
      for (let dx = -20; dx < 20; dx++) {
        if (dx * dx + dy * dy < 300) {
          const x = SIZE / 2 + dx;
          const y = SIZE / 2 + dy;
          const idx = (y * SIZE + x) * 4;
          seed[idx] = 0.5;
          seed[idx + 1] = 0.85 + Math.random() * 0.1;
        }
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIZE, SIZE, 0, gl.RGBA, gl.FLOAT, seed);

    const uState = gl.getUniformLocation(updateProg, "uState");
    const uPx = gl.getUniformLocation(updateProg, "uPx");
    const uFeed = gl.getUniformLocation(updateProg, "uFeed");
    const uKill = gl.getUniformLocation(updateProg, "uKill");
    const uDu = gl.getUniformLocation(updateProg, "uDu");
    const uDv = gl.getUniformLocation(updateProg, "uDv");
    const uDt = gl.getUniformLocation(updateProg, "uDt");
    const uBrush = gl.getUniformLocation(updateProg, "uBrush");
    const uBrushR = gl.getUniformLocation(updateProg, "uBrushR");
    const uDispState = gl.getUniformLocation(displayProg, "uState");

    // mouse
    let dragging = false;
    const rectify = (ev: MouseEvent | Touch) => {
      const r = canvas.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width);
      const y = 1 - ((ev.clientY - r.top) / r.height);
      return [x, y] as [number, number];
    };
    const down = (ev: MouseEvent) => { dragging = true; stateRef.current.brush = rectify(ev); };
    const up = () => { dragging = false; stateRef.current.brush = [-1, -1]; };
    const move = (ev: MouseEvent) => { if (dragging) stateRef.current.brush = rectify(ev); };
    canvas.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);

    // achievement
    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-gs") === -1) {
        arr.push("lab-gs");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}

    let raf = 0;
    const loop = () => {
      if (stateRef.current.running) {
        // run 8 update steps per frame
        for (let i = 0; i < 8; i++) {
          gl.useProgram(updateProg);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
          gl.viewport(0, 0, SIZE, SIZE);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texA);
          gl.uniform1i(uState, 0);
          gl.uniform2f(uPx, 1 / SIZE, 1 / SIZE);
          gl.uniform1f(uFeed, stateRef.current.feed);
          gl.uniform1f(uKill, stateRef.current.kill);
          gl.uniform1f(uDu, 0.16);
          gl.uniform1f(uDv, 0.08);
          gl.uniform1f(uDt, 1.0);
          gl.uniform2f(uBrush, stateRef.current.brush[0], stateRef.current.brush[1]);
          gl.uniform1f(uBrushR, 0.02);

          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.enableVertexAttribArray(posAU);
          gl.vertexAttribPointer(posAU, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          [texA, texB] = [texB, texA];
          [fboA, fboB] = [fboB, fboA];
        }
      }

      // display
      gl.useProgram(displayProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(uDispState, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posAD);
      gl.vertexAttribPointer(posAD, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 04
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          gray-scott reaction-diffusion on the GPU
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          Two coupled reactants live in a 512×512 float32 texture. Each frame
          the simulation ticks 8 times through a fragment shader — the Laplacian
          is a 4-tap sample, the update is Euler. Click and drag on the canvas
          to inject V. Change the feed/kill rates to trip the pattern space.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="rounded-md border border-stone-800 cursor-crosshair"
          style={{ width: 512, height: 512 }}
        />

        <div className="space-y-5">
          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-3">
              parameters
            </div>
            <label className="block mb-3">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-stone-400">feed</span>
                <span className="text-stone-100 tabular-nums">{feed.toFixed(4)}</span>
              </div>
              <input
                type="range" min={0.005} max={0.09} step={0.0005}
                value={feed}
                onChange={(e) => setFeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="block">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-stone-400">kill</span>
                <span className="text-stone-100 tabular-nums">{kill.toFixed(4)}</span>
              </div>
              <input
                type="range" min={0.04} max={0.075} step={0.0005}
                value={kill}
                onChange={(e) => setKill(parseFloat(e.target.value))}
                className="w-full"
              />
            </label>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setRunning((v) => !v)}
                className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
              >
                {running ? "pause" : "resume"}
              </button>
            </div>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              presets
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setFeed(p.feed);
                    setKill(p.kill);
                  }}
                  className="text-left text-[11px] font-mono px-2 py-1.5 border border-stone-900 rounded hover:border-amber-200/40 text-stone-300"
                >
                  <div>{p.name}</div>
                  <div className="text-stone-600 text-[10px]">
                    f={p.feed} k={p.kill}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-stone-500 leading-relaxed">
            some regimes are meta-stable — nudge the sliders until the pattern
            reveals itself. click the canvas to seed more V.
          </p>
        </div>
      </div>
    </>
  );
}
