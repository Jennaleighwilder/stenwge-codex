"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  NormalBlending,
  ShaderMaterial,
  Vector2,
} from "three";
import type { Progress } from "./StenwgeCodex";

/**
 * Code rain reveal scene. A full-screen shader using a glyph atlas texture.
 * Falling streams of characters, but the characters spell out lines from the
 * conversation. Activates from chapter 6.5 onward and intensifies in chapter 7.
 */

// What the streams spell — actual prompt fragments and code lines from the
// conversation that produced this experience. The "variance" made visible.
const POEM_LINES = [
  "if you have a mouse and a cookie who gets the milk",
  "imagine this story is a system",
  "and it needs to be written in code",
  "mouse.lactose_intolerant = True",
  "cat.vegetarian = True",
  "def attempt_truce(mouse, cat):",
  "  return offers_milk_to_cat_for_the_cause",
  "pos += drift * dissolve",
  "head.lerp(target, 0.12)",
  "salt and brine, not wood and lies",
  "weightless in a world of salt and stone",
  "you are a stenwge bird",
  "the code compiles. the tale persists.",
];

function buildGlyphAtlas(): { texture: CanvasTexture; cols: number; rows: number; charCount: number; chars: string } {
  // pack all unique chars from POEM_LINES + a few extras
  const all = (POEM_LINES.join(" ").toLowerCase() + "abcdefghijklmnopqrstuvwxyz 01.,").split("");
  const unique = Array.from(new Set(all)).join("");
  const cols = 16;
  const rows = Math.ceil(unique.length / cols);
  const cell = 64;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < unique.length; i++) {
    const x = (i % cols) * cell + cell / 2;
    const y = Math.floor(i / cols) * cell + cell / 2 + 2;
    ctx.fillText(unique[i], x, y);
  }
  const tex = new CanvasTexture(canvas);
  tex.minFilter = (tex as any).LinearFilter ?? 1006;
  tex.needsUpdate = true;
  return { texture: tex, cols, rows, charCount: unique.length, chars: unique };
}

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAlpha;
uniform vec2 uResolution;
uniform sampler2D uAtlas;
uniform float uAtlasCols;
uniform float uAtlasRows;
uniform float uCharCount;
uniform sampler2D uMessage;
uniform float uMessageLen;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

void main() {
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = vUv;
  // cell grid — fewer, wider columns so each glyph reads
  vec2 grid = vec2(48.0, 28.0);
  vec2 cell = floor(uv * grid);
  vec2 inCell = fract(uv * grid);

  // column existence — only ~55% of columns rain at any one moment
  float colSeed = hash(vec2(cell.x, 0.5));
  float colActive = step(0.45, colSeed);

  float speed = 1.4 + colSeed * 1.4;
  float colPhase = colSeed * 100.0;
  // signed distance from the falling head
  float headDist = mod(uTime * speed + colPhase - cell.y, grid.y);

  // glyph: along head, use a message char; elsewhere, a slowly-changing random
  float glyphSel;
  if (headDist < 6.0) {
    // walk through message offset by column so each column reads its own slice
    float mIdx = mod(
      floor(cell.x * 5.0 + uTime * speed * 2.0 - headDist),
      uMessageLen
    );
    glyphSel = texture2D(uMessage, vec2((mIdx + 0.5) / uMessageLen, 0.5)).r * 255.0;
  } else {
    glyphSel = floor(hash(cell + floor(uTime * 0.4)) * uCharCount);
  }

  // sample atlas (note flipped V)
  float gx = mod(glyphSel, uAtlasCols);
  float gy = floor(glyphSel / uAtlasCols);
  vec2 atlasUv = vec2(
    (gx + inCell.x) / uAtlasCols,
    1.0 - (gy + 1.0 - inCell.y) / uAtlasRows
  );
  float glyph = texture2D(uAtlas, atlasUv).a;

  // intensity drops fast behind the head so streams look like trails not noise
  float trail = exp(-headDist * 0.35);
  // head pop (first 1.5 cells)
  float headPop = exp(-headDist * 1.5);
  // tail is muted teal-green, head is warm cream — both kept moderate
  vec3 tailCol = vec3(0.18, 0.55, 0.34);
  vec3 headCol = vec3(0.85, 0.92, 0.78);
  vec3 col = mix(tailCol, headCol, headPop);

  float intensity = trail * glyph * colActive;
  vec3 outCol = col * intensity * uAlpha;
  gl_FragColor = vec4(outCol, intensity * uAlpha * 0.9);
}
`;

export default function CodeRain({ progress }: { progress: Progress }) {
  const matRef = useRef<ShaderMaterial>(null);
  const { size } = useThree();

  const atlas = useMemo(() => {
    if (typeof document === "undefined") return null;
    return buildGlyphAtlas();
  }, []);

  // Build a 1D "message texture" indexing into atlas chars
  const messageData = useMemo(() => {
    if (!atlas) return null;
    const text = POEM_LINES.join(" • ").toLowerCase();
    const indices = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const idx = atlas.chars.indexOf(text[i]);
      indices[i] = idx >= 0 ? idx : 0;
    }
    const canvas = document.createElement("canvas");
    canvas.width = text.length;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(text.length, 1);
    for (let i = 0; i < text.length; i++) {
      img.data[i * 4] = indices[i];
      img.data[i * 4 + 1] = 0;
      img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new CanvasTexture(canvas);
    tex.needsUpdate = true;
    return { tex, len: text.length };
  }, [atlas]);

  const uniforms = useMemo(() => {
    if (!atlas || !messageData) return null;
    return {
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uResolution: { value: new Vector2(size.width, size.height) },
      uAtlas: { value: atlas.texture },
      uAtlasCols: { value: atlas.cols },
      uAtlasRows: { value: atlas.rows },
      uCharCount: { value: atlas.charCount },
      uMessage: { value: messageData.tex },
      uMessageLen: { value: messageData.len },
    };
  }, [atlas, messageData, size.width, size.height]);

  useFrame((_, delta) => {
    if (!matRef.current || !uniforms) return;
    const u = matRef.current.uniforms;
    u.uTime.value += delta;
    const t = progress.chapter + progress.local;
    let a = 0;
    if (t > 6.3) {
      a = Math.min(0.95, (t - 6.3) * 1.3);
    }
    u.uAlpha.value += (a - u.uAlpha.value) * 0.05;
    u.uResolution.value.set(size.width, size.height);
  });

  if (!uniforms) return null;

  return (
    <mesh frustumCulled={false} renderOrder={5}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={NormalBlending}
      />
    </mesh>
  );
}
