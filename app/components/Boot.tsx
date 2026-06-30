"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * The boot under the moon. Constructed by lofting points along a 2D silhouette
 * traced from a worn boot. Inside: two tiny glowing dots (mouse + cat).
 * Above: a soft moon disc.
 */

// silhouette points of a boot (rough outline, hand-tuned)
const BOOT_PATH: [number, number][] = [
  [-1.0, -0.55],
  [-0.95, -0.35],
  [-0.85, -0.05],
  [-0.75, 0.25],
  [-0.55, 0.4],
  [-0.25, 0.55],
  [0.05, 0.6],
  [0.3, 0.55],
  [0.4, 0.4],
  [0.45, 0.2],
  [0.5, 0.05],
  [0.6, -0.05],
  [0.85, -0.15],
  [1.0, -0.3],
  [1.05, -0.45],
  [1.0, -0.55],
  [0.5, -0.6],
  [0.0, -0.62],
  [-0.5, -0.6],
  [-1.0, -0.55],
];

function buildBootPoints(count = 1000): { positions: Float32Array; widths: Float32Array } {
  const pts = BOOT_PATH.map(([x, y]) => new Vector3(x, y, 0));
  const curve = new CatmullRomCurve3(pts, true, "catmullrom", 0.3);
  const positions = new Float32Array(count * 3);
  const widths = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const p = curve.getPoint(t);
    // jitter outward slightly for "worn leather"
    const jit = (Math.random() - 0.5) * 0.025;
    positions[i * 3] = p.x + jit;
    positions[i * 3 + 1] = p.y + jit * 0.8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    widths[i] = Math.random();
  }
  return { positions, widths };
}

const bootVert = /* glsl */ `
attribute float aWidth;
uniform float uTime;
uniform float uAlpha;
uniform float uPixelRatio;
varying float vSeed;
void main() {
  vSeed = aWidth;
  vec3 pos = position;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 + aWidth * 1.4) * uPixelRatio * (130.0 / -mv.z);
}
`;
const bootFrag = /* glsl */ `
precision highp float;
varying float vSeed;
uniform float uAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float disc = smoothstep(0.5, 0.32, d);
  vec3 leather = mix(vec3(0.42, 0.28, 0.16), vec3(0.18, 0.12, 0.07), vSeed);
  float alpha = disc * uAlpha * 0.85;
  gl_FragColor = vec4(leather, alpha);
}
`;

export default function Boot({ progress }: { progress: Progress }) {
  const ref = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const mouseRef = useRef<Mesh>(null);
  const catRef = useRef<Mesh>(null);
  const moonRef = useRef<Mesh>(null);

  const { geom } = useMemo(() => {
    const g = new BufferGeometry();
    const { positions, widths } = buildBootPoints(1100);
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.setAttribute("aWidth", new BufferAttribute(widths, 1));
    return { geom: g };
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

    // visible from ch2 (cat enters) through ch4 (sinking)
    const t = progress.chapter + progress.local;
    let alpha = 0;
    if (t > 1.8 && t < 5.0) {
      alpha = Math.min(1, (t - 1.8) * 1.2) * (1 - Math.max(0, (t - 4.0) * 1.0));
    }
    matRef.current.uniforms.uAlpha.value +=
      (alpha - matRef.current.uniforms.uAlpha.value) * 0.06;

    // mouse / cat positions inside boot, gentle bob
    if (mouseRef.current) {
      mouseRef.current.position.set(
        -0.5 + Math.sin(matRef.current.uniforms.uTime.value * 1.4) * 0.02,
        -0.25 + Math.cos(matRef.current.uniforms.uTime.value * 1.1) * 0.02,
        0.02,
      );
      const mAlpha = alpha;
      (mouseRef.current.material as any).opacity = mAlpha;
    }
    if (catRef.current) {
      catRef.current.position.set(
        0.4 + Math.sin(matRef.current.uniforms.uTime.value * 0.8 + 1) * 0.02,
        -0.2 + Math.cos(matRef.current.uniforms.uTime.value * 0.9 + 1) * 0.02,
        0.02,
      );
      (catRef.current.material as any).opacity = alpha;
    }

    // moon, visible during ch3 mostly
    if (moonRef.current) {
      const mt = t;
      let ma = 0;
      if (mt > 2.4 && mt < 4.5) {
        ma = Math.min(1, (mt - 2.4) * 1.4) * (1 - Math.max(0, (mt - 3.8) * 1.2));
      }
      (moonRef.current.material as any).opacity = ma;
      moonRef.current.position.set(1.6, 1.3, -1.0);
    }

    // boot itself bobs gently
    if (ref.current) {
      ref.current.position.y = -0.2 + Math.sin(matRef.current.uniforms.uTime.value * 0.6) * 0.02;
      ref.current.rotation.z = Math.sin(matRef.current.uniforms.uTime.value * 0.3) * 0.03;
    }
  });

  return (
    <group>
      <points
        ref={ref as any}
        geometry={geom}
        position={[0, -0.2, 0]}
        renderOrder={1}
      >
        <shaderMaterial
          ref={matRef}
          vertexShader={bootVert}
          fragmentShader={bootFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </points>

      {/* mouse: tiny warm-white sphere */}
      <mesh ref={mouseRef} renderOrder={3}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#fff2c8" transparent opacity={0} />
      </mesh>

      {/* cat: slightly larger, cool-blue sphere */}
      <mesh ref={catRef} renderOrder={3}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#9ec9ff" transparent opacity={0} />
      </mesh>

      {/* moon */}
      <mesh ref={moonRef} renderOrder={0}>
        <circleGeometry args={[0.5, 64]} />
        <meshBasicMaterial color="#ffe8b0" transparent opacity={0} />
      </mesh>
    </group>
  );
}
