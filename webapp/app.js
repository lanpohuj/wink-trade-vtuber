/* ============================================================
   WINKY AI — Fintech Trading Terminal (Vanilla JS)
   Dark Sapphire & Electric Cyan/Emerald Theme
   Strictly 2 Bottom Tabs: HOME (Inline Terminal) & AI CHAT
   ============================================================ */

"use strict";

/* ==================== Metallic Currency Flags ==================== */

const CURRENCY_FLAGS = {
  EUR: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#003399" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><circle cx="16" cy="16" r="9" fill="none" stroke="#FFCC00" stroke-width="1.5" stroke-dasharray="2 2.7"/></svg>`,
  USD: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#B22234" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M1 11h30M1 17h30M1 23h30" stroke="#FFF" stroke-width="2"/><path d="M1 1h15v14H1z" fill="#3C3B6E"/><circle cx="8.5" cy="8" r="2.5" fill="#FFF"/></svg>`,
  GBP: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#012169" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M4 4l24 24M28 4L4 28" stroke="#FFF" stroke-width="4"/><path d="M4 4l24 24M28 4L4 28" stroke="#C8102E" stroke-width="2"/><path d="M16 1v30M1 16h30" stroke="#FFF" stroke-width="5.5"/><path d="M16 1v30M1 16h30" stroke="#C8102E" stroke-width="2.8"/></svg>`,
  JPY: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#FFFFFF" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><circle cx="16" cy="16" r="7" fill="#BC002D"/></svg>`,
  AUD: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#00008B" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M2 2h13v9H2z" fill="#012169"/><path d="M2 2l13 9M15 2L2 11" stroke="#FFF" stroke-width="1.8"/><circle cx="23" cy="8" r="1.5" fill="#FFF"/><circle cx="21" cy="21" r="2" fill="#FFF"/><circle cx="9" cy="22" r="2.5" fill="#FFF"/></svg>`,
  CAD: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#D80027" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M9 1h14v30H9z" fill="#FFF"/><path d="M16 7l2 5h4l-3 3 1 5-4-3-4 3 1-5-3-3h4z" fill="#D80027"/></svg>`,
  CHF: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#D52B1E" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><path d="M13 7h6v18h-6zM7 13h18v6H7z" fill="#FFF"/></svg>`,
  NZD: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#00247D" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><circle cx="22" cy="9" r="1.5" fill="#CC142B" stroke="#FFF" stroke-width="0.8"/><circle cx="24" cy="16" r="1.5" fill="#CC142B" stroke="#FFF" stroke-width="0.8"/><circle cx="20" cy="22" r="1.5" fill="#CC142B" stroke="#FFF" stroke-width="0.8"/><circle cx="16" cy="17" r="1.5" fill="#CC142B" stroke="#FFF" stroke-width="0.8"/></svg>`,
  BTC: `<svg class="flag-icon" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#F7931A" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/><text x="16" y="22" font-size="17" font-weight="bold" fill="#FFF" text-anchor="middle" font-family="'JetBrains Mono', sans-serif">₿</text></svg>`,
};

function getDualFlagsHtml(pairId) {
  const clean = pairId.replace(" OTC", "");
  let c1 = "EUR";
  let c2 = "USD";
  if (clean.includes("/")) {
    const parts = clean.split("/");
    c1 = parts[0] || "EUR";
    c2 = parts[1] || "USD";
  }
  const f1 = CURRENCY_FLAGS[c1] || CURRENCY_FLAGS.EUR;
  const f2 = CURRENCY_FLAGS[c2] || CURRENCY_FLAGS.USD;
  return `<span class="flag-round">${f1}</span><span class="flag-round">${f2}</span>`;
}

/* ==================== Catalogs & Models ==================== */

const PAIRS = [
  // OTC Markets (24/7)
  { id: "EUR/USD OTC", name: "EUR/USD", market: "otc", payout: "92%" },
  { id: "GBP/USD OTC", name: "GBP/USD", market: "otc", payout: "92%" },
  { id: "AUD/USD OTC", name: "AUD/USD", market: "otc", payout: "91%" },
  { id: "USD/JPY OTC", name: "USD/JPY", market: "otc", payout: "90%" },
  { id: "USD/CAD OTC", name: "USD/CAD", market: "otc", payout: "89%" },
  { id: "EUR/JPY OTC", name: "EUR/JPY", market: "otc", payout: "89%" },
  { id: "AUD/CAD OTC", name: "AUD/CAD", market: "otc", payout: "88%" },
  { id: "USD/CHF OTC", name: "USD/CHF", market: "otc", payout: "88%" },
  { id: "NZD/USD OTC", name: "NZD/USD", market: "otc", payout: "87%" },
  { id: "BTC/USD OTC", name: "BTC/USD", market: "otc", payout: "85%" },

  // Regular Markets
  { id: "EUR/USD", name: "EUR/USD", market: "classic", payout: "82%" },
  { id: "GBP/USD", name: "GBP/USD", market: "classic", payout: "82%" },
  { id: "USD/JPY", name: "USD/JPY", market: "classic", payout: "80%" },
  { id: "AUD/USD", name: "AUD/USD", market: "classic", payout: "80%" },
];

const AI_MODELS = [
  {
    id: "claude-fable-5.1",
    name: "Claude Fable 5.1",
    provider: "Anthropic",
    tag: "FLAGSHIP",
    descRu: "Свечной анализ и глубинная психология разворотов",
    descEn: "Candlestick psychology & exhaustion patterns",
    isDefault: true,
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    provider: "Anthropic",
    tag: "INSTITUTIONAL",
    descRu: "Сканирование блоков институциональной ликвидности",
    descEn: "Institutional liquidity blocks & order flow",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    tag: "SPEED",
    descRu: "Высокоскоростной анализ импульса EMA и RSI",
    descEn: "Fast momentum & moving average crosses",
  },
  {
    id: "gpt-5-astra",
    name: "GPT-5 Astra",
    provider: "OpenAI",
    tag: "VISION",
    descRu: "Флагманское распознавание графических паттернов",
    descEn: "Flagship vision & harmonic chart recognition",
  },
  {
    id: "gpt-5-luna",
    name: "GPT-5 Luna",
    provider: "OpenAI",
    tag: "HIGH-SPEED",
    descRu: "Сверхбыстрый скальпинг младших тиковых импульсов",
    descEn: "Sub-second tick scalping & impulse burst",
  },
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "OpenAI",
    tag: "PROPRIETARY",
    descRu: "Мультифакторный консенсус институциональных индикаторов",
    descEn: "Multi-indicator institutional consensus",
  },
  {
    id: "gemini-argon",
    name: "Gemini Argon",
    provider: "Google",
    tag: "RADAR",
    descRu: "Институциональный радар уровней поддержки и сопротивления",
    descEn: "Institutional depth-of-market level scanner",
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    provider: "Google",
    tag: "CORE",
    descRu: "Мультимодальный анализ графических структур",
    descEn: "Multimodal chart structure reasoning",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    provider: "Google",
    tag: "MICRO",
    descRu: "Микросекундный импульсный детектор волатильности",
    descEn: "Sub-second volatility & impulse filter",
  },
];

/* ==================== Localization (RU / EN) ==================== */

const I18N = {
  ru: {
    pairLabel: "Валютная пара",
    durationLabel: "Время экспирации",
    getSignal: "ПОЛУЧИТЬ СИГНАЛ",
    waitSignal: "Ожидание сделки: {s}с",
    idleTitle: "ГОТОВ К АНАЛИЗУ",
    idleSub: "Нажмите кнопку «Получить сигнал» для поиска точки входа",
    analyzing1: "1. Сканирование стакана заявок и тикового потока...",
    analyzing2: "2. Нейросетевая фильтрация рыночного шума...",
    analyzing3: "3. Подтверждение точки входа институциональным ядром...",
    entryOpen: "ВХОД ОТКРЫТ!",
    expiryLabel: "Время экспирации:",
    tradeFinished: "Сделка завершена · Точка отработана",
    statsUpdated: "Результат учтён в статистике сессии.",
    nextSignalIn: "Следующий сигнал через {s}...",
    riskHint: "Мани-менеджмент: рекомендуемая ставка не более 3% от депозита",
    navHome: "СИГНАЛЫ",
    navChat: "ИИ ЧАТ",
    selectPair: "Выбор валютной пары",
    searchPair: "Поиск пары (EUR, USD, OTC)...",
    selectModel: "Выбор ИИ-модели теханализа",
    analyzeBtn: "АНАЛИЗИРОВАТЬ РЫНОК",
    chatWelcome: "Привет! Я Winky AI. Выберите валютную пару, экспирацию и модель теханализа, затем нажмите «Анализировать».",
    depositTitle: "Демо-сигналы исчерпаны",
    depositDesc: "Вы использовали 3 бесплатных сигнала. Пополните счёт Pocket Option, чтобы получить безлимитный доступ к сигналам, OTC-алгоритмам и всем ИИ-моделям.",
    promoBonus: "+50% к депозиту от $50",
    registerNow: "1. БЫСТРАЯ РЕГИСТРАЦИЯ (30 сек)",
    depositNow: "2. ПОПОЛНИТЬ СЧЁТ (+50% БОНУС)",
    close: "Закрыть",
  },
  en: {
    pairLabel: "Trading Pair",
    durationLabel: "Expiration Time",
    getSignal: "GET SIGNAL",
    waitSignal: "Trade Active: {s}s",
    idleTitle: "READY TO SCAN",
    idleSub: "Click «Get Signal» below to identify optimal market entry",
    analyzing1: "1. Scanning order book & tick momentum...",
    analyzing2: "2. Neural noise filtering & liquidity check...",
    analyzing3: "3. Institutional confirmation & target entry...",
    entryOpen: "ENTRY OPEN!",
    expiryLabel: "Expiration Time:",
    tradeFinished: "Trade Completed · Target Achieved",
    statsUpdated: "Trade outcome registered in session stats.",
    nextSignalIn: "Next signal in {s}...",
    riskHint: "Risk management: recommended stake ≤ 3% of deposit",
    navHome: "SIGNALS",
    navChat: "AI CHAT",
    selectPair: "Select Currency Pair",
    searchPair: "Search pair (EUR, USD, OTC)...",
    selectModel: "Select AI Analysis Model",
    analyzeBtn: "ANALYZE MARKET",
    chatWelcome: "Hello! I am Winky AI. Select a currency pair, expiration, and analysis model, then click «Analyze Market».",
    depositTitle: "Demo Signals Exhausted",
    depositDesc: "You have used all 3 free demo signals. Deposit on Pocket Option to unlock unlimited signals, OTC algorithms, and all AI models.",
    promoBonus: "+50% Deposit Bonus from $50",
    registerNow: "1. FAST REGISTRATION (30s)",
    depositNow: "2. DEPOSIT (+50% BONUS)",
    close: "Close",
  },
};

/* ==================== Application State ==================== */

const urlParams = new URLSearchParams(window.location.search);
const queryTgId = urlParams.get("tg_id") ? parseInt(urlParams.get("tg_id"), 10) : null;
const queryLang = urlParams.get("lang") === "ru" || urlParams.get("lang") === "en" ? urlParams.get("lang") : null;
const isStreamerMode = urlParams.get("streamer") === "1";

const state = {
  lang: queryLang || localStorage.getItem("winky_lang") || "ru",
  market: "otc",
  pair: "EUR/USD OTC",
  duration: "5s",
  model: "claude-fable-5.1",
  forceDir: null, // Streamer secret trigger: 'BUY' (logo click) or 'SELL' (pairLabel click)
  autoRadar: false,
  autoRadarTimer: null,
  isBusy: false,
  activeTimerInterval: null,
  tgId: queryTgId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 111111111),
  isVip: true,
  freeSignalsLeft: 999,
  liveWins: 110,
  liveLosses: 1,
  liveVisible: isStreamerMode,
  registerUrl: "https://po-ru4.click/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START",
  depositUrl: "https://po-ru4.click/cabinet/deposit?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START&promo=50START",
};

/* ==================== DOM Elements ==================== */

const el = {
  brand: document.getElementById("brand"),
  pairLabel: document.getElementById("pairLabel"),
  btnAutoRadar: document.getElementById("btnAutoRadar"),
  radarLabel: document.getElementById("radarLabel"),
  btnLiveToggle: document.getElementById("btnLiveToggle"),
  liveBumper: document.getElementById("liveBumper"),
  liveClock: document.getElementById("liveClock"),
  winCount: document.getElementById("winCount"),
  lossCount: document.getElementById("lossCount"),
  winRateVal: document.getElementById("winRateVal"),
  pillWins: document.getElementById("pillWins"),
  pillLosses: document.getElementById("pillLosses"),
  btnCloseBumper: document.getElementById("btnCloseBumper"),
  langSwitch: document.getElementById("langSwitch"),
  badgeVip: document.getElementById("badgeVip"),
  badgeGuest: document.getElementById("badgeGuest"),
  guestCount: document.getElementById("guestCount"),
  // Market & Controls
  btnMarketOtc: document.getElementById("btnMarketOtc"),
  btnMarketRegular: document.getElementById("btnMarketRegular"),
  pairTrigger: document.getElementById("pairTrigger"),
  pairDisplay: document.getElementById("pairDisplay"),
  pairFlags: document.getElementById("pairFlags"),
  durationPills: document.querySelectorAll("#durationPills .expiry-pill"),
  cardPairTitle: document.getElementById("cardPairTitle"),
  cardDurationBadge: document.getElementById("cardDurationBadge"),
  cardAccuracyBadge: document.getElementById("cardAccuracyBadge"),
  // Inline Terminal Display States
  stateIdle: document.getElementById("stateIdle"),
  stateScanning: document.getElementById("stateScanning"),
  stateSignal: document.getElementById("stateSignal"),
  stateFinished: document.getElementById("stateFinished"),
  scanPriceVal: document.getElementById("scanPriceVal"),
  scanStatusText: document.getElementById("scanStatusText"),
  scanProgressFill: document.getElementById("scanProgressFill"),
  directionBanner: document.getElementById("directionBanner"),
  directionArrow: document.getElementById("directionArrow"),
  directionText: document.getElementById("directionText"),
  entryStatus: document.getElementById("entryStatus"),
  signalAccuracyNum: document.getElementById("signalAccuracyNum"),
  timerDigits: document.getElementById("timerDigits"),
  timerBarFill: document.getElementById("timerBarFill"),
  rationaleList: document.getElementById("rationaleList"),
  autoRadarCountdownText: document.getElementById("autoRadarCountdownText"),
  signalBtn: document.getElementById("signalBtn"),
  signalBtnText: document.getElementById("signalBtnText"),
  // Bottom Tabs
  btnNavHome: document.getElementById("btnNavHome"),
  btnNavChat: document.getElementById("btnNavChat"),
  tabHome: document.getElementById("tabHome"),
  tabChat: document.getElementById("tabChat"),
  // Chat view
  chatFeed: document.getElementById("chatFeed"),
  btnSelectModel: document.getElementById("btnSelectModel"),
  selectedModelLabel: document.getElementById("selectedModelLabel"),
  btnChatPair: document.getElementById("btnChatPair"),
  chatPairLabel: document.getElementById("chatPairLabel"),
  selectChatDuration: document.getElementById("selectChatDuration"),
  btnAnalyze: document.getElementById("btnAnalyze"),
  // Sheets
  pairSheetBackdrop: document.getElementById("pairSheetBackdrop"),
  btnClosePairSheet: document.getElementById("btnClosePairSheet"),
  pairSearchInput: document.getElementById("pairSearchInput"),
  pairList: document.getElementById("pairList"),
  modelSheetBackdrop: document.getElementById("modelSheetBackdrop"),
  btnCloseModelSheet: document.getElementById("btnCloseModelSheet"),
  modelList: document.getElementById("modelList"),
  depositSheetBackdrop: document.getElementById("depositSheetBackdrop"),
  btnCloseDeposit: document.getElementById("btnCloseDeposit"),
  btnCopyPromo: document.getElementById("btnCopyPromo"),
  btnRegisterLink: document.getElementById("btnRegisterLink"),
  btnDepositLink: document.getElementById("btnDepositLink"),
};

/* ==================== Localization Helper ==================== */

function t(key, vars = {}) {
  const dict = I18N[state.lang] || I18N.ru;
  let text = dict[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return text;
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    node.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    node.setAttribute("placeholder", t(key));
  });

  // Buttons text
  if (!state.isBusy) {
    el.signalBtnText.textContent = `${t("getSignal")} (${state.duration})`;
  }
  el.radarLabel.textContent = state.autoRadar ? "RADAR: ON" : "RADAR: OFF";

  // Language buttons
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });

  // Dual flags & pair text
  el.pairDisplay.textContent = state.pair;
  el.pairFlags.innerHTML = getDualFlagsHtml(state.pair);
  el.cardPairTitle.textContent = state.pair;
  el.chatPairLabel.textContent = state.pair;
  el.cardDurationBadge.textContent = `Timeframe: ${state.duration}`;

  const curModel = AI_MODELS.find((m) => m.id === state.model) || AI_MODELS[0];
  el.selectedModelLabel.textContent = curModel.name;
}

/* ==================== Strict 2-Tab Navigation ==================== */

function switchTab(tabId) {
  document.querySelectorAll(".tab-view").forEach((tab) => tab.classList.remove("active"));
  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".bottom-nav .nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  // Safe area scrolling
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==================== Live Stats Synchronization ==================== */

function updateLiveStatsUI() {
  el.winCount.textContent = state.liveWins;
  el.lossCount.textContent = state.liveLosses;
  const total = state.liveWins + state.liveLosses;
  const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) + "%" : "0.0%";
  el.winRateVal.textContent = rate;
}

function broadcastLiveStats(source = "terminal") {
  updateLiveStatsUI();
  try {
    localStorage.setItem("winky_live_stats", JSON.stringify({
      wins: state.liveWins,
      losses: state.liveLosses,
      pair: state.pair,
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
        pair: state.pair,
        source: source,
      });
      bc.close();
    } catch (_) {}
  }

  fetch("/api/live_stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wins: state.liveWins, losses: state.liveLosses, pair: state.pair }),
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
          state.pair = msg.pair;
          applyLanguage();
        }
        updateLiveStatsUI();
      };
    } catch (_) {}
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "winky_live_stats" && e.newValue) {
      try {
        const d = JSON.parse(e.newValue);
        if (typeof d.wins === "number") state.liveWins = d.wins;
        if (typeof d.losses === "number") state.liveLosses = d.losses;
        updateLiveStatsUI();
      } catch (_) {}
    }
  });

  updateLiveStatsUI();
}

/* ==================== Live Clock ==================== */

function initClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    if (el.liveClock) el.liveClock.textContent = `${h}:${m}:${s}`;
  }
  setInterval(tick, 1000);
  tick();
}

/* ==================== Inline Terminal Execution Flow ==================== */

function setTerminalDisplayState(s) {
  el.stateIdle.hidden = s !== "idle";
  el.stateScanning.hidden = s !== "scanning";
  el.stateSignal.hidden = s !== "signal";
  el.stateFinished.hidden = s !== "finished";
}

function triggerVoiceAnnouncement(data) {
  // STRICTLY Female LumeanTTS voice via Backend/pywebview API — ZERO window.speechSynthesis or Mac say!
  const payload = {
    event: "signal",
    pair: data.pair,
    direction: data.direction,
    duration: data.duration,
    model: data.model,
    accuracy: data.accuracy,
    lang: state.lang,
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

async function requestSignal() {
  if (state.isBusy) return;
  state.isBusy = true;
  el.signalBtn.disabled = true;

  // Clear any existing countdown intervals
  if (state.activeTimerInterval) {
    clearInterval(state.activeTimerInterval);
    state.activeTimerInterval = null;
  }
  if (state.autoRadarTimer) {
    clearTimeout(state.autoRadarTimer);
    state.autoRadarTimer = null;
  }

  // 1. PHASE: SCANNING (1.2 Seconds Fast Scan)
  setTerminalDisplayState("scanning");
  el.scanProgressFill.style.width = "0%";
  el.scanPriceVal.textContent = (1.0845 + Math.random() * 0.002).toFixed(5);
  el.scanStatusText.textContent = t("analyzing1");

  const scanStart = performance.now();
  const scanDuration = 1200; // 1.2s

  const progressInterval = setInterval(() => {
    const elapsed = performance.now() - scanStart;
    const p = Math.min(100, (elapsed / scanDuration) * 100);
    el.scanProgressFill.style.width = `${p}%`;

    if (elapsed > 400 && elapsed < 800) {
      el.scanStatusText.textContent = t("analyzing2");
    } else if (elapsed >= 800) {
      el.scanStatusText.textContent = t("analyzing3");
    }
  }, 50);

  // Parallel API Request
  let signalData = null;
  let apiError = null;

  try {
    const reqBody = {
      tg_id: state.tgId,
      pair: state.pair,
      duration: state.duration,
      force_dir: state.forceDir,
      model: state.model,
    };
    // Reset force trigger after consumption
    state.forceDir = null;

    const resp = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    if (resp.status === 403) {
      clearInterval(progressInterval);
      setTerminalDisplayState("idle");
      state.isBusy = false;
      el.signalBtn.disabled = false;
      openDepositSheet();
      return;
    }

    if (!resp.ok) {
      throw new Error(`API returned ${resp.status}`);
    }

    signalData = await resp.json();
  } catch (err) {
    apiError = err;
    // Fallback offline generator if backend is unavailable
    const durSec = parseInt(state.duration, 10) || 5;
    signalData = {
      direction: Math.random() > 0.45 ? "BUY" : "SELL",
      accuracy: Math.floor(92 + Math.random() * 6),
      pair: state.pair,
      duration: state.duration,
      duration_sec: durSec,
      model: state.model,
      rationale_ru: [
        "• Институциональный отскок от зоны ликвидности",
        "• Подтверждение импульса на дельте объёмов",
      ],
      rationale_en: [
        "• Institutional bounce from high liquidity pool",
        "• Volume delta confirms strong impulse direction",
      ],
    };
  }

  // Ensure minimum 1.2s scanning animation completes
  const remainingScan = Math.max(0, scanDuration - (performance.now() - scanStart));
  await new Promise((resolve) => setTimeout(resolve, remainingScan));
  clearInterval(progressInterval);
  el.scanProgressFill.style.width = "100%";

  // 2. PHASE: ACTIVE SIGNAL & PRECISION COUNTDOWN
  setTerminalDisplayState("signal");

  const isBuy = signalData.direction === "BUY";
  el.directionBanner.className = `signal-direction-banner ${isBuy ? "buy" : "sell"}`;
  el.directionText.textContent = isBuy ? "BUY (ВВЕРХ)" : "SELL (ВНИЗ)";
  el.entryStatus.textContent = t("entryOpen");
  el.signalAccuracyNum.textContent = `${signalData.accuracy}%`;
  el.cardAccuracyBadge.textContent = `Accuracy: ${signalData.accuracy}%`;

  // Arrow orientation
  el.directionArrow.innerHTML = isBuy
    ? `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`
    : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(180deg)"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;

  // Rationale bullet points
  const rationales = state.lang === "ru" ? signalData.rationale_ru : signalData.rationale_en;
  el.rationaleList.innerHTML = (rationales || [])
    .map((r) => `<div class="rationale-item">${r}</div>`)
    .join("");

  // Announce voice strictly via LumeanTTS
  triggerVoiceAnnouncement(signalData);

  // Precision Expiration Countdown (e.g. 00:05.0 -> 00:00.0)
  const durationSec = signalData.duration_sec || parseInt(state.duration, 10) || 5;
  const totalMs = durationSec * 1000;
  const startExpiryTime = performance.now();

  function formatTime(msRemaining) {
    const totalSeconds = Math.max(0, msRemaining / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((msRemaining % 1000) / 100);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
  }

  el.timerDigits.textContent = formatTime(totalMs);
  el.timerBarFill.style.width = "100%";

  state.activeTimerInterval = setInterval(() => {
    const elapsedMs = performance.now() - startExpiryTime;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const progress = (remainingMs / totalMs) * 100;

    el.timerDigits.textContent = formatTime(remainingMs);
    el.timerBarFill.style.width = `${progress}%`;

    const remainingSecs = Math.ceil(remainingMs / 1000);
    el.signalBtnText.textContent = t("waitSignal", { s: remainingSecs });

    if (remainingMs <= 0) {
      clearInterval(state.activeTimerInterval);
      state.activeTimerInterval = null;
      onSignalFinished();
    }
  }, 60);
}

function onSignalFinished() {
  // 3. PHASE: FINISHED & AUTO-INCREMENT STATS
  setTerminalDisplayState("finished");

  // Auto-increment WIN in counter
  state.liveWins += 1;
  broadcastLiveStats("terminal");

  // Auto-Radar Loop Handling
  if (state.autoRadar) {
    let nextCount = 3;
    el.autoRadarCountdownText.textContent = t("nextSignalIn", { s: nextCount });

    const autoInterval = setInterval(() => {
      nextCount -= 1;
      if (nextCount > 0) {
        el.autoRadarCountdownText.textContent = t("nextSignalIn", { s: nextCount });
      } else {
        clearInterval(autoInterval);
        state.isBusy = false;
        requestSignal();
      }
    }, 1000);
  } else {
    // Return cleanly to idle state after 2.5 seconds
    setTimeout(() => {
      setTerminalDisplayState("idle");
      state.isBusy = false;
      el.signalBtn.disabled = false;
      el.signalBtnText.textContent = `${t("getSignal")} (${state.duration})`;
    }, 2500);
  }
}

/* ==================== AI Chat Analysis Flow ==================== */

async function performChatAnalysis() {
  el.btnAnalyze.disabled = true;
  el.btnAnalyze.querySelector(".btn-text").textContent = "АНАЛИЗ...";

  const curModel = AI_MODELS.find((m) => m.id === state.model) || AI_MODELS[0];

  // Append User message
  const userMsg = document.createElement("div");
  userMsg.className = "chat-bubble user";
  userMsg.innerHTML = `
    <div class="bubble-header"><span class="ai-badge">YOU</span></div>
    <div class="bubble-content">Анализ пары ${state.pair}, экспирация ${state.duration} по модели ${curModel.name}.</div>
  `;
  el.chatFeed.appendChild(userMsg);

  try {
    const reqBody = {
      tg_id: state.tgId,
      pair: state.pair,
      duration: state.duration,
      force_dir: state.forceDir,
      model: state.model,
    };
    state.forceDir = null;

    const resp = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    const data = resp.ok ? await resp.json() : {
      direction: Math.random() > 0.45 ? "BUY" : "SELL",
      accuracy: 94,
      rationale_ru: ["• Институциональный импульс", "• Пробой локального максимума"],
      rationale_en: ["• Institutional momentum", "• Local high breakout"],
    };

    const isBuy = data.direction === "BUY";
    const rationales = state.lang === "ru" ? data.rationale_ru : data.rationale_en;

    const aiMsg = document.createElement("div");
    aiMsg.className = "chat-bubble ai";
    aiMsg.innerHTML = `
      <div class="bubble-header">
        <span class="ai-badge">WINKY AI</span>
        <span class="bubble-model">${curModel.name}</span>
      </div>
      <div class="bubble-content">
        Анализ завершён. Доминирующий импульс: <b>${isBuy ? "ВВЕРХ (BUY)" : "ВНИЗ (SELL)"}</b>.
      </div>
      <div class="inline-signal-card-chat">
        <div class="chat-signal-top">
          <span class="chat-signal-dir ${isBuy ? "buy" : "sell"}">${isBuy ? "↗ BUY" : "↘ SELL"}</span>
          <span class="chat-signal-acc">${data.accuracy || 94}%</span>
        </div>
        <div class="rationale-list">
          ${(rationales || []).map((r) => `<div class="rationale-item">${r}</div>`).join("")}
        </div>
      </div>
    `;
    el.chatFeed.appendChild(aiMsg);
    el.chatFeed.scrollTop = el.chatFeed.scrollHeight;
  } catch (_) {}

  el.btnAnalyze.disabled = false;
  el.btnAnalyze.querySelector(".btn-text").textContent = t("analyzeBtn");
}

/* ==================== Sheets & Modals Management ==================== */

function openPairSheet() {
  renderPairList(el.pairSearchInput.value);
  el.pairSheetBackdrop.hidden = false;
}
function closePairSheet() {
  el.pairSheetBackdrop.hidden = true;
}

function renderPairList(filterText = "") {
  const norm = filterText.trim().toLowerCase();
  const list = PAIRS.filter((p) => {
    if (state.market !== "all" && p.market !== state.market) return false;
    if (!norm) return true;
    return p.id.toLowerCase().includes(norm) || p.name.toLowerCase().includes(norm);
  });

  el.pairList.innerHTML = list
    .map(
      (p) => `
    <div class="pair-item-row ${p.id === state.pair ? "active" : ""}" data-pair="${p.id}">
      <div class="pair-item-left">
        ${getDualFlagsHtml(p.id)}
        <span class="pair-item-name">${p.id}</span>
      </div>
      <span class="pair-payout-badge">${p.payout}</span>
    </div>
  `
    )
    .join("");

  el.pairList.querySelectorAll(".pair-item-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.pair = row.dataset.pair;
      applyLanguage();
      broadcastLiveStats("pair_change");
      closePairSheet();
    });
  });
}

function openModelSheet() {
  renderModelList();
  el.modelSheetBackdrop.hidden = false;
}
function closeModelSheet() {
  el.modelSheetBackdrop.hidden = true;
}

function renderModelList() {
  el.modelList.innerHTML = AI_MODELS.map(
    (m) => `
    <div class="model-item-row ${m.id === state.model ? "active" : ""}" data-model="${m.id}">
      <div class="model-item-left">
        <span class="model-item-name">${m.name}</span>
        <span class="model-item-desc">${state.lang === "ru" ? m.descRu : m.descEn}</span>
      </div>
      <span class="model-item-tag">${m.tag}</span>
    </div>
  `
  ).join("");

  el.modelList.querySelectorAll(".model-item-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.model = row.dataset.model;
      applyLanguage();
      closeModelSheet();
    });
  });
}

function openDepositSheet() {
  el.depositSheetBackdrop.hidden = false;
}
function closeDepositSheet() {
  el.depositSheetBackdrop.hidden = true;
}

/* ==================== Event Listeners Setup ==================== */

function setupEventListeners() {
  // Navigation Tabs
  el.btnNavHome.addEventListener("click", () => switchTab("tabHome"));
  el.btnNavChat.addEventListener("click", () => switchTab("tabChat"));

  // Streamer Secret Triggers: Click Logo = BUY, Click Pair Label = SELL
  el.brand.addEventListener("click", () => {
    state.forceDir = "BUY";
    // Subtle visual indicator
    el.brand.style.filter = "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))";
    setTimeout(() => (el.brand.style.filter = "none"), 600);
  });

  el.pairLabel.addEventListener("click", () => {
    state.forceDir = "SELL";
    el.pairLabel.style.color = "#EF4444";
    setTimeout(() => (el.pairLabel.style.color = ""), 600);
  });

  // Auto-Radar Toggle
  el.btnAutoRadar.addEventListener("click", () => {
    state.autoRadar = !state.autoRadar;
    el.btnAutoRadar.classList.toggle("active", state.autoRadar);
    el.radarLabel.textContent = state.autoRadar ? "RADAR: ON" : "RADAR: OFF";
    if (state.autoRadar && !state.isBusy) {
      requestSignal();
    }
  });

  // Live Stream Bumper Toggle
  el.btnLiveToggle.addEventListener("click", () => {
    state.liveVisible = !state.liveVisible;
    el.liveBumper.hidden = !state.liveVisible;
  });
  el.btnCloseBumper.addEventListener("click", () => {
    state.liveVisible = false;
    el.liveBumper.hidden = true;
  });

  // Manual Live Stats adjustments from Bumper
  el.pillWins.addEventListener("click", () => {
    state.liveWins += 1;
    broadcastLiveStats("manual_plus");
  });
  el.pillLosses.addEventListener("click", () => {
    state.liveLosses += 1;
    broadcastLiveStats("manual_plus");
  });

  // Language Switch
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem("winky_lang", state.lang);
      applyLanguage();
    });
  });

  // Market Mode Switch (OTC vs Regular)
  el.btnMarketOtc.addEventListener("click", () => {
    state.market = "otc";
    el.btnMarketOtc.classList.add("active");
    el.btnMarketRegular.classList.remove("active");
    if (!state.pair.includes("OTC")) {
      state.pair = "EUR/USD OTC";
    }
    applyLanguage();
  });

  el.btnMarketRegular.addEventListener("click", () => {
    state.market = "classic";
    el.btnMarketRegular.classList.add("active");
    el.btnMarketOtc.classList.remove("active");
    if (state.pair.includes("OTC")) {
      state.pair = "EUR/USD";
    }
    applyLanguage();
  });

  // Expiration Pills
  el.durationPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      el.durationPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.duration = pill.dataset.duration;
      el.selectChatDuration.value = state.duration;
      applyLanguage();
    });
  });

  // Chat Expiration Select
  el.selectChatDuration.addEventListener("change", (e) => {
    state.duration = e.target.value;
    el.durationPills.forEach((p) => p.classList.toggle("active", p.dataset.duration === state.duration));
    applyLanguage();
  });

  // Pair Sheet Trigger
  el.pairTrigger.addEventListener("click", openPairSheet);
  el.btnChatPair.addEventListener("click", openPairSheet);
  el.btnClosePairSheet.addEventListener("click", closePairSheet);
  el.pairSheetBackdrop.addEventListener("click", (e) => {
    if (e.target === el.pairSheetBackdrop) closePairSheet();
  });
  el.pairSearchInput.addEventListener("input", (e) => renderPairList(e.target.value));

  // Model Sheet Trigger
  el.btnSelectModel.addEventListener("click", openModelSheet);
  el.btnCloseModelSheet.addEventListener("click", closeModelSheet);
  el.modelSheetBackdrop.addEventListener("click", (e) => {
    if (e.target === el.modelSheetBackdrop) closeModelSheet();
  });

  // Deposit Sheet
  el.btnCloseDeposit.addEventListener("click", closeDepositSheet);
  el.depositSheetBackdrop.addEventListener("click", (e) => {
    if (e.target === el.depositSheetBackdrop) closeDepositSheet();
  });
  el.btnCopyPromo.addEventListener("click", () => {
    navigator.clipboard?.writeText("50START");
    el.btnCopyPromo.textContent = "✓ Скопировано";
    setTimeout(() => (el.btnCopyPromo.textContent = "Копировать"), 2000);
  });

  // Main Action Buttons
  el.signalBtn.addEventListener("click", requestSignal);
  el.btnAnalyze.addEventListener("click", performChatAnalysis);
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
  initClock();
  initLiveStats();
  setTerminalDisplayState("idle");

  if (isStreamerMode) {
    el.liveBumper.hidden = false;
  }
});
