/* Winky — пульт: вызовы в Python через pywebview.api, хоткеи, статус. */

"use strict";

const stateDot = document.getElementById("stateDot");
const stateText = document.getElementById("stateText");
const queueBadge = document.getElementById("queueBadge");
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
const ttDisconnect = document.getElementById("ttDisconnect");
const simQuestion = document.getElementById("simQuestion");
const simAsk = document.getElementById("simAsk");
const simJoin = document.getElementById("simJoin");
const simFollow = document.getElementById("simFollow");
const simGift = document.getElementById("simGift");
const simLike = document.getElementById("simLike");
const clearQueueBtn = document.getElementById("clearQueueBtn");
const chatFeed = document.getElementById("chatFeed");
const chatStats = document.getElementById("chatStats");
const modelShibahuBtn = document.getElementById("modelShibahuBtn");
const modelVrmBtn = document.getElementById("modelVrmBtn");

// Voice Library элементы
const activeProviderBadgeRu = document.getElementById("activeProviderBadgeRu");
const activeVoiceNameRu = document.getElementById("activeVoiceNameRu");
const activeVoiceIdRu = document.getElementById("activeVoiceIdRu");
const activeProviderBadgeEn = document.getElementById("activeProviderBadgeEn");
const activeVoiceNameEn = document.getElementById("activeVoiceNameEn");
const activeVoiceIdEn = document.getElementById("activeVoiceIdEn");

const testVoiceRuBtn = document.getElementById("testVoiceRuBtn");
const testVoiceEnBtn = document.getElementById("testVoiceEnBtn");
const warmupCatalogBtn = document.getElementById("warmupCatalogBtn");
const catalogSelect = document.getElementById("catalogSelect");
const voiceSearchInput = document.getElementById("voiceSearchInput");
const voiceLangFilter = document.getElementById("voiceLangFilter");
const voiceGenderFilter = document.getElementById("voiceGenderFilter");
const searchVoicesBtn = document.getElementById("searchVoicesBtn");
const voiceCardsContainer = document.getElementById("voiceCardsContainer");
const manualProviderSelect = document.getElementById("manualProviderSelect");
const manualVoiceId = document.getElementById("manualVoiceId");
const manualTemplateId = document.getElementById("manualTemplateId");
const manualSaveRuBtn = document.getElementById("manualSaveRuBtn");
const manualSaveEnBtn = document.getElementById("manualSaveEnBtn");
const voiceStatusHint = document.getElementById("voiceStatusHint");
const simLang = document.getElementById("simLang");
const streamLangRuBtn = document.getElementById("streamLangRuBtn");
const streamLangEnBtn = document.getElementById("streamLangEnBtn");

// Карточки активных голосов для быстрого переключения слота
const activeVoiceBoxRu = document.getElementById("activeVoiceBoxRu");
const activeVoiceBoxEn = document.getElementById("activeVoiceBoxEn");

// Элементы Студии тонкой настройки живости голоса
const applyLivePresetBtn = document.getElementById("applyLivePresetBtn");
const tuneSlotRuBtn = document.getElementById("tuneSlotRuBtn");
const tuneSlotEnBtn = document.getElementById("tuneSlotEnBtn");
const tuneModelSelect = document.getElementById("tuneModelSelect");
const tuneLatencyRow = document.getElementById("tuneLatencyRow");
const tuneLatencySelect = document.getElementById("tuneLatencySelect");
const tuneSpeedSlider = document.getElementById("tuneSpeedSlider");
const tuneSpeedValue = document.getElementById("tuneSpeedValue");
const tuneStabilityRow = document.getElementById("tuneStabilityRow");
const tuneStabilityLabel = document.getElementById("tuneStabilityLabel");
const tuneStabilitySlider = document.getElementById("tuneStabilitySlider");
const tuneStabilityValue = document.getElementById("tuneStabilityValue");
const tuneStyleRow = document.getElementById("tuneStyleRow");
const tuneStyleSlider = document.getElementById("tuneStyleSlider");
const tuneStyleValue = document.getElementById("tuneStyleValue");
const tuneSimilarityRow = document.getElementById("tuneSimilarityRow");
const tuneSimilaritySlider = document.getElementById("tuneSimilaritySlider");
const tuneSimilarityValue = document.getElementById("tuneSimilarityValue");
const sampleRatePills = document.querySelectorAll(".sample-rate-pills .pill-btn");
const tuneNormalizeText = document.getElementById("tuneNormalizeText");
const tuneNormalizeVolume = document.getElementById("tuneNormalizeVolume");
const tuneBreathingPauses = document.getElementById("tuneBreathingPauses");
const saveTuningBtn = document.getElementById("saveTuningBtn");
const testTunedBtn = document.getElementById("testTunedBtn");
const rewarmTunedBtn = document.getElementById("rewarmTunedBtn");

const PROVIDER_INFO = {
  elevenlabs: { icon: "🔥", name: "ElevenLabs", badgeClass: "badge-elevenlabs" },
  fishaudio: { icon: "🐟", name: "Fish Audio", badgeClass: "badge-fishaudio" },
  lumvoice: { icon: "💎", name: "LumVoice", badgeClass: "badge-lumvoice" },
  cartesia: { icon: "⚡", name: "Cartesia", badgeClass: "badge-cartesia" },
};

let currentPreviewAudio = null;
let currentPreviewBtn = null;
let currentActiveRu = { service: "fishaudio", id: "1db1618b6eaf4571ac7db70e20eb6727", name: "Марин китагава" };
let currentActiveEn = { service: "fishaudio", id: "e34c486929524d41b88646b4ac2f382f", name: "Venti" };
let activeTuningSlot = "ru";
let currentTuningData = { ru: {}, en: {} };
let currentSampleRate = 44100;

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

function updateActiveVoiceDisplay(slot, serviceKey, voiceId, voiceName) {
  const p = PROVIDER_INFO[serviceKey] || { icon: "🎙️", name: serviceKey || "Lumean" };
  const isRu = (slot || "ru").toLowerCase() === "ru";
  if (isRu) {
    currentActiveRu = { service: serviceKey, id: voiceId, name: voiceName };
    if (activeProviderBadgeRu) {
      activeProviderBadgeRu.textContent = `${p.icon} ${p.name}`;
      activeProviderBadgeRu.className = "active-badge " + (p.badgeClass || "");
    }
    const displayName = voiceName || voiceId || "Марин китагава";
    if (activeVoiceNameRu) {
      activeVoiceNameRu.textContent = displayName;
    }
    if (activeVoiceIdRu) {
      activeVoiceIdRu.textContent = voiceId || "";
    }
    if (tuneSlotRuBtn) {
      tuneSlotRuBtn.textContent = `🇷🇺 Настраивать RU (${displayName})`;
    }
  } else {
    currentActiveEn = { service: serviceKey, id: voiceId, name: voiceName };
    if (activeProviderBadgeEn) {
      activeProviderBadgeEn.textContent = `${p.icon} ${p.name}`;
      activeProviderBadgeEn.className = "active-badge " + (p.badgeClass || "");
    }
    const displayName = voiceName || voiceId || "Venti";
    if (activeVoiceNameEn) {
      activeVoiceNameEn.textContent = displayName;
    }
    if (activeVoiceIdEn) {
      activeVoiceIdEn.textContent = voiceId || "";
    }
    if (tuneSlotEnBtn) {
      tuneSlotEnBtn.textContent = `🇬🇧 Настраивать EN (${displayName})`;
    }
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
  const qSize = status.queue_size ?? status.queue_len ?? 0;
  stateText.textContent = status.state + (qSize > 0 ? ` (очередь: ${qSize})` : "");
  if (queueBadge) {
    if (qSize > 0) {
      queueBadge.hidden = false;
      queueBadge.textContent = `очередь: ${qSize}`;
    } else {
      queueBadge.hidden = true;
    }
  }
  stateDot.className = "state-dot " + (status.state === "speaking" ? "speaking" : status.state === "paused" ? "paused" : "");
  engineName.textContent = "движок: " + (status.engine || "—");
  volumeSlider.value = Math.round((status.volume ?? 1) * 100);
  volumeValue.textContent = Math.round((status.volume ?? 1) * 100) + "%";
  if (status.last_blocked) {
    blockedInfo.hidden = false;
    blockedInfo.textContent = "⛔ " + status.last_blocked;
  }
  if (status.lumean) {
    updateActiveVoiceDisplay("ru", status.lumean.ru_service, status.lumean.ru_voice_id, status.lumean.ru_voice_name);
    updateActiveVoiceDisplay("en", status.lumean.en_service, status.lumean.en_voice_id, status.lumean.en_voice_name);
    if (status.lumean.ru_tuning) currentTuningData.ru = status.lumean.ru_tuning;
    if (status.lumean.en_tuning) currentTuningData.en = status.lumean.en_tuning;
    if (manualVoiceId && !manualVoiceId.value) {
      if (manualProviderSelect) manualProviderSelect.value = status.lumean.ru_service || "fishaudio";
      manualVoiceId.value = status.lumean.ru_voice_id || "";
    }
  }
  if (status.stream_lang) {
    updateStreamLangUI(status.stream_lang);
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
  onTikTokStatus(chat.tiktok_status, chat.tiktok_detail);
  llmBadge.hidden = !chat.llm_available;
  if (chat.tiktok_username && !ttUsername.value) ttUsername.value = chat.tiktok_username;
  const c = chat.counters || {};
  chatStats.textContent =
    `комментариев: ${c.comments || 0} · ключевых: ${c.keyword_hits || 0} · ` +
    `LLM: ${c.llm_replies || 0} · фолбэков: ${c.fallbacks || 0} · подарков: ${c.gifts || 0} · ` +
    `подписок: ${c.follows || 0} · входов: ${c.joins_greeted || 0}`;
}

function onTikTokStatus(status, detail) {
  const rawUser = ttUsername?.value?.trim() || "tiktok";
  const userMatch = rawUser.match(/@([a-zA-Z0-9_.]+)/);
  const user = userMatch ? userMatch[1] : rawUser.replace(/[^a-zA-Z0-9_.]/g, "") || "streamer";

  let text = "выключен";
  let className = "tt-status";

  if (status === "connected") {
    text = detail || `🟢 В ЭФИРЕ: @${user}`;
    className += " connected";
    if (ttConnect) ttConnect.hidden = true;
    if (ttDisconnect) ttDisconnect.hidden = false;
  } else if (status === "connecting") {
    text = detail || `⏳ Подключаюсь к @${user}...`;
    className += " connecting";
    if (ttConnect) ttConnect.hidden = true;
    if (ttDisconnect) ttDisconnect.hidden = false;
  } else if (status === "offline") {
    text = detail || `⚫ @${user} сейчас ОФЛАЙН (не ведет стрим)`;
    className += " offline";
    if (ttConnect) ttConnect.hidden = true;
    if (ttDisconnect) ttDisconnect.hidden = false;
  } else if (status === "error") {
    text = detail ? `🔴 ${detail}` : `🔴 Ошибка подключения`;
    className += " error";
    if (ttConnect) ttConnect.hidden = false;
    if (ttDisconnect) ttDisconnect.hidden = true;
  } else {
    // "off"
    text = "выключен";
    if (ttConnect) ttConnect.hidden = false;
    if (ttDisconnect) ttDisconnect.hidden = true;
  }

  if (ttStatus) {
    ttStatus.textContent = text;
    ttStatus.className = className;
  }
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
    statusSpan.textContent = statusText || (percent === 100 ? "✅ Голоса готовы (мгновенный отклик 0.05с)" : `⚡ Прогрев голосов: ${done} / ${total}...`);
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
    const card = document.createElement("div");
    card.className = "quick-card-container";
    card.setAttribute("data-id", reply.id);

    const previewText = (reply.texts_ru && reply.texts_ru[0]) || reply.text || "";
    const icon = reply.icon || "💬";

    card.innerHTML = `
      <div class="quick-card-header">
        <span class="qr-title" title="${reply.label}">${icon} ${reply.label}</span>
        <span class="qr-emo">${reply.emotion || 'happy'}</span>
      </div>
      <div class="qr-preview" title="${previewText}">${previewText}</div>
      <div class="qr-btns">
        <button class="qr-lang-btn qr-ru" title="Озвучить случайный русский вариант">🇷🇺 RU</button>
        <button class="qr-lang-btn qr-en" title="Озвучить случайный английский вариант">🇬🇧 EN</button>
      </div>
    `;

    const btnRu = card.querySelector(".qr-ru");
    const btnEn = card.querySelector(".qr-en");

    btnRu?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      btnRu.classList.add("clicked");
      setTimeout(() => btnRu.classList.remove("clicked"), 700);
      const bridge = window.pywebview?.api || api();
      bridge?.quick_reply(reply.id, "ru");
    });

    btnEn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      btnEn.classList.add("clicked");
      setTimeout(() => btnEn.classList.remove("clicked"), 700);
      const bridge = window.pywebview?.api || api();
      bridge?.quick_reply(reply.id, "en");
    });

    quickGrid.appendChild(card);
  }
}

function onScenariosReloaded() {
  reloadHint.hidden = false;
  setTimeout(() => (reloadHint.hidden = true), 2000);
}

/* ==================== Карточки Voice Library ==================== */

function renderVoiceCards(voices) {
  if (!voiceCardsContainer) return;
  voiceCardsContainer.innerHTML = "";
  if (!Array.isArray(voices) || voices.length === 0) {
    voiceCardsContainer.innerHTML = '<div class="voice-cards-empty">Голоса не найдены по заданным критериям</div>';
    return;
  }

  for (const v of voices) {
    const isRuSelected = v.voice_id === currentActiveRu.id;
    const isEnSelected = v.voice_id === currentActiveEn.id;

    const card = document.createElement("div");
    card.className = "voice-card" + ((isRuSelected || isEnSelected) ? " selected" : "");
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
          <button class="btn-select-ru ${isRuSelected ? 'active' : ''}">${isRuSelected ? "✅ RU" : "🇷🇺 На RU"}</button>
          <button class="btn-select-en ${isEnSelected ? 'active' : ''}">${isEnSelected ? "✅ EN" : "🇬🇧 На EN"}</button>
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

    // Кнопка На RU
    const selectRuBtn = card.querySelector(".btn-select-ru");
    selectRuBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      selectRuBtn.disabled = true;
      selectRuBtn.textContent = "⏳...";
      try {
        await api()?.set_voice("ru", v.service_key, v.voice_id, v.name);
        updateActiveVoiceDisplay("ru", v.service_key, v.voice_id, v.name);
        document.querySelectorAll(".btn-select-ru").forEach(b => {
          b.classList.remove("active");
          b.textContent = "🇷🇺 На RU";
        });
        selectRuBtn.classList.add("active");
        selectRuBtn.textContent = "✅ RU";
        card.classList.add("selected");
        showVoiceStatusHint(`Голос «${v.name}» назначен для RU ответов!`);
      } catch (err) {
        console.error("Set RU voice error:", err);
      } finally {
        selectRuBtn.disabled = false;
      }
    });

    // Кнопка На EN
    const selectEnBtn = card.querySelector(".btn-select-en");
    selectEnBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      selectEnBtn.disabled = true;
      selectEnBtn.textContent = "⏳...";
      try {
        await api()?.set_voice("en", v.service_key, v.voice_id, v.name);
        updateActiveVoiceDisplay("en", v.service_key, v.voice_id, v.name);
        document.querySelectorAll(".btn-select-en").forEach(b => {
          b.classList.remove("active");
          b.textContent = "🇬🇧 На EN";
        });
        selectEnBtn.classList.add("active");
        selectEnBtn.textContent = "✅ EN";
        card.classList.add("selected");
        showVoiceStatusHint(`Голос «${v.name}» назначен для EN ответов!`);
      } catch (err) {
        console.error("Set EN voice error:", err);
      } finally {
        selectEnBtn.disabled = false;
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
    renderVoiceCards(voices || []);
  } catch (err) {
    voiceCardsContainer.innerHTML = '<div class="voice-cards-empty">Ошибка загрузки каталога голосов</div>';
    console.error("Load voices error:", err);
  }
}

/* ==================== Слушатели событий Voice Library ==================== */

searchVoicesBtn?.addEventListener("click", () => {
  const cat = catalogSelect?.value || "fishaudio";
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

testVoiceRuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  selectTuningSlot("ru");
  const form = collectTuningForm();
  api()?.test_voice("ru", form);
});

testVoiceEnBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  selectTuningSlot("en");
  const form = collectTuningForm();
  api()?.test_voice("en", form);
});

warmupCatalogBtn?.addEventListener("click", async () => {
  warmupCatalogBtn.disabled = true;
  warmupCatalogBtn.textContent = "⏳ Запуск прогрева...";
  try {
    await api()?.warmup_full_catalog();
    showVoiceStatusHint("Запущен фоновый прогрев всех реплик стрима!");
  } catch (err) {
    console.error("Warmup catalog error:", err);
  } finally {
    setTimeout(() => {
      warmupCatalogBtn.disabled = false;
      warmupCatalogBtn.textContent = "⚡ Прогреть весь каталог реплик";
    }, 2000);
  }
});

manualSaveRuBtn?.addEventListener("click", async () => {
  const p = manualProviderSelect?.value || "fishaudio";
  const vid = manualVoiceId?.value.trim() || "";
  if (!vid) return;
  manualSaveRuBtn.disabled = true;
  manualSaveRuBtn.textContent = "⏳...";
  try {
    await api()?.set_voice("ru", p, vid, vid);
    updateActiveVoiceDisplay("ru", p, vid, vid);
    showVoiceStatusHint("Голос RU успешно сохранён!");
  } catch (err) {
    console.error("Manual save RU voice error:", err);
  } finally {
    manualSaveRuBtn.disabled = false;
    manualSaveRuBtn.textContent = "🇷🇺 Сохранить на RU";
  }
});

manualSaveEnBtn?.addEventListener("click", async () => {
  const p = manualProviderSelect?.value || "fishaudio";
  const vid = manualVoiceId?.value.trim() || "";
  if (!vid) return;
  manualSaveEnBtn.disabled = true;
  manualSaveEnBtn.textContent = "⏳...";
  try {
    await api()?.set_voice("en", p, vid, vid);
    updateActiveVoiceDisplay("en", p, vid, vid);
    showVoiceStatusHint("Голос EN успешно сохранён!");
  } catch (err) {
    console.error("Manual save EN voice error:", err);
  } finally {
    manualSaveEnBtn.disabled = false;
    manualSaveEnBtn.textContent = "🇬🇧 Сохранить на EN";
  }
});

/* ==================== Студия тонкой настройки живости голоса Lumean ==================== */

function selectTuningSlot(slot) {
  activeTuningSlot = slot;
  tuneSlotRuBtn?.classList.toggle("active", slot === "ru");
  tuneSlotEnBtn?.classList.toggle("active", slot === "en");
  activeVoiceBoxRu?.classList.toggle("selected-slot", slot === "ru");
  activeVoiceBoxEn?.classList.toggle("selected-slot", slot === "en");
  renderTuningUI(slot);
}

// Клик по карточкам активных голосов переключает настраиваемый слот
activeVoiceBoxRu?.addEventListener("click", () => selectTuningSlot("ru"));
activeVoiceBoxEn?.addEventListener("click", () => selectTuningSlot("en"));

function renderTuningUI(slot) {
  const tuning = (slot === "ru" ? currentTuningData.ru : currentTuningData.en) || {};
  const activeVoice = slot === "ru" ? currentActiveRu : currentActiveEn;
  const serviceKey = (tuning.service_key || activeVoice.service || "fishaudio").toLowerCase();

  // 1. Модели и доступные контролы в зависимости от провайдера
  if (tuneModelSelect) {
    tuneModelSelect.innerHTML = "";
    if (serviceKey === "fishaudio") {
      const models = [
        { id: "s2.1-pro", label: "s2.1-pro (Флагман, макс. живость)" },
        { id: "s2-pro", label: "s2-pro (Быстрая)" },
        { id: "s1", label: "s1 (Базовая)" },
        { id: "drama-3", label: "drama-3 (Эмоциональная)" },
      ];
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.label;
        if (tuning.model_id === m.id || (!tuning.model_id && m.id === "s2.1-pro")) {
          opt.selected = true;
        }
        tuneModelSelect.appendChild(opt);
      }
      if (tuneLatencyRow) tuneLatencyRow.hidden = false;
      if (tuneLatencySelect) tuneLatencySelect.value = tuning.latency || "balanced";
      if (tuneStyleRow) tuneStyleRow.hidden = true;
      if (tuneSimilarityRow) tuneSimilarityRow.hidden = true;
      if (tuneStabilityLabel) tuneStabilityLabel.textContent = "🎭 Вариативность (Температура)";
      if (tuneStabilitySlider) {
        const tempVal = tuning.temperature !== undefined ? Math.round(tuning.temperature * 100) : 82;
        tuneStabilitySlider.value = tempVal;
        if (tuneStabilityValue) tuneStabilityValue.textContent = (tempVal / 100).toFixed(2);
      }
    } else if (serviceKey === "elevenlabs") {
      const models = [
        { id: "eleven_multilingual_v2", label: "eleven_multilingual_v2 (Мультиязычная v2)" },
        { id: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5 (Быстрая Turbo)" },
        { id: "eleven_flash_v2_5", label: "eleven_flash_v2_5 (Мгновенная Flash)" },
      ];
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.label;
        if (tuning.model_id === m.id || (!tuning.model_id && m.id === "eleven_multilingual_v2")) {
          opt.selected = true;
        }
        tuneModelSelect.appendChild(opt);
      }
      if (tuneLatencyRow) tuneLatencyRow.hidden = true;
      if (tuneStyleRow) tuneStyleRow.hidden = false;
      if (tuneSimilarityRow) tuneSimilarityRow.hidden = false;
      if (tuneStabilityLabel) tuneStabilityLabel.textContent = "🎭 Стабильность / Эмоции";
      if (tuneStabilitySlider) {
        const stabVal = tuning.stability !== undefined ? Math.round(tuning.stability * 100) : 38;
        tuneStabilitySlider.value = stabVal;
        if (tuneStabilityValue) tuneStabilityValue.textContent = (stabVal / 100).toFixed(2);
      }
      if (tuneStyleSlider) {
        const styleVal = tuning.style !== undefined ? Math.round(tuning.style * 100) : 42;
        tuneStyleSlider.value = styleVal;
        if (tuneStyleValue) tuneStyleValue.textContent = (styleVal / 100).toFixed(2);
      }
      if (tuneSimilaritySlider) {
        const simVal = tuning.similarity_boost !== undefined ? Math.round(tuning.similarity_boost * 100) : 82;
        tuneSimilaritySlider.value = simVal;
        if (tuneSimilarityValue) tuneSimilarityValue.textContent = (simVal / 100).toFixed(2);
      }
    } else {
      const opt = document.createElement("option");
      opt.value = tuning.model_id || "default";
      opt.textContent = tuning.model_id || "По умолчанию";
      tuneModelSelect.appendChild(opt);
      if (tuneLatencyRow) tuneLatencyRow.hidden = true;
      if (tuneStyleRow) tuneStyleRow.hidden = true;
      if (tuneSimilarityRow) tuneSimilarityRow.hidden = true;
    }
  }

  // 2. Темп речи
  const speed = tuning.speed !== undefined ? Number(tuning.speed) : 1.06;
  if (tuneSpeedSlider) {
    tuneSpeedSlider.value = Math.round(speed * 100);
    if (tuneSpeedValue) tuneSpeedValue.textContent = speed.toFixed(2) + "x";
  }

  // 3. Частота дискретизации (Sample Rate pills)
  const srate = tuning.sample_rate || 44100;
  currentSampleRate = srate;
  sampleRatePills.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.srate) === srate);
  });

  // 4. Чекбоксы
  if (tuneNormalizeText) tuneNormalizeText.checked = tuning.normalize_text !== false;
  if (tuneNormalizeVolume) tuneNormalizeVolume.checked = tuning.normalize_volume !== false;
  if (tuneBreathingPauses) tuneBreathingPauses.checked = tuning.breathing_pauses !== false;
}

function collectTuningForm() {
  const activeVoice = activeTuningSlot === "ru" ? currentActiveRu : currentActiveEn;
  const serviceKey = activeVoice.service || "fishaudio";
  const speed = Number(tuneSpeedSlider?.value || 106) / 100;
  const normalize_text = Boolean(tuneNormalizeText?.checked);
  const normalize_volume = Boolean(tuneNormalizeVolume?.checked);
  const breathing_pauses = Boolean(tuneBreathingPauses?.checked);
  const model_id = tuneModelSelect?.value || "";

  const payload = {
    service_key: serviceKey,
    model_id: model_id,
    speed: speed,
    sample_rate: currentSampleRate,
    normalize_text: normalize_text,
    normalize_volume: normalize_volume,
    breathing_pauses: breathing_pauses,
    audio_quality: "high",
  };

  if (serviceKey === "fishaudio") {
    payload.latency = tuneLatencySelect?.value || "balanced";
    payload.temperature = Number(tuneStabilitySlider?.value || 82) / 100;
    payload.top_p = 0.85;
    payload.repetition_penalty = 1.20;
  } else if (serviceKey === "elevenlabs") {
    payload.advanced_voice_settings = true;
    payload.stability = Number(tuneStabilitySlider?.value || 38) / 100;
    payload.style = Number(tuneStyleSlider?.value || 42) / 100;
    payload.similarity_boost = Number(tuneSimilaritySlider?.value || 82) / 100;
    payload.use_speaker_boost = true;
  }

  return payload;
}

// Переключение RU / EN слота в студии
tuneSlotRuBtn?.addEventListener("click", () => selectTuningSlot("ru"));
tuneSlotEnBtn?.addEventListener("click", () => selectTuningSlot("en"));

// Интерактивные слайдеры
tuneSpeedSlider?.addEventListener("input", () => {
  if (tuneSpeedValue) tuneSpeedValue.textContent = (Number(tuneSpeedSlider.value) / 100).toFixed(2) + "x";
});

tuneStabilitySlider?.addEventListener("input", () => {
  if (tuneStabilityValue) tuneStabilityValue.textContent = (Number(tuneStabilitySlider.value) / 100).toFixed(2);
});

tuneStyleSlider?.addEventListener("input", () => {
  if (tuneStyleValue) tuneStyleValue.textContent = (Number(tuneStyleSlider.value) / 100).toFixed(2);
});

tuneSimilaritySlider?.addEventListener("input", () => {
  if (tuneSimilarityValue) tuneSimilarityValue.textContent = (Number(tuneSimilaritySlider.value) / 100).toFixed(2);
});

// Кнопки частоты дискретизации
sampleRatePills.forEach((btn) => {
  btn.addEventListener("click", () => {
    sampleRatePills.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentSampleRate = Number(btn.dataset.srate) || 44100;
  });
});

// Кнопка пресета "Живая стримерша"
applyLivePresetBtn?.addEventListener("click", async () => {
  applyLivePresetBtn.disabled = true;
  applyLivePresetBtn.textContent = "⏳ Применение пресета «Живая стримерша»...";
  try {
    const res = await api()?.apply_live_preset(activeTuningSlot);
    if (res && res.tuning) {
      currentTuningData[activeTuningSlot] = res.tuning;
    }
    renderTuningUI(activeTuningSlot);
    showVoiceStatusHint(`Пресет «Живая стримерша» применён и сохранён для ${activeTuningSlot.toUpperCase()}!`);
  } catch (err) {
    console.error("Apply live preset error:", err);
  } finally {
    applyLivePresetBtn.disabled = false;
    applyLivePresetBtn.textContent = "✨ Сделать голос максимально живым (Авто-настройка)";
  }
});

// Сохранить в Lumean
saveTuningBtn?.addEventListener("click", async () => {
  saveTuningBtn.disabled = true;
  saveTuningBtn.textContent = "⏳ Сохранение в Lumean...";
  try {
    const payload = collectTuningForm();
    const res = await api()?.save_voice_tuning(activeTuningSlot, payload);
    if (res && res.tuning) {
      currentTuningData[activeTuningSlot] = res.tuning;
    }
    renderTuningUI(activeTuningSlot);
    showVoiceStatusHint(`Настройки живости для ${activeTuningSlot.toUpperCase()} успешно сохранены в Lumean!`);
  } catch (err) {
    console.error("Save voice tuning error:", err);
    showVoiceStatusHint("Ошибка сохранения настроек живости");
  } finally {
    saveTuningBtn.disabled = false;
    saveTuningBtn.textContent = "💾 Сохранить в Lumean";
  }
});

// Тест (без кэша)
testTunedBtn?.addEventListener("click", async () => {
  testTunedBtn.disabled = true;
  testTunedBtn.textContent = "🎙 Синтез...";
  try {
    const currentForm = collectTuningForm();
    await api()?.test_tuned_voice(activeTuningSlot, currentForm);
    showVoiceStatusHint(`Тестовая живая фраза отправлена на синтез (bypass кэша)`);
  } catch (err) {
    console.error("Test tuned voice error:", err);
  } finally {
    setTimeout(() => {
      testTunedBtn.disabled = false;
      testTunedBtn.textContent = "🎙 Тест (без кэша)";
    }, 2500);
  }
});

// Очистить кэш и переозвучить с новыми настройками
rewarmTunedBtn?.addEventListener("click", async () => {
  rewarmTunedBtn.disabled = true;
  rewarmTunedBtn.textContent = "⏳ Очистка и переозвучка...";
  try {
    await api()?.clear_and_rewarm_cache(activeTuningSlot);
    showVoiceStatusHint(`Старый кэш очищен. Запущена переозвучка реплик с новыми настройками!`);
  } catch (err) {
    console.error("Rewarm error:", err);
  } finally {
    setTimeout(() => {
      rewarmTunedBtn.disabled = false;
      rewarmTunedBtn.textContent = "🔄 Переозвучить кэш с новыми настройками";
    }, 2500);
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

ttConnect?.addEventListener("click", async () => {
  const username = ttUsername.value.trim();
  if (!username) return;
  onTikTokStatus("connecting", `⏳ Подключаюсь к ${username}...`);
  const ok = await api()?.connect_tiktok(username);
  if (!ok) {
    onTikTokStatus("error", "Некорректный юзернейм или ссылка");
  }
});

ttDisconnect?.addEventListener("click", async () => {
  await api()?.disconnect_tiktok();
  onTikTokStatus("off", "выключен");
});

simAsk.addEventListener("click", () => {
  const text = simQuestion.value.trim();
  if (!text) return;
  onChatEvent({ kind: "user", who: "👤 Зритель", text });
  api()?.simulate_comment(text);
  simQuestion.value = "";
});

simJoin?.addEventListener("click", () => {
  const lang = simLang?.value || "auto";
  const isEn = lang === "en";
  const user = isEn ? "Alex 🚀" : "Дима 🚀";
  onChatEvent({ kind: "user", who: "👋 Вход", text: isEn ? `${user} joined the stream` : `${user} присоединился к эфиру` });
  api()?.simulate_join(user, lang);
});

simFollow?.addEventListener("click", () => {
  const lang = simLang?.value || "auto";
  const isEn = lang === "en";
  const user = isEn ? "Emily ✨" : "Алина ✨";
  onChatEvent({ kind: "user", who: "💃 Подписка", text: isEn ? `${user} followed!` : `${user} подписалась на канал!` });
  api()?.simulate_follow(user, lang);
});

simGift?.addEventListener("click", () => {
  const lang = simLang?.value || "auto";
  const isEn = lang === "en";
  const user = isEn ? "Mike 🚀" : "Миша 🚀";
  const gift = isEn ? "Rose" : "Роза";
  onChatEvent({ kind: "user", who: "🎁 Подарок", text: isEn ? `${user} sent a ${gift}!` : `${user} отправил ${gift}!` });
  api()?.simulate_gift(user, gift, lang);
});

simLike?.addEventListener("click", () => {
  const lang = simLang?.value || "auto";
  const isEn = lang === "en";
  const user = isEn ? "Kate ✨" : "Катя ✨";
  onChatEvent({ kind: "user", who: "❤️ Лайки", text: isEn ? `${user} sent 5 likes!` : `${user} поставила 5 лайков!` });
  api()?.simulate_like(user, 5, lang);
});

clearQueueBtn?.addEventListener("click", async () => {
  await api()?.clear_queue();
  if (queueBadge) queueBadge.hidden = true;
});

simQuestion.addEventListener("keydown", (event) => {
  if (event.key === "Enter") simAsk.click();
});

function updateStreamLangUI(lang) {
  const isRu = (lang || "ru").toLowerCase() === "ru";
  if (streamLangRuBtn) streamLangRuBtn.classList.toggle("active", isRu);
  if (streamLangEnBtn) streamLangEnBtn.classList.toggle("active", !isRu);
  if (simLang) simLang.value = isRu ? "ru" : "en";
}

streamLangRuBtn?.addEventListener("click", async () => {
  await api()?.set_stream_lang("ru");
  updateStreamLangUI("ru");
  showVoiceStatusHint("Язык эфира переключен на RU 🇷🇺");
});

streamLangEnBtn?.addEventListener("click", async () => {
  await api()?.set_stream_lang("en");
  updateStreamLangUI("en");
  showVoiceStatusHint("Язык эфира переключен на EN 🇬🇧");
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

/* ==================== WINKY AI Terminal Overlay & Voice Signals ==================== */

const openTerminalBtn = document.getElementById("openTerminalBtn");
const voiceSignalsToggle = document.getElementById("voiceSignalsToggle");
const voiceSignalsToggleBg = document.getElementById("voiceSignalsToggleBg");
const voiceSignalsToggleKnob = document.getElementById("voiceSignalsToggleKnob");

if (openTerminalBtn) {
  openTerminalBtn.addEventListener("click", () => {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.open_signal_terminal) {
      window.pywebview.api.open_signal_terminal();
    } else {
      window.open("http://127.0.0.1:8790/webapp/?streamer=1&lang=ru", "_blank");
    }
  });
}

function updateVoiceToggleUI(enabled) {
  if (!voiceSignalsToggle) return;
  voiceSignalsToggle.checked = enabled;
  if (voiceSignalsToggleBg) {
    voiceSignalsToggleBg.style.background = enabled ? "#00F0FF" : "rgba(255,255,255,0.2)";
  }
  if (voiceSignalsToggleKnob) {
    voiceSignalsToggleKnob.style.left = enabled ? "24px" : "4px";
  }
}

if (voiceSignalsToggle) {
  voiceSignalsToggle.addEventListener("change", () => {
    const enabled = voiceSignalsToggle.checked;
    updateVoiceToggleUI(enabled);
    if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_voice_signals) {
      window.pywebview.api.toggle_voice_signals(enabled);
    }
  });
}

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
    updateActiveVoiceDisplay("ru", status.lumean.ru_service, status.lumean.ru_voice_id, status.lumean.ru_voice_name);
    updateActiveVoiceDisplay("en", status.lumean.en_service, status.lumean.en_voice_id, status.lumean.en_voice_name);
    if (status.lumean.ru_tuning) currentTuningData.ru = status.lumean.ru_tuning;
    if (status.lumean.en_tuning) currentTuningData.en = status.lumean.en_tuning;
    renderTuningUI(activeTuningSlot);
    const defaultCatalog = status.lumean.ru_service || "fishaudio";
    if (catalogSelect) catalogSelect.value = defaultCatalog;
    loadVoices(defaultCatalog);
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
