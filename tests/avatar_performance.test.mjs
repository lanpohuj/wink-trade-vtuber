import test from "node:test";
import assert from "node:assert/strict";
import {
  PerformanceDirector,
  GESTURES,
} from "../winky/web/avatar-performance.mjs";
let seed = 731;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const event = (id, profile = "chat") => ({
  speech_id: id,
  duration: 5,
  animation: {
    profile,
    flirt_allowed: !["loss", "opening"].includes(profile),
    emotion: "happy",
    cue_offsets: [0.2, 2.8],
  },
});
test("start/end identity and out of order RMS", () => {
  const d = new PerformanceDirector(random);
  assert.ok(d.begin(event("a")));
  assert.equal(d.begin(event("a")), false);
  assert.equal(d.frame({ speech_id: "other", elapsed: 1, rms: 0.5 }), false);
  d.frame({ speech_id: "a", elapsed: 1, rms: 0.3 });
  assert.equal(d.frame({ speech_id: "a", elapsed: 0.5, rms: 1 }), false);
  assert.equal(d.end({ speech_id: "other" }), false);
  assert.ok(d.end({ speech_id: "a" }));
  assert.equal(d.rms, 0);
  assert.equal(d.mood, "idle");
  assert.equal(d.speech, null);
});
test("all twenty gestures have finite unique bone targets and return to rest", () => {
  assert.equal(Object.keys(GESTURES).length, 20);
  for (const action of Object.keys(GESTURES)) {
    const d = new PerformanceDirector(random);
    d.trigger(action, 2, true);
    d.update(0.016, 1);
    const pose = d.pose(1);
    assert.ok(Object.keys(pose).length > 40);
    for (const target of Object.values(pose))
      assert.ok(target.length === 3 && target.every(Number.isFinite), action);
    assert.deepEqual(pose.Shibahu_Tail1, [0, 0, 0]);
    d.update(0.016, 3);
    assert.equal(d.gesture, null, action);
  }
});
test("four hour stream: no repeated gestures, safe serious profiles, cooldown and end reset", () => {
  const d = new PerformanceDirector(random);
  let last = "",
    lastFlirt = -1e6,
    count = 0,
    flirts = 0;
  const all = [];
  for (let t = 0; t < 14400; t += 0.1) {
    if (Math.round(t * 10) % 120 === 0) {
      const profile = ["chat", "thanks", "flirt", "opening", "loss", "explain"][
        Math.floor(t / 12) % 6
      ];
      d.begin(event("s" + t, profile));
    }
    if (d.speech)
      d.frame({
        speech_id: d.speech.id,
        elapsed: t - d.speech.anchor,
        rms: 0.25,
      });
    d.update(0.1, t);
    if (d.history.length && d.history.at(-1) !== all.at(-1)) {
      const g = d.history.at(-1);
      all.push(g);
      assert.notEqual(g.action, last);
      last = g.action;
      count++;
      if (
        [
          "flirt_kiss",
          "neko_paws",
          "hip_groove",
          "shy",
          "peek_closer",
        ].includes(g.action)
      ) {
        assert.ok(t - lastFlirt >= 24.9);
        lastFlirt = t;
        flirts++;
        assert.ok(
          !["opening", "loss", "explain"].includes(d.speech?.animation.profile),
        );
      }
    }
  }
  assert.ok(count > 500);
  assert.ok(flirts > 20);
});
test("idle flirt first waits fifteen seconds and does not queue missed reactions", () => {
  const d = new PerformanceDirector(random);
  d.update(0.016, 14);
  assert.equal(d.gesture, null);
  d.update(0.016, 15);
  assert.ok(d.gesture);
  const n = d.history.length;
  d.update(0.016, 1000);
  assert.equal(d.history.length, n + 1);
});

test("manual emotion expires without a stuck idle expression", () => {
  const d = new PerformanceDirector(random);
  d.setMood("blush", 4);
  d.update(0.016, 2);
  assert.equal(d.mood, "blush");
  d.update(0.016, 5);
  assert.equal(d.mood, "idle");
});
