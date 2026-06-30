"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * A small cookie and a small milk glass, placed deliberately off the screen
 * center so the narrative text is always readable. Both use normal blending
 * (not additive) and stay below the bloom threshold so they never bloom out.
 */

const COOKIE_COUNT = 280;

function cookiePositions(): Float32Array {
  const pos = new Float32Array(COOKIE_COUNT * 3);
  for (let i = 0; i < COOKIE_COUNT; i++) {
    // tight disc, small radius
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.28;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * 0.55;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
  }
  return pos;
}

const vert = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uPixelRatio;
attribute float aSeed;
varying float vSeed;
void main() {
  vSeed = aSeed;
  vec3 pos = position;
  pos.x += sin(uTime * 0.7 + aSeed * 6.28) * 0.005;
  pos.y += cos(uTime * 0.6 + aSeed * 4.0) * 0.004;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  // small points only
  gl_PointSize = (1.4 + aSeed * 1.4) * uPixelRatio * (110.0 / -mv.z);
}
`;
const frag = /* glsl */ `
precision highp float;
varying float vSeed;
uniform float uAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  // soft disc but with hard cutoff to keep bloom from triggering
  float disc = smoothstep(0.5, 0.30, d);
  // muted warm browns (well below bloom threshold of 0.55)
  vec3 base = vec3(0.36, 0.24, 0.13);
  vec3 dark = vec3(0.16, 0.10, 0.05);
  vec3 col = mix(dark, base, vSeed);
  // chip flecks (darker for some)
  col = mix(col, dark * 0.6, step(0.85, vSeed));
  gl_FragColor = vec4(col, disc * uAlpha * 0.75);
}
`;

export default function CookieAndMilk({ progress }: { progress: Progress }) {
  const ref = useRef<Points>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const milkRef = useRef<any>(null);

  const geom = useMemo(() => {
    const g = new BufferGeometry();
    const positions = cookiePositions();
    const seeds = new Float32Array(COOKIE_COUNT);
    for (let i = 0; i < COOKIE_COUNT; i++) seeds[i] = Math.random();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uPixelRatio: {
        value:
          typeof window !== "undefined"
            ? Math.min(window.devicePixelRatio, 2)
            : 1,
      },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    const t = progress.chapter + progress.local;

    // cookie alpha: hidden during title (t<0.55), gentle in/out for ch1
    let cookieAlpha = 0;
    if (t > 0.55 && t < 2.3) {
      cookieAlpha =
        Math.min(1, (t - 0.55) * 1.6) * (1 - Math.max(0, (t - 1.6) * 1.4));
    }
    matRef.current.uniforms.uAlpha.value +=
      (cookieAlpha - matRef.current.uniforms.uAlpha.value) * 0.08;

    if (ref.current) {
      ref.current.rotation.y = matRef.current.uniforms.uTime.value * 0.15;
      ref.current.rotation.x =
        -0.35 + Math.sin(matRef.current.uniforms.uTime.value * 0.3) * 0.04;
      // place cookie down and far left, well below the centered text
      ref.current.position.set(-1.45, -0.95, 0);
    }

    if (milkRef.current) {
      let milkAlpha = 0;
      if (t > 0.9 && t < 2.6) {
        milkAlpha =
          Math.min(1, (t - 0.9) * 1.2) * (1 - Math.max(0, (t - 1.9) * 1.2));
      }
      (milkRef.current.material as any).opacity = milkAlpha * 0.32;
      milkRef.current.position.set(1.5, -0.85, 0);
    }
  });

  return (
    <group>
      <points ref={ref} geometry={geom} renderOrder={2}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={NormalBlending}
        />
      </points>
      {/* milk glass: small, lower-right, dim */}
      <mesh ref={milkRef} renderOrder={1}>
        <cylinderGeometry args={[0.13, 0.10, 0.4, 32, 1, true]} />
        <meshBasicMaterial color="#cbd0d8" transparent opacity={0} />
      </mesh>
    </group>
  );
}
