"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense } from "react";
import type { Progress } from "./StenwgeCodex";
import BrineBackground from "./BrineBackground";
import SaltFish from "./SaltFish";
import Boot from "./Boot";
import StenwgeBird from "./StenwgeBird";
import CookieAndMilk from "./CookieAndMilk";
import CodeRain from "./CodeRain";
import CameraRig from "./CameraRig";
import { Vector2 } from "three";

export default function Scene3D({ progress }: { progress: Progress }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#020306"]} />
      <fog attach="fog" args={["#020306", 10, 35]} />

      <ambientLight intensity={0.15} />

      <Suspense fallback={null}>
        <CameraRig progress={progress} />
        <BrineBackground progress={progress} />
        <CookieAndMilk progress={progress} />
        <Boot progress={progress} />
        <SaltFish progress={progress} />
        <StenwgeBird progress={progress} />
        <CodeRain progress={progress} />

        <EffectComposer>
          <Bloom
            intensity={0.22}
            luminanceThreshold={0.7}
            luminanceSmoothing={0.92}
            mipmapBlur
          />
          <ChromaticAberration
            offset={new Vector2(0.0006, 0.0009)}
            radialModulation={false}
            modulationOffset={0}
            blendFunction={BlendFunction.NORMAL}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.75} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
