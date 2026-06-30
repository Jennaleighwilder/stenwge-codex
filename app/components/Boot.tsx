"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
} from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * The boot under the moon. Drawn as a solid leather silhouette mesh
 * (Shape geometry) with a softer rim glow. Inside curl a tiny mouse
 * and a slightly larger cat — both rendered as small composite shapes
 * so they actually read as creatures, not random dots.
 */

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
];

function buildBootShape(): Shape {
  const s = new Shape();
  s.moveTo(BOOT_PATH[0][0], BOOT_PATH[0][1]);
  for (let i = 1; i < BOOT_PATH.length; i++) {
    s.lineTo(BOOT_PATH[i][0], BOOT_PATH[i][1]);
  }
  s.closePath();
  return s;
}

/** A small mouse: round body + smaller head + ear + thin tail line. */
function Mouse({ alphaRef }: { alphaRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const headRef = useRef<Mesh>(null);
  const earRef = useRef<Mesh>(null);
  const tailRef = useRef<Mesh>(null);

  useFrame((_, dt) => {
    const a = alphaRef.current;
    for (const r of [bodyRef, headRef, earRef, tailRef]) {
      if (r.current) (r.current.material as MeshBasicMaterial).opacity = a;
    }
    if (groupRef.current) {
      groupRef.current.position.y = -0.32 + Math.sin(performance.now() * 0.001) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={[-0.45, -0.32, 0.02]}>
      {/* body */}
      <mesh ref={bodyRef}>
        <circleGeometry args={[0.07, 32]} />
        <meshBasicMaterial color="#f5e9c7" transparent opacity={0} />
      </mesh>
      {/* head, slightly forward */}
      <mesh ref={headRef} position={[0.08, 0.015, 0]}>
        <circleGeometry args={[0.045, 24]} />
        <meshBasicMaterial color="#f8eed3" transparent opacity={0} />
      </mesh>
      {/* round ear */}
      <mesh ref={earRef} position={[0.06, 0.06, 0]}>
        <circleGeometry args={[0.022, 16]} />
        <meshBasicMaterial color="#e6d5a7" transparent opacity={0} />
      </mesh>
      {/* thin curled tail (using elongated ellipse) */}
      <mesh
        ref={tailRef}
        position={[-0.1, -0.02, 0]}
        rotation={[0, 0, 0.6]}
        scale={[1, 0.18, 1]}
      >
        <circleGeometry args={[0.06, 20]} />
        <meshBasicMaterial color="#e6d5a7" transparent opacity={0} />
      </mesh>
    </group>
  );
}

/** A larger cat: body + head + two triangular ears + tail. */
function Cat({ alphaRef }: { alphaRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const headRef = useRef<Mesh>(null);
  const ear1Ref = useRef<Mesh>(null);
  const ear2Ref = useRef<Mesh>(null);
  const tailRef = useRef<Mesh>(null);

  useFrame((_, dt) => {
    const a = alphaRef.current;
    for (const r of [bodyRef, headRef, ear1Ref, ear2Ref, tailRef]) {
      if (r.current) (r.current.material as MeshBasicMaterial).opacity = a;
    }
    if (groupRef.current) {
      groupRef.current.position.y = -0.28 + Math.cos(performance.now() * 0.0008) * 0.012;
    }
  });

  return (
    <group ref={groupRef} position={[0.32, -0.28, 0.02]}>
      {/* body — curled, oval */}
      <mesh ref={bodyRef} scale={[1.3, 0.85, 1]}>
        <circleGeometry args={[0.13, 36]} />
        <meshBasicMaterial color="#7fa9d8" transparent opacity={0} />
      </mesh>
      {/* head */}
      <mesh ref={headRef} position={[0.14, 0.06, 0]}>
        <circleGeometry args={[0.08, 28]} />
        <meshBasicMaterial color="#94b7df" transparent opacity={0} />
      </mesh>
      {/* triangular ears using rotated narrow circles (approx) */}
      <mesh
        ref={ear1Ref}
        position={[0.11, 0.13, 0]}
        rotation={[0, 0, -0.4]}
        scale={[0.6, 1, 1]}
      >
        <circleGeometry args={[0.04, 3]} />
        <meshBasicMaterial color="#7aa3d2" transparent opacity={0} />
      </mesh>
      <mesh
        ref={ear2Ref}
        position={[0.18, 0.13, 0]}
        rotation={[0, 0, 0.4]}
        scale={[0.6, 1, 1]}
      >
        <circleGeometry args={[0.04, 3]} />
        <meshBasicMaterial color="#7aa3d2" transparent opacity={0} />
      </mesh>
      {/* tail curled over body */}
      <mesh
        ref={tailRef}
        position={[-0.13, 0.05, 0]}
        rotation={[0, 0, 0.8]}
        scale={[1, 0.18, 1]}
      >
        <circleGeometry args={[0.13, 24]} />
        <meshBasicMaterial color="#7aa3d2" transparent opacity={0} />
      </mesh>
    </group>
  );
}

export default function Boot({ progress }: { progress: Progress }) {
  const groupRef = useRef<Group>(null);
  const bootRef = useRef<Mesh>(null);
  const bootGlowRef = useRef<Mesh>(null);
  const moonRef = useRef<Mesh>(null);
  const creatureAlpha = useRef(0);

  const { bootGeom, glowGeom } = useMemo(() => {
    const shape = buildBootShape();
    return {
      bootGeom: new ShapeGeometry(shape, 64),
      glowGeom: new ShapeGeometry(shape, 64),
    };
  }, []);

  useFrame(() => {
    const t = progress.chapter + progress.local;
    let alpha = 0;
    if (t > 1.8 && t < 5.0) {
      alpha = Math.min(1, (t - 1.8) * 1.2) * (1 - Math.max(0, (t - 4.0) * 1.0));
    }

    if (bootRef.current) {
      (bootRef.current.material as MeshBasicMaterial).opacity = alpha * 0.95;
    }
    if (bootGlowRef.current) {
      (bootGlowRef.current.material as MeshBasicMaterial).opacity = alpha * 0.18;
    }
    creatureAlpha.current = alpha;

    if (moonRef.current) {
      const mt = t;
      let ma = 0;
      if (mt > 2.4 && mt < 4.5) {
        ma =
          Math.min(1, (mt - 2.4) * 1.4) *
          (1 - Math.max(0, (mt - 3.8) * 1.2));
      }
      (moonRef.current.material as MeshBasicMaterial).opacity = ma;
      moonRef.current.position.set(1.6, 1.3, -1.0);
    }

    if (groupRef.current) {
      const ms = performance.now() * 0.0005;
      groupRef.current.position.y = -0.05 + Math.sin(ms) * 0.02;
      groupRef.current.rotation.z = Math.sin(ms * 0.6) * 0.025;
    }
  });

  return (
    <group>
      {/* moon */}
      <mesh ref={moonRef} renderOrder={0}>
        <circleGeometry args={[0.42, 64]} />
        <meshBasicMaterial color="#f4dca3" transparent opacity={0} />
      </mesh>

      {/* boot itself, fills the shape */}
      <group ref={groupRef} position={[0, -0.05, 0]}>
        {/* soft halo behind boot */}
        <mesh
          ref={bootGlowRef}
          geometry={glowGeom}
          scale={[1.12, 1.12, 1]}
          position={[0, 0, -0.02]}
          renderOrder={1}
        >
          <meshBasicMaterial
            color="#8a6034"
            transparent
            opacity={0}
            side={DoubleSide}
          />
        </mesh>
        {/* filled boot silhouette */}
        <mesh ref={bootRef} geometry={bootGeom} renderOrder={2}>
          <meshBasicMaterial
            color="#3a2614"
            transparent
            opacity={0}
            side={DoubleSide}
          />
        </mesh>

        {/* creatures inside */}
        <Mouse alphaRef={creatureAlpha} />
        <Cat alphaRef={creatureAlpha} />
      </group>
    </group>
  );
}
