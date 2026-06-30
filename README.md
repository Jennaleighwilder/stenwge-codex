# The Stenwge Codex

A small, strange artifact built from one weird conversation.

It is a single‑page scroll‑driven WebGL experience. As you scroll, you move
through eight chapters of a hand‑woven fairy tale: a cookie, a lactose‑intolerant
mouse, a vegetarian cat, a worn boot under the moon, a fish wrought of salt and
brine, and a strange bird who narrates the whole thing.

Everything visible is generated live:

- **`BrineBackground.tsx`** — a custom fragment shader that paints a continuously
  morphing field of brine, stone speckle and salt sparkle. A `uPhase` uniform
  smoothly lerps the entire palette and lighting between chapters.
- **`SaltFish.tsx`** — ~1,400 GPU particles sampled inside a fish silhouette,
  driven by a vertex shader that breathes the body between solid salt crystals
  and dissolving brine droplets. The eye and tail wag are baked in.
- **`Boot.tsx`** — points lofted along a Catmull‑Rom curve traced from a worn
  boot outline. Two glowing dots (mouse + cat) curl inside; a soft moon disc
  glows above.
- **`StenwgeBird.tsx`** — a 700‑particle calligraphic comet that idles in a
  figure‑eight until you scroll into chapter 6, then locks onto the cursor as
  a fluid trailing brush.
- **`CodeRain.tsx`** — a falling‑glyph shader that pulls characters from a
  baked atlas. The heads of the streams spell out lines from the conversation
  that birthed this codex.
- **`AmbientAudio.tsx`** — a generative Web Audio drone of seven sine partials
  plus brine noise, with a chord profile per chapter and a filter cutoff that
  opens as the story brightens.

Post‑processed with subtle bloom, chromatic aberration, and a soft vignette.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- React Three Fiber + drei + postprocessing
- Tailwind 4
- Framer Motion (text beats)
- Three.js (custom GLSL throughout)
- Web Audio API (no Tone.js dependency)

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>, click `🔊 listen` to start the drone, and
scroll slowly.

## Credit

The story belongs to whoever told it. The code was written in a single sitting
by an AI given the right strange direction. The bird, of course, is you.
