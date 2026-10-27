/* Winky — пульт: вызовы в Python через pywebview.api, хоткеи, статус. */

"use strict";

const stateDot = document.getElementById("stateDot");
const stateText = document.getElementById("stateText");
const speakText = document.getElementById("speakText");
const speakLang = document.getElementById("speakLang");
const speakEmotion = document.getElementById("speakEmotion");
const speakBtn = document.getElementById("speakBtn");
const quickGrid = document.getElementById("quickGrid");
const reloadHint = document.getElementById("reloadHint");
const pauseBtn = document.getElementById("pauseBtn");
const ctaBtn = document.getElementById("ctaBtn");
const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");
const avatarScaleSlider = document.getElementById("avatarScaleSlider");
const avatarScaleValue = document.getElementById("avatarScaleValue");
const avatarYSlider = document.getElementById("avatarYSlider");
const avatarYValue = document.getElementById("avatarYValue");
const avatarResetBtn = document.getElementById("avatarResetBtn");
const ctaToggle = document.getElementById("ctaToggle");
const ctaInterval = document.getElementById("ctaInterval");
const engineName = document.getElementById("engineName");
const blockedInfo = document.getElementById("blockedInfo");
const ttStatus = document.getElementById("ttStatus");
const llmBadge = document.getElementById("llmBadge");
const ttUsername = document.getElementById("ttUsername");
const ttConnect = document.getElementById("ttConnect");
const simQuestion = document.getElementById("simQuestion");
const simAsk = document.getElementById("simAsk");
const simJoin = document.getElementById("simJoin");
const chatFeed = document.getElementById("chatFeed");
const chatStats = document.getElementById("chatStats");
const lumeanTemplate = document.getElementById("lumeanTemplate");
const lumeanVoice = document.getElementById("lumeanVoice");
const saveVoiceBtn = document.getElementById("saveVoiceBtn");
const voiceStatusHint = document.getElementById("voiceStatusHint");
const voicePresetSelect = document.getElementById("voicePresetSelect");
const modelShibahuBtn = document.getElementById("modelShibahuBtn");
const modelVrmBtn = document.getElementById("modelVrmBtn");

function api() {
  return window.pywebview?.api;
}

/* ==================== Статус из Python ==================== */

function renderStatus(status) {
  stateText.textContent = status.state + (status.queue_len ? ` (+${status.queue_len})` : "");
  stateDot.className = "state-dot " + (status.state === "speaking" ? "speaking" : status.state === "paused" ? "paused" : "");
  engineName.textContent = "движок: " + (status.engine || "—");
  volumeSlider.value = Math.round((status.volume ?? 1) * 100);
  volumeValue.textContent = Math.round((status.volume ?? 1) * 100) + "%";
  if (status.last_blocked) {
    blockedInfo.hidden = false;
    blockedInfo.textContent = "⛔ " + status.last_blocked;
  }
  if (status.lumean) {
    if (lumeanTemplate && !lumeanTemplate.value) lumeanTemplate.value = status.lumean.template_id || "";
    if (lumeanVoice) {
      if (!lumeanVoice.value) lumeanVoice.value = status.lumean.voice_id || "";
      if (voicePresetSelect) {
        const matching = Array.from(voicePresetSelect.options).find(o => o.value === lumeanVoice.value);
        voicePresetSelect.value = matching ? matching.value : "custom";
      }
    }
  }
  renderChatState(status.chat);
}

function renderChatState(chat) {
  if (!chat) return;
  onTikTokStatus(chat.tiktok_status);
  llmBadge.hidden = !chat.llm_available;
  if (chat.tiktok_username && !ttUsername.value) ttUsername.value = chat.tiktok_username;
  const c = chat.counters || {};
  chatStats.textContent =
    `комментариев: ${c.comments || 0} · ключевых: ${c.keyword_hits || 0} · ` +
    `LLM: ${c.llm_replies || 0} · фолбэков: ${c.fallbacks || 0} · подарков: ${c.gifts || 0}`;
}

const TT_LABELS = {
  off: "выключен",
  connecting: "подключаюсь…",
  connected: "в эфире",
  reconnecting: "переподключаюсь…",
};

function onTikTokStatus(status) {
  const label = TT_LABELS[status] || status;
  ttStatus.textContent = "@" + (ttUsername.value || "tiktok") + " · " + label;
  ttStatus.className = "tt-status " + (status === "connected" ? "connected" : "");
}

function onChatEvent(event) {
  const empty = chatFeed.querySelector(".feed-empty-line");
  if (empty) empty.remove();
  const line = document.createElement("div");
  line.className = "chat-line " + (event.kind === "winky" ? "winky" : event.kind === "blocked" ? "blocked" : "");
  const who = document.createElement("span");
  who.className = "who";
  who.textContent = event.kind === "winky" ? "Winky:" : event.who + ":";
  const text = document.createElement("span");
  text.className = "text";
  text.textContent = event.text;
  line.append(who, text);
  chatFeed.append(line);
  while (chatFeed.children.length > 30) chatFeed.removeChild(chatFeed.firstChild);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

window.winkyPanel = { renderStatus, renderQuickReplies, onScenariosReloaded, onChatEvent };

function renderQuickReplies(replies) {
  quickGrid.innerHTML = "";
  for (const reply of replies) {
    const button = document.createElement("button");
    button.innerHTML =
      '<span class="qr-lang">' + reply.lang.toUpperCase() + " · " + reply.emotion + "</span>" +
      '<span>' + reply.label + "</span>" +
      '<span class="qr-text">' + reply.text + "</span>";
    button.addEventListener("click", () => {
      button.classList.add("clicked");
      setTimeout(() => button.classList.remove("clicked"), 700);
      if (reply.emotion) api()?.set_emotion(reply.emotion);
      api()?.quick_reply(reply.id);
    });
    quickGrid.appendChild(button);
  }
}

function onScenariosReloaded() {
  reloadHint.hidden = false;
  setTimeout(() => (reloadHint.hidden = true), 2000);
}

/* ==================== Действия ==================== */

speakBtn.addEventListener("click", () => {
  const text = speakText.value.trim();
  if (!text) return;
  speakBtn.disabled = true;
  speakBtn.textContent = "⏳ Отправка...";
  setTimeout(() => {
    speakBtn.disabled = false;
    speakBtn.textContent = "Сказать";
  }, 1000);
  api()?.speak(text, speakLang.value === "auto" ? null : speakLang.value, speakEmotion.value);
  speakText.value = "";
});

document.querySelectorAll(".emotion-row button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".emotion-row button").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    api()?.set_emotion(button.dataset.emotion);
  });
});

pauseBtn.addEventListener("click", async () => {
  const paused = await api()?.toggle_pause();
  pauseBtn.textContent = paused ? "▶ Продолжить" : "⏸ Пауза";
});

ctaBtn.addEventListener("click", () => api()?.repeat_cta());

volumeSlider.addEventListener("input", () => {
  const value = volumeSlider.value / 100;
  volumeValue.textContent = volumeSlider.value + "%";
  api()?.set_volume(value);
});

/* ---------- Настройка аватара (Zoom / Позиция Y) ---------- */

function applyAvatarScale(val, save = true) {
  if (avatarScaleSlider) avatarScaleSlider.value = val;
  if (avatarScaleValue) avatarScaleValue.textContent = val + "%";
  api()?.set_avatar_scale(val / 100);
  if (save) localStorage.setItem("winky_avatar_scale", val);
}

function applyAvatarY(val, save = true) {
  if (avatarYSlider) avatarYSlider.value = val;
  if (avatarYValue) avatarYValue.textContent = (val > 0 ? "+" : "") + val;
  api()?.set_avatar_offset_y(val / 100);
  if (save) localStorage.setItem("winky_avatar_y", val);
}

avatarScaleSlider?.addEventListener("input", () => {
  applyAvatarScale(Number(avatarScaleSlider.value));
});

avatarYSlider?.addEventListener("input", () => {
  applyAvatarY(Number(avatarYSlider.value));
});

avatarResetBtn?.addEventListener("click", () => {
  applyAvatarScale(100);
  applyAvatarY(0);
});

/* ---------- Выбор модели (Shibahu / VRM) ---------- */

function applyModel(modelName, save = true) {
  modelShibahuBtn?.classList.toggle("active", modelName === "shibahu");
  modelVrmBtn?.classList.toggle("active", modelName === "vrm");
  api()?.set_avatar_model(modelName);
  if (save) localStorage.setItem("winky_model_choice", modelName);
}

modelShibahuBtn?.addEventListener("click", () => applyModel("shibahu"));
modelVrmBtn?.addEventListener("click", () => applyModel("vrm"));

// Инициализация модели: по умолчанию Shibahu
const initialModel = localStorage.getItem("winky_model_choice") || "shibahu";
applyModel(initialModel, false);

/* ---------- Выбор голоса ---------- */

voicePresetSelect?.addEventListener("change", () => {
  const val = voicePresetSelect.value;
  if (val !== "custom") {
    if (lumeanVoice) lumeanVoice.value = val;
    saveVoiceBtn?.click();
  }
});

saveVoiceBtn?.addEventListener("click", async () => {
  const tmpl = lumeanTemplate?.value.trim() || "";
  const vId = lumeanVoice?.value.trim() || "";
  await api()?.update_lumean_settings(tmpl, vId);
  if (voiceStatusHint) {
    voiceStatusHint.hidden = false;
    setTimeout(() => { voiceStatusHint.hidden = true; }, 2500);
  }
});

ctaToggle.addEventListener("change", () => api()?.toggle_cta(ctaToggle.checked));

ttConnect.addEventListener("click", async () => {
  const username = ttUsername.value.trim();
  if (!username) return;
  const ok = await api()?.connect_tiktok(username);
  onTikTokStatus(ok ? "connecting" : "off");
});

simAsk.addEventListener("click", () => {
  const text = simQuestion.value.trim();
  if (!text) return;
  onChatEvent({ kind: "user", who: "👤 Зритель", text });
  api()?.simulate_comment(text);
  simQuestion.value = "";
});

simJoin?.addEventListener("click", () => {
  api()?.simulate_join("Дима 🚀");
});

simQuestion.addEventListener("keydown", (event) => {
  if (event.key === "Enter") simAsk.click();
});

/* ==================== Хоткеи пульта ==================== */

document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "TEXTAREA" || event.target.tagName === "INPUT") return;
  if (event.code === "Space") {
    event.preventDefault();
    pauseBtn.click();
  } else if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey) {
    ctaBtn.click();
  }
});

/* ==================== Инициализация ==================== */

async function init() {
  if (!api()) return; // открыто в браузере без pywebview
  const status = await api().get_state();
  renderStatus(status);
  renderQuickReplies(status.quick_replies);
  ctaInterval.textContent = status.cta_interval_minutes;
  ctaToggle.checked = status.cta_enabled;
  pauseBtn.textContent = status.state === "paused" ? "▶ Продолжить" : "⏸ Пауза";

  if (status.lumean) {
    if (lumeanTemplate && !lumeanTemplate.value) lumeanTemplate.value = status.lumean.template_id || "";
    if (lumeanVoice && !lumeanVoice.value) lumeanVoice.value = status.lumean.voice_id || "";
  }

  const savedScale = localStorage.getItem("winky_avatar_scale");
  if (savedScale !== null) {
    applyAvatarScale(Number(savedScale), false);
  }
  const savedY = localStorage.getItem("winky_avatar_y");
  if (savedY !== null) {
    applyAvatarY(Number(savedY), false);
  }
}

// pywebview подставляет window.pywebview асинхронно — ждём готовности
if (window.pywebview?.api) {
  init();
} else {
  window.addEventListener("pywebviewready", init);
}
