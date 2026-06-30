"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense } from "react";
import type { Progress } from "./StenwgeCodex";
import BrineBackground from "./BrineBackground";
import Moon from "./Moon";

/**
 * Just the brine background shader + a rising moon, behind everything.
 * The Grok video is layered on top as the visual centerpiece.
 */
export default function Scene3D({ progress }: { progress: Progress }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#020306"]} />

      <Suspense fallback={null}>
        <BrineBackground progress={progress} />
        <Moon progress={progress} />

        <EffectComposer>
          <Bloom
            intensity={0.22}
            luminanceThreshold={0.7}
            luminanceSmoothing={0.92}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
