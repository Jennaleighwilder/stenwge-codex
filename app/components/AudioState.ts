/**
 * Shared module-level audio state.
 * AmbientAudio writes here once per animation frame; BrineBackground / StenwgeBird
 * read it from useFrame to drive subtle music-reactive visuals.
 *
 * Values:
 *  - level   : 0..1 broadband RMS (overall loudness)
 *  - lows    : 0..1 energy in low band (kicks, bass)
 *  - highs   : 0..1 energy in high band (hats, sizzle, sparkle)
 */
export const AudioState = {
  level: 0,
  lows: 0,
  highs: 0,
  playing: false,
};
