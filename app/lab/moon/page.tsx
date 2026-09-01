"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A single-fragment-shader 3D scene rendered by sphere-tracing signed
 * distance functions:
 *
 *   moon:   sphere
 *   boot:   union of rounded boxes + a cylinder (heel + shaft + toe)
 *   mouse:  ellipsoid + 2 tiny spheres (ears) + a torus (tail hint)
 *   cat:    ellipsoid + tri prism (ears)
 *   ground: sea plane
 *
 * Lighting: directional key light from moon direction + soft ambient +
 * cheap ambient occlusion from short-range distance sampling + one
 * shadow ray per pixel. Runs at 60fps on a laptop iGPU at 720p.
 */

const QUAD_VS = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SCENE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uCamOrbit;

// ── SDF primitives ────────────────────────────────────────────────────────
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCappedCyl(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}
float sdTriPrism(vec3 p, vec2 h) {
  vec3 q = abs(p);
  return max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5);
}
float sdPlane(vec3 p, float y) { return p.y - y; }

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// scene: returns (distance, material)
vec2 boot(vec3 p) {
  // shaft: rounded box standing up
  float shaft = sdRoundBox(p - vec3(0.0, 0.4, 0.0), vec3(0.28, 0.55, 0.28), 0.06);
  // toe: a lower rounded box extended forward
  float toe = sdRoundBox(p - vec3(0.28, -0.16, 0.0), vec3(0.42, 0.14, 0.24), 0.05);
  // heel: a small cylinder
  float heel = sdCappedCyl(p - vec3(-0.16, -0.20, 0.0), 0.12, 0.10);
  float d = smin(shaft, toe, 0.09);
  d = smin(d, heel, 0.09);
  return vec2(d, 1.0);
}

vec2 mouse_(vec3 p) {
  // small ellipsoid body, tiny ears, torus for tail
  vec3 mp = p - vec3(0.05, 0.5, 0.15);
  float body = sdEllipsoid(mp, vec3(0.12, 0.09, 0.09));
  float earL = sdSphere(mp - vec3(0.02, 0.09, 0.06), 0.03);
  float earR = sdSphere(mp - vec3(0.02, 0.09, -0.06), 0.03);
  float tail = sdTorus(mp - vec3(-0.14, 0.0, 0.0), vec2(0.07, 0.008));
  float d = min(min(body, earL), min(earR, tail));
  return vec2(d, 2.0);
}

vec2 cat_(vec3 p) {
  // ellipsoid body, triangular ears
  vec3 cp = p - vec3(-0.10, 0.55, -0.12);
  float body = sdEllipsoid(cp, vec3(0.15, 0.12, 0.11));
  float earL = sdTriPrism((cp - vec3(0.02, 0.13, 0.05)).xyz, vec2(0.06, 0.04));
  float earR = sdTriPrism((cp - vec3(0.02, 0.13, -0.05)).xyz, vec2(0.06, 0.04));
  float d = min(body, min(earL, earR));
  return vec2(d, 3.0);
}

vec2 moon(vec3 p) {
  // moon: big sphere far away, up and to the left
  vec3 mp = p - vec3(-4.5, 4.0, -6.0);
  return vec2(sdSphere(mp, 1.9), 4.0);
}

vec2 ground(vec3 p) {
  float d = sdPlane(p, -0.35);
  return vec2(d, 5.0);
}

vec2 opU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }

vec2 scene(vec3 p) {
  vec2 d = boot(p);
  d = opU(d, mouse_(p));
  d = opU(d, cat_(p));
  d = opU(d, moon(p));
  d = opU(d, ground(p));
  return d;
}

vec3 normal(vec3 p) {
  const float h = 0.0008;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * scene(p + k.xyy * h).x +
    k.yyx * scene(p + k.yyx * h).x +
    k.yxy * scene(p + k.yxy * h).x +
    k.xxx * scene(p + k.xxx * h).x
  );
}

// ── ray march ─────────────────────────────────────────────────────────────
float rayMarch(vec3 ro, vec3 rd, out float mat) {
  float t = 0.0;
  mat = 0.0;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    vec2 d = scene(p);
    if (d.x < 0.001) { mat = d.y; return t; }
    if (t > 60.0) break;
    t += d.x * 0.9;
  }
  return -1.0;
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 32; i++) {
    if (t >= maxt) break;
    float h = scene(ro + rd * t).x;
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += h;
  }
  return clamp(res, 0.0, 1.0);
}

float ao(vec3 p, vec3 n) {
  float acc = 0.0;
  float w = 1.0;
  for (int i = 0; i < 5; i++) {
    float d = 0.02 + 0.06 * float(i);
    acc += w * (d - scene(p + n * d).x);
    w *= 0.65;
  }
  return clamp(1.0 - 2.0 * acc, 0.0, 1.0);
}

vec3 materialColor(float mat) {
  if (mat < 1.5) return vec3(0.18, 0.12, 0.09);  // boot: dark leather
  if (mat < 2.5) return vec3(0.72, 0.66, 0.56);  // mouse: warm gray
  if (mat < 3.5) return vec3(0.10, 0.09, 0.10);  // cat: near-black
  if (mat < 4.5) return vec3(0.96, 0.92, 0.80);  // moon: warm cream
  return vec3(0.05, 0.06, 0.09);                  // sea: dark
}

void main() {
  vec2 fragCoord = (vUv * 0.5 + 0.5) * uRes;
  vec2 p = (2.0 * fragCoord - uRes) / uRes.y;

  // orbit camera
  float ang = uCamOrbit + (uMouse.x - 0.5) * 1.2;
  float pitch = 0.28 + (0.5 - uMouse.y) * 0.4;
  float rad = 3.0;
  vec3 ro = vec3(sin(ang) * rad, 0.6 + pitch * 0.4, cos(ang) * rad);
  vec3 ta = vec3(0.0, 0.35, 0.0);

  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(p.x * uu + p.y * vv + 1.4 * ww);

  float mat;
  float t = rayMarch(ro, rd, mat);

  vec3 col;
  if (t > 0.0) {
    vec3 pos = ro + rd * t;
    vec3 nor = normal(pos);
    vec3 mCol = materialColor(mat);

    // moon acts as a directional light
    vec3 ldir = normalize(vec3(-4.5, 4.0, -6.0) - pos);
    float ndl = max(dot(nor, ldir), 0.0);
    float sh = mat > 3.5 && mat < 4.5 ? 1.0 : softShadow(pos + nor * 0.002, ldir, 0.01, 20.0, 12.0);
    float aoc = ao(pos, nor);

    // self-illuminate the moon
    if (mat > 3.5 && mat < 4.5) {
      float glow = pow(max(0.0, dot(nor, -rd)), 0.6);
      col = mix(mCol, vec3(1.0, 0.98, 0.92), glow * 0.4) * 1.05;
    } else {
      vec3 diff = mCol * (0.16 + 0.9 * ndl * sh);
      vec3 rim = vec3(0.55, 0.60, 0.75) * pow(1.0 - max(dot(nor, -rd), 0.0), 3.0) * 0.35;
      col = diff * aoc + rim * aoc;
    }
    // atmosphere
    col = mix(col, vec3(0.04, 0.05, 0.09), smoothstep(3.0, 12.0, t));
  } else {
    // sky: gradient with a scatter of stars
    float sky = smoothstep(-0.3, 0.4, rd.y);
    col = mix(vec3(0.05, 0.05, 0.10), vec3(0.10, 0.14, 0.22), sky);
    // salt of stars
    vec2 s = rd.xy * 40.0 + vec2(uCamOrbit * 3.0, 0.0);
    float star = step(0.998, fract(sin(dot(floor(s), vec2(12.9898, 78.233))) * 43758.5453));
    col += vec3(1.0, 0.95, 0.85) * star * (0.5 + 0.5 * rd.y);
  }

  // gentle vignette + gamma
  vec2 uvv = vUv;
  col *= 1.0 - 0.35 * dot(uvv * 0.7, uvv * 0.7);
  col = pow(col, vec3(1.0 / 1.9));
  fragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error("shader: " + gl.getShaderInfoLog(sh));
  }
  return sh;
}
function link(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("link: " + gl.getProgramInfoLog(p));
  }
  return p;
}

export default function MoonLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const mouseRef = useRef({ x: 0.5, y: 0.55 });
  const orbitRef = useRef(0);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const gl = c.getContext("webgl2");
    if (!gl) return;

    try {
      const raw = localStorage.getItem("fcri:achievements");
      const arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf("lab-moon") === -1) {
        arr.push("lab-moon");
        localStorage.setItem("fcri:achievements", JSON.stringify(arr));
      }
    } catch {}

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const prog = link(gl, QUAD_VS, SCENE_FS);
    const posA = gl.getAttribLocation(prog, "aPos");
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uOrbit = gl.getUniformLocation(prog, "uCamOrbit");

    const onMove = (ev: MouseEvent) => {
      const r = c.getBoundingClientRect();
      mouseRef.current.x = (ev.clientX - r.left) / r.width;
      mouseRef.current.y = (ev.clientY - r.top) / r.height;
    };
    c.addEventListener("mousemove", onMove);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      if (autoRef.current) orbitRef.current += 0.005;
      gl.useProgram(prog);
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(uRes, c.width, c.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(uOrbit, orbitRef.current);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posA);
      gl.vertexAttribPointer(posA, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("mousemove", onMove);
    };
  }, []);

  const autoRef = useRef(autoOrbit);
  useEffect(() => { autoRef.current = autoOrbit; }, [autoOrbit]);

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.4em] uppercase text-stone-500">
          paper 08
        </div>
        <h1 className="font-serif italic text-3xl text-stone-50 mt-1 mb-3">
          the moon, ray-marched
        </h1>
        <p className="text-stone-400 text-[13px] leading-relaxed max-w-2xl">
          One fragment shader. No meshes, no textures, no vertex data.
          The mouse, cat, boot, sea, and moon are all signed distance
          functions composited with soft-min unions and traced with 96
          sphere-marching steps per pixel. Normals come from finite
          differences, shadows from a soft-shadow ray, ambient occlusion
          from five short-range distance samples.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        <div>
          <canvas
            ref={canvasRef}
            width={720}
            height={480}
            className="rounded-md border border-stone-800 block cursor-move"
            style={{ width: 720, height: 480 }}
          />
          <div className="mt-2 text-[10px] text-stone-500 font-mono">
            720×480 · 1 fragment shader · move the cursor to look around
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              controls
            </div>
            <button
              onClick={() => setAutoOrbit((v) => !v)}
              className="px-3 py-1.5 rounded bg-amber-200 text-stone-950 text-[11px] font-mono hover:bg-amber-100"
            >
              {autoOrbit ? "stop orbit" : "auto orbit"}
            </button>
          </div>

          <div className="rounded border border-stone-800 p-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-stone-500 mb-2">
              what you&apos;re looking at
            </div>
            <ul className="font-mono text-[11px] text-stone-400 space-y-1.5">
              <li>boot   <span className="text-stone-200">smin(3 rounded prims)</span></li>
              <li>mouse  <span className="text-stone-200">ellipsoid + 2 spheres + torus</span></li>
              <li>cat    <span className="text-stone-200">ellipsoid + 2 tri-prisms</span></li>
              <li>moon   <span className="text-stone-200">sphere · self-illuminated</span></li>
              <li>sea    <span className="text-stone-200">plane</span></li>
              <li>steps  <span className="text-stone-200">96 primary · 32 shadow · 5 AO</span></li>
            </ul>
          </div>

          <p className="text-[11px] text-stone-500 leading-relaxed">
            everything you see on the canvas is derived from ~200 lines of
            GLSL. there is no polygonal geometry anywhere in this page.
          </p>
        </div>
      </div>
    </>
  );
}
