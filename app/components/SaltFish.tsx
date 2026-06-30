"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * Salt fish, made of ~1200 GPU particles.
 * - rest positions form a fish silhouette in xy
 * - they breathe and dissolve into brine droplets via shader-side noise
 * - the whole school swims slowly across the scene
 * - opacity ramps in during chapters 4-6 and fades out for code-rain
 */
const COUNT = 1400;

function makeFishPositions(count: number): Float32Array {
  // Sample points inside a fish silhouette (signed function)
  // Body: ellipse |x/a|^2 + |y/b|^2 < 1, tail: small triangle to the left
  // Eye: a small dot near +x
  const positions = new Float32Array(count * 3);
  const offsets = new Float32Array(count * 3);
  let i = 0;
  let attempts = 0;
  while (i < count && attempts < count * 60) {
    attempts++;
    const x = (Math.random() * 2 - 1) * 1.6;
    const y = (Math.random() * 2 - 1) * 0.6;
    // body ellipse
    const inBody = (x / 1.0) * (x / 1.0) + (y / 0.45) * (y / 0.45) < 1.0;
    // tail triangle (open V to the left)
    const inTail =
      x < -0.8 && x > -1.55 && Math.abs(y) < (Math.abs(x) - 0.8) * 1.1;
    // top fin
    const inFin = x > -0.2 && x < 0.5 && y > 0.35 && y < 0.35 + (0.6 - Math.abs(x)) * 0.7;
    if (inBody || inTail || inFin) {
      const idx = i * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = (Math.random() - 0.5) * 0.05;
      // per-particle phase offset for breathing
      offsets[idx] = Math.random() * 6.28;
      offsets[idx + 1] = Math.random() * 6.28;
      offsets[idx + 2] = Math.random();
      i++;
    }
  }
  // any leftovers, scatter near center (rare)
  for (; i < count; i++) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 0.6;
    positions[idx + 1] = (Math.random() - 0.5) * 0.2;
    positions[idx + 2] = 0;
    offsets[idx] = Math.random() * 6.28;
    offsets[idx + 1] = Math.random() * 6.28;
    offsets[idx + 2] = Math.random();
  }
  return positions;
}

const vert = /* glsl */ `
uniform float uTime;
uniform float uDissolve;
uniform float uAlpha;
uniform float uPixelRatio;
uniform vec2 uSwim;

attribute vec3 aOffset; // px phase, py phase, dissolve threshold

varying float vGlow;
varying float vIsEye;

// 1D hash
float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vec3 pos = position;

  // breathing: small per-axis sinusoidal jitter
  pos.x += sin(uTime * 1.2 + aOffset.x) * 0.012;
  pos.y += cos(uTime * 1.1 + aOffset.y) * 0.014;

  // dissolve: at uDissolve >= threshold the particle drifts off as brine
  float t = clamp((uDissolve - aOffset.z) / 0.5, 0.0, 1.0);
  // drift direction depends on particle hash
  float h = hash(aOffset.x * 13.1 + aOffset.y * 7.3);
  vec3 drift = vec3(
    sin(uTime * 0.5 + h * 6.28) * 0.3,
    0.4 + h * 0.4,
    cos(uTime * 0.3 + h * 6.28) * 0.2
  );
  pos += drift * t * 1.0;

  // swim translation: whole fish slowly moves across the scene
  pos.x += uSwim.x;
  pos.y += uSwim.y;

  // tail wag: more displacement on negative x
  float wag = sin(uTime * 2.4 + position.x * 4.0) * 0.06;
  pos.y += wag * smoothstep(0.0, -1.5, position.x);

  // eye detection: small zone near +x, near y=0.05
  float isEye = step(0.8, position.x) * step(abs(position.y - 0.05), 0.08);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // point size: larger when near camera, larger for eye
  float size = mix(1.6, 0.8, t) * uPixelRatio;
  size += isEye * 5.0;
  gl_PointSize = size * (170.0 / -mv.z);

  vGlow = 1.0 - t;
  vIsEye = isEye;
}
`;

const frag = /* glsl */ `
precision highp float;
varying float vGlow;
varying float vIsEye;
uniform float uAlpha;

void main() {
  // circular point
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float disc = smoothstep(0.5, 0.35, d);
  // bright core
  float core = smoothstep(0.2, 0.0, d);

  vec3 saltCol = vec3(0.85, 0.82, 0.74);
  vec3 brineCol = vec3(0.28, 0.55, 0.85);
  vec3 col = mix(brineCol, saltCol, vGlow);

  // eye = warm yellow
  vec3 eyeCol = vec3(1.0, 0.85, 0.55);
  col = mix(col, eyeCol, vIsEye);

  float alpha = disc * (0.35 + 0.4 * core) * uAlpha;
  gl_FragColor = vec4(col, alpha);
}
`;

export default function SaltFish({ progress }: { progress: Progress }) {
  const ref = useRef<Points>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const geom = useMemo(() => {
    const g = new BufferGeometry();
    const positions = makeFishPositions(COUNT);
    const offsets = new Float32Array(COUNT * 3);
    // generate phases independently
    for (let i = 0; i < COUNT; i++) {
      offsets[i * 3] = Math.random() * 6.28;
      offsets[i * 3 + 1] = Math.random() * 6.28;
      offsets[i * 3 + 2] = Math.random();
    }
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aOffset", new BufferAttribute(offsets, 3));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uAlpha: { value: 0 },
      uPixelRatio: {
        value:
          typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1,
      },
      uSwim: { value: { x: 0, y: 0 } as any },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value += delta;

    // visible only chapters 5-6 so it doesn't smear over the boot scene
    const t = progress.chapter + progress.local;
    let alpha = 0;
    if (t > 4.7 && t < 7.0) {
      alpha = Math.min(1, (t - 4.7) * 2.2) * (1 - Math.max(0, (t - 6.1) * 1.6));
    }
    u.uAlpha.value += (alpha - u.uAlpha.value) * 0.1;

    // breathe between solid and brine continuously
    const breathe = 0.35 + 0.35 * Math.sin(u.uTime.value * 0.8);
    u.uDissolve.value = breathe;

    // swim across scene during ch5-6
    const swimT = Math.max(0, Math.min(1, (t - 4.7) / 1.5));
    u.uSwim.value.x = -2.2 + swimT * 4.0;
    u.uSwim.value.y = Math.sin(u.uTime.value * 0.5) * 0.2;

    // gently dissolve out into ch6+
    if (t > 6.0) {
      const d = Math.min(1, (t - 6.0) * 1.5);
      u.uDissolve.value = Math.max(u.uDissolve.value, d);
    }
  });

  return (
    <points ref={ref} geometry={geom} renderOrder={2}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
