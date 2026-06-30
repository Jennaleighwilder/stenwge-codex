"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import type { Progress } from "./StenwgeCodex";
import { AudioState } from "./AudioState";

/**
 * The Stenwge Bird. ~700 particles forming a trailing comet that follows the cursor.
 * Each particle lags behind the head with progressively heavier damping, creating
 * a fluid "calligraphic" trail. During chapter 6 it appears; during chapter 7 the
 * particles peel off into glyphs (handed to CodeRain).
 */

const TRAIL_COUNT = 700;

const vert = /* glsl */ `
attribute float aAge;          // 0..1 where 0 = head, 1 = tail end
attribute float aSeed;
uniform float uTime;
uniform float uAlpha;
uniform float uPixelRatio;
varying float vAge;
varying float vSeed;
void main() {
  vAge = aAge;
  vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // gentle taper: head is small, tail dwindles to a thread
  float s = mix(2.2, 0.2, aAge);
  gl_PointSize = s * uPixelRatio * (110.0 / -mv.z);
}
`;
const frag = /* glsl */ `
precision highp float;
varying float vAge;
varying float vSeed;
uniform float uAlpha;
uniform float uTime;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float disc = smoothstep(0.5, 0.25, d);
  // head: muted cream, tail: muted teal — well below bloom threshold
  vec3 head = vec3(0.78, 0.72, 0.60);
  vec3 tail = vec3(0.30, 0.55, 0.70);
  vec3 col = mix(head, tail, smoothstep(0.0, 1.0, vAge));
  col *= 0.9 + 0.15 * sin(uTime * 4.0 + vSeed * 30.0);
  float alpha = disc * (1.0 - vAge) * uAlpha * 0.75;
  gl_FragColor = vec4(col, alpha);
}
`;

export default function StenwgeBird({ progress }: { progress: Progress }) {
  const ref = useRef<Points>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const { viewport } = useThree();

  const { geom, positions } = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(TRAIL_COUNT * 3);
    const ages = new Float32Array(TRAIL_COUNT);
    const seeds = new Float32Array(TRAIL_COUNT);
    for (let i = 0; i < TRAIL_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      ages[i] = i / TRAIL_COUNT;
      seeds[i] = Math.random();
    }
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aAge", new BufferAttribute(ages, 1));
    g.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return { geom: g, positions: pos };
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

  // working state
  const head = useRef(new Vector3(0, 0, 0));
  const target = useRef(new Vector3(0, 0, 0));
  const lastUpdate = useRef(0);

  useFrame((_, delta) => {
    if (!matRef.current || !ref.current) return;
    matRef.current.uniforms.uTime.value += delta;
    lastUpdate.current += delta;

    const t = progress.chapter + progress.local;
    // appear ch5.5+, peak ch6, fully gone by ch7.0 (before code-rain finale)
    let alpha = 0;
    if (t > 5.3 && t < 7.2) {
      alpha =
        Math.min(1, (t - 5.3) * 1.6) * (1 - Math.max(0, (t - 6.6) * 2.2));
    }
    // very subtle low-band breathing, not a brightness explosion
    const beatBoost = 1.0 + AudioState.lows * 0.18;
    matRef.current.uniforms.uAlpha.value +=
      (alpha * beatBoost - matRef.current.uniforms.uAlpha.value) * 0.1;

    // target: cursor in world space, mapped to camera plane
    target.current.x = progress.mouseX * (viewport.width * 0.4);
    target.current.y = progress.mouseY * (viewport.height * 0.4);
    target.current.z = 0.5;
    // when bird isn't yet visible, idle figure-eight in scene
    if (alpha < 0.05) {
      const time = matRef.current.uniforms.uTime.value;
      target.current.set(
        Math.sin(time * 0.6) * 1.5,
        Math.cos(time * 0.45) * 0.8,
        0,
      );
    }

    // spring head toward target
    head.current.lerp(target.current, 0.12);

    // shift all positions down (each particle inherits previous one), head at index 0
    // we do this at a fixed cadence (~60Hz)
    if (lastUpdate.current > 1 / 60) {
      lastUpdate.current = 0;
      // shift from end to start
      for (let i = TRAIL_COUNT - 1; i > 0; i--) {
        positions[i * 3] = positions[(i - 1) * 3];
        positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
        positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
      }
      positions[0] = head.current.x;
      positions[1] = head.current.y;
      positions[2] = head.current.z;
      const attr = ref.current.geometry.attributes.position as BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  return (
    <points ref={ref} geometry={geom} renderOrder={4}>
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
  );
}
