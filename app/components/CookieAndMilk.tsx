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
 * A cookie (warm point cluster) and a glass of milk (vertical translucent prism).
 * They appear in chapters 0-1 then drift away to be replaced by boot in chapter 2.
 */

const COOKIE_COUNT = 600;

function cookiePositions(): Float32Array {
  const pos = new Float32Array(COOKIE_COUNT * 3);
  for (let i = 0; i < COOKIE_COUNT; i++) {
    // disc of radius 0.6 with slight thickness
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.55;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r * 0.6 - 0.1; // squash vertically
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
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
  pos.x += sin(uTime * 0.8 + aSeed * 6.28) * 0.015;
  pos.y += cos(uTime * 0.7 + aSeed * 4.0) * 0.012;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (2.0 + aSeed * 2.5) * uPixelRatio * (180.0 / -mv.z);
}
`;
const frag = /* glsl */ `
precision highp float;
varying float vSeed;
uniform float uAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float disc = smoothstep(0.5, 0.3, d);
  // warm cookie color, varied
  vec3 base = vec3(0.85, 0.55, 0.25);
  vec3 dark = vec3(0.35, 0.18, 0.05);
  vec3 col = mix(dark, base, vSeed);
  // chocolate chip flecks (darker for some)
  col = mix(col, dark, step(0.88, vSeed));
  gl_FragColor = vec4(col, disc * uAlpha);
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
          typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1,
      },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    const t = progress.chapter + progress.local;

    // cookie alpha: visible ch0-1.5, fades after
    let cookieAlpha = 0;
    if (t < 2.3) {
      cookieAlpha = Math.min(1, t * 1.4) * (1 - Math.max(0, (t - 1.5) * 1.4));
    }
    matRef.current.uniforms.uAlpha.value +=
      (cookieAlpha - matRef.current.uniforms.uAlpha.value) * 0.06;

    // gentle rotation
    if (ref.current) {
      ref.current.rotation.y = matRef.current.uniforms.uTime.value * 0.2;
      ref.current.rotation.x = -0.3 + Math.sin(matRef.current.uniforms.uTime.value * 0.3) * 0.05;
      ref.current.position.set(-0.5, -0.1, 0);
    }

    // milk glass: appears slightly later, also fades
    if (milkRef.current) {
      let milkAlpha = 0;
      if (t > 0.6 && t < 2.5) {
        milkAlpha = Math.min(1, (t - 0.6) * 1.2) * (1 - Math.max(0, (t - 1.8) * 1.2));
      }
      (milkRef.current.material as any).opacity = milkAlpha * 0.55;
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
          blending={AdditiveBlending}
        />
      </points>
      {/* milk glass - simple cylinder */}
      <mesh ref={milkRef} position={[0.7, -0.15, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.18, 0.14, 0.6, 32, 1, true]} />
        <meshBasicMaterial color="#eaeaf2" transparent opacity={0} />
      </mesh>
    </group>
  );
}
