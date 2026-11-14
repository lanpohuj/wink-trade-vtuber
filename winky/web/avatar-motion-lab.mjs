import { authoredGesture } from "./avatar-authored-motion.mjs";
const frame = document.querySelector("#avatar"),
  status = document.querySelector("#status");
let loaded = false,
  author = false,
  mixer = null;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
function add(name, blob) {
  const a = document.createElement("a");
  a.download = name;
  a.textContent = name;
  a.href = URL.createObjectURL(blob);
  document.querySelector("#downloads").append(a);
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    if (frame.contentWindow.__fbxStatus === "ready") return frame.contentWindow;
    await delay(150);
  }
  throw Error("Модель не загрузилась");
}
async function navigate(url) {
  await new Promise((resolve) => {
    frame.addEventListener("load", resolve, { once: true });
    frame.src = url;
  });
  return ready();
}
function trackRange(t) {
  let angle = 0,
    span = [0, 0, 0];
  const v = t.values;
  if (t.ValueTypeName === "quaternion") {
    for (let i = 0; i < v.length; i += 4) {
      let dot = 0;
      for (let j = 0; j < 4; j++) dot += v[j] * v[i + j];
      angle = Math.max(
        angle,
        (2 * Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI,
      );
    }
  } else if (t.ValueTypeName === "vector") {
    for (let a = 0; a < 3; a++) {
      let min = Infinity,
        max = -Infinity;
      for (let i = a; i < v.length; i += 3) {
        min = Math.min(min, v[i]);
        max = Math.max(max, v[i]);
      }
      span[a] = max - min;
    }
  }
  return { angle_deg: angle, span };
}
function summary(w) {
  return {
    clips: w.vtuber.fbx.animations.map((c) => ({
      name: c.name,
      duration: c.duration,
      tracks: c.tracks.length,
      channels: c.tracks.map((t) => ({
        name: t.name,
        type: t.ValueTypeName,
        keys: t.times.length,
        ...trackRange(t),
        first: Array.from(t.values.slice(0, 4)),
      })),
    })),
    bones: Object.keys(w.vtuber.bones),
    parents: Object.fromEntries(
      Object.entries(w.vtuber.bones)
        .filter(([n]) => n.startsWith("Shibahu_"))
        .map(([n, b]) => [n, b.parent?.name]),
    ),
    morphs: w.vtuber.faceMesh.morphTargetDictionary,
  };
}
document.querySelector("#inspect").onclick = async () => {
  const w = await ready(),
    data = summary(w);
  status.textContent = JSON.stringify(data, null, 2);
  add(
    "author-motion-analysis.json",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
  );
};
document.querySelector("#author").onclick = async () => {
  const w = await ready();
  const clip = w.vtuber.fbx.animations[0];
  if (!clip) {
    status.textContent = "Встроенных анимаций нет";
    return;
  }
  const video = w.document.querySelector("canvas").captureStream(30),
    chunks = [],
    recorder = new MediaRecorder(video, { mimeType: "video/webm;codecs=vp9" });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    add(
      "author-original-motion.webm",
      new Blob(chunks, { type: "video/webm" }),
    );
    video.getTracks().forEach((t) => t.stop());
  };
  recorder.start();
  setTimeout(
    () => {
      if (recorder.state === "recording") recorder.stop();
    },
    (clip.duration + 1) * 1000,
  );
  mixer = new w.THREE.AnimationMixer(w.vtuber.fbx);
  const action = mixer.clipAction(clip);
  action.setLoop(w.THREE.LoopOnce);
  action.clampWhenFinished = true;
  action.play();
  w.vtuber.update = (dt, t, speaking, rms) => {
    mixer.update(Math.min(0.05, dt));
    w.vtuber.updateFace(t, Math.min(0.05, dt), false, 0);
  };
  status.textContent =
    "Авторская анимация: " + clip.name + " / " + clip.duration + " с";
};
document.querySelector("#reset").onclick = () => {
  frame.src = "/avatar-legacy.html?reset=" + Date.now();
  status.textContent = "Исходный вид";
};
for (const [id, action] of [["kiss", "flirt_kiss"]])
  document.querySelector("#" + id).onclick = async () => {
    const w = await navigate(
      id === "think"
        ? "/avatar.html?animation=expressive"
        : "/avatar-legacy.html?probe=" + Date.now(),
    );
    w.vtuber.idleFlirtTimer = 60;
    w.winkyTriggerAction(action, 3);
    status.textContent = action;
  };
ready().then((w) => {
  w.vtuber.idleFlirtTimer = 60;
  status.textContent =
    "Исходная FBX готова. Анимаций: " + w.vtuber.fbx.animations.length;
});

document.querySelector("#speech").onclick = async () => {
  const w = await navigate("/avatar.html?animation=expressive");
  w.winkyConfigureAnimation({ flirt: "off", activity: "low" });
  const [visemes, manifest] = await Promise.all([
    fetch("/avatar-viseme-probes.json").then((r) => r.json()),
    fetch("/assets/voices/lively_v3/manifest.json").then((r) => r.json()),
  ]);
  const rows = Object.values(manifest.categories).flat();
  const ctx = new AudioContext();
  await ctx.resume();
  const dest = ctx.createMediaStreamDestination();
  const silence = ctx.createConstantSource();
  silence.offset.value = 0;
  silence.connect(dest);
  silence.start();
  const video = w.document.querySelector("canvas").captureStream(30),
    stream = new MediaStream([
      ...video.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]),
    chunks = [],
    recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9,opus",
    });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    add("viseme-speech-probe.webm", new Blob(chunks, { type: "video/webm" }));
    video.getTracks().forEach((t) => t.stop());
    silence.stop();
    ctx.close();
  };
  recorder.start();
  for (const id of [
    "lively3_ru_narrate_pair_018",
    "lively3_en_narrate_cta_001",
  ]) {
    const row = rows.find((r) => r.id === id),
      probe = visemes.records[id],
      audio = new Audio("/assets/voices/lively_v3/" + row.file),
      node = ctx.createMediaElementSource(audio);
    node.connect(dest);
    node.connect(ctx.destination);
    status.textContent = row.text;
    await new Promise((resolve) => {
      let raf;
      const finish = () => {
        cancelAnimationFrame(raf);
        w.winkyEndSpeech({ speech_id: id });
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.onplaying = () => {
        w.winkyBeginSpeech({
          speech_id: id,
          duration: audio.duration,
          started_at_ms: Date.now() - audio.currentTime * 1000,
          animation: {
            profile: "focus",
            emotion: "neutral",
            flirt_allowed: false,
            gestures_disabled: true,
            cue_offsets: [],
          },
          mouthCues: probe.mouthCues,
        });
        function tick() {
          w.winkySpeechFrame({
            speech_id: id,
            elapsed: audio.currentTime,
            rms: 0,
          });
          raf = requestAnimationFrame(tick);
        }
        tick();
      };
      audio.play().catch(finish);
    });
    node.disconnect();
    await delay(1000);
  }
  recorder.stop();
  status.textContent = "Проба фонетической синхронизации готова";
};

document.querySelector("#smallMotions").onclick = async () => {
  const w = await navigate("/avatar-legacy.html"),
    v = w.vtuber,
    original = v.update.bind(v),
    originalFace = v.updateFace.bind(v);
  let label = "";
  const stream = w.document.querySelector("canvas").captureStream(30),
    parts = [],
    rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  rec.ondataavailable = (e) => {
    if (e.data.size) parts.push(e.data);
  };
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    add("small-motion-probes-v3.webm", new Blob(parts, { type: "video/webm" }));
  };
  rec.start();
  label = "Ориентир — принятый поцелуй";
  v.idleFlirtTimer = 60;
  w.winkyTriggerAction("flirt_kiss", 3);
  await delay(3900);
  label = "1 — открытая ладонь";
  let born = performance.now();
  v.update = (dt, t, speaking, rms) => {
    const elapsed = (performance.now() - born) / 1000;
    if (elapsed < 2.2) {
      v.actionMode = "flirt_kiss";
      v.actionDuration = 3;
      v.actionTimer = 1.55;
    } else {
      v.actionMode = null;
      v.actionTimer = 0;
      v.currentEmotion = "idle";
    }
    original(dt, t, false, 0);
    v.currentEmotion = "idle";
    const a = v.actionMode;
    v.actionMode = null;
    originalFace(t, dt, false, 0);
    v.actionMode = a;
  };
  await delay(3500);
  for (const probe of [
    { label: "2 — авторский жест пояснения", start: 3.2, end: 6.0 },
    { label: "3 — авторский жест с руками перед собой", start: 8.1, end: 10.8 },
  ]) {
    label = probe.label;
    const motion = authoredGesture(w, probe.start, probe.end);
    await delay(motion.duration * 1000 + 400);
    motion.stop();
  }
  rec.stop();
  label = "";
  status.textContent = "Малые пробы движений готовы";
};
