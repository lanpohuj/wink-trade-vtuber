import test from "node:test";
import assert from "node:assert/strict";
import { visemeWeights } from "../winky/web/avatar-visemes.mjs";
import { PerformanceDirector } from "../winky/web/avatar-performance.mjs";
const cues = [
  { start: 0, end: 0.2, value: "X" },
  { start: 0.2, end: 0.4, value: "D" },
  { start: 0.4, end: 0.6, value: "A" },
  { start: 0.6, end: 0.8, value: "F" },
  { start: 0.8, end: 1, value: "X" },
];
test("mouth follows timed speech sounds and closes for pauses/consonants/end", () => {
  assert.equal(visemeWeights(cues, 0.1).face_mesh1, 0);
  assert.ok(visemeWeights(cues, 0.3).face_mesh1 > 0.5);
  assert.equal(visemeWeights(cues, 0.5).face_mesh1, 0);
  assert.ok(visemeWeights(cues, 0.7).face_mesh9 > 0.5);
  assert.equal(visemeWeights(cues, 2).face_mesh9, 0);
});
test("mouth-only audition does not trigger rejected body gestures", () => {
  const d = new PerformanceDirector(() => 0.1);
  d.begin({
    speech_id: "probe",
    duration: 2,
    mouthCues: cues,
    animation: { profile: "chat", gestures_disabled: true, cue_offsets: [0.1] },
  });
  d.frame({ speech_id: "probe", elapsed: 0.5, rms: 0.5 });
  d.update(0.016, 0.5);
  assert.equal(d.gesture, null);
  assert.deepEqual(d.speech.mouthCues, cues);
});
