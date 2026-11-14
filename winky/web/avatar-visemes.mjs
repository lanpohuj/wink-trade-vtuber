/* Timed speech sounds; no random vowel oscillator and no new audio playback. */
const SHAPES = {
  X: [0, 0, 0, 0.3],
  A: [0, 0, 0, 0.12],
  B: [0.12, 0.1, 0, 0.08],
  C: [0.36, 0.18, 0, 0.04],
  D: [0.66, 0.08, 0, 0],
  E: [0.16, 0.03, 0.32, 0.02],
  F: [0.03, 0, 0.62, 0],
};
export function visemeWeights(cues, time) {
  let low = 0,
    high = cues.length - 1,
    index = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (cues[mid].start <= time) {
      index = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  const c = cues[index];
  let weights = SHAPES.X;
  if (c && time < c.end) {
    weights = SHAPES[c.value] || SHAPES.X;
    const next = cues[index + 1];
    if (next && time > c.end - 0.035) {
      const w = Math.max(0, Math.min(1, (time - (c.end - 0.035)) / 0.035));
      weights = weights.map(
        (x, i) => x + ((SHAPES[next.value] || SHAPES.X)[i] - x) * w,
      );
    }
  }
  return {
    face_mesh1: weights[0],
    face_mesh6: weights[1],
    face_mesh9: weights[2],
    face_mesh3: 0,
    face_mesh4_2: weights[3],
  };
}
