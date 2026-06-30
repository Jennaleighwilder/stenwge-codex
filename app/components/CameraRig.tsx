"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, Vector3 } from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * Camera that drifts through scenes as we scroll.
 * Each chapter has a specific target position and look-at.
 */
const STOPS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  // ch0 – cookie void (close up, dark)
  { pos: [0, 0, 4], look: [0, 0, 0] },
  // ch1 – mouse asks for milk (slight push)
  { pos: [0, 0.3, 3.5], look: [0, 0, 0] },
  // ch2 – cat enters (pull back)
  { pos: [0, 0.6, 5], look: [0, 0, 0] },
  // ch3 – boot under the moon
  { pos: [0, 1.2, 6.5], look: [0, 0.5, 0] },
  // ch4 – we sink into the brine
  { pos: [0, -0.5, 5.5], look: [0, 0, 0] },
  // ch5 – salt fish swims past
  { pos: [-1.2, 0, 4.5], look: [0.5, 0, 0] },
  // ch6 – bird emerges, you are the bird
  { pos: [0, 0.4, 4.5], look: [0, 0, 0] },
  // ch7 – code rain reveal
  { pos: [0, 0, 5], look: [0, 0, 0] },
];

export default function CameraRig({ progress }: { progress: Progress }) {
  const { camera } = useThree();
  const tmp = useRef(new Vector3());
  const targetLook = useRef(new Vector3());

  useFrame(() => {
    const ch = Math.min(STOPS.length - 1, progress.chapter);
    const next = Math.min(STOPS.length - 1, ch + 1);
    const t = progress.local;

    const a = STOPS[ch].pos;
    const b = STOPS[next].pos;
    tmp.current.set(
      MathUtils.lerp(a[0], b[0], t),
      MathUtils.lerp(a[1], b[1], t),
      MathUtils.lerp(a[2], b[2], t)
    );

    // gentle parallax from mouse
    tmp.current.x += progress.mouseX * 0.25;
    tmp.current.y += progress.mouseY * 0.15;

    camera.position.lerp(tmp.current, 0.06);

    const la = STOPS[ch].look;
    const lb = STOPS[next].look;
    targetLook.current.set(
      MathUtils.lerp(la[0], lb[0], t),
      MathUtils.lerp(la[1], lb[1], t),
      MathUtils.lerp(la[2], lb[2], t)
    );
    camera.lookAt(targetLook.current);
  });

  return null;
}
