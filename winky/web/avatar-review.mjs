const frame = document.querySelector("#avatar"),
  out = document.querySelector("#diagnostic"),
  caption = document.querySelector("#caption");
const avatarURL = (mode) =>
  mode === "legacy"
    ? "/avatar-legacy.html"
    : "/avatar.html?animation=expressive";
const old = [
  "wave",
  "dance",
  "cheer",
  "shy",
  "flirt_kiss",
  "neko_paws",
  "hip_groove",
  "peek_closer",
];
const added = [
  "explain_right",
  "explain_left",
  "compare",
  "point",
  "beat",
  "shrug",
  "hand_chest",
  "thank_bow",
  "thumbs_up",
  "clap",
  "fist_pump",
  "think",
];
let stopped = false,
  audio = null,
  recorder = null,
  chunks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function download(name, blob) {
  const a = document.createElement("a");
  a.textContent = name;
  a.download = name;
  a.href = URL.createObjectURL(blob);
  document.querySelector("#downloads").append(a);
  return a;
}
function canvas() {
  return frame.contentWindow.document.querySelector("canvas");
}
function snapshot(name) {
  const data = frame.contentWindow.winkyScreenshot();
  download(
    name,
    new Blob([JSON.stringify({ image: data, at: Date.now() })], {
      type: "application/json",
    }),
  );
}
function halt() {
  stopped = true;
  audio?.pause();
  const w = frame.contentWindow;
  w.winkyEndSpeech?.({ speech_id: w.__reviewSpeech });
  w.setAvatarSpeechVolume?.(0);
  w.winkyStopAnimation?.();
  if (recorder?.state === "recording") recorder.stop();
}
document.querySelector("#stop").onclick = halt;
document.querySelector("#mode").onchange = (e) => {
  halt();
  frame.src = avatarURL(e.target.value);
};
for (const action of [...old, ...added]) {
  const b = document.createElement("button");
  b.textContent = action;
  b.onclick = () => {
    halt();
    stopped = false;
    frame.contentWindow.winkyTriggerAction(action, 3);
  };
  document.querySelector("#gestures").append(b);
}
setInterval(() => {
  const w = frame.contentWindow;
  out.textContent = JSON.stringify(
    w.winkyAnimationStatus?.() || {
      loaded: w.__fbxStatus,
      error: w.__fbxError,
      emotion: w.vtuber?.currentEmotion,
      action: w.vtuber?.actionMode,
      scale: w.vtuber?.fbx.scale.toArray(),
      position: w.vtuber?.fbx.position.toArray(),
    },
    null,
    2,
  );
}, 500);
document.querySelector("#baseline").onclick = async () => {
  halt();
  stopped = false;
  for (const action of ["idle", ...old]) {
    if (stopped) break;
    frame.contentWindow.winkyStopAnimation?.();
    if (frame.contentWindow.vtuber)
      frame.contentWindow.vtuber.idleFlirtTimer = 60;
    if (action === "idle" && frame.contentWindow.vtuber) {
      const v = frame.contentWindow.vtuber;
      v.actionMode = null;
      v.actionTimer = 0;
      v.waveTimer = 0;
      v.currentEmotion = "idle";
    }
    if (action === "wave") frame.contentWindow.winkyWave();
    else if (action !== "idle")
      frame.contentWindow.winkyTriggerAction(action, 2);
    await sleep(900);
    snapshot("baseline-" + action + ".json");
    await sleep(1500);
  }
  caption.textContent = "Исходные кадры готовы";
};
document.querySelector("#suite").onclick = async () => {
  halt();
  stopped = false;
  const checks = [];
  for (const a of [...old, ...added]) {
    if (stopped) break;
    frame.contentWindow.winkyTriggerAction(a, 2.5);
    await sleep(1000);
    snapshot("gesture-" + a + ".json");
    checks.push(frame.contentWindow.winkyAnimationStatus?.());
    await sleep(2000);
  }
  download(
    "gesture-checks.json",
    new Blob([JSON.stringify(checks)], { type: "application/json" }),
  );
  caption.textContent = "Проверка жестов завершена";
};
document.querySelector("#samples").onclick = async () => {
  halt();
  stopped = false;
  chunks = [];
  const ctx = new AudioContext(),
    dest = ctx.createMediaStreamDestination(),
    analyser = ctx.createAnalyser();
  const silence = ctx.createConstantSource();
  silence.offset.value = 0;
  silence.connect(dest);
  silence.start();
  analyser.fftSize = 256;
  const video = canvas().captureStream(30),
    stream = new MediaStream([
      ...video.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
  recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9,opus",
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    download(
      "winky-" + document.querySelector("#mode").value + "-RU-EN.webm",
      new Blob(chunks, { type: "video/webm" }),
    );
    video.getTracks().forEach((t) => t.stop());
    silence.stop();
    ctx.close();
  };
  recorder.start();
  const manifest = await (
    await fetch("/assets/voices/lively_v3/manifest.json")
  ).json();
  const all = Object.values(manifest.categories).flat();
  const ids = [
    "lively3_ru_narrate_pair_018",
    "lively3_ru_chat_reaction_020",
    "lively3_ru_narrate_engage_001",
    "lively3_ru_trade_win_001",
    "lively3_ru_trade_loss_001",
    "lively3_en_narrate_cta_001",
  ];
  const map = await fetch("/avatar-phrases.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  for (const id of ids) {
    if (stopped) break;
    const row = all.find((r) => r.id === id);
    if (!row) continue;
    audio = new Audio("/assets/voices/lively_v3/" + row.file);
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(dest);
    source.connect(ctx.destination);
    const w = frame.contentWindow,
      speech_id = "review:" + id;
    w.__reviewSpeech = speech_id;
    caption.textContent = row.text;
    await new Promise((resolve) => {
      let loop;
      const finish = () => {
        cancelAnimationFrame(loop);
        w.winkyEndSpeech?.({ speech_id });
        w.setAvatarSpeechVolume(0);
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.onpause = () => {
        if (stopped) finish();
      };
      audio.onplaying = () => {
        w.winkyBeginSpeech?.({
          speech_id,
          duration: audio.duration,
          started_at_ms: Date.now(),
          animation: map.records?.[id] || { profile: "chat" },
          text: row.text,
        });
        if (!w.winkyBeginSpeech)
          w.winkySpeak(
            "",
            row.category === "TRADE_WIN"
              ? "win"
              : row.category === "TRADE_LOSS"
                ? "thinking"
                : "happy",
          );
        const values = new Float32Array(analyser.fftSize);
        function tick() {
          analyser.getFloatTimeDomainData(values);
          const rms =
            Math.sqrt(values.reduce((s, x) => s + x * x, 0) / values.length) *
            4;
          w.winkySpeechFrame?.({ speech_id, elapsed: audio.currentTime, rms });
          if (!w.winkySpeechFrame) w.setAvatarSpeechVolume(rms);
          loop = requestAnimationFrame(tick);
        }
        tick();
      };
      audio.play().catch(finish);
    });
    source.disconnect();
    await sleep(1000);
  }
  if (recorder.state === "recording") recorder.stop();
  caption.textContent = "Видео со звуком готово";
};

async function waitReady() {
  for (let i = 0; i < 80; i++) {
    await sleep(200);
    if (frame.contentWindow.__fbxStatus === "ready") return;
  }
  throw Error("Модель не загрузилась");
}
document.querySelector("#benchmark").onclick = async () => {
  halt();
  stopped = false;
  const records = [];
  for (let round = 0; round < 3; round++)
    for (const mode of ["legacy", "expressive"]) {
      if (stopped) return;
      frame.src = avatarURL(mode);
      await waitReady();
      await sleep(1200);
      const values = [];
      await new Promise((resolve) => {
        let previous = null,
          start = null;
        function measure(time) {
          if (start === null) start = time;
          if (previous !== null) values.push(time - previous);
          previous = time;
          if (time - start >= 3600) resolve();
          else frame.contentWindow.requestAnimationFrame(measure);
        }
        frame.contentWindow.requestAnimationFrame(measure);
      });
      const sorted = [...values].sort((a, b) => a - b);
      records.push({
        mode,
        round,
        frame_ms: values.reduce((a, b) => a + b, 0) / values.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
        frames: values.length,
        viewport: [frame.clientWidth, frame.clientHeight],
      });
    }
  download(
    "performance-comparison.json",
    new Blob([JSON.stringify(records)], { type: "application/json" }),
  );
  caption.textContent = "Сравнение скорости завершено";
  frame.src = avatarURL(document.querySelector("#mode").value);
};
document.querySelector("#flirtFilm").onclick = async () => {
  halt();
  stopped = false;
  chunks = [];
  const video = canvas().captureStream(30);
  recorder = new MediaRecorder(video, { mimeType: "video/webm;codecs=vp9" });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    download(
      "winky-flirt-transitions.webm",
      new Blob(chunks, { type: "video/webm" }),
    );
    video.getTracks().forEach((t) => t.stop());
  };
  recorder.start();
  for (const a of [
    "wave",
    "flirt_kiss",
    "neko_paws",
    "shy",
    "hip_groove",
    "peek_closer",
    "hand_chest",
    "explain_right",
    "think",
  ]) {
    if (stopped) break;
    caption.textContent = a;
    frame.contentWindow.winkyTriggerAction(a, 3);
    await sleep(3800);
  }
  if (recorder.state === "recording") recorder.stop();
  caption.textContent = "Видео флирта и переходов готово";
};

document.querySelector("#wink").onclick = async () => {
  halt();
  stopped = false;
  frame.contentWindow.winkyPreviewWink?.();
  await sleep(100);
  snapshot("wink-check.json");
};
