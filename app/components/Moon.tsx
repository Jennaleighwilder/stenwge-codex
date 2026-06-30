"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshBasicMaterial } from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * A standalone moon disc that rises across the experience. Fades in
 * chapter 2, drifts slowly upward, peaks at chapter 4, lingers through
 * chapter 7, then fades to black for the final beat.
 */
export default function Moon({ progress }: { progress: Progress }) {
  const meshRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  useFrame(() => {
    const t = progress.chapter + progress.local;
    let alpha = 0;
    if (t > 1.6 && t < 7.8) {
      alpha =
        Math.min(1, (t - 1.6) * 0.9) * (1 - Math.max(0, (t - 7.0) * 1.3));
    }

    // moon rises: low-right (1.7, 0.4) at ch2, high-right (1.9, 1.6) by ch4
    const rise = Math.min(1, Math.max(0, (t - 1.6) / 2.8));
    const x = 1.6 + rise * 0.25;
    const y = 0.4 + rise * 1.3;

    if (meshRef.current) {
      meshRef.current.position.set(x, y, -1.0);
      (meshRef.current.material as MeshBasicMaterial).opacity = alpha;
    }
    if (haloRef.current) {
      haloRef.current.position.set(x, y, -1.05);
      (haloRef.current.material as MeshBasicMaterial).opacity = alpha * 0.25;
    }
  });

  return (
    <group>
      {/* halo */}
      <mesh ref={haloRef} renderOrder={0}>
        <circleGeometry args={[0.95, 64]} />
        <meshBasicMaterial color="#f4dca3" transparent opacity={0} />
      </mesh>
      {/* moon disc */}
      <mesh ref={meshRef} renderOrder={1}>
        <circleGeometry args={[0.4, 64]} />
        <meshBasicMaterial color="#f4dca3" transparent opacity={0} />
      </mesh>
    </group>
  );
}
