"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_SHADER = `// available: vec2 uv (0..1)  vec2 uRes  float uTime  vec2 uMouse
// return the color for this pixel via 'fragColor = vec4(r,g,b,1)'

void main() {
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uRes.x / uRes.y;

  float d = length(p) - 0.5;
  float a = 0.02 / abs(d);

  vec3 col = vec3(0.02, 0.03, 0.06);
  col += vec3(0.95, 0.88, 0.65) * a;

  // shimmer
  float wave = sin(atan(p.y, p.x) * 12.0 + uTime * 2.0);
  col += vec3(0.30, 0.40, 0.55) * wave * 0.15 * a;

  fragColor = vec4(col, 1.0);
}`;

const PRESETS = [
  {
    name: "brine ring",
    code: DEFAULT_SHADER,
  },
  {
    name: "traveling wave",
    code: `void main() {
  vec2 p = uv;
  float v = 0.0;
  for (float i = 1.0; i < 6.0; i += 1.0) {
    v += sin(p.x * i * 4.0 + uTime * i * 0.5) / i;
  }
  vec3 col = vec3(0.03, 0.05, 0.09) + vec3(0.55, 0.42, 0.20) * (0.5 + 0.5 * v);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    name: "domain-warped noise",
    code: `float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
void main() {
  vec2 p = uv * 4.0;
  vec2 q = vec2(noise(p + uTime * 0.15), noise(p + vec2(3.7, 1.9)));
  float n = noise(p + q * 2.0);
  vec3 col = mix(vec3(0.04, 0.06, 0.10), vec3(0.96, 0.88, 0.72), n * n);
  fragColor = vec4(col, 1.0);
}`,
  },
  {
    name: "mouse follows you",
    code: `void main() {
  vec2 p = uv * 2.0 - 1.0;
  vec2 m = uMouse * 2.0 - 1.0;
  m.x *= uRes.x / uRes.y;
  p.x *= uRes.x / uRes.y;
  float d = length(p - m);
  vec3 col = mix(vec3(0.02), vec3(0.96, 0.88, 0.72), exp(-d * 4.0));
  fragColor = vec4(col, 1.0);
}`,
  },
];

const VS = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

function wrapFragment(user: string): string {
  return `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
out vec4 fragColor;
#define uv vUv
${user}`;
}

export default function ShaderLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState(PRESETS[0].code);
  const [error, setError] = useState<string>("");
  const codeRef = useRef(code);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => { codeRef.current = code; }, [code]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const gl = c.getContext("webgl2");
    if (!gl) return;

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    let prog: WebGLProgram | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    let posA = 0;

    const build = (user: string): string => {
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, VS);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        const e = gl.getShaderInfoLog(vs) ?? "";
        gl.deleteShader(vs);
        return "vertex: " + e;
      }
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, wrapFragment(user));
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const e = gl.getShaderInfoLog(fs) ?? "";
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return e.trim();
      }
      const p = gl.createProgram()!;
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const e = gl.getProgramInfoLog(p) ?? "";
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteProgram(p);
        return "link: " + e;
      }
      if (prog) gl.deleteProgram(prog);
      prog = p;
      uRes = gl.getUniformLocation(prog, "uRes");
      uTime = gl.getUniformLocation(prog, "uTime");
      uMouse = gl.getUniformLocation(prog, "uMouse");
      posA = gl.getAttribLocation(prog, "aPos");
      return "";
    };

    // initial build
    setError(build(code));

    // debounced rebuild on code change
    let debounce: any;
    const rebuild = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        setError(build(codeRef.current));
      }, 200);
    };
    (window as any).__shaderRebuild = rebuild;

    const onMove = (ev: MouseEvent) => {
      const r = c.getBoundingClientRect();
      mouseRef.current.x = (ev.clientX - r.left) / r.width;
      mouseRef.current.y = 1 - (ev.clientY - r.top) / r.height;
    };
    c.addEventListener("mousemove", onMove);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      if (prog) {
        const t = (performance.now() - start) / 1000;
        gl.useProgram(prog);
        gl.viewport(0, 0, c.width, c.height);
        gl.uniform2f(uRes!, c.width, c.height);
        gl.uniform1f(uTime!, t);
        gl.uniform2f(uMouse!, mouseRef.current.x, mouseRef.current.y);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(posA);
        gl.vertexAttribPointer(posA, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-shader") === -1) {
        arr.push("lab-shader");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}

    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("mousemove", onMove);
      delete (window as any).__shaderRebuild;
    };
  }, []);

  const setAndRebuild = (v: string) => {
    setCode(v);
    (window as any).__shaderRebuild?.();
  };

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 09
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          shader playground
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          Write GLSL 300 es; it recompiles on every keystroke (debounced 200ms).{" "}
          <code className="text-stone-200">uv</code> is the 0..1 fragment position,{" "}
          <code className="text-stone-200">uRes</code> the canvas size,{" "}
          <code className="text-stone-200">uTime</code> seconds since load,{" "}
          <code className="text-stone-200">uMouse</code> your cursor normalized.
          Write to <code className="text-stone-200">fragColor</code>. Errors from
          the driver land in the panel below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <textarea
            value={code}
            onChange={(e) => setAndRebuild(e.target.value)}
            spellCheck={false}
            className="w-full h-72 bg-stone-950 border border-stone-800 rounded-md p-4 font-mono text-[12px] text-stone-100 outline-none focus:border-amber-200/50 whitespace-pre"
          />
          {error ? (
            <pre className="mt-2 text-[11px] font-mono text-rose-300 p-3 border border-rose-500/40 rounded bg-rose-950/20 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {error}
            </pre>
          ) : (
            <div className="mt-2 text-[10px] text-emerald-300 font-mono">
              ✓ compiles
            </div>
          )}
        </div>

        <div className="space-y-4">
          <canvas
            ref={canvasRef}
            width={512}
            height={384}
            className="rounded-md border border-stone-800 block cursor-crosshair"
            style={{ width: 512, height: 384 }}
          />
          <div className="rounded border border-stone-800 p-3">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              presets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setAndRebuild(p.code)}
                  className="text-left text-[11px] font-mono px-2 py-1.5 border border-stone-900 rounded hover:border-amber-200/40 hover:bg-stone-900/50 text-stone-300"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
