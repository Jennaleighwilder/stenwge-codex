"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ShaderMaterial, Vector2 } from "three";
import type { Progress } from "./StenwgeCodex";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Fragment shader that paints a brine-and-stone field behind everything.
 * Mixes a flowing simplex-style noise with stone speckle and salt sparkle.
 * The "phase" uniform morphs the look:
 *   0 = empty void (cookie)
 *   1 = warm dim (mouse)
 *   2 = colder (cat enters)
 *   3 = moonlit (boot)
 *   4 = sinking into brine
 *   5 = full saltwater
 *   6 = brightening (bird)
 *   7 = code rain
 */
const fragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uPhase;     // continuous 0..7 chapter index
uniform vec2 uResolution;
uniform float uMouseX;
uniform float uMouseY;

// 2D hash + simplex-ish noise
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(
    dot(a, hash22(i + 0.0)),
    dot(b, hash22(i + o)),
    dot(c, hash22(i + 1.0))
  );
  return dot(n, vec3(70.0));
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

// star/salt sparkle
float salt(vec2 uv, float seed) {
  vec2 g = floor(uv * 40.0);
  vec2 f = fract(uv * 40.0);
  vec2 r = hash22(g + seed);
  vec2 c = 0.5 + 0.45 * r;
  float d = distance(f, c);
  float sparkle = smoothstep(0.04, 0.0, d);
  float twinkle = 0.5 + 0.5 * sin(uTime * (1.0 + r.x * 3.0) + r.y * 10.0);
  return sparkle * twinkle;
}

vec3 hueAt(float p) {
  // pick palette anchored by chapter
  vec3 c0 = vec3(0.012, 0.014, 0.025);          // void / black
  vec3 c1 = vec3(0.06, 0.04, 0.03);             // warm dim cookie
  vec3 c2 = vec3(0.05, 0.06, 0.08);             // cooler
  vec3 c3 = vec3(0.08, 0.07, 0.04);             // moonlit boot
  vec3 c4 = vec3(0.02, 0.06, 0.10);             // sinking
  vec3 c5 = vec3(0.03, 0.08, 0.12);             // salt sea
  vec3 c6 = vec3(0.07, 0.10, 0.12);             // bird dawn
  vec3 c7 = vec3(0.00, 0.04, 0.02);             // code rain green-black

  float f = clamp(p, 0.0, 7.0);
  int i = int(floor(f));
  float t = fract(f);
  vec3 a; vec3 b;
  if (i == 0) { a = c0; b = c1; }
  else if (i == 1) { a = c1; b = c2; }
  else if (i == 2) { a = c2; b = c3; }
  else if (i == 3) { a = c3; b = c4; }
  else if (i == 4) { a = c4; b = c5; }
  else if (i == 5) { a = c5; b = c6; }
  else { a = c6; b = c7; }
  return mix(a, b, t);
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;

  // flow with slow drift + mouse parallax
  vec2 flow = vec2(uTime * 0.03, uTime * 0.015);
  flow += vec2(uMouseX, uMouseY) * 0.15;

  float n1 = fbm(p * 2.5 + flow);
  float n2 = fbm(p * 6.0 - flow * 0.6 + 5.0);
  float brine = smoothstep(-0.4, 0.6, n1 * 0.8 + n2 * 0.3);

  vec3 base = hueAt(uPhase);

  // stone speckle baked in: dark spots
  float stones = step(0.78, fbm(p * 12.0 + 9.0));
  vec3 stoneCol = vec3(0.015);

  // salt sparkle, intensified during sea chapters (4-6)
  float saltIntensity = smoothstep(2.5, 4.5, uPhase) * (1.0 - smoothstep(6.5, 7.5, uPhase));
  float sa = salt(uv * aspect + flow * 0.5, 1.0) + salt(uv * aspect * 1.5 - flow, 7.0) * 0.6;

  // moon halo for chapter 3
  float moonMask = smoothstep(2.5, 3.0, uPhase) * (1.0 - smoothstep(4.0, 4.6, uPhase));
  vec2 moonPos = vec2(0.6, 0.65);
  float moonDist = length((uv - moonPos) * aspect);
  float moonGlow = smoothstep(0.5, 0.0, moonDist) * 0.5;

  vec3 col = base;
  col = mix(col, col + vec3(0.04, 0.06, 0.10) * brine, 0.6 + 0.4 * smoothstep(3.0, 5.0, uPhase));
  col = mix(col, stoneCol, stones * 0.65);
  col += vec3(1.0, 0.95, 0.85) * sa * saltIntensity * 0.55;
  col += vec3(1.0, 0.92, 0.7) * moonGlow * moonMask;

  // subtle vignette to keep edges dark
  float vig = smoothstep(1.2, 0.4, length(p));
  col *= 0.6 + 0.4 * vig;

  // boost a little contrast
  col = pow(col, vec3(0.95));

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function BrineBackground({ progress }: { progress: Progress }) {
  const matRef = useRef<ShaderMaterial>(null);
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uResolution: { value: new Vector2(size.width, size.height) },
      uMouseX: { value: 0 },
      uMouseY: { value: 0 },
    }),
    // size will be updated below
    [],
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value += delta;
    const target = progress.chapter + progress.local;
    u.uPhase.value = u.uPhase.value + (target - u.uPhase.value) * 0.04;
    u.uResolution.value.set(size.width, size.height);
    u.uMouseX.value += (progress.mouseX - u.uMouseX.value) * 0.05;
    u.uMouseY.value += (progress.mouseY - u.uMouseY.value) * 0.05;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
