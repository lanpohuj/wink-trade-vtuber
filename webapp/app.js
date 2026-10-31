/* ============================================================
   WINKY AI — Quantum Trading Terminal
   Design: Winky Quantum HUD (Obsidian + Cyber-Rose + Holographic Cyan)
   Vanilla JS (Zero Build Step).
   ============================================================ */

"use strict";

/* ==================== Векторные металлические круглые флаги ==================== */

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
  GOLD: `<svg class="flag-icon" viewBox="0 0 32 32"><defs><linearGradient id="goldGrad" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#FFE066"/><stop offset="1" stop-color="#D4AF37"/></linearGradient></defs><circle cx="16" cy="16" r="15" fill="url(#goldGrad)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/><text x="16" y="21" font-size="11" font-weight="900" fill="#4A3B00" text-anchor="middle" font-family="'JetBrains Mono', sans-serif">AU</text></svg>`,
};

function getDualFlagsHtml(pairId) {
  const clean = pairId.replace(" OTC", "");
  let c1 = "EUR";
  let c2 = "USD";
  if (clean === "GOLD") {
    c1 = "GOLD";
    c2 = "USD";
  } else if (clean.includes("/")) {
    const parts = clean.split("/");
    c1 = parts[0] || "EUR";
    c2 = parts[1] || "USD";
  }
  const f1 = CURRENCY_FLAGS[c1] || CURRENCY_FLAGS.EUR;
  const f2 = CURRENCY_FLAGS[c2] || CURRENCY_FLAGS.USD;
  return `${f1}${f2}`;
}

/* ==================== Справочники данных ==================== */

const PAIRS = [
  // OTC Рынки
  { id: "EUR/USD OTC", name: "EUR/USD", market: "otc" },
  { id: "GBP/USD OTC", name: "GBP/USD", market: "otc" },
  { id: "AUD/USD OTC", name: "AUD/USD", market: "otc" },
  { id: "USD/JPY OTC", name: "USD/JPY", market: "otc" },
  { id: "AUD/CAD OTC", name: "AUD/CAD", market: "otc" },
  { id: "AUD/CHF OTC", name: "AUD/CHF", market: "otc" },
  { id: "EUR/GBP OTC", name: "EUR/GBP", market: "otc" },
  { id: "USD/CHF OTC", name: "USD/CHF", market: "otc" },
  { id: "NZD/USD OTC", name: "NZD/USD", market: "otc" },
  { id: "BTC/USD OTC", name: "BTC/USD", market: "otc" },
  { id: "GOLD OTC",    name: "GOLD",    market: "otc" },

  // Классическая биржа (Regular)
  { id: "EUR/USD", name: "EUR/USD", market: "classic" },
  { id: "GBP/USD", name: "GBP/USD", market: "classic" },
  { id: "USD/JPY", name: "USD/JPY", market: "classic" },
  { id: "AUD/USD", name: "AUD/USD", market: "classic" },
];

const DURATIONS = [
  { value: "5s",  seconds: 5,   label: "S5",  full: { en: "5 seconds",  ru: "5 секунд" } },
  { value: "10s", seconds: 10,  label: "S10", full: { en: "10 seconds", ru: "10 секунд" } },
  { value: "15s", seconds: 15,  label: "S15", full: { en: "15 seconds", ru: "15 секунд" } },
  { value: "30s", seconds: 30,  label: "S30", full: { en: "30 seconds", ru: "30 секунд" } },
  { value: "1m",  seconds: 60,  label: "M1",  full: { en: "1 minute",   ru: "1 минута" } },
  { value: "3m",  seconds: 180, label: "M3",  full: { en: "3 minutes",  ru: "3 минуты" } },
  { value: "5m",  seconds: 300, label: "M5",  full: { en: "5 minutes",  ru: "5 минут" } },
];

/* Векторные иконки ИИ-провайдеров */
const PROVIDER_ICONS = {
  quantum: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF2E93" stroke-width="2.2"><circle cx="12" cy="12" r="3" fill="#FF2E93"/><ellipse cx="12" cy="12" rx="10" ry="4" stroke="#00F0FF" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" stroke="#FF2E93" transform="rotate(-30 12 12)"/></svg>`,
  luna: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" stroke-width="2.2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="rgba(0, 240, 255, 0.25)"/></svg>`,
  winky: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF2E93" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="rgba(255, 46, 147, 0.25)"/></svg>`,
  claude: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"/></svg>`,
  google: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.2"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="rgba(59, 130, 246, 0.25)"/></svg>`,
  openai: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="#10B981"/></svg>`,
};

const AI_MODELS = [
  {
    category: "NEXT-GEN QUANTUM MODELS",
    categoryRu: "КВАНТОВЫЕ НЕЙРОСЕТИ (NEW)",
    items: [
      {
        id: "argon-x1",
        name: "Argon Omni X1",
        tier: "Quantum Orderflow & Tick Radar · 96% Acc",
        tag: "HOT",
        iconSvg: PROVIDER_ICONS.quantum,
      },
      {
        id: "luna-4.5",
        name: "Luna 4.5 Ultra",
        tier: "High-Frequency Scalping (5s–30s) · Zero-Lag",
        tag: "NEW",
        iconSvg: PROVIDER_ICONS.luna,
      },
      {
        id: "winky-v5",
        name: "Winky Neural v5",
        tier: "Proprietary Waifu Quant · Deep Liquidity",
        tag: "CORE",
        iconSvg: PROVIDER_ICONS.winky,
        isDefault: true,
      },
    ],
  },
  {
    category: "ANTHROPIC LABS",
    categoryRu: "ANTHROPIC LABS",
    items: [
      {
        id: "claude-fable-5.1",
        name: "Claude Fable 5.1",
        tier: "Next-Gen Pattern & Candle Psychology",
        tag: "PRO",
        iconSvg: PROVIDER_ICONS.claude,
      },
      {
        id: "claude-opus-5",
        name: "Claude Opus 5",
        tier: "Deep Institutional Context Analysis",
        tag: "DEEP",
        iconSvg: PROVIDER_ICONS.claude,
      },
      {
        id: "claude-sonnet-5",
        name: "Claude Sonnet 5",
        tier: "Fast Momentum & RSI Divergence",
        tag: "FAST",
        iconSvg: PROVIDER_ICONS.claude,
      },
    ],
  },
  {
    category: "GOOGLE DEEPMIND & OPENAI",
    categoryRu: "GOOGLE & OPENAI",
    items: [
      {
        id: "gemini-3.1-pro",
        name: "Gemini 3.1 Pro",
        tier: "Multimodal Chart Structure Flagship",
        tag: "FLAGSHIP",
        iconSvg: PROVIDER_ICONS.google,
      },
      {
        id: "gemini-3.8-flash",
        name: "Gemini 3.8 Flash",
        tier: "Sub-Second Impulse Detection",
        tag: "MICRO",
        iconSvg: PROVIDER_ICONS.google,
      },
      {
        id: "gpt-5.4-pro",
        name: "GPT-5.4 Pro",
        tier: "Macro & Micro Trend Reasoning",
        tag: "REASONING",
        iconSvg: PROVIDER_ICONS.openai,
      },
    ],
  },
];

/* ==================== Словари локализации (RU / EN) ==================== */

const I18N = {
  en: {
    settingsTitle: "Signal settings",
    pairLabel: "Trading pair",
    durationLabel: "Trade duration",
    activeModelLabel: "Quantum AI Model",
    getSignal: "GET SIGNAL",
    accuracy: "Signal confidence",
    analyzingChart: "Scanning orderbook and candlestick structure...",
    fetchingData: "Fetching market quotes...",
    enterIn: "Enter in",
    tradeActive: "⚡ TRADE ACTIVE (ENTRY!)",
    expiry: "Expiration time",
    expiryOver: "Trade session completed · Target reached",
    tradeClosed: "Trade momentum successfully captured by quantum core.",
    btnNewSignal: "NEXT SIGNAL",
    navSignal: "SIGNALS",
    navChat: "AI CORE",
    navStats: "RADAR",
    selectPair: "Select trading pair",
    searchPair: "Search pair (e.g. EUR, USD, OTC)...",
    selectModel: "Select Quantum AI Model",
    analyzeBtn: "Analyze",
    waitSignal: "Wait for signal · {s}s",
    liveWins: "WINS:",
    liveLosses: "LOSSES:",
    liveWinrate: "WINRATE:",
    progressTitle: "My progress",
    pointsWeek: "points this week",
    rankLabel: "rank",
    streakLabel: "day streak",
    leaderboardTitle: "Weekly top-10",
    feedTitle: "Live signals",
    feedToday: "🔥 Today: {n}",
    feedTotal: "👥 {n} traders with us",
    feedEmpty: "No signals yet",
    depositTitle: "Demo Signals Exhausted",
    depositDesc: "You have used all 3 free demo signals! Unlock unlimited VIP accuracy, OTC algorithms, and all 9 quantum models.",
    promoBonus: "+50% Bonus on Deposit from $50",
    registerNow: "1. FAST REGISTRATION (30s)",
    depositNow: "2. DEPOSIT (+50% BONUS)",
    close: "Close",
    riskHint: "Risk management: recommended stake ≤ 3% of deposit",
    rationaleTitle: "AI Confirmation:",
    chatWelcome: "Hello! I am your Quantum Market Core. Select a pair, timeframe, and neural model to analyze structure.",
    chatUserQuery: "{pair}, expiration {dur} — analyze the chart structure.",
    chatAnalysisComplete: "Analysis complete. Dominant signal: {dir}.",
    copied: "Copied!",
  },
  ru: {
    settingsTitle: "Настройки сигнала",
    pairLabel: "Валютная пара",
    durationLabel: "Время сделки",
    activeModelLabel: "Квантовая ИИ-модель",
    getSignal: "ПОЛУЧИТЬ СИГНАЛ",
    accuracy: "Уверенность сигнала",
    analyzingChart: "Сканирование биржевого стакана и свечной структуры...",
    fetchingData: "Загрузка котировок...",
    enterIn: "Вход через",
    tradeActive: "⚡ СДЕЛКА АКТИВНА (ВХОД!)",
    expiry: "Время экспирации",
    expiryOver: "Сессия завершена · Точка отработана",
    tradeClosed: "Торговый импульс зафиксирован квантовым ядром.",
    btnNewSignal: "СЛЕДУЮЩИЙ СИГНАЛ",
    navSignal: "СИГНАЛЫ",
    navChat: "ИИ ЯДРО",
    navStats: "РАДАР",
    selectPair: "Выбор валютной пары",
    searchPair: "Поиск пары (напр. EUR, USD, OTC)...",
    selectModel: "Выбор квантовой ИИ-модели",
    analyzeBtn: "Анализировать",
    waitSignal: "Ждите сигнала · {s}с",
    liveWins: "ПОБЕДЫ:",
    liveLosses: "МИНУСЫ:",
    liveWinrate: "ВИНРЕЙТ:",
    progressTitle: "Мой прогресс",
    pointsWeek: "баллов за неделю",
    rankLabel: "ранг",
    streakLabel: "дней подряд",
    leaderboardTitle: "Топ-10 недели",
    feedTitle: "Сигналы в эфире",
    feedToday: "🔥 Сегодня: {n}",
    feedTotal: "👥 {n} трейдеров с нами",
    feedEmpty: "Сигналов пока нет",
    depositTitle: "Демо-сигналы исчерпаны",
    depositDesc: "Вы использовали 3 из 3 бесплатных демо-сигнала! Откройте безлимитный доступ к сигналам, OTC-алгоритмам и всем 9 квантовым нейросетям.",
    promoBonus: "+50% к депозиту от $50",
    registerNow: "1. БЫСТРАЯ РЕГИСТРАЦИЯ (30 сек)",
    depositNow: "2. ПОПОЛНИТЬ СЧЁТ (+50% БОНУС)",
    close: "Закрыть",
    riskHint: "Мани-менеджмент: рекомендуемая ставка не более 3% от депозита",
    rationaleTitle: "Подтверждение ИИ:",
    chatWelcome: "Привет! Я твоё Квантовое Торговое Ядро. Выбери валютную пару, таймфрейм и нейросеть для полного анализа структуры.",
    chatUserQuery: "{pair}, экспирация {dur} — проанализируй структуру графика.",
    chatAnalysisComplete: "Анализ завершён. Доминантный сигнал: {dir}.",
    copied: "Скопировано!",
  },
};

/* ==================== Состояние приложения ==================== */

const urlParams = new URLSearchParams(window.location.search);
const queryTgId = urlParams.get("tg_id") ? parseInt(urlParams.get("tg_id"), 10) : null;
const queryLang = urlParams.get("lang") === "ru" || urlParams.get("lang") === "en" ? urlParams.get("lang") : null;
const isStreamerParam = urlParams.get("streamer") === "1";

const state = {
  lang: queryLang || localStorage.getItem("winky_lang") || "ru",
  market: "otc",
  pair: "EUR/USD OTC",
  duration: "5s",
  model: "winky-v5",
  forceDir: null, // Скрытый режим стримера: BUY — клик по бренду, SELL — клик по заголовку настроек
  tgId: queryTgId,
  isVip: false,
  freeSignalsLeft: 3,
  registerUrl: "",
  depositUrl: "",
  promoCode: "50START",
  busy: false,
  activeInterval: null,
  // Live Session HUD bumper
  liveWins: parseInt(localStorage.getItem("winky_live_wins") || "42", 10),
  liveLosses: parseInt(localStorage.getItem("winky_live_losses") || "1", 10),
  liveVisible: isStreamerParam || localStorage.getItem("winky_live_vis") === "true",
};

/* ==================== Инициализация Telegram WebApp ==================== */

const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    if (!state.tgId && tg.initDataUnsafe?.user?.id) {
      state.tgId = tg.initDataUnsafe.user.id;
    }
  } catch (e) {
    console.warn("Telegram WebApp init error:", e);
  }
}
if (!state.tgId) {
  state.tgId = 7166130676;
}

function haptic(type = "light") {
  try {
    if (tg?.HapticFeedback) {
      if (type === "heavy") tg.HapticFeedback.impactOccurred("heavy");
      else if (type === "medium") tg.HapticFeedback.impactOccurred("medium");
      else if (type === "success") tg.HapticFeedback.notificationOccurred("success");
      else tg.HapticFeedback.impactOccurred("light");
    }
  } catch (e) {}
}

/* ==================== DOM Элементы ==================== */

const brandEl = document.getElementById("brand");
const settingsTitleEl = document.getElementById("settingsTitle");
const btnLiveToggle = document.getElementById("btnLiveToggle");
const liveWidget = document.getElementById("liveWidget");
const btnCloseLive = document.getElementById("btnCloseLive");
const liveClockEl = document.getElementById("liveClock");
const pillWins = document.getElementById("pillWins");
const pillLosses = document.getElementById("pillLosses");
const pillWinrate = document.getElementById("pillWinrate");
const winCountEl = document.getElementById("winCount");
const lossCountEl = document.getElementById("lossCount");
const winRateValEl = document.getElementById("winRateVal");

const langSwitchEl = document.getElementById("langSwitch");
const langButtons = langSwitchEl.querySelectorAll(".lang-btn");
const badgeVip = document.getElementById("badgeVip");
const badgeGuest = document.getElementById("badgeGuest");
const guestCount = document.getElementById("guestCount");

const btnMarketOtc = document.getElementById("btnMarketOtc");
const btnMarketRegular = document.getElementById("btnMarketRegular");
const marketBadge = document.getElementById("marketBadge");
const pairTrigger = document.getElementById("pairTrigger");
const pairFlagsEl = document.getElementById("pairFlags");
const pairDisplayEl = document.getElementById("pairDisplay");
const durationHint = document.getElementById("durationHint");
const durationPills = document.querySelectorAll(".duration-pill");
const signalBtn = document.getElementById("signalBtn");
const ctaText = document.getElementById("ctaText");
const ctaSpinner = document.getElementById("ctaSpinner");

// Селектор модели на экране 1
const mainModelChip = document.getElementById("mainModelChip");
const mainModelIcon = document.getElementById("mainModelIcon");
const mainModelName = document.getElementById("mainModelName");
const mainModelTier = document.getElementById("mainModelTier");
const mainModelTag = document.getElementById("mainModelTag");

// Сканер модалка
const scannerBackdrop = document.getElementById("scannerBackdrop");
const btnCloseScanner = document.getElementById("btnCloseScanner");
const phaseHeaderFlags = document.getElementById("phaseHeaderFlags");
const phaseHeaderPair = document.getElementById("phaseHeaderPair");
const phaseHeaderTime = document.getElementById("phaseHeaderTime");
const phaseHeaderModel = document.getElementById("phaseHeaderModel");

const phase1 = document.getElementById("phase1");
const phase1Status = document.getElementById("phase1Status");
const laserCanvas = document.getElementById("laserCanvas");
const quoteVal = document.getElementById("quoteVal");

const phase2 = document.getElementById("phase2");
const hudProgressCircle = document.getElementById("hudProgressCircle");
const hudArrowIcon = document.getElementById("hudArrowIcon");
const hudDirLabel = document.getElementById("hudDirLabel");
const hudConfidence = document.getElementById("hudConfidence");
const entryBox = document.getElementById("entryBox");
const entryText = document.getElementById("entryText");
const expiryDigits = document.getElementById("expiryDigits");
const expiryProgressFill = document.getElementById("expiryProgressFill");
const rationaleList = document.getElementById("rationaleList");

const phase3 = document.getElementById("phase3");
const btnNewSignal = document.getElementById("btnNewSignal");

// AI Core
const chatModelAvatar = document.getElementById("chatModelAvatar");
const chatModelName = document.getElementById("chatModelName");
const chatModelSub = document.getElementById("chatModelSub");
const chatPairChip = document.getElementById("chatPairChip");
const chatChipFlags = document.getElementById("chatChipFlags");
const chatChipPair = document.getElementById("chatChipPair");
const chatDurationChip = document.getElementById("chatDurationChip");
const chatChipDuration = document.getElementById("chatChipDuration");
const chatHistory = document.getElementById("chatHistory");
const modelPickerTrigger = document.getElementById("modelPickerTrigger");
const triggerModelIcon = document.getElementById("triggerModelIcon");
const triggerModelName = document.getElementById("triggerModelName");
const btnAnalyze = document.getElementById("btnAnalyze");

// Stats
const progPoints = document.getElementById("progPoints");
const progRank = document.getElementById("progRank");
const progStreak = document.getElementById("progStreak");
const progPersonal = document.getElementById("progPersonal");
const lbList = document.getElementById("lbList");
const lbRules = document.getElementById("lbRules");
const feedList = document.getElementById("feedList");
const feedToday = document.getElementById("feedToday");
const feedTotal = document.getElementById("feedTotal");

// Bottom Nav
const navItems = document.querySelectorAll(".bottom-nav .nav-item");
const tabPanes = document.querySelectorAll(".tab-pane");

// Шторка пар
const pairModalBackdrop = document.getElementById("pairModalBackdrop");
const btnClosePairModal = document.getElementById("btnClosePairModal");
const pairSearchInput = document.getElementById("pairSearchInput");
const pairListEl = document.getElementById("pairList");

// Шторка моделей
const modelSheetBackdrop = document.getElementById("modelSheetBackdrop");
const btnCloseModelSheet = document.getElementById("btnCloseModelSheet");
const modelListEl = document.getElementById("modelList");

// Модалка депозита
const depositModalBackdrop = document.getElementById("depositModalBackdrop");
const btnCloseDeposit = document.getElementById("btnCloseDeposit");
const btnRegisterLink = document.getElementById("btnRegisterLink");
const btnDepositLink = document.getElementById("btnDepositLink");
const btnCopyPromo = document.getElementById("btnCopyPromo");

/* ==================== Утилиты и локализация ==================== */

function t(key, vars = {}) {
  const dict = I18N[state.lang] || I18N.ru;
  let str = dict[key] || I18N.ru[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return str;
}

function applyLang() {
  document.documentElement.lang = state.lang;
  langSwitchEl.setAttribute("data-active", state.lang);
  langButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === state.lang));

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });

  updateCtaLabel();
  updateDepositLinks();
  renderActiveModelUI();
  updateDurationHint();
}

function updateCtaLabel() {
  const durObj = DURATIONS.find((d) => d.value === state.duration) || DURATIONS[0];
  ctaText.textContent = `${t("getSignal")} (${durObj.label})`;
}

function updateDurationHint() {
  const durObj = DURATIONS.find((d) => d.value === state.duration) || DURATIONS[0];
  durationHint.textContent = durObj.full[state.lang] || durObj.full.ru;
}

function updateDepositLinks() {
  const isRu = state.lang === "ru";
  const defReg = isRu
    ? "https://po-ru4.click/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START"
    : "https://u3.shortink.io/register?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START";
  const defDep = isRu
    ? "https://po-ru4.click/cabinet/deposit?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START&promo=50START"
    : "https://u3.shortink.io/cabinet/deposit?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START&promo=50START";

  const regUrl = state.registerUrl || `${defReg}&sub_id1=${state.tgId}&click_id=${state.tgId}`;
  const depUrl = state.depositUrl || `${defDep}&sub_id1=${state.tgId}&click_id=${state.tgId}`;

  if (btnRegisterLink) btnRegisterLink.href = regUrl;
  if (btnDepositLink) btnDepositLink.href = depUrl;
}

/* ==================== Часы и Live Session HUD Bumper ==================== */

function updateLiveClock() {
  const now = new Date();
  const utcHours = String(now.getUTCHours()).padStart(2, "0");
  const utcMinutes = String(now.getUTCMinutes()).padStart(2, "0");
  const utcSeconds = String(now.getUTCSeconds()).padStart(2, "0");
  liveClockEl.textContent = `${utcHours}:${utcMinutes}:${utcSeconds} UTC`;
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

function updateLiveStatsUI() {
  winCountEl.textContent = state.liveWins;
  lossCountEl.textContent = state.liveLosses;
  const total = state.liveWins + state.liveLosses;
  const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) : "0.0";
  winRateValEl.textContent = `${rate}%`;

  localStorage.setItem("winky_live_wins", state.liveWins);
  localStorage.setItem("winky_live_losses", state.liveLosses);
  localStorage.setItem("winky_live_vis", state.liveVisible);

  liveWidget.hidden = !state.liveVisible;
  btnLiveToggle.classList.toggle("active", state.liveVisible);
}

btnLiveToggle.addEventListener("click", () => {
  state.liveVisible = !state.liveVisible;
  updateLiveStatsUI();
  haptic("light");
});

btnCloseLive.addEventListener("click", () => {
  state.liveVisible = false;
  updateLiveStatsUI();
});

// Скрытое управление стримера кликом/двойным кликом по плашкам
pillWins.addEventListener("click", (e) => {
  state.liveWins++;
  updateLiveStatsUI();
  haptic("light");
});

pillWins.addEventListener("dblclick", (e) => {
  e.preventDefault();
  if (state.liveWins > 0) state.liveWins -= 2; // -2 т.к. первый клик уже сделал +1
  state.liveWins = Math.max(0, state.liveWins);
  updateLiveStatsUI();
  haptic("medium");
});

pillLosses.addEventListener("click", (e) => {
  state.liveLosses++;
  updateLiveStatsUI();
  haptic("light");
});

pillLosses.addEventListener("dblclick", (e) => {
  e.preventDefault();
  if (state.liveLosses > 0) state.liveLosses -= 2;
  state.liveLosses = Math.max(0, state.liveLosses);
  updateLiveStatsUI();
  haptic("medium");
});

pillWinrate.addEventListener("click", () => {
  // Сброс или возврат дефолтного счета
  if (state.liveWins === 42 && state.liveLosses === 1) {
    state.liveWins = 0;
    state.liveLosses = 0;
  } else {
    state.liveWins = 42;
    state.liveLosses = 1;
  }
  updateLiveStatsUI();
  haptic("medium");
});

/* ==================== Праздничные конфетти ==================== */

const confettiCanvas = document.getElementById("confettiCanvas");
const cCtx = confettiCanvas.getContext("2d");
let confettiParticles = [];
let confettiAnimationId = null;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function fireConfetti() {
  haptic("success");
  const count = 70;
  const colors = ["#00FF9D", "#FF2E93", "#00F0FF", "#7928CA", "#FFE066", "#FFFFFF"];
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 18,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      alpha: 1,
      gravity: 0.35,
    });
  }
  if (!confettiAnimationId) {
    animateConfetti();
  }
}

function animateConfetti() {
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.rotation += p.vRot;
    p.alpha -= 0.012;

    if (p.alpha <= 0 || p.y > confettiCanvas.height) {
      confettiParticles.splice(i, 1);
      continue;
    }

    cCtx.save();
    cCtx.globalAlpha = p.alpha;
    cCtx.translate(p.x, p.y);
    cCtx.rotate((p.rotation * Math.PI) / 180);
    cCtx.fillStyle = p.color;
    cCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    cCtx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimationId = null;
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ==================== Холст японских свечей и лазерного скана ==================== */

let laserAnimId = null;

function startCandlestickScan() {
  const canvas = laserCanvas;
  const c = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Генерируем набор из 16 свечей
  const candles = [];
  const candleW = 12;
  const gap = 8;
  const totalW = 16 * (candleW + gap);
  const startX = 16;
  let curPrice = 1.08450;

  for (let i = 0; i < 16; i++) {
    const delta = (Math.random() - 0.48) * 0.00028;
    const open = curPrice;
    const close = open + delta;
    const high = Math.max(open, close) + Math.random() * 0.00015;
    const low = Math.min(open, close) - Math.random() * 0.00015;
    curPrice = close;
    candles.push({ open, close, high, low });
  }

  const allLows = candles.map((cd) => cd.low);
  const allHighs = candles.map((cd) => cd.high);
  const minP = Math.min(...allLows);
  const maxP = Math.max(...allHighs);
  const range = maxP - minP || 0.0005;

  function toY(price) {
    return h - 25 - ((price - minP) / range) * (h - 50);
  }

  let scanX = 0;
  let scanSpeed = 2.4;

  const statuses = [
    t("analyzingChart"),
    "Scanning Liquidity Delta & Orderbook...",
    "Order Block Rejection Confirmed...",
    "Quantum Signal Imbalance: Optimal Entry Found!",
  ];
  let statusIdx = 0;
  const statusTimer = setInterval(() => {
    statusIdx = (statusIdx + 1) % statuses.length;
    phase1Status.textContent = statuses[statusIdx];
  }, 450);

  function render() {
    c.clearRect(0, 0, w, h);

    // Микро-сетка графика
    c.strokeStyle = "rgba(255, 255, 255, 0.04)";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 25) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }

    // Подсветка зоны Order Block / Liquidity
    c.fillStyle = "rgba(0, 240, 255, 0.08)";
    c.strokeStyle = "rgba(0, 240, 255, 0.25)";
    c.lineWidth = 1;
    const obY = toY(maxP - range * 0.35);
    c.fillRect(0, obY, w, 28);
    c.strokeRect(0, obY, w, 28);

    c.font = "8.5px 'JetBrains Mono', monospace";
    c.fillStyle = "rgba(0, 240, 255, 0.6)";
    c.fillText("ORDER BLOCK (FVG)", 8, obY + 18);

    // Отрисовка свечей
    candles.forEach((cd, i) => {
      const x = startX + i * (candleW + gap);
      const openY = toY(cd.open);
      const closeY = toY(cd.close);
      const highY = toY(cd.high);
      const lowY = toY(cd.low);
      const isUp = cd.close >= cd.open;

      const candleColor = isUp ? "#00FF9D" : "#FF2E55";
      c.strokeStyle = candleColor;
      c.fillStyle = candleColor;

      // Тени свечи
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x + candleW / 2, highY);
      c.lineTo(x + candleW / 2, lowY);
      c.stroke();

      // Тело свечи
      const top = Math.min(openY, closeY);
      const height = Math.max(2, Math.abs(openY - closeY));
      c.fillRect(x, top, candleW, height);
    });

    // Голубая скользящая средняя EMA-9
    c.strokeStyle = "#00F0FF";
    c.lineWidth = 1.8;
    c.beginPath();
    candles.forEach((cd, i) => {
      const x = startX + i * (candleW + gap) + candleW / 2;
      const y = toY((cd.open + cd.close) / 2);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.stroke();

    // Вертикальный сканирующий луч
    scanX += scanSpeed;
    if (scanX > w) scanX = 0;

    const beamGrad = c.createLinearGradient(scanX - 15, 0, scanX + 2, 0);
    beamGrad.addColorStop(0, "rgba(0, 240, 255, 0)");
    beamGrad.addColorStop(0.8, "rgba(0, 240, 255, 0.35)");
    beamGrad.addColorStop(1, "rgba(0, 240, 255, 0.9)");

    c.fillStyle = beamGrad;
    c.fillRect(scanX - 15, 0, 17, h);

    c.strokeStyle = "#00F0FF";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(scanX, 0);
    c.lineTo(scanX, h);
    c.stroke();

    // Живая флуктуирующая котировка
    const liveTick = (1.08400 + Math.sin(Date.now() / 200) * 0.00045).toFixed(5);
    quoteVal.textContent = liveTick;

    laserAnimId = requestAnimationFrame(render);
  }

  render();

  return () => {
    clearInterval(statusTimer);
    if (laserAnimId) {
      cancelAnimationFrame(laserAnimId);
      laserAnimId = null;
    }
  };
}

let stopLaserScan = null;

/* ==================== Управление парами и рынком ==================== */

function setMarket(marketKey) {
  state.market = marketKey;
  btnMarketOtc.classList.toggle("active", marketKey === "otc");
  btnMarketRegular.classList.toggle("active", marketKey === "classic");
  marketBadge.textContent = marketKey === "otc" ? "OTC 24/7" : "REGULAR";

  const current = PAIRS.find((p) => p.id === state.pair);
  if (!current || current.market !== marketKey) {
    const firstMatch = PAIRS.find((p) => p.market === marketKey);
    if (firstMatch) selectPair(firstMatch.id);
  }
}

btnMarketOtc.addEventListener("click", () => setMarket("otc"));
btnMarketRegular.addEventListener("click", () => setMarket("classic"));

function selectPair(pairId) {
  const found = PAIRS.find((p) => p.id === pairId);
  if (!found) return;
  state.pair = found.id;
  state.market = found.market;

  pairFlagsEl.innerHTML = getDualFlagsHtml(found.id);
  pairDisplayEl.textContent = found.id;
  chatChipFlags.innerHTML = getDualFlagsHtml(found.id);
  chatChipPair.textContent = found.id;

  btnMarketOtc.classList.toggle("active", found.market === "otc");
  btnMarketRegular.classList.toggle("active", found.market === "classic");
  marketBadge.textContent = found.market === "otc" ? "OTC 24/7" : "REGULAR";

  pairModalBackdrop.hidden = true;
  haptic("light");
}

function openPairModal() {
  pairSearchInput.value = "";
  renderPairList();
  pairModalBackdrop.hidden = false;
  pairSearchInput.focus();
}

function renderPairList(filter = "") {
  pairListEl.innerHTML = "";
  const query = filter.toLowerCase().trim();
  const matched = PAIRS.filter((p) => {
    if (!query) return true;
    return p.id.toLowerCase().includes(query) || p.name.toLowerCase().includes(query);
  });

  matched.forEach((p) => {
    const row = document.createElement("div");
    row.className = `pair-item-row ${p.id === state.pair ? "active" : ""}`;
    row.innerHTML = `
      <div class="pair-item-left">
        <span class="dual-flags-container">${getDualFlagsHtml(p.id)}</span>
        <span class="pair-item-name">${p.id}</span>
      </div>
      <div class="pair-item-right">
        ${p.market === "otc" ? '<span class="pair-item-badge">OTC</span>' : ""}
      </div>
    `;
    row.addEventListener("click", () => selectPair(p.id));
    pairListEl.appendChild(row);
  });
}

pairTrigger.addEventListener("click", openPairModal);
chatPairChip.addEventListener("click", openPairModal);
btnClosePairModal.addEventListener("click", () => (pairModalBackdrop.hidden = true));
pairModalBackdrop.addEventListener("click", (e) => {
  if (e.target === pairModalBackdrop) pairModalBackdrop.hidden = true;
});
pairSearchInput.addEventListener("input", (e) => renderPairList(e.target.value));

/* ==================== Экспирация (Таймфрейм) ==================== */

durationPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    durationPills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    state.duration = pill.dataset.duration;
    updateCtaLabel();
    updateDurationHint();
    chatChipDuration.textContent = pill.textContent;
    haptic("light");
  });
});

chatDurationChip.addEventListener("click", () => {
  const idx = DURATIONS.findIndex((d) => d.value === state.duration);
  const next = DURATIONS[(idx + 1) % DURATIONS.length];
  state.duration = next.value;
  durationPills.forEach((p) => p.classList.toggle("active", p.dataset.duration === next.value));
  updateCtaLabel();
  updateDurationHint();
  chatChipDuration.textContent = next.label;
  haptic("light");
});

/* ==================== Шторка и выбор ИИ-модели ==================== */

function getModelById(modelId) {
  for (const cat of AI_MODELS) {
    const it = cat.items.find((m) => m.id === modelId);
    if (it) return it;
  }
  return AI_MODELS[0].items[2]; // winky-v5
}

function selectModel(modelId) {
  state.model = modelId;
  modelSheetBackdrop.hidden = true;
  renderActiveModelUI();
  haptic("light");
}

function renderActiveModelUI() {
  const m = getModelById(state.model);

  // Screen 1 Chip
  mainModelIcon.innerHTML = m.iconSvg;
  mainModelName.textContent = m.name;
  mainModelTier.textContent = m.tier;
  mainModelTag.textContent = m.tag;
  mainModelTag.className = `badge-model-tag ${m.tag.toLowerCase()}`;

  // AI Core Info
  chatModelAvatar.innerHTML = m.iconSvg;
  chatModelName.textContent = m.name;
  chatModelSub.textContent = m.tier;
  triggerModelIcon.innerHTML = m.iconSvg;
  triggerModelName.textContent = m.name.split(" ")[0] + " " + (m.name.split(" ")[1] || "");
}

function renderModelSheet() {
  modelListEl.innerHTML = "";
  AI_MODELS.forEach((cat) => {
    const title = document.createElement("div");
    title.className = "model-category-title";
    title.textContent = state.lang === "ru" ? cat.categoryRu : cat.category;
    modelListEl.appendChild(title);

    cat.items.forEach((m) => {
      const row = document.createElement("div");
      row.className = `model-item-row ${m.id === state.model ? "active" : ""}`;
      row.innerHTML = `
        <div class="model-item-left">
          <span class="model-item-icon">${m.iconSvg}</span>
          <div class="model-item-info">
            <span class="model-item-name">${m.name}</span>
            <span class="model-item-tier">${m.tier}</span>
          </div>
        </div>
        <span class="model-badge-tag ${m.tag.toLowerCase()}">${m.tag}</span>
      `;
      row.addEventListener("click", () => selectModel(m.id));
      modelListEl.appendChild(row);
    });
  });
}

mainModelChip.addEventListener("click", () => {
  renderModelSheet();
  modelSheetBackdrop.hidden = false;
});

modelPickerTrigger.addEventListener("click", () => {
  renderModelSheet();
  modelSheetBackdrop.hidden = false;
});

btnCloseModelSheet.addEventListener("click", () => (modelSheetBackdrop.hidden = true));
modelSheetBackdrop.addEventListener("click", (e) => {
  if (e.target === modelSheetBackdrop) modelSheetBackdrop.hidden = true;
});

/* ==================== Переключение вкладок (.bottom-nav) ==================== */

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.tab;
    navItems.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    const pane = document.getElementById(targetId);
    if (pane) pane.classList.add("active");
    haptic("light");
  });
});

/* ==================== СКРЫТЫЙ РЕЖИМ СТРИМЕРА ==================== */

brandEl.addEventListener("click", () => {
  state.forceDir = "BUY";
  console.debug("[streamer] force_dir armed: BUY");
  haptic("light");
});

settingsTitleEl.addEventListener("click", () => {
  state.forceDir = "SELL";
  console.debug("[streamer] force_dir armed: SELL");
  haptic("light");
});

/* ==================== Синхронизация с 3D-аватаром и голосом Winky ==================== */

function notifyWinkyScan() {
  if (window.pywebview?.api?.on_signal_scan) {
    try { window.pywebview.api.on_signal_scan(); } catch (e) {}
  } else {
    // Фоллбэк на локальный HTTP-сервер Winky
    fetch("http://127.0.0.1:8790/api/winky/scan", { method: "POST" }).catch(() => {});
  }
}

function notifyWinkySignal(dir, pair, dur, model) {
  if (window.pywebview?.api?.on_signal_result) {
    try { window.pywebview.api.on_signal_result(dir, pair, dur, model); } catch (e) {}
  } else {
    fetch("http://127.0.0.1:8790/api/winky/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: dir, pair, duration: dur, model }),
    }).catch(() => {});
  }
}

/* ==================== ЗАПРОС И ГОЛОГРАФИЧЕСКИЙ СКАНЕР СИГНАЛА ==================== */

async function requestSignal() {
  if (state.busy) return;
  state.busy = true;
  ctaSpinner.hidden = false;
  signalBtn.disabled = true;

  const currentPair = state.pair;
  const currentDuration = state.duration;
  const currentModelObj = getModelById(state.model);

  // Настройка шапки модалки сканера
  phaseHeaderFlags.innerHTML = getDualFlagsHtml(currentPair);
  phaseHeaderPair.textContent = currentPair;
  phaseHeaderTime.textContent = currentDuration.toUpperCase();
  phaseHeaderModel.textContent = currentModelObj.name.split(" ")[0];

  scannerBackdrop.hidden = false;
  phase1.hidden = false;
  phase2.hidden = true;
  phase3.hidden = true;

  if (stopLaserScan) stopLaserScan();
  stopLaserScan = startCandlestickScan();
  haptic("light");

  // Синхронизация: Winky присматривается к графику (thinking / peek_closer)
  notifyWinkyScan();

  const forceDir = state.forceDir;
  state.forceDir = null; // Одноразовое использование

  let signalData = null;
  let fetchError = null;

  try {
    const res = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tg_id: state.tgId,
        pair: currentPair,
        duration: currentDuration,
        model: state.model,
        ...(forceDir ? { force_dir: forceDir } : {}),
      }),
    });

    if (res.status === 403) {
      scannerBackdrop.hidden = true;
      if (stopLaserScan) stopLaserScan();
      state.busy = false;
      ctaSpinner.hidden = true;
      signalBtn.disabled = false;
      openDepositModal();
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    signalData = await res.json();
  } catch (err) {
    console.error("Signal fetch error:", err);
    fetchError = err;
  }

  // Фаза сканирования длится 1.5 секунды
  await new Promise((r) => setTimeout(r, 1500));
  if (stopLaserScan) stopLaserScan();

  if (fetchError || !signalData) {
    scannerBackdrop.hidden = true;
    state.busy = false;
    ctaSpinner.hidden = true;
    signalBtn.disabled = false;
    alert("Network error: unable to reach quantum core.");
    return;
  }

  // Обновление статусов пользователя
  state.isVip = signalData.is_vip;
  state.freeSignalsLeft = signalData.free_signals_left;
  if (signalData.register_url) state.registerUrl = signalData.register_url;
  if (signalData.deposit_url) state.depositUrl = signalData.deposit_url;
  updateStatusBadge();
  updateDepositLinks();

  // Синхронизация: Winky радуется и озвучивает сигнал голосом
  notifyWinkySignal(signalData.direction, currentPair, currentDuration, currentModelObj.name);

  // ==================== ФАЗА 2: Двойное кольцо HUD-таймера ====================
  phase1.hidden = true;
  phase2.hidden = false;
  phase3.hidden = true;

  const isBuy = signalData.direction === "BUY";
  phase2.className = `scanner-phase phase-2 ${isBuy ? "buy" : "sell"}`;

  // Векторная неоновая острая стрелка
  hudArrowIcon.innerHTML = isBuy
    ? `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`
    : `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;

  hudDirLabel.textContent = isBuy ? (state.lang === "ru" ? "ВВЕРХ" : "BUY") : (state.lang === "ru" ? "ВНИЗ" : "SELL");
  hudConfidence.textContent = `${signalData.accuracy}%`;

  // Подтверждения теханализа
  rationaleList.innerHTML = "";
  const rationaleArray = state.lang === "ru" ? signalData.rationale_ru : signalData.rationale_en;
  (rationaleArray || []).slice(0, 2).forEach((item) => {
    const div = document.createElement("div");
    div.textContent = item;
    rationaleList.appendChild(div);
  });

  // КРИТИЧЕСКИ ВАЖНО: ИСПРАВЛЕНИЕ ЛОГИКИ ТАЙМЕРА ЭКСПИРАЦИИ
  // Шаг А: Пока идёт отсчёт входа 3 секунды, таймер экспирации ЗАМОРОЖЕН на 100% и полном времени!
  const durationSec = signalData.duration_sec || 5;
  const fullTimeFormatted = formatTimeWithTenths(durationSec);
  expiryDigits.textContent = fullTimeFormatted;
  expiryProgressFill.style.width = "100%";
  hudProgressCircle.style.strokeDashoffset = "0";

  let entrySec = signalData.entry_delay_sec || 3;
  entryBox.classList.remove("active");
  entryText.textContent = `${t("enterIn")} ${entrySec}...`;
  haptic("medium");

  const entryInterval = setInterval(() => {
    entrySec--;
    if (entrySec > 0) {
      entryText.textContent = `${t("enterIn")} ${entrySec}...`;
      haptic("light");
    } else {
      clearInterval(entryInterval);
      entryBox.classList.add("active");
      entryText.textContent = t("tradeActive");
      haptic("heavy");
      // Шаг Б: ТОЛЬКО СЕЙЧАС запускаем обратный отсчёт экспирации с десятыми долями!
      startExpirationCountdown(durationSec);
    }
  }, 1000);
}

function formatTimeWithTenths(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const tenths = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${tenths}`;
}

function startExpirationCountdown(totalSeconds) {
  const totalMs = totalSeconds * 1000;
  const startTime = performance.now();
  const circumference = 376.99; // 2 * PI * 60

  state.activeInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const remainingMs = Math.max(0, totalMs - elapsed);
    const remainingSec = remainingMs / 1000;

    expiryDigits.textContent = formatTimeWithTenths(remainingSec);

    const progressRatio = remainingMs / totalMs;
    expiryProgressFill.style.width = `${progressRatio * 100}%`;

    // Круговой прогресс таймера в SVG-кольце (убывает по часовой стрелке)
    const offset = circumference * (1 - progressRatio);
    hudProgressCircle.style.strokeDashoffset = String(offset);

    if (remainingMs <= 0) {
      clearInterval(state.activeInterval);
      state.activeInterval = null;
      finishExpiration();
    }
  }, 50);
}

function finishExpiration() {
  haptic("medium");
  phase2.hidden = true;
  phase3.hidden = false;

  // Если Live активен — тихо прибавляем +1 к победам без палевных кнопок
  if (state.liveVisible) {
    state.liveWins++;
    updateLiveStatsUI();
  }

  fireConfetti();

  state.busy = false;
  ctaSpinner.hidden = true;
  signalBtn.disabled = false;

  loadHistory();
  loadProgress();
}

btnCloseScanner.addEventListener("click", () => {
  if (stopLaserScan) stopLaserScan();
  if (state.activeInterval) {
    clearInterval(state.activeInterval);
    state.activeInterval = null;
  }
  scannerBackdrop.hidden = true;
  state.busy = false;
  ctaSpinner.hidden = true;
  signalBtn.disabled = false;
});

btnNewSignal.addEventListener("click", () => {
  scannerBackdrop.hidden = true;
  requestSignal();
});

signalBtn.addEventListener("click", requestSignal);

/* ==================== AI CORE (ЧАТ-АНАЛИТИК) ==================== */

function appendChatBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

btnAnalyze.addEventListener("click", async () => {
  const m = getModelById(state.model);
  const durObj = DURATIONS.find((d) => d.value === state.duration) || DURATIONS[0];
  const queryText = t("chatUserQuery", {
    pair: state.pair,
    dur: durObj.full[state.lang] || durObj.full.ru,
  });

  appendChatBubble("user", queryText);
  haptic("light");

  // Эмуляция ответа ИИ с задержкой 1с
  setTimeout(() => {
    const isBuy = Math.random() > 0.48;
    const dirText = isBuy ? (state.lang === "ru" ? "ВВЕРХ ↗" : "BUY ↗") : (state.lang === "ru" ? "ВНИЗ ↘" : "SELL ↘");
    const replyText = `${m.name}: ${t("chatAnalysisComplete", { dir: dirText })} (Acc: 94%).`;
    appendChatBubble("bot", replyText);
    haptic("medium");
  }, 900);
});

/* ==================== ЗАГРУЗКА ИСТОРИИ И РЕЙТИНГА ==================== */

async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const data = await res.json();

    feedList.innerHTML = "";
    (data.signals || []).forEach((item) => {
      const row = document.createElement("div");
      row.className = "feed-item-row";
      const isBuy = item.direction === "BUY";
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="dual-flags-container">${getDualFlagsHtml(item.pair)}</span>
          <span style="font-weight: 700; color: #FFF;">${item.pair}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: ${isBuy ? "var(--neon-green)" : "var(--neon-red)"}; font-weight: 800;">
            ${isBuy ? "BUY ↗" : "SELL ↘"}
          </span>
          <span style="color: var(--text-faint); font-size: 11px;">${item.accuracy}%</span>
        </div>
      `;
      feedList.appendChild(row);
    });

    if (data.today_traders > 0) {
      feedToday.hidden = false;
      feedToday.textContent = t("feedToday", { n: data.today_traders });
    }
  } catch (e) {
    console.warn("Load history error:", e);
  }
}

async function loadProgress() {
  try {
    const res = await fetch(`/api/me?tg_id=${state.tgId}`);
    if (!res.ok) return;
    const me = await res.json();

    progPoints.textContent = me.points_this_week || 0;
    progRank.textContent = me.rank ? `#${me.rank}` : "—";
    progStreak.textContent = me.streak_days || 0;
    progPersonal.textContent = `${me.signals_used_total || 0} ${state.lang === "ru" ? "сигналов получено" : "signals used"}`;

    state.isVip = me.has_access || false;
    updateStatusBadge();
  } catch (e) {
    console.warn("Load progress error:", e);
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) return;
    const lb = await res.json();

    lbList.innerHTML = "";
    (lb.top || []).forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = `lb-item-row ${idx === 0 ? "top-1" : ""}`;
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 800; color: ${idx === 0 ? "var(--neon-amber)" : "var(--text-faint)"};">#${item.rank}</span>
          <span style="color: #FFF;">${item.username || "Trader"}</span>
        </div>
        <span style="color: var(--neon-cyan); font-weight: 700;">${item.points} pts</span>
      `;
      lbList.appendChild(row);
    });
  } catch (e) {
    console.warn("Load leaderboard error:", e);
  }
}

function updateStatusBadge() {
  if (state.isVip) {
    badgeVip.hidden = false;
    badgeGuest.hidden = true;
  } else {
    badgeVip.hidden = true;
    badgeGuest.hidden = false;
    guestCount.textContent = `${state.freeSignalsLeft}/3`;
  }
}

function openDepositModal() {
  depositModalBackdrop.hidden = false;
}

badgeGuest.addEventListener("click", openDepositModal);
btnCloseDeposit.addEventListener("click", () => (depositModalBackdrop.hidden = true));
depositModalBackdrop.addEventListener("click", (e) => {
  if (e.target === depositModalBackdrop) depositModalBackdrop.hidden = true;
});

btnCopyPromo.addEventListener("click", () => {
  navigator.clipboard.writeText(state.promoCode).then(() => {
    alert(t("copied"));
    haptic("success");
  });
});

/* ==================== Переключение языка ==================== */

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.lang = btn.dataset.lang;
    localStorage.setItem("winky_lang", state.lang);
    applyLang();
    haptic("light");
  });
});

/* ==================== ИНИЦИАЛИЗАЦИЯ ==================== */

function init() {
  applyLang();
  selectPair(state.pair);
  renderActiveModelUI();
  updateLiveStatsUI();

  // Приветственное сообщение в чате
  appendChatBubble("bot", t("chatWelcome"));

  loadHistory();
  loadProgress();
  loadLeaderboard();
}

init();
