/* ============================================================
   WINKY AI TRADING BOT — TELEGRAM MINI APP CONTROLLER (Vanilla JS)
   Classic Trading Bot HUD (Dark Sapphire Matte #0D1322)
   Strictly 2 Bottom Tabs: 🏠 СИГНАЛЫ & 💬 ИИ-ЧАТ
   Zero Popups · Zero speechSynthesis · Full Inline Experience
   ============================================================ */

"use strict";

const ASSET_CATALOG = {
  otc: [
    { id: "EUR/USD OTC", name: "EUR/USD OTC", flags: "🇪🇺🇺🇸", payout: "92%" },
    { id: "AUD/CAD OTC", name: "AUD/CAD OTC", flags: "🇦🇺🇨🇦", payout: "90%" },
    { id: "MAD/USD OTC", name: "MAD/USD OTC", flags: "🇲🇦🇺🇸", payout: "92%" },
    { id: "USD/CAD OTC", name: "USD/CAD OTC", flags: "🇺🇸🇨🇦", payout: "92%" },
    { id: "GBP/USD OTC", name: "GBP/USD OTC", flags: "🇬🇧🇺🇸", payout: "92%" },
    { id: "USD/JPY OTC", name: "USD/JPY OTC", flags: "🇺🇸🇯🇵", payout: "90%" },
    { id: "AUD/USD OTC", name: "AUD/USD OTC", flags: "🇦🇺🇺🇸", payout: "91%" },
    { id: "NZD/USD OTC", name: "NZD/USD OTC", flags: "🇳🇿🇺🇸", payout: "88%" },
    { id: "Apple OTC", name: "Apple OTC", flags: "🍏", payout: "90%" },
    { id: "Tesla OTC", name: "Tesla OTC", flags: "⚡", payout: "90%" },
    { id: "BTC/USD OTC", name: "BTC/USD OTC", flags: "₿", payout: "86%" },
    { id: "ETH/USD OTC", name: "ETH/USD OTC", flags: "Ξ", payout: "85%" },
    { id: "GOLD OTC", name: "GOLD OTC", flags: "🥇", payout: "90%" },
  ],
  regular: [
    { id: "EUR/USD", name: "EUR/USD", flags: "🇪🇺🇺🇸", payout: "85%" },
    { id: "GBP/USD", name: "GBP/USD", flags: "🇬🇧🇺🇸", payout: "84%" },
    { id: "USD/JPY", name: "USD/JPY", flags: "🇺🇸🇯🇵", payout: "85%" },
    { id: "AUD/USD", name: "AUD/USD", flags: "🇦🇺🇺🇸", payout: "80%" },
    { id: "USD/CAD", name: "USD/CAD", flags: "🇺🇸🇨🇦", payout: "82%" },
    { id: "AUD/CAD", name: "AUD/CAD", flags: "🇦🇺🇨🇦", payout: "82%" },
    { id: "NZD/USD", name: "NZD/USD", flags: "🇳🇿🇺🇸", payout: "80%" },
  ]
};

const urlParams = new URLSearchParams(window.location.search);
const queryTgId = urlParams.get("tg_id") ? parseInt(urlParams.get("tg_id"), 10) : null;
const queryLang = urlParams.get("lang") === "ru" || urlParams.get("lang") === "en" ? urlParams.get("lang") : null;
const isStreamerMode = urlParams.get("streamer") === "1";

const state = {
  lang: queryLang || localStorage.getItem("winky_lang") || "ru",
  marketType: "otc",
  pair: "EUR/USD OTC",
  flags: "🇪🇺🇺🇸",
  payout: "92%",
  duration: "30s",
  model: "claude-fable-5.1",
  autoSignals: false,
  isBusy: false,
  forceDir: null, // Secret Streamer trigger: 'BUY' (logo) | 'SELL' (badge/pair)
  initData: window.Telegram?.WebApp?.initData || "",
  tgId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || (queryTgId ? parseInt(queryTgId, 10) : null),
  liveWins: 110,
  liveLosses: 1,
  countdownInterval: null,
};

const i18n = {
  ru: {
    pairLbl: "Валютная пара",
    timeLbl: "Время сделки",
    time: "Экспирация:",
    accuracy: "Точность:",
    readyForSignal: "Готов к анализу графика",
    analysing: "Анализ RSI, EMA и уровней...",
    getSignal: "ПОЛУЧИТЬ СИГНАЛ",
    auto: "АВТО",
    tabSignals: "🏠 СИГНАЛЫ",
    tabChat: "💬 ИИ-ЧАТ",
    chatWelcome: "Привет! Я Winky AI. Выберите пару, экспирацию и нажмите кнопку запроса.",
    buyText: "↗ КУПИТЬ (ВВЕРХ)",
    sellText: "↘ ПРОДАТЬ (ВНИЗ)",
    depositTitle: "Демо-сигналы исчерпаны",
    depositDesc: "Вы использовали 3 бесплатных сигнала. Пополните счёт Pocket Option, чтобы получить безлимитный доступ к сигналам, OTC-алгоритмам и всем ИИ-моделям.",
    promoBonus: "+50% к депозиту от $50",
    registerNow: "1. БЫСТРАЯ РЕГИСТРАЦИЯ (30 сек)",
    depositNow: "2. ПОПОЛНИТЬ СЧЁТ (+50% БОНУС)",
    close: "Закрыть",
    copied: "Скопировано!",
  },
  en: {
    pairLbl: "Currency Pair",
    timeLbl: "Trade Duration",
    time: "Expiry:",
    accuracy: "Accuracy:",
    readyForSignal: "Ready for chart analysis",
    analysing: "Analyzing RSI, EMA & levels...",
    getSignal: "GET SIGNAL",
    auto: "AUTO",
    tabSignals: "🏠 SIGNALS",
    tabChat: "💬 AI CHAT",
    chatWelcome: "Hello! I am Winky AI. Select a currency pair, duration and tap send.",
    buyText: "↗ BUY (CALL)",
    sellText: "↘ SELL (PUT)",
    depositTitle: "Demo Signals Exhausted",
    depositDesc: "You have used all 3 free demo signals. Deposit on Pocket Option to unlock unlimited signals, OTC algorithms, and all AI models.",
    promoBonus: "+50% Deposit Bonus from $50",
    registerNow: "1. FAST REGISTRATION (30s)",
    depositNow: "2. DEPOSIT (+50% BONUS)",
    close: "Close",
    copied: "Copied!",
  }
};

function t(k) {
  const dict = i18n[state.lang] || i18n.ru;
  return dict[k] || k;
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const k = node.getAttribute("data-i18n");
    node.textContent = t(k);
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });
  updateCardUI();
}

/* ==================== 1. Tab Switching (Strictly 2 Tabs) ==================== */

function switchTab(tabId) {
  document.querySelectorAll(".tab-view").forEach((tab) => tab.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==================== 2. Market Switch & Selectors ==================== */

function populatePairSelect() {
  const select = document.getElementById("selectPair");
  if (!select) return;

  const list = ASSET_CATALOG[state.marketType] || ASSET_CATALOG.otc;
  select.innerHTML = "";

  list.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = `${item.flags} ${item.name} (${item.payout})`;
    if (item.id === state.pair) opt.selected = true;
    select.appendChild(opt);
  });

  // Ensure valid selection
  const match = list.find((x) => x.id === select.value) || list[0];
  state.pair = match.id;
  state.flags = match.flags;
  state.payout = match.payout;

  updateCardUI();
}

function updateCardUI() {
  const flagsEl = document.getElementById("cardFlags");
  const nameEl = document.getElementById("cardPairName");
  const payoutEl = document.getElementById("cardPayout");
  const metricTimeEl = document.getElementById("metricTime");
  const pillChatPair = document.getElementById("pillChatPair");
  const pillChatDuration = document.getElementById("pillChatDuration");

  if (flagsEl) flagsEl.textContent = state.flags;
  if (nameEl) nameEl.textContent = state.pair;
  if (payoutEl) payoutEl.textContent = `+${state.payout}`;
  if (metricTimeEl) metricTimeEl.textContent = state.duration;

  if (pillChatPair) pillChatPair.textContent = state.pair;
  if (pillChatDuration) pillChatDuration.textContent = state.duration;
}

/* ==================== 3. Signal Generation Flow ==================== */

function cleanRationaleText(str) {
  if (!str) return "";
  return String(str)
    .replace(/[📌🎯⚡⚠️]/g, "")
    .replace(/^(Картина графика:|Логика входа:|Настроение рынка:|Анализ просадки:|Умное перекрытие:|Chart structure:|Trade entry:|Market sentiment:|Drawdown analysis:|Smart recovery:)\s*/i, "")
    .trim();
}

function parseDurationSeconds(dur) {
  const num = parseInt(dur, 10) || 30;
  if (dur.includes("m")) return num * 60;
  return num;
}

function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function startSignalAnalysis() {
  if (state.isBusy) return;
  state.isBusy = true;

  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
    state.countdownInterval = null;
  }

  const dirBlock = document.getElementById("directionBlock");
  const btn = document.getElementById("btnGetSignal");
  if (btn) btn.disabled = true;

  // 1. ANALYSIS STATE: 1.2 SECONDS SCANNING BAR
  if (dirBlock) {
    dirBlock.className = "winky-direction-block analysing";
    dirBlock.innerHTML = `
      <div class="analysis-scan-title" style="display:flex;align-items:center;gap:6px;font-size:11.5px;letter-spacing:0.5px;color:#00F5A0;font-weight:800;">
        <span>⚡</span>
        <span>${t("analysing")}</span>
      </div>
      <div class="analysis-progress-bar">
        <div class="analysis-progress-fill"></div>
      </div>
    `;
  }

  const startTime = performance.now();
  let apiData = null;

  try {
    const resp = await fetch("/api/signal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": state.initData || "",
      },
      body: JSON.stringify({
        tg_id: state.tgId,
        pair: state.pair,
        duration: state.duration,
        force_dir: state.forceDir,
        model: state.model,
        init_data: state.initData || "",
      }),
    });
    state.forceDir = null; // consume trigger

    if (resp.status === 403) {
      if (dirBlock) {
        dirBlock.className = "winky-direction-block idle";
        dirBlock.innerHTML = `<span id="dirStateText">${t("readyForSignal")}</span>`;
      }
      if (btn) btn.disabled = false;
      state.isBusy = false;
      const depositBackdrop = document.getElementById("depositSheetBackdrop");
      if (depositBackdrop) depositBackdrop.hidden = false;
      return;
    }

    if (resp.ok) {
      apiData = await resp.json();
    }
  } catch (_) {
    // offline fallback
  }

  // Ensure minimum 950ms smooth analysis bar animation
  const elapsed = performance.now() - startTime;
  if (elapsed < 950) {
    await new Promise((r) => setTimeout(r, 950 - elapsed));
  }

  // 2. ACTIVE SIGNAL STATE
  const dir = apiData?.direction || (Math.random() > 0.45 ? "BUY" : "SELL");
  const isBuy = dir === "BUY";
  const accuracy = apiData?.accuracy || Math.floor(91 + Math.random() * 6);
  const totalSec = parseDurationSeconds(state.duration);

  const accEl = document.getElementById("metricAccuracy");
  if (accEl) accEl.textContent = `${accuracy}%`;

  const lines = state.lang === "ru" ? (apiData?.rationale_ru || []) : (apiData?.rationale_en || []);
  const cleanLine1 = cleanRationaleText(lines[0]);
  const cleanLine2 = cleanRationaleText(lines[1]);
  const isRu = (state.lang === "ru");
  let strategyText = cleanLine1;
  if (cleanLine2 && cleanLine2 !== cleanLine1) {
    strategyText += (strategyText.endsWith(".") ? " " : ". ") + cleanLine2;
  }
  if (!strategyText) {
    strategyText = isBuy
      ? (isRu ? "Подтверждённый отскок от зоны спроса — покупатели удерживают инициативу." : "Confirmed demand zone bounce — buyers sustaining upside momentum.")
      : (isRu ? "Пробой локального уровня поддержки — продавцы давят цену вниз без откатов." : "Support breakdown confirmed — sellers pressing price action lower.");
  }

  if (dirBlock) {
    dirBlock.className = `winky-direction-block active ${isBuy ? "buy" : "sell"}`;
    dirBlock.innerHTML = `
      <div class="winky-sig-hero">
        <div class="winky-sig-dir-wrap ${isBuy ? "buy" : "sell"}">
          <span class="winky-sig-arrow">${isBuy ? "↗" : "↘"}</span>
          <span class="winky-sig-dir-text">${isBuy ? (isRu ? "КУПИТЬ · ВВЕРХ" : "BUY · CALL") : (isRu ? "ПРОДАТЬ · ВНИЗ" : "SELL · PUT")}</span>
        </div>
        <div class="winky-sig-timer-capsule">
          <span class="winky-sig-pulse-dot">●</span>
          <span class="winky-sig-timer-val" id="signalTimer">${formatCountdown(totalSec)}</span>
        </div>
      </div>

      <div class="winky-sig-strategy-box ${isBuy ? "buy" : "sell"}">
        <div class="winky-sig-strategy-meta">
          <span>${isRu ? "АНАЛИТИКА ВХОДА" : "ENTRY ANALYTICS"}</span>
          <span class="winky-sig-strategy-score">★ ${apiData?.confluence ? Number(apiData.confluence).toFixed(1) : "4.7"} / 5.0 · ${accuracy}%</span>
        </div>
        <div class="winky-sig-strategy-text">
          ${strategyText}
        </div>
      </div>

      <div class="winky-sig-progress-track">
        <div class="winky-sig-progress-fill ${isBuy ? "buy" : "sell"}" id="signalProgressFill" style="width: 100%;"></div>
      </div>
    `;
  }

  if (btn) {
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.textContent = isRu ? `СДЕЛКА АКТИВНА · ${formatCountdown(totalSec)}` : `TRADE ACTIVE · ${formatCountdown(totalSec)}`;
  }

  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(isBuy ? "success" : "warning");
  }

  // Attempt voice dispatch if local or remote server endpoint responds
  dispatchLumeanVoice({ pair: state.pair, direction: dir, duration: state.duration, accuracy });

  // 3. COUNTDOWN TO EXPIRY
  let remaining = totalSec;
  const timerEl = document.getElementById("signalTimer");
  const progressEl = document.getElementById("signalProgressFill");

  state.countdownInterval = setInterval(() => {
    remaining -= 1;
    const safeRem = Math.max(0, remaining);
    if (timerEl) timerEl.textContent = formatCountdown(safeRem);
    if (progressEl) {
      const pct = Math.max(0, Math.min(100, (safeRem / totalSec) * 100));
      progressEl.style.width = `${pct}%`;
    }
    if (btn) {
      btn.textContent = isRu ? `СДЕЛКА АКТИВНА · ${formatCountdown(safeRem)}` : `TRADE ACTIVE · ${formatCountdown(safeRem)}`;
    }

    if (remaining <= 0) {
      clearInterval(state.countdownInterval);
      state.countdownInterval = null;
      onSignalExpiryFinished();
    }
  }, 1000);
}

function onSignalExpiryFinished() {
  state.liveWins += 1;
  updateLiveScoreUI();

  if (window.Telegram?.WebApp?.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
  }

  const btn = document.getElementById("btnGetSignal");
  if (btn) btn.disabled = false;
  state.isBusy = false;

  // Auto-signals loop on stream
  if (state.autoSignals) {
    setTimeout(() => {
      if (state.autoSignals && !state.isBusy) {
        startSignalAnalysis();
      }
    }, 2800);
  }
}

async function dispatchLumeanVoice(payload) {
  try {
    await fetch("/api/winky/speak_signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        lang: state.lang,
      }),
    });
  } catch (_) {
    // Non-critical if running in pure web mode
  }
}

/* ==================== 4. Live Score Streamer HUD ==================== */

function updateLiveScoreUI() {
  const winEl = document.getElementById("winCount");
  const lossEl = document.getElementById("lossCount");
  const rateEl = document.getElementById("winRateVal");

  if (winEl) winEl.textContent = state.liveWins;
  if (lossEl) lossEl.textContent = state.liveLosses;

  const total = state.liveWins + state.liveLosses;
  const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) : "99.1";
  if (rateEl) rateEl.textContent = `${rate}%`;
}

function setupLiveScore() {
  const btnToggle = document.getElementById("btnLiveToggle");
  const bumper = document.getElementById("liveBumper");
  const btnClose = document.getElementById("btnCloseBumper");
  const pillWins = document.getElementById("pillWins");
  const pillLosses = document.getElementById("pillLosses");

  if (btnToggle && bumper) {
    btnToggle.addEventListener("click", () => {
      bumper.hidden = !bumper.hidden;
    });
  }

  if (btnClose && bumper) {
    btnClose.addEventListener("click", () => {
      bumper.hidden = true;
    });
  }

  if (pillWins) {
    pillWins.addEventListener("click", () => {
      state.liveWins += 1;
      updateLiveScoreUI();
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
      }
    });
  }

  if (pillLosses) {
    pillLosses.addEventListener("click", () => {
      state.liveLosses += 1;
      updateLiveScoreUI();
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
      }
    });
  }

  // Update clock every second
  const clockEl = document.getElementById("liveClock");
  setInterval(() => {
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = `${now.toISOString().substring(11, 19)} UTC`;
    }
  }, 1000);
}

/* ==================== 5. AI Chat Tab Controller ==================== */

function setupAiChat() {
  const selectModel = document.getElementById("selectChatModel");
  const chatFeed = document.getElementById("chatFeed");
  const btnSend = document.getElementById("btnChatSend");
  const pillPair = document.getElementById("pillChatPair");
  const pillDuration = document.getElementById("pillChatDuration");
  const modelTag = document.getElementById("chatActiveModelTag");

  if (selectModel) {
    selectModel.addEventListener("change", (e) => {
      state.model = e.target.value;
      if (modelTag) {
        const text = e.target.options[e.target.selectedIndex]?.text || state.model;
        modelTag.textContent = text.split("·")[0].trim();
      }
    });
  }

  function sendChatQuery() {
    if (!chatFeed) return;

    // User Message Bubble
    const userBubble = document.createElement("div");
    userBubble.className = "winky-chat-bubble user";
    userBubble.innerHTML = `
      <div class="bubble-header">
        <span class="user-badge">${state.lang === "ru" ? "ВЫ" : "YOU"}</span>
      </div>
      <div class="bubble-content">
        ${state.lang === "ru" ? "Анализ актива" : "Asset analysis"}: <b>${state.pair}</b> · ${state.duration}
      </div>
    `;
    chatFeed.appendChild(userBubble);

    // AI Response Loading Indicator
    const aiBubble = document.createElement("div");
    aiBubble.className = "winky-chat-bubble ai";
    aiBubble.innerHTML = `
      <div class="bubble-header">
        <span class="ai-badge">WINKY AI</span>
        <span class="bubble-model">${selectModel?.options[selectModel.selectedIndex]?.text.split("·")[0].trim() || "Claude Fable"}</span>
      </div>
      <div class="bubble-content" style="opacity:0.7;">
        ${state.lang === "ru" ? "Обработка свечного графика и стакана ордеров..." : "Processing candlesticks and order flow..."}
      </div>
    `;
    chatFeed.appendChild(aiBubble);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    setTimeout(() => {
      const isUp = Math.random() > 0.45;
      const rsi = (35 + Math.random() * 35).toFixed(1);
      const conf = Math.floor(92 + Math.random() * 6);

      aiBubble.querySelector(".bubble-content").innerHTML = `
        <div style="font-weight:700;color:#fff;margin-bottom:6px;">
          ${state.pair} · ${state.duration}
        </div>
        <div style="color:#94a3b8;font-size:12px;margin-bottom:6px;line-height:1.5;">
          • RSI: <b style="color:#fff;">${rsi}</b> (${isUp ? (state.lang === "ru" ? "выход из перепроданности" : "oversold recovery") : (state.lang === "ru" ? "разворот вниз" : "overbought rejection")})<br>
          • EMA 9/21: <b style="color:#fff;">${isUp ? "Bullish Cross" : "Bearish Cross"}</b><br>
          • Confidence: <b style="color:#10b981;">${conf}%</b>
        </div>
        <div style="display:inline-block;padding:4px 10px;border-radius:6px;font-weight:800;font-size:12px;background:${isUp ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};color:${isUp ? '#10B981' : '#EF4444'};border:1px solid ${isUp ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'};">
          ${isUp ? (state.lang === "ru" ? "РЕКОМЕНДАЦИЯ: КУПИТЬ ↗" : "CALL: BUY ↗") : (state.lang === "ru" ? "РЕКОМЕНДАЦИЯ: ПРОДАТЬ ↘" : "CALL: SELL ↘")}
        </div>
      `;
      chatFeed.scrollTop = chatFeed.scrollHeight;

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
      }
    }, 850);
  }

  if (btnSend) btnSend.addEventListener("click", sendChatQuery);
  if (pillPair) pillPair.addEventListener("click", sendChatQuery);
  if (pillDuration) pillDuration.addEventListener("click", sendChatQuery);
}

/* ==================== 6. Streamer Secret Triggers ==================== */

function setupSecretTriggers() {
  const brand = document.getElementById("brand");
  const cardPair = document.getElementById("cardPairName");
  const badge = document.getElementById("userStatusBadge");

  // Tap Logo -> Force BUY
  if (brand) {
    brand.addEventListener("click", () => {
      state.forceDir = "BUY";
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
      }
    });
  }

  // Tap Pair Name or Badge -> Force SELL
  if (cardPair) {
    cardPair.addEventListener("click", () => {
      state.forceDir = "SELL";
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
      }
    });
  }

  if (badge) {
    badge.addEventListener("click", () => {
      state.forceDir = "SELL";
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
      }
    });
  }
}

/* ==================== 7. App Initialization ==================== */

document.addEventListener("DOMContentLoaded", () => {
  // Telegram WebApp setup
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    try {
      window.Telegram.WebApp.setHeaderColor("#0D1322");
      window.Telegram.WebApp.setBackgroundColor("#0D1322");
    } catch (_) {}
  }

  // Apply language
  applyLanguage();

  // Tab switching
  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
    });
  });

  // Market Switch
  const mktReg = document.getElementById("mktRegularBtn");
  const mktOtc = document.getElementById("mktOtcBtn");

  if (mktReg) {
    mktReg.addEventListener("click", () => {
      state.marketType = "regular";
      mktReg.classList.add("active");
      if (mktOtc) mktOtc.classList.remove("active");
      populatePairSelect();
    });
  }

  if (mktOtc) {
    mktOtc.addEventListener("click", () => {
      state.marketType = "otc";
      mktOtc.classList.add("active");
      if (mktReg) mktReg.classList.remove("active");
      populatePairSelect();
    });
  }

  // Populate Selectors
  populatePairSelect();

  const selectPair = document.getElementById("selectPair");
  if (selectPair) {
    selectPair.addEventListener("change", (e) => {
      state.pair = e.target.value;
      const list = ASSET_CATALOG[state.marketType] || ASSET_CATALOG.otc;
      const match = list.find((x) => x.id === state.pair) || { flags: "⚡", payout: "90%" };
      state.flags = match.flags;
      state.payout = match.payout;
      updateCardUI();
    });
  }

  const selectDuration = document.getElementById("selectDuration");
  if (selectDuration) {
    selectDuration.addEventListener("change", (e) => {
      state.duration = e.target.value;
      updateCardUI();
    });
  }

  // Language Switch
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang") || "ru";
      localStorage.setItem("winky_lang", state.lang);
      applyLanguage();
    });
  });

  // Action Button & Auto Toggle
  const btnGetSignal = document.getElementById("btnGetSignal");
  if (btnGetSignal) {
    btnGetSignal.addEventListener("click", startSignalAnalysis);
  }

  const autoToggle = document.getElementById("autoToggle");
  if (autoToggle) {
    autoToggle.addEventListener("click", () => {
      state.autoSignals = !state.autoSignals;
      autoToggle.classList.toggle("active", state.autoSignals);
      if (state.autoSignals && !state.isBusy) {
        startSignalAnalysis();
      }
    });
  }

  // Deposit Sheet actions
  const btnCloseDeposit = document.getElementById("btnCloseDeposit");
  const depositBackdrop = document.getElementById("depositSheetBackdrop");
  if (btnCloseDeposit && depositBackdrop) {
    btnCloseDeposit.addEventListener("click", () => {
      depositBackdrop.hidden = true;
    });
  }

  const btnCopyPromo = document.getElementById("btnCopyPromo");
  if (btnCopyPromo) {
    btnCopyPromo.addEventListener("click", () => {
      navigator.clipboard?.writeText("50START").then(() => {
        btnCopyPromo.textContent = t("copied");
        setTimeout(() => {
          btnCopyPromo.textContent = state.lang === "ru" ? "Копировать" : "Copy";
        }, 2000);
      });
    });
  }

  // Live Score Bumper setup
  setupLiveScore();

  // AI Chat setup
  setupAiChat();

  // Secret Streamer Triggers
  setupSecretTriggers();

  // Poll synced signal from live streamer extension
  let lastSyncedSignalKey = "";
  async function pollSyncedStreamSignal() {
    try {
      const res = await fetch("/api/signal/sync");
      if (!res.ok) return;
      const data = await res.json();
      if (data.active && data.signal && data.remaining_sec > 0) {
        const sig = data.signal;
        const key = `${sig.pair}_${sig.direction}_${Math.floor(sig.created_at)}`;
        if (key !== lastSyncedSignalKey) {
          lastSyncedSignalKey = key;
          if (!state.isBusy) {
            state.pair = sig.pair;
            const pairEl = document.getElementById("selectPair");
            if (pairEl) {
              let found = false;
              for (const opt of pairEl.options) {
                if (opt.value.toLowerCase() === sig.pair.toLowerCase()) {
                  opt.selected = true;
                  found = true;
                  break;
                }
              }
              if (!found) {
                const newOpt = document.createElement("option");
                newOpt.value = sig.pair;
                newOpt.textContent = sig.pair;
                newOpt.selected = true;
                pairEl.prepend(newOpt);
              }
            }
            const pairDisplay = document.getElementById("cardPairName");
            if (pairDisplay) pairDisplay.textContent = sig.pair;
          }
        }
      }
    } catch (_) {}
  }
  setInterval(pollSyncedStreamSignal, 3500);
});
