/* Pure, deterministic performance state. No audio player, network, or trading access. */
export const GESTURES = Object.freeze({
  wave: "Приветствие",
  dance: "Танец",
  cheer: "Радость",
  shy: "Смущение",
  flirt_kiss: "Поцелуй",
  neko_paws: "Лапки",
  hip_groove: "Кокетливое движение",
  peek_closer: "Наклон к зрителю",
  explain_right: "Правая ладонь",
  explain_left: "Левая ладонь",
  compare: "Сравнение",
  point: "Акцент пальцем",
  beat: "Разговорный акцент",
  shrug: "Пожимание плечами",
  hand_chest: "От сердца",
  thank_bow: "Благодарственный наклон",
  thumbs_up: "Большой палец",
  clap: "Аплодисменты",
  fist_pump: "Победный жест",
  think: "Размышление",
});
const FLIRTS = new Set([
  "flirt_kiss",
  "neko_paws",
  "hip_groove",
  "shy",
  "peek_closer",
]);
const POOLS = {
  focus: ["think", "beat", "explain_right", "explain_left"],
  explain: ["explain_right", "explain_left", "compare", "point", "beat"],
  opening: ["point", "beat", "explain_right"],
  loss: ["think", "beat", "explain_right"],
  refund: ["shrug", "beat", "explain_left"],
  win: ["fist_pump", "thumbs_up", "cheer", "clap"],
  thanks: ["hand_chest", "thank_bow", "clap", "wave"],
  greet: ["wave", "hand_chest", "peek_closer"],
  cta: ["point", "explain_right", "explain_left", "peek_closer"],
  ironic: ["shrug", "compare", "peek_closer", "beat"],
  chat: ["explain_right", "explain_left", "beat", "shrug", "thumbs_up"],
  flirt: ["shy", "flirt_kiss", "peek_closer", "hip_groove", "neko_paws"],
};
const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
const mix = (a, b, w) => a.map((v, i) => v + (b[i] - v) * w);
export class PerformanceDirector {
  constructor(random = Math.random) {
    this.random = random;
    this.time = 0;
    this.speech = null;
    this.gesture = null;
    this.lastGesture = "";
    this.lastUse = new Map();
    this.seen = new Set();
    this.lastFlirt = -Infinity;
    this.nextIdle = 15;
    this.nextMicro = 3;
    this.nextPosture = 10;
    this.micro = { x: 0, y: 0, z: 0 };
    this.posture = 0;
    this.mood = "idle";
    this.manualMoodUntil = 0;
    this.rms = 0;
    this.wink = 0;
    this.settings = { activity: "high", flirt: "expressive" };
    this.history = [];
    this.suppressedUntil = 0;
    this.calibration = {};
  }
  configure(settings = {}) {
    if (["low", "high"].includes(settings.activity))
      this.settings.activity = settings.activity;
    if (["off", "contextual", "expressive"].includes(settings.flirt))
      this.settings.flirt = settings.flirt;
  }
  begin(event) {
    if (!event?.speech_id || this.seen.has(event.speech_id)) return false;
    this.seen.add(event.speech_id);
    if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value);
    this.stopGesture();
    const a = event.animation || {
      profile: "chat",
      flirt_allowed: true,
      emotion: "happy",
    };
    const duration = Math.max(0.1, Math.min(180, Number(event.duration) || 10));
    const delay = Math.max(
      0,
      Math.min(
        duration,
        (Date.now() - (Number(event.started_at_ms) || Date.now())) / 1000,
      ),
    );
    this.speech = {
      id: event.speech_id,
      mouthCues: Array.isArray(event.mouthCues) ? event.mouthCues : null,
      duration,
      animation: a,
      elapsed: delay,
      lastFrame: -1,
      anchor: this.time - delay,
      count: 0,
      cues: (a.cue_offsets || [0.25])
        .filter((x) => x >= 0 && x < duration)
        .slice(0, 2),
      cueIndex: 0,
    };
    if (!this.speech.cues.length)
      this.speech.cues = [Math.min(0.25, duration * 0.25)];
    this.mood = a.emotion || "happy";
    this.rms = 0;
    this.nextIdle = this.time + 15;
    if (["loss", "opening", "explain", "focus"].includes(a.profile)) {
      this.wink = 0;
      this.micro = { x: 0, y: 0, z: 0 };
    }
    return true;
  }
  frame(e) {
    if (!this.speech || e.speech_id !== this.speech.id) return false;
    const elapsed = Number(e.elapsed);
    if (!Number.isFinite(elapsed) || elapsed < this.speech.lastFrame)
      return false;
    this.speech.lastFrame = elapsed;
    this.speech.elapsed = elapsed;
    this.speech.anchor = this.time - elapsed;
    this.rms = Math.min(1, Math.max(0, Number(e.rms) || 0));
    return true;
  }
  end(e) {
    if (!this.speech || e.speech_id !== this.speech.id) return false;
    const serious = ["loss", "opening", "explain"].includes(
      this.speech.animation.profile,
    );
    this.speech = null;
    this.rms = 0;
    this.mood = "idle";
    this.stopGesture();
    this.nextIdle = this.time + 15;
    if (serious) this.suppressedUntil = this.time + 15;
    return true;
  }
  stopGesture() {
    this.gesture = null;
  }
  stop() {
    this.speech = null;
    this.rms = 0;
    this.mood = "idle";
    this.wink = 0;
    this.stopGesture();
    this.nextIdle = this.time + 15;
  }
  choose(profile) {
    const pool = POOLS[profile] || POOLS.chat;
    let candidates = pool.filter(
      (a) =>
        a !== this.lastGesture &&
        this.time - (this.lastUse.get(a) ?? -Infinity) >= 20 &&
        (!FLIRTS.has(a) ||
          (this.settings.flirt !== "off" && this.time - this.lastFlirt >= 25)),
    );
    if (!candidates.length) return null;
    return candidates[Math.floor(this.random() * candidates.length)];
  }
  setMood(name, duration = 4) {
    this.mood = name;
    this.manualMoodUntil = this.time + duration;
  }
  trigger(action, duration = 2.5, manual = false) {
    if (!GESTURES[action]) return false;
    if (
      !manual &&
      (action === this.lastGesture ||
        (FLIRTS.has(action) && this.time - this.lastFlirt < 25))
    )
      return false;
    this.gesture = {
      action,
      start: this.time,
      duration: Math.max(0.7, Math.min(8, Number(duration) || 2.5)),
    };
    if (manual)
      this.mood = FLIRTS.has(action)
        ? "blush"
        : ["think", "point", "compare"].includes(action)
          ? "thinking"
          : "happy";
    if (manual) this.manualMoodUntil = this.time + this.gesture.duration;
    this.lastGesture = action;
    this.lastUse.set(action, this.time);
    if (FLIRTS.has(action)) this.lastFlirt = this.time;
    this.history.push({ at: this.time, action, manual });
    if (this.history.length > 256) this.history.shift();
    return true;
  }
  update(dt, t) {
    this.time = t;
    if (!this.speech && !this.gesture && this.time >= this.manualMoodUntil)
      this.mood = "idle";
    dt = Math.min(0.05, Math.max(0, dt));
    if (this.gesture && t - this.gesture.start >= this.gesture.duration) {
      this.gesture = null;
      this.mood = this.speech?.animation.emotion || "idle";
    }
    if (this.wink > 0) this.wink = Math.max(0, this.wink - dt);
    const s = this.speech;
    if (s) {
      s.elapsed = Math.max(s.elapsed, t - s.anchor);
      if (s.elapsed > s.duration + 0.5) {
        this.end({ speech_id: s.id });
        return;
      }
      if (
        !s.animation.gestures_disabled &&
        !this.gesture &&
        s.count < 2 &&
        s.cueIndex < s.cues.length &&
        s.elapsed >= s.cues[s.cueIndex] &&
        (this.rms > 0.025 || s.elapsed > s.cues[s.cueIndex] + 0.35)
      ) {
        const playful =
          ["chat", "ironic", "cta"].includes(s.animation.profile) &&
          s.animation.flirt_allowed &&
          this.settings.flirt === "expressive" &&
          this.time - this.lastFlirt >= 25 &&
          this.random() < 0.35;
        const action = this.choose(playful ? "flirt" : s.animation.profile);
        s.cueIndex++;
        s.count++;
        if (action)
          this.trigger(
            action,
            Math.min(2.7, Math.max(0.8, s.duration - s.elapsed - 0.2)),
          );
      }
    } else if (t >= this.nextIdle) {
      this.nextIdle = t + 25 + this.random() * 20;
      if (
        !this.gesture &&
        t >= this.suppressedUntil &&
        this.settings.flirt === "expressive"
      ) {
        const a = this.choose("flirt");
        if (a) this.trigger(a, 3);
      }
    }
    if (t >= this.nextMicro) {
      this.nextMicro = t + 3 + this.random() * 4;
      const playful = s ? s.animation.flirt_allowed : t >= this.suppressedUntil;
      const strength = this.settings.activity === "high" ? 1 : 0.5;
      this.micro = {
        x: (this.random() - 0.5) * 0.07 * strength,
        y: (this.random() - 0.5) * 0.14 * strength,
        z: (this.random() - 0.5) * 0.1 * strength,
      };
      if (playful && this.settings.flirt !== "off" && this.random() < 0.65)
        this.wink = 0.24;
    }
    if (t >= this.nextPosture) {
      this.nextPosture = t + 10 + this.random() * 8;
      this.posture = (this.random() - 0.5) * 0.08;
    }
  }
  pose(t) {
    const p = {};
    const put = (name, a) => (p["Shibahu_" + name] = a);
    const active = this.settings.activity === "high" ? 1 : 0.55;
    const speech = this.speech ? 1 : 0;
    put("Hips", [
      Math.sin(t * 1.7) * 0.018,
      Math.cos(t * 0.7) * 0.025,
      this.posture + Math.sin(t * 0.9) * 0.035,
    ]);
    put("Spine", [Math.sin(t * 1.8) * 0.012, 0, -this.posture * 0.3]);
    put("Spine1", [
      Math.sin(t * 1.8) * 0.018,
      Math.sin(t * 0.7) * 0.012,
      -this.posture * 0.4,
    ]);
    put("Spine2", [Math.sin(t * 1.8) * 0.018, 0, -this.posture * 0.3]);
    put("Neck", [this.micro.x * 0.4, this.micro.y * 0.4, this.micro.z * 0.4]);
    put("Head", [
      this.micro.x * 0.6 + Math.sin(t * 2.7) * 0.018 * speech,
      this.micro.y * 0.6,
      this.micro.z * 0.6,
    ]);
    for (const side of ["Right", "Left"]) {
      const sign = side === "Right" ? 1 : -1;
      put(side + "Shoulder", [0, 0, Math.sin(t * 1.8) * 0.018]);
      put(side + "Arm", [0, sign * 0.015, 0.035]);
      put(side + "ForeArm", [0, -0.16 + Math.sin(t * 1.4 + sign) * 0.025, 0]);
      put(side + "Hand", [0, Math.sin(t * 1.7) * 0.025, 0]);
      for (const f of ["Index", "Middle", "Ring", "Pinky"])
        for (let i = 1; i <= 3; i++) put(side + "Hand" + f + i, [0, 0, -0.16]);
      for (let i = 1; i <= 3; i++) put(side + "HandThumb" + i, [0, -0.08, 0]);
    }
    put("Ear_Left1", [0, 0, Math.sin(t * 1.4) * 0.02]);
    put("Ear_Right1", [0, 0, -Math.sin(t * 1.4) * 0.02]);
    // Keep the root tail's authored rest pose. Only flexible downstream links move.
    put("Tail1", [0, 0, 0]);
    for (let i = 2; i <= 6; i++)
      put("Tail" + i, [0, 0, Math.sin(t * 1.5 - i * 0.4) * 0.035]);
    for (let i = 1; i <= 3; i++)
      put("Ahoge" + i, [0, 0, Math.sin(t * 2.8 - i * 0.25) * 0.035]);
    const g = this.gesture;
    if (!g) return p;
    const elapsed = t - g.start,
      w = smooth(elapsed / 0.28) * smooth((g.duration - elapsed) / 0.4);
    const a = g.action,
      b = Math.sin(elapsed * 5.8),
      q = {};
    const set = (name, v) => (q["Shibahu_" + name] = v);
    const arm = (side, upper, fore, hand = [0, 0, 0]) => {
      set(side + "Arm", upper);
      set(side + "ForeArm", fore);
      set(side + "Hand", hand);
    };
    const open = (side) =>
      arm(side, [-0.24, -0.12, 0.08], [0.75, -0.45, 1.1], [0, -0.12, -0.1]);
    const fingers = (side, curl, except = "") => {
      for (const f of ["Index", "Middle", "Ring", "Pinky"])
        for (let i = 1; i <= 3; i++)
          set(side + "Hand" + f + i, [0, 0, f === except ? 0 : curl]);
    };
    if (
      a === "explain_right" ||
      a === "beat" ||
      a === "point" ||
      a === "thumbs_up"
    ) {
      open("Right");
      set("RightHand", [0, -0.12 + Math.sin(elapsed * 5) * 0.05, -0.1]);
      if (a === "point") fingers("Right", -0.75, "Index");
      if (a === "thumbs_up") {
        fingers("Right", -0.9);
        for (let i = 1; i <= 3; i++)
          set("RightHandThumb" + i, [0, 0.22, -0.05]);
      }
      if (a === "beat") set("RightForeArm", [0.55 + 0.1 * b, -0.4, 0.8]);
    } else if (a === "explain_left") {
      open("Left");
    } else if (a === "compare") {
      open("Right");
      open("Left");
      set("Head", [0.02, 0.08 * Math.sin(elapsed * 2), 0]);
    } else if (a === "shrug") {
      for (const side of ["Right", "Left"]) {
        open(side);
        set(side + "Shoulder", [0.03, 0, 0.08]);
      }
      set("Head", [0.02, 0, 0.07]);
    } else if (a === "hand_chest" || a === "thank_bow") {
      arm("Right", [-0.35, -0.25, -0.05], [1.35, -0.45, 1.65], [0, 0.12, -0.2]);
      set("Head", [a === "thank_bow" ? 0.12 : 0.04, 0, -0.06]);
      if (a === "thank_bow") {
        set("Spine1", [0.06, 0, 0]);
        set("Spine2", [0.06, 0, 0]);
      }
    } else if (a === "think") {
      arm("Right", [-0.6, -0.35, -0.1], [1.65, -0.25, 1.9], [0, 0, -0.15]);
      set("Head", [0.04, 0.07, -0.08]);
      fingers("Right", -0.35, "Index");
    } else if (a === "fist_pump") {
      arm(
        "Right",
        [-0.45, -0.2, 0.02],
        [1.3 + 0.12 * b, -0.4, 1.55],
        [0, 0, -0.15],
      );
      fingers("Right", -0.9);
      set("Head", [-0.04, 0, 0.04]);
    } else if (a === "clap") {
      arm(
        "Right",
        [-0.35, -0.25, -0.05],
        [1.35, -0.45, 1.65 + 0.08 * b],
        [0, 0.15, -0.25],
      );
      arm(
        "Left",
        [-0.35, 0.1, -0.15],
        [1.6, -0.45, 1.65 - 0.08 * b],
        [0, -0.15, -0.25],
      );
    } else if (a === "wave") {
      arm(
        "Right",
        [-0.58, 0.26, 0.18 + 0.04 * b],
        [1.75 - 0.16 * b, -0.35 - 0.27 * b, 2.15 - 0.1 * b],
        [0, -0.26 * Math.sin(elapsed * 5.8 - 0.55), 0],
      );
      fingers("Right", 0.06);
    } else if (a === "cheer") {
      for (const side of ["Right", "Left"]) {
        const sign = side === "Right" ? 1 : -1;
        arm(
          side,
          [-0.55, 0.25, 0.2],
          [
            1.75 - sign * 0.14 * b,
            -0.35 - sign * 0.22 * b,
            2.15 - sign * 0.08 * b,
          ],
        );
        fingers(side, 0.06);
      }
      set("Head", [-0.05, 0, 0.05]);
    } else if (a === "dance") {
      arm(
        "Right",
        [-0.35, -0.25, -0.05],
        [1.35, -0.45, 1.65 + 0.18 * b],
        [0, 0.15 * Math.cos(elapsed * 6.8), -0.25],
      );
      arm(
        "Left",
        [-0.35, 0.1, -0.15],
        [1.6, -0.45, 1.65 - 0.18 * b],
        [0, -0.15 * Math.cos(elapsed * 6.8), -0.25],
      );
      set("Hips", [
        Math.abs(b) * 0.03,
        Math.sin(elapsed * 3.4) * 0.09,
        b * 0.12,
      ]);
      set("Spine1", [0.03, 0, -b * 0.06]);
      set("Head", [
        -0.02,
        Math.sin(elapsed * 3.4) * 0.06,
        Math.sin(elapsed * 3.4) * 0.12,
      ]);
    } else if (a === "flirt_kiss") {
      const first = elapsed < 1.35;
      if (first)
        arm(
          "Right",
          [-0.9, -0.75, -0.45],
          [-0.45, -2.12, 0],
          [-0.4, 0.25, -0.2],
        );
      else
        arm(
          "Right",
          [-0.75, -0.45, -0.3],
          [-0.35, -1.65 + 0.04 * b, 0],
          [-0.45, 0.15, -0.35 + 0.04 * b],
        );
      fingers("Right", 0.08);
      set("Head", [first ? 0.06 : -0.03, 0.05, first ? -0.13 : 0.09]);
    } else if (a === "neko_paws") {
      for (const side of ["Right", "Left"]) {
        const sign = side === "Right" ? 1 : -1;
        arm(
          side,
          [-0.72, 0.15, -0.12 + sign * 0.06 * b],
          [1.85, -0.05, 2.18 + sign * 0.14 * b],
          [0, sign * 0.12 * b, -0.65 - sign * 0.15 * b],
        );
        fingers(side, -0.35);
      }
      set("Head", [
        0.04,
        Math.sin(elapsed * 3.4) * 0.06,
        Math.sin(elapsed * 3.4) * 0.14,
      ]);
    } else if (a === "hip_groove") {
      for (const side of ["Right", "Left"])
        arm(
          side,
          [0.06, side === "Right" ? 0.16 : -0.16, 0.18],
          [0, -0.85, 0],
          [0, side === "Right" ? 0.2 : -0.2, 0],
        );
      set("Hips", [
        0.02,
        Math.cos(elapsed * 2.6) * 0.09,
        Math.sin(elapsed * 5.2) * 0.14,
      ]);
      set("Spine1", [0, 0, -Math.sin(elapsed * 5.2) * 0.07]);
      set("Head", [-0.02, 0, -Math.sin(elapsed * 5.2) * 0.1]);
    } else if (a === "peek_closer") {
      set("Spine", [0.05, 0, 0]);
      set("Spine1", [0.08, 0, 0]);
      set("Spine2", [0.1, 0, 0]);
      set("Head", [0.08, 0.08, -0.14]);
      for (const side of ["Right", "Left"])
        arm(side, [0.02, side === "Right" ? 0.08 : -0.08, 0.08], [0, -0.35, 0]);
    } else if (a === "shy") {
      set("Head", [0.06, 0, -0.12]);
      set("Spine1", [0, 0.03 * Math.sin(elapsed * 4.5), 0]);
      for (const side of ["Right", "Left"])
        arm(side, [0, side === "Right" ? 0.08 : -0.08, 0.06], [0, -0.65, 0]);
    }
    Object.assign(q, this.calibration[a] || {});
    if (this.calibration[a]) {
      if (a === "wave" && q.Shibahu_RightHand)
        q.Shibahu_RightHand = [
          ...q.Shibahu_RightHand.slice(0, 2),
          q.Shibahu_RightHand[2] + Math.sin(elapsed * 5.8) * 0.13,
        ];
      if (["beat", "fist_pump"].includes(a) && q.Shibahu_RightArm)
        q.Shibahu_RightArm = [
          q.Shibahu_RightArm[0] + b * 0.04,
          ...q.Shibahu_RightArm.slice(1),
        ];
      if (a === "clap")
        for (const side of ["Right", "Left"]) {
          const name = "Shibahu_" + side + "ForeArm";
          q[name] = [
            q[name][0],
            q[name][1] +
              (side === "Right" ? 1 : -1) * Math.sin(elapsed * 7) * 0.045,
            q[name][2],
          ];
        }
    }
    for (const [key, target] of Object.entries(q))
      p[key] = mix(p[key] || [0, 0, 0], target, w * active);
    return p;
  }
  status() {
    return {
      speech_id: this.speech?.id || null,
      profile: this.speech?.animation.profile || "idle",
      gesture: this.gesture?.action || null,
      emotion: this.mood,
      rms: this.rms,
      flirt: this.settings.flirt,
      activity: this.settings.activity,
      history: this.history.slice(-8),
    };
  }
}
