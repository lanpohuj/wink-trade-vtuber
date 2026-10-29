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
const simFollow = document.getElementById("simFollow");
const simGift = document.getElementById("simGift");
const chatFeed = document.getElementById("chatFeed");
const chatStats = document.getElementById("chatStats");
const modelShibahuBtn = document.getElementById("modelShibahuBtn");
const modelVrmBtn = document.getElementById("modelVrmBtn");

// Voice Library элементы
const activeProviderBadge = document.getElementById("activeProviderBadge");
const activeVoiceName = document.getElementById("activeVoiceName");
const activeVoiceId = document.getElementById("activeVoiceId");
const testVoiceRuBtn = document.getElementById("testVoiceRuBtn");
const testVoiceEnBtn = document.getElementById("testVoiceEnBtn");
const catalogSelect = document.getElementById("catalogSelect");
const voiceSearchInput = document.getElementById("voiceSearchInput");
const voiceLangFilter = document.getElementById("voiceLangFilter");
const voiceGenderFilter = document.getElementById("voiceGenderFilter");
const searchVoicesBtn = document.getElementById("searchVoicesBtn");
const voiceCardsContainer = document.getElementById("voiceCardsContainer");
const manualProviderSelect = document.getElementById("manualProviderSelect");
const manualVoiceId = document.getElementById("manualVoiceId");
const manualTemplateId = document.getElementById("manualTemplateId");
const manualSaveBtn = document.getElementById("manualSaveBtn");
const voiceStatusHint = document.getElementById("voiceStatusHint");

const PROVIDER_INFO = {
  elevenlabs: { icon: "🔥", name: "ElevenLabs", badgeClass: "badge-elevenlabs" },
  fishaudio: { icon: "🐟", name: "Fish Audio", badgeClass: "badge-fishaudio" },
  lumvoice: { icon: "💎", name: "LumVoice", badgeClass: "badge-lumvoice" },
  cartesia: { icon: "⚡", name: "Cartesia", badgeClass: "badge-cartesia" },
};

let currentPreviewAudio = null;
let currentPreviewBtn = null;

function api() {
  return window.pywebview?.api;
}

function showVoiceStatusHint(text) {
  if (!voiceStatusHint) return;
  voiceStatusHint.textContent = text || "Голос применён во всём приложении";
  voiceStatusHint.hidden = false;
  setTimeout(() => {
    voiceStatusHint.hidden = true;
  }, 3000);
}

function updateActiveVoiceDisplay(serviceKey, voiceId, voiceName) {
  const p = PROVIDER_INFO[serviceKey] || { icon: "🎙️", name: serviceKey || "Lumean" };
  if (activeProviderBadge) {
    activeProviderBadge.textContent = `${p.icon} ${p.name}`;
    activeProviderBadge.className = "active-badge " + (p.badgeClass || "");
  }
  if (activeVoiceName) {
    activeVoiceName.textContent = voiceName || voiceId || "Marusya G";
  }
  if (activeVoiceId) {
    activeVoiceId.textContent = voiceId || "";
  }
}

function stopCurrentPreview() {
  if (currentPreviewAudio) {
    try {
      currentPreviewAudio.pause();
      currentPreviewAudio.currentTime = 0;
    } catch (_) {}
    currentPreviewAudio = null;
  }
  if (currentPreviewBtn) {
    currentPreviewBtn.classList.remove("playing");
    currentPreviewBtn.textContent = "▶️ Превью";
    currentPreviewBtn = null;
  }
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
    updateActiveVoiceDisplay(status.lumean.service_key, status.lumean.voice_id, status.lumean.voice_name);
    if (manualVoiceId && !manualVoiceId.value) {
      if (manualProviderSelect) manualProviderSelect.value = status.lumean.service_key || "elevenlabs";
      manualVoiceId.value = status.lumean.voice_id || "";
    }
  }
  renderChatState(status.chat);

  if (Array.isArray(status.chat_history) && status.chat_history.length > 0) {
    if (!chatFeed.querySelector(".chat-line")) {
      for (const ev of status.chat_history) {
        onChatEvent(ev);
      }
    }
  }
}

function renderChatState(chat) {
  if (!chat) return;
  onTikTokStatus(chat.tiktok_status);
  llmBadge.hidden = !chat.llm_available;
  if (chat.tiktok_username && !ttUsername.value) ttUsername.value = chat.tiktok_username;
  const c = chat.counters || {};
  chatStats.textContent =
    `комментариев: ${c.comments || 0} · ключевых: ${c.keyword_hits || 0} · ` +
    `LLM: ${c.llm_replies || 0} · фолбэков: ${c.fallbacks || 0} · подарков: ${c.gifts || 0} · ` +
    `подписок: ${c.follows || 0} · входов: ${c.joins_greeted || 0}`;
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

function onWarmupProgress(done, total, statusText) {
  const container = document.getElementById("voiceWarmupContainer");
  const statusSpan = document.getElementById("warmupStatusText");
  const percentSpan = document.getElementById("warmupPercentText");
  const barFill = document.getElementById("warmupBarFill");
  if (!container || !barFill) return;

  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 100;
  barFill.style.width = percent + "%";
  if (percentSpan) percentSpan.textContent = percent + "%";
  if (statusSpan) {
    statusSpan.textContent = statusText || (percent === 100 ? "✅ Голос готов (мгновенный отклик 0.05с)" : `⚡ Прогрев голоса: ${done} / ${total}...`);
  }

  if (percent === 100) {
    barFill.classList.add("completed");
    setTimeout(() => {
      if (container) container.classList.add("warmup-done");
    }, 4500);
  } else {
    barFill.classList.remove("completed");
    container.classList.remove("warmup-done");
  }
}

window.winkyPanel = { renderStatus, renderQuickReplies, onScenariosReloaded, onChatEvent, onWarmupProgress };

function renderQuickReplies(replies) {
  quickGrid.innerHTML = "";
  for (const reply of replies) {
    const button = document.createElement("button");
    button.className = "quick-card";
    button.setAttribute("data-id", reply.id);
    button.innerHTML =
      '<span class="qr-lang">' + reply.lang.toUpperCase() + " · " + reply.emotion + "</span>" +
      '<span>' + reply.label + "</span>" +
      '<span class="qr-text">' + reply.text + "</span>";
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      button.classList.add("clicked");
      setTimeout(() => button.classList.remove("clicked"), 700);
      const bridge = window.pywebview?.api || api();
      if (bridge?.quick_reply) {
        bridge.quick_reply(reply.id);
      }
    });
    quickGrid.appendChild(button);
  }
}

quickGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".quick-card");
  if (!card) return;
  const id = card.getAttribute("data-id");
  if (id) {
    const bridge = window.pywebview?.api || api();
    if (bridge?.quick_reply) {
      bridge.quick_reply(id);
    }
  }
});

function onScenariosReloaded() {
  reloadHint.hidden = false;
  setTimeout(() => (reloadHint.hidden = true), 2000);
}

/* ==================== Карточки Voice Library ==================== */

function renderVoiceCards(voices, activeVoiceIdVal) {
  if (!voiceCardsContainer) return;
  voiceCardsContainer.innerHTML = "";
  if (!Array.isArray(voices) || voices.length === 0) {
    voiceCardsContainer.innerHTML = '<div class="voice-cards-empty">Голоса не найдены по заданным критериям</div>';
    return;
  }

  for (const v of voices) {
    const isSelected = v.voice_id === activeVoiceIdVal;
    const card = document.createElement("div");
    card.className = "voice-card" + (isSelected ? " selected" : "");
    card.setAttribute("data-voice-id", v.voice_id);

    const p = PROVIDER_INFO[v.service_key] || { icon: "🎙️", name: v.service_key, badgeClass: "badge-elevenlabs" };
    const genderBadge = v.gender ? `<span class="badge badge-gender">${v.gender === "female" ? "♀ Жен" : "♂ Муж"}</span>` : "";
    const langBadge = v.languages ? `<span class="badge badge-gender">${v.languages}</span>` : "";

    card.innerHTML = `
      <div class="voice-card-top">
        <span class="voice-card-name" title="${v.name}">${v.name}</span>
        <div class="voice-card-badges">
          <span class="badge ${p.badgeClass}">${p.icon} ${p.name}</span>
          ${genderBadge}
          ${langBadge}
        </div>
      </div>
      <div class="voice-card-desc" title="${v.description || ''}">${v.description || 'Качественная мультиязычная модель'}</div>
      <div class="voice-card-actions">
        <span class="voice-card-id" title="Кликните, чтобы скопировать ID">${v.voice_id}</span>
        <div class="voice-action-btns">
          <button class="btn-preview">▶️ Превью</button>
          <button class="btn-select">${isSelected ? "✅ Выбрано" : "Выбрать"}</button>
        </div>
      </div>
    `;

    // Копирование ID по клику
    const idEl = card.querySelector(".voice-card-id");
    idEl?.addEventListener("click", (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(v.voice_id);
      showVoiceStatusHint(`ID скопирован: ${v.voice_id.slice(0, 12)}...`);
    });

    // Кнопка Превью
    const previewBtn = card.querySelector(".btn-preview");
    previewBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (currentPreviewBtn === previewBtn) {
        stopCurrentPreview();
        return;
      }
      stopCurrentPreview();

      if (v.preview_url) {
        const audio = new Audio(v.preview_url);
        currentPreviewAudio = audio;
        currentPreviewBtn = previewBtn;
        previewBtn.classList.add("playing");
        previewBtn.textContent = "⏸️ Стоп";
        audio.play().catch((err) => {
          console.error("Audio preview error:", err);
          stopCurrentPreview();
        });
        audio.onended = () => stopCurrentPreview();
        audio.onerror = () => stopCurrentPreview();
      } else {
        // Если у голоса нет preview_url (как у некоторых Fish Audio) — синтезируем сэмпл
        previewBtn.disabled = true;
        previewBtn.textContent = "⏳ Синтез...";
        try {
          const sampleUrl = await api()?.preview_voice_sample(v.service_key, v.voice_id);
          previewBtn.disabled = false;
          if (sampleUrl) {
            const audio = new Audio(sampleUrl);
            currentPreviewAudio = audio;
            currentPreviewBtn = previewBtn;
            previewBtn.classList.add("playing");
            previewBtn.textContent = "⏸️ Стоп";
            audio.play().catch(() => stopCurrentPreview());
            audio.onended = () => stopCurrentPreview();
            audio.onerror = () => stopCurrentPreview();
          } else {
            previewBtn.textContent = "▶️ Превью";
          }
        } catch (err) {
          previewBtn.disabled = false;
          previewBtn.textContent = "▶️ Превью";
        }
      }
    });

    // Кнопка Выбрать
    const selectBtn = card.querySelector(".btn-select");
    selectBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      selectBtn.disabled = true;
      selectBtn.textContent = "⏳...";
      try {
        await api()?.set_voice(v.service_key, v.voice_id, v.name);
        updateActiveVoiceDisplay(v.service_key, v.voice_id, v.name);
        document.querySelectorAll(".voice-card").forEach(c => {
          c.classList.remove("selected");
          const b = c.querySelector(".btn-select");
          if (b) b.textContent = "Выбрать";
        });
        card.classList.add("selected");
        selectBtn.textContent = "✅ Выбрано";
        showVoiceStatusHint(`Голос «${v.name}» выбран и сохранён во всём приложении!`);
      } catch (err) {
        console.error("Set voice error:", err);
      } finally {
        selectBtn.disabled = false;
      }
    });

    voiceCardsContainer.appendChild(card);
  }
}

async function loadVoices(catalog, query = "", lang = "", gender = "") {
  if (!voiceCardsContainer) return;
  voiceCardsContainer.innerHTML = '<div class="voice-cards-empty">⏳ Загрузка каталога голосов...</div>';
  try {
    const voices = await api()?.search_voices(catalog, query, lang, gender, 1);
    const currId = activeVoiceId?.textContent || "";
    renderVoiceCards(voices || [], currId);
  } catch (err) {
    voiceCardsContainer.innerHTML = '<div class="voice-cards-empty">Ошибка загрузки каталога голосов</div>';
    console.error("Load voices error:", err);
  }
}

/* ==================== Слушатели событий Voice Library ==================== */

searchVoicesBtn?.addEventListener("click", () => {
  const cat = catalogSelect?.value || "elevenlabs";
  const q = voiceSearchInput?.value.trim() || "";
  const l = voiceLangFilter?.value || "";
  const g = voiceGenderFilter?.value || "";
  loadVoices(cat, q, l, g);
});

voiceSearchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchVoicesBtn?.click();
});

catalogSelect?.addEventListener("change", () => {
  searchVoicesBtn?.click();
});

testVoiceRuBtn?.addEventListener("click", () => {
  api()?.test_voice("ru");
});

testVoiceEnBtn?.addEventListener("click", () => {
  api()?.test_voice("en");
});

manualSaveBtn?.addEventListener("click", async () => {
  const p = manualProviderSelect?.value || "elevenlabs";
  const vid = manualVoiceId?.value.trim() || "";
  const tid = manualTemplateId?.value.trim() || "";
  if (!vid) return;

  manualSaveBtn.disabled = true;
  manualSaveBtn.textContent = "⏳...";
  try {
    if (tid) {
      await api()?.update_lumean_settings(tid, vid, p, vid);
    } else {
      await api()?.set_voice(p, vid, vid);
    }
    updateActiveVoiceDisplay(p, vid, vid);
    showVoiceStatusHint("Голос успешно сохранён и активирован!");
  } catch (err) {
    console.error("Manual save voice error:", err);
  } finally {
    manualSaveBtn.disabled = false;
    manualSaveBtn.textContent = "Сохранить";
  }
});

/* ==================== Действия пульта ==================== */

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
  onChatEvent({ kind: "user", who: "👋 Вход", text: "Дима 🚀 присоединился к эфиру" });
  api()?.simulate_join("Дима 🚀");
});

simFollow?.addEventListener("click", () => {
  onChatEvent({ kind: "user", who: "💃 Подписка", text: "Алина ✨ подписалась на канал!" });
  api()?.simulate_follow("Алина ✨");
});

simGift?.addEventListener("click", () => {
  onChatEvent({ kind: "user", who: "🎁 Подарок", text: "Миша 🚀 отправил Роза!" });
  api()?.simulate_gift("Миша 🚀", "Роза");
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
    updateActiveVoiceDisplay(status.lumean.service_key, status.lumean.voice_id, status.lumean.voice_name);
    if (catalogSelect) catalogSelect.value = status.lumean.service_key || "elevenlabs";
    loadVoices(catalogSelect ? catalogSelect.value : "elevenlabs");
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
