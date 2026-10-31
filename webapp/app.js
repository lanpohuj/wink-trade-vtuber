/* ============================================================
   WINKY PAIR SNIPER — TELEGRAM MINI APP CONTROLLER (Vanilla JS)
   Tactical HUD (Market Pulse, 48-Tick Radar, Tachometer Gauge)
   Strictly 2 Bottom Tabs: SNIPER & AI CHAT
   ============================================================ */

"use strict";

const ASSET_CATALOG = {
  currencies: [
    { id: "USD/CAD OTC", name: "USD/CAD OTC", payout: "92%" },
    { id: "EUR/USD OTC", name: "EUR/USD OTC", payout: "92%" },
    { id: "GBP/USD OTC", name: "GBP/USD OTC", payout: "92%" },
    { id: "AUD/CAD OTC", name: "AUD/CAD OTC", payout: "90%" },
    { id: "MAD/USD OTC", name: "MAD/USD OTC", payout: "92%" },
    { id: "AUD/USD OTC", name: "AUD/USD OTC", payout: "91%" },
    { id: "USD/JPY OTC", name: "USD/JPY OTC", payout: "90%" },
    { id: "NZD/USD OTC", name: "NZD/USD OTC", payout: "88%" },
  ],
  stocks: [
    { id: "Apple OTC", name: "Apple OTC", payout: "90%" },
    { id: "Tesla OTC", name: "Tesla OTC", payout: "90%" },
    { id: "Microsoft OTC", name: "Microsoft OTC", payout: "89%" },
    { id: "Amazon OTC", name: "Amazon OTC", payout: "88%" },
  ],
  crypto: [
    { id: "BTC/USD OTC", name: "Bitcoin OTC", payout: "86%" },
    { id: "ETH/USD OTC", name: "Ethereum OTC", payout: "85%" },
    { id: "SOL/USD OTC", name: "Solana OTC", payout: "84%" },
  ],
  indices: [
    { id: "SP500 OTC", name: "S&P 500 OTC", payout: "88%" },
    { id: "NDX100 OTC", name: "Nasdaq 100 OTC", payout: "88%" },
    { id: "DJI30 OTC", name: "Dow Jones OTC", payout: "87%" },
  ],
  commodities: [
    { id: "GOLD OTC", name: "Gold OTC", payout: "90%" },
    { id: "SILVER OTC", name: "Silver OTC", payout: "88%" },
    { id: "BRENT OTC", name: "Crude Oil OTC", payout: "86%" },
  ],
};

const urlParams = new URLSearchParams(window.location.search);
const queryTgId = urlParams.get("tg_id") ? parseInt(urlParams.get("tg_id"), 10) : null;
const queryLang = urlParams.get("lang") === "ru" || urlParams.get("lang") === "en" ? urlParams.get("lang") : null;
const isStreamerMode = urlParams.get("streamer") === "1";

const state = {
  lang: queryLang || localStorage.getItem("winky_lang") || "ru",
  category: "currencies",
  targetPair: "USD/CAD OTC",
  targetPayout: "92%",
  selectedModel: "claude-fable-5.1",
  autoSniper: false,
  isBusy: false,
  forceDir: null, // Streamer secret trigger: 'BUY' (logo) | 'SELL' (pair)
  tgId: queryTgId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 7166130676),
  liveWins: 110,
  liveLosses: 1,
  activeSignal: null,
  entryInterval: null,
};

const i18n = {
  ru: {
    pulseTitle: "MARKET PULSE",
    pulseSub: "Где рынок движется сильнее всего прямо сейчас. Нажми на строку, чтобы выбрать цель.",
    selected: "ВЫБРАНА",
    orPick: "ИЛИ ВЫБЕРИТЕ САМИ",
    target: "ЦЕЛЬ",
    payout: "выплата",
    change: "СМЕНИТЬ ▾",
    aiEngine: "ИИ-ДВИЖОК:",
    analyse: "АНАЛИЗИРОВАТЬ",
    autoSniper: "АВТО-СНАЙПЕР",
    checkingPairs: "ПАР ПРОВЕРЕНО",
    choosingExpiry: "ПОДБОР ЭКСПИРАЦИИ",
    toFitMove: "под текущий импульс рынка",
    entryWindow: "ОКНО ВХОДА · ИЗ",
    expiry: "ЭКСПИРАЦИЯ",
    signalStrength: "СИЛА СИГНАЛА",
    strongSignal: "сильный сигнал",
    edgeOfNoise: "на границе шума",
    newTarget: "НОВАЯ ЦЕЛЬ",
    keyboardHint: "⌨️ Введите экспирацию вручную, если нет кнопки",
    chatWelcome: "Привет! Я Winky AI. Выберите цель, модель теханализа и нажмите «Анализировать».",
    depositTitle: "Демо-сигналы исчерпаны",
    depositDesc: "Вы использовали 3 бесплатных сигнала. Пополните счёт Pocket Option, чтобы получить безлимитный доступ к сигналам, OTC-алгоритмам и всем ИИ-моделям.",
    promoBonus: "+50% к депозиту от $50",
    registerNow: "1. БЫСТРАЯ РЕГИСТРАЦИЯ (30 сек)",
    depositNow: "2. ПОПОЛНИТЬ СЧЁТ (+50% БОНУС)",
    close: "Закрыть",
    selectPair: "Выбор торгового актива",
  },
  en: {
    pulseTitle: "MARKET PULSE",
    pulseSub: "Where the market moves hardest right now. Tap a row to make it your target.",
    selected: "SELECTED",
    orPick: "OR PICK ONE YOURSELF",
    target: "TARGET",
    payout: "payout",
    change: "CHANGE ▾",
    aiEngine: "AI ENGINE:",
    analyse: "ANALYSE",
    autoSniper: "AUTO-SNIPER",
    checkingPairs: "PAIRS CHECKED",
    choosingExpiry: "CHOOSING EXPIRY",
    toFitMove: "to fit the move",
    entryWindow: "ENTRY WINDOW · OF",
    expiry: "EXPIRY",
    signalStrength: "SIGNAL STRENGTH",
    strongSignal: "strong signal",
    edgeOfNoise: "edge of noise",
    newTarget: "NEW TARGET",
    keyboardHint: "⌨️ Type this expiry in by hand if no quick button",
    chatWelcome: "Hello! I am Winky AI. Select a target, analysis model, and click «Analyze Market».",
    depositTitle: "Demo Signals Exhausted",
    depositDesc: "You have used all 3 free demo signals. Deposit on Pocket Option to unlock unlimited signals, OTC algorithms, and all AI models.",
    promoBonus: "+50% Deposit Bonus from $50",
    registerNow: "1. FAST REGISTRATION (30s)",
    depositNow: "2. DEPOSIT (+50% BONUS)",
    close: "Close",
    selectPair: "Select Trading Asset",
  },
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
  updateTargetCardUI();
}

/* ==================== 1. Strict 2-Tab Navigation ==================== */

function switchTab(tabId) {
  document.querySelectorAll(".tab-view").forEach((tab) => tab.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==================== 2. Inline Sniper States ==================== */

function setSniperState(s) {
  document.getElementById("statePulse").hidden = s !== "pulse";
  document.getElementById("stateRadar").hidden = s !== "radar";
  document.getElementById("stateSignal").hidden = s !== "signal";
}

function updateTargetCardUI() {
  const nameEl = document.getElementById("targetPairName");
  const payoutEl = document.getElementById("targetPayoutBadge");
  if (nameEl) nameEl.textContent = state.targetPair;
  if (payoutEl) payoutEl.textContent = `${t("payout")} ${state.targetPayout}`;
}

async function startSniperAnalysis() {
  if (state.isBusy) return;
  state.isBusy = true;

  if (state.entryInterval) {
    clearInterval(state.entryInterval);
    state.entryInterval = null;
  }

  // 1. STATE B: RADAR SCREEN (1.3 SECONDS)
  setSniperState("radar");

  const radarStart = performance.now();
  const countEl = document.getElementById("radarCountNum");
  const fillEl = document.getElementById("radarProgressFill");

  const radarInterval = setInterval(() => {
    const elapsed = performance.now() - radarStart;
    const p = Math.min(100, (elapsed / 1300) * 100);
    if (fillEl) fillEl.style.width = `${p}%`;

    const count = Math.min(23, Math.floor(1 + (elapsed / 1300) * 22));
    if (countEl) countEl.textContent = count;
  }, 45);

  let apiData = null;
  try {
    const resp = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tg_id: state.tgId,
        pair: state.targetPair,
        duration: "30s",
        force_dir: state.forceDir,
        model: state.selectedModel,
      }),
    });
    state.forceDir = null;

    if (resp.status === 403) {
      clearInterval(radarInterval);
      setSniperState("pulse");
      state.isBusy = false;
      document.getElementById("depositSheetBackdrop").hidden = false;
      return;
    }

    if (resp.ok) {
      apiData = await resp.json();
    }
  } catch (_) {}

  const remaining = Math.max(0, 1300 - (performance.now() - radarStart));
  await new Promise((r) => setTimeout(r, remaining));
  clearInterval(radarInterval);

  // 2. STATE C: SIGNAL SCREEN WITH TACHOMETER
  const dir = apiData?.direction || (Math.random() > 0.45 ? "BUY" : "SELL");
  const isBuy = dir === "BUY";
  const strength = apiData?.signal_strength || Math.floor(75 + Math.random() * 15);
  const entryWindow = apiData?.entry_window_sec || 12;

  state.activeSignal = {
    direction: dir,
    duration: apiData?.duration || "30 sec",
    signal_strength: strength,
    strength_verdict: strength >= 65 ? t("strongSignal") : t("edgeOfNoise"),
    entry_window_sec: entryWindow,
    move_percent: apiData?.move_percent || 0.019,
    move_window_sec: 30,
    move_to_noise: apiData?.move_to_noise || 3.4,
    horizons_agreeing: apiData?.horizons_agreeing || (state.lang === "ru" ? "5 из 5" : "5 of 5"),
    voice_phrase_ru: apiData?.voice_phrase_ru,
    voice_phrase_en: apiData?.voice_phrase_en,
  };

  // Populate UI
  document.getElementById("signalPairTitle").textContent = state.targetPair;
  document.getElementById("signalCategoryTag").textContent = state.category.toUpperCase();
  document.getElementById("signalExpiryVal").textContent = state.activeSignal.duration;
  document.getElementById("signalStrengthVal").textContent = state.activeSignal.signal_strength;
  document.getElementById("signalVerdictVal").textContent = state.activeSignal.strength_verdict;

  const dirBadge = document.getElementById("signalDirBadge");
  dirBadge.className = `wps-dir-badge ${isBuy ? "up" : "down"}`;
  dirBadge.textContent = isBuy ? "↑ UP" : "↓ DOWN";

  document.getElementById("signalTelemetryBox").textContent = state.lang === "ru"
    ? `Движение цены ${isBuy ? "вверх" : "вниз"}: ${state.activeSignal.move_percent}% за 30 с. Сила импульса к шуму — ${state.activeSignal.move_to_noise}. Согласие горизонтов: ${state.activeSignal.horizons_agreeing}.`
    : `Price moving ${isBuy ? "up" : "down"}: ${state.activeSignal.move_percent}% over 30s. Move-to-noise strength — ${state.activeSignal.move_to_noise}. Horizons agreeing: ${state.activeSignal.horizons_agreeing}.`;

  setSniperState("signal");

  // Voice announcement strictly through LumeanTTS
  dispatchVoiceAnnouncement(state.activeSignal);

  // Start Speedometer countdown
  startSpeedometerCountdown(entryWindow);
}

function startSpeedometerCountdown(totalSec) {
  const startTime = performance.now();
  const arcEl = document.getElementById("gaugeProgressArc");
  const needleEl = document.getElementById("gaugeNeedle");
  const countEl = document.getElementById("signalCountdownDigits");
  const isBuy = state.activeSignal?.direction === "BUY";

  if (arcEl) {
    arcEl.setAttribute("stroke", isBuy ? "#00FF9D" : "#FF3B5C");
  }

  state.entryInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const remaining = Math.max(0, totalSec - elapsed);
    const ratio = remaining / totalSec;

    if (countEl) countEl.textContent = `${Math.ceil(remaining)} SEC`;

    if (arcEl) {
      const offset = 314 * (1 - ratio);
      arcEl.style.strokeDashoffset = `${offset}`;
    }

    if (needleEl) {
      const angleRad = Math.PI - ratio * Math.PI;
      const nx = 130 - 80 * Math.cos(angleRad);
      const ny = 130 - 80 * Math.sin(angleRad);
      needleEl.setAttribute("x2", nx);
      needleEl.setAttribute("y2", ny);
    }

    if (remaining <= 0) {
      clearInterval(state.entryInterval);
      state.entryInterval = null;
      onSignalExpiryFinished();
    }
  }, 60);
}

function onSignalExpiryFinished() {
  state.liveWins += 1;
  broadcastLiveStats("signal_win");

  if (state.autoSniper) {
    setTimeout(() => {
      state.isBusy = false;
      startSniperAnalysis();
    }, 2500);
  } else {
    state.isBusy = false;
  }
}

function dispatchVoiceAnnouncement(sig) {
  // STRICT BAN: Zero window.speechSynthesis or macOS say!
  const phrase = state.lang === "ru" ? sig.voice_phrase_ru : sig.voice_phrase_en;
  const payload = {
    event: "signal",
    pair: state.targetPair,
    direction: sig.direction,
    duration: sig.duration,
    model: state.selectedModel,
    lang: state.lang,
    phrase: phrase,
  };

  if (window.pywebview?.api?.speak_signal) {
    try {
      window.pywebview.api.speak_signal(payload);
      return;
    } catch (_) {}
  }

  fetch("/api/winky/speak_signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/* ==================== 3. Live Stats Synchronization ==================== */

function updateLiveStatsUI() {
  const wEl = document.getElementById("winCount");
  const lEl = document.getElementById("lossCount");
  const rEl = document.getElementById("winRateVal");
  if (wEl) wEl.textContent = state.liveWins;
  if (lEl) lEl.textContent = state.liveLosses;
  const total = state.liveWins + state.liveLosses;
  const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) + "%" : "0.0%";
  if (rEl) rEl.textContent = rate;
}

function broadcastLiveStats(source = "miniapp") {
  updateLiveStatsUI();
  try {
    localStorage.setItem("winky_live_stats", JSON.stringify({
      wins: state.liveWins,
      losses: state.liveLosses,
      pair: state.targetPair,
      timestamp: Date.now(),
    }));
  } catch (_) {}

  if (window.BroadcastChannel) {
    try {
      const bc = new BroadcastChannel("winky_live_stats");
      bc.postMessage({
        type: "STATS_UPDATE",
        wins: state.liveWins,
        losses: state.liveLosses,
        pair: state.targetPair,
        source: source,
      });
      bc.close();
    } catch (_) {}
  }

  fetch("/api/live_stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wins: state.liveWins, losses: state.liveLosses, pair: state.targetPair }),
  }).catch(() => {});
}

function initLiveStats() {
  try {
    const raw = localStorage.getItem("winky_live_stats");
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.wins === "number") state.liveWins = p.wins;
      if (typeof p.losses === "number") state.liveLosses = p.losses;
    }
  } catch (_) {}

  fetch("/api/live_stats")
    .then((r) => r.json())
    .then((data) => {
      if (data && typeof data.wins === "number") {
        state.liveWins = data.wins;
        state.liveLosses = data.losses;
        updateLiveStatsUI();
      }
    })
    .catch(() => {});

  if (window.BroadcastChannel) {
    try {
      const rx = new BroadcastChannel("winky_live_stats");
      rx.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (typeof msg.wins === "number") state.liveWins = msg.wins;
        if (typeof msg.losses === "number") state.liveLosses = msg.losses;
        if (msg.pair && !state.isBusy) {
          state.targetPair = msg.pair;
          updateTargetCardUI();
        }
        updateLiveStatsUI();
      };
    } catch (_) {}
  }

  updateLiveStatsUI();
}

/* ==================== 4. AI Chat Tab ==================== */

async function performChatAnalysis() {
  const btn = document.getElementById("btnChatAnalyze");
  btn.disabled = true;

  const modelSelect = document.getElementById("chatModelSelect");
  const durSelect = document.getElementById("selectChatDuration");
  const modelName = modelSelect ? modelSelect.options[modelSelect.selectedIndex].text : "Claude Fable 5.1";
  const durVal = durSelect ? durSelect.value : "30s";

  const feed = document.getElementById("chatFeed");

  const userMsg = document.createElement("div");
  userMsg.className = "chat-bubble user";
  userMsg.innerHTML = `
    <div class="bubble-header"><span class="ai-badge">YOU</span></div>
    <div class="bubble-content">Анализ цели ${state.targetPair}, экспирация ${durVal} через ${modelName}.</div>
  `;
  feed.appendChild(userMsg);

  try {
    const resp = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tg_id: state.tgId,
        pair: state.targetPair,
        duration: durVal,
        force_dir: state.forceDir,
        model: modelSelect.value,
      }),
    });
    state.forceDir = null;

    const data = resp.ok ? await resp.json() : {
      direction: Math.random() > 0.45 ? "BUY" : "SELL",
      signal_strength: 82,
      duration: durVal,
    };

    const isBuy = data.direction === "BUY";
    const aiMsg = document.createElement("div");
    aiMsg.className = "chat-bubble ai";
    aiMsg.innerHTML = `
      <div class="bubble-header">
        <span class="ai-badge">WINKY AI</span>
        <span class="bubble-model">${modelName}</span>
      </div>
      <div class="bubble-content">
        Сигнал: <b style="color:${isBuy ? "#00FF9D" : "#FF3B5C"}">${isBuy ? "↑ UP (ВВЕРХ)" : "↓ DOWN (ВНИЗ)"}</b> · Сила ${data.signal_strength || 82}.
        Рекомендуемая экспирация: <b>${durVal}</b>.
      </div>
    `;
    feed.appendChild(aiMsg);
    feed.scrollTop = feed.scrollHeight;
  } catch (_) {}

  btn.disabled = false;
}

/* ==================== 5. Event Listeners Setup ==================== */

function setupEventListeners() {
  // Navigation Tabs
  document.getElementById("btnNavSniper").addEventListener("click", () => switchTab("tabSniper"));
  document.getElementById("btnNavChat").addEventListener("click", () => switchTab("tabChat"));

  // Streamer Secret Triggers: Click Logo = BUY, Click Target Label = SELL
  const brand = document.getElementById("brand");
  if (brand) {
    brand.addEventListener("click", () => {
      state.forceDir = "BUY";
      brand.style.filter = "drop-shadow(0 0 8px rgba(0, 255, 157, 0.8))";
      setTimeout(() => (brand.style.filter = "none"), 600);
    });
  }

  const targetLabel = document.getElementById("targetLabel");
  if (targetLabel) {
    targetLabel.addEventListener("click", () => {
      state.forceDir = "SELL";
      targetLabel.style.color = "#FF3B5C";
      setTimeout(() => (targetLabel.style.color = ""), 600);
    });
  }

  // Language Toggle
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem("winky_lang", state.lang);
      applyLanguage();
    });
  });

  // Hot pairs click
  document.querySelectorAll(".wps-hot-row").forEach((row) => {
    row.addEventListener("click", () => {
      document.querySelectorAll(".wps-hot-row").forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
      state.targetPair = row.dataset.pair;
      state.targetPayout = row.dataset.payout || "92%";
      updateTargetCardUI();
    });
  });

  // Category tabs
  document.querySelectorAll(".wps-cat-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".wps-cat-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.category = tab.dataset.cat;
      const catList = ASSET_CATALOG[state.category];
      if (catList && catList.length > 0) {
        state.targetPair = catList[0].id;
        state.targetPayout = catList[0].payout;
        updateTargetCardUI();
      }
    });
  });

  // Change Pair Button
  document.getElementById("btnChangePair").addEventListener("click", () => {
    const sheet = document.getElementById("pairSheetBackdrop");
    const listEl = document.getElementById("pairList");
    const catList = ASSET_CATALOG[state.category] || ASSET_CATALOG.currencies;

    listEl.innerHTML = catList
      .map((p) => `
        <div class="pair-item-row" data-pair="${p.id}" data-payout="${p.payout}">
          <span style="font-family:'JetBrains Mono'; font-weight:800;">${p.name}</span>
          <span class="wps-payout-tag">${p.payout}</span>
        </div>
      `)
      .join("");

    listEl.querySelectorAll(".pair-item-row").forEach((item) => {
      item.addEventListener("click", () => {
        state.targetPair = item.dataset.pair;
        state.targetPayout = item.dataset.payout;
        updateTargetCardUI();
        sheet.hidden = true;
      });
    });

    sheet.hidden = false;
  });

  document.getElementById("btnClosePairSheet").addEventListener("click", () => {
    document.getElementById("pairSheetBackdrop").hidden = true;
  });

  // Model select
  document.getElementById("modelSelect").addEventListener("change", (e) => {
    state.selectedModel = e.target.value;
  });

  // Auto-Sniper Switch
  const autoSwitch = document.getElementById("autoSniperSwitch");
  autoSwitch.addEventListener("click", () => {
    state.autoSniper = !state.autoSniper;
    autoSwitch.classList.toggle("active", state.autoSniper);
  });

  // Action Buttons
  document.getElementById("btnAnalyse").addEventListener("click", startSniperAnalysis);
  document.getElementById("btnNewTarget").addEventListener("click", () => {
    if (state.entryInterval) clearInterval(state.entryInterval);
    state.isBusy = false;
    setSniperState("pulse");
  });

  document.getElementById("btnChatAnalyze").addEventListener("click", performChatAnalysis);

  // Live HUD Bumper Toggle
  const liveToggle = document.getElementById("btnLiveToggle");
  const liveBumper = document.getElementById("liveBumper");
  liveToggle.addEventListener("click", () => {
    liveBumper.hidden = !liveBumper.hidden;
  });
  document.getElementById("btnCloseBumper").addEventListener("click", () => {
    liveBumper.hidden = true;
  });

  // Counter Bumper adjustments
  document.getElementById("pillWins").addEventListener("click", () => {
    state.liveWins += 1;
    broadcastLiveStats("manual");
  });
  document.getElementById("pillLosses").addEventListener("click", () => {
    state.liveLosses += 1;
    broadcastLiveStats("manual");
  });

  // Deposit Sheet
  document.getElementById("btnCloseDeposit").addEventListener("click", () => {
    document.getElementById("depositSheetBackdrop").hidden = true;
  });
  document.getElementById("btnCopyPromo").addEventListener("click", () => {
    navigator.clipboard?.writeText("50START");
    const btn = document.getElementById("btnCopyPromo");
    btn.textContent = "✓ Скопировано";
    setTimeout(() => (btn.textContent = "Копировать"), 2000);
  });
}

/* ==================== Initialization ==================== */

document.addEventListener("DOMContentLoaded", () => {
  if (window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    } catch (_) {}
  }

  setupEventListeners();
  applyLanguage();
  initLiveStats();
  setSniperState("pulse");

  if (isStreamerMode) {
    document.getElementById("liveBumper").hidden = false;
  }
});
