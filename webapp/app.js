/* ============================================================
   WINKY AI — Premium Trading Signals & Neural Terminal
   Vanilla JS (без сборки).
   ============================================================ */

"use strict";

/* ==================== Справочники данных ==================== */

const PAIRS = [
  // OTC Рынки
  { id: "EUR/USD OTC", name: "EUR/USD", flags: "🇪🇺🇺🇸", market: "otc" },
  { id: "GBP/USD OTC", name: "GBP/USD", flags: "🇬🇧🇺🇸", market: "otc" },
  { id: "AUD/USD OTC", name: "AUD/USD", flags: "🇦🇺🇺🇸", market: "otc" },
  { id: "USD/JPY OTC", name: "USD/JPY", flags: "🇺🇸🇯🇵", market: "otc" },
  { id: "AUD/CAD OTC", name: "AUD/CAD", flags: "🇦🇺🇨🇦", market: "otc" },
  { id: "AUD/CHF OTC", name: "AUD/CHF", flags: "🇦🇺🇨🇭", market: "otc" },
  { id: "EUR/GBP OTC", name: "EUR/GBP", flags: "🇪🇺🇬🇧", market: "otc" },
  { id: "USD/CHF OTC", name: "USD/CHF", flags: "🇺🇸🇨🇭", market: "otc" },
  { id: "NZD/USD OTC", name: "NZD/USD", flags: "🇳🇿🇺🇸", market: "otc" },
  { id: "BTC/USD OTC", name: "BTC/USD", flags: "₿🇺🇸",  market: "otc" },
  { id: "GOLD OTC",    name: "GOLD",    flags: "🥇🇺🇸", market: "otc" },

  // Классическая биржа (Regular)
  { id: "EUR/USD", name: "EUR/USD", flags: "🇪🇺🇺🇸", market: "classic" },
  { id: "GBP/USD", name: "GBP/USD", flags: "🇬🇧🇺🇸", market: "classic" },
  { id: "USD/JPY", name: "USD/JPY", flags: "🇺🇸🇯🇵", market: "classic" },
  { id: "AUD/USD", name: "AUD/USD", flags: "🇦🇺🇺🇸", market: "classic" },
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

const AI_MODELS = [
  {
    category: "WINKY AI (EXCLUSIVE)",
    categoryRu: "WINKY AI (ЭКСКЛЮЗИВ)",
    items: [
      { id: "winky-v4", name: "Winky Neural v4", tier: "Flagship Neural Engine", icon: "💖", isDefault: true },
    ],
  },
  {
    category: "OPENAI",
    categoryRu: "OPENAI",
    items: [
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", tier: "Flagship Reasoning", icon: "🟢" },
      { id: "gpt-5-mini",  name: "GPT-5 mini",  tier: "Ultra Fast", icon: "🟢" },
    ],
  },
  {
    category: "ANTHROPIC",
    categoryRu: "ANTHROPIC",
    items: [
      { id: "claude-opus-5",    name: "Claude Opus 5",    tier: "Deep Context Analysis", icon: "🟠" },
      { id: "claude-sonnet-5",  name: "Claude Sonnet 5",  tier: "Balanced Intelligence", icon: "🟠" },
      { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", tier: "Fast Momentum", icon: "🟠" },
    ],
  },
  {
    category: "GOOGLE",
    categoryRu: "GOOGLE",
    items: [
      { id: "gemini-3.1-pro",   name: "Gemini 3.1 Pro",   tier: "Multimodal Engine", icon: "🔵" },
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", tier: "Microsecond Latency", icon: "🔵" },
    ],
  },
];

const I18N = {
  en: {
    settingsTitle: "Signal settings",
    pairLabel: "Trading pair",
    durationLabel: "Trade duration",
    getSignal: "GET SIGNAL",
    accuracy: "Signal confidence",
    analyzingChart: "Scanning candlestick patterns and order delta...",
    fetchingData: "Fetching market data...",
    enterIn: "Enter in",
    tradeActive: "🔥 Trade active!",
    expiry: "Expiration time",
    expiryOver: "Expiration time is over",
    tradeClosed: "Trade session completed for this signal.",
    btnWin: "+1 WIN (Streamer)",
    btnNewSignal: "New signal",
    navSignal: "SIGNAL",
    navChat: "AI CHAT",
    navStats: "STATS",
    selectPair: "Select trading pair",
    searchPair: "Search pair (e.g. EUR, USD, OTC)...",
    selectModel: "Select AI Model",
    analyzeBtn: "Analyze",
    waitSignal: "Wait for signal · {s}s",
    liveSessionStats: "EDUCATIONAL LIVE",
    liveWins: "WINS",
    liveLosses: "LOSSES",
    liveWinrate: "WINRATE",
    reset: "Reset",
    progressTitle: "My progress",
    pointsWeek: "points this week",
    rankLabel: "rank",
    streakLabel: "day streak",
    leaderboardTitle: "Weekly top",
    feedTitle: "Live signals",
    feedToday: "🔥 Today: {n}",
    feedTotal: "👥 {n} traders with us",
    feedEmpty: "No signals yet",
    depositTitle: "Free Demo Signals Used",
    depositDesc: "You have used all 3 free demo signals! Unlock unlimited VIP accuracy, OTC algorithms, and all AI models.",
    promoBonus: "+50% Bonus on Deposit from $50",
    depositNow: "DEPOSIT (+50% BONUS)",
    close: "Close",
    riskHint: "Risk tip: stake ≤ 3% of your deposit",
    chatWelcome: "Hello! I am your AI Market Analyst. Select a trading pair, timeframe, and neural network to analyze market structure.",
    chatUserQuery: "{pair}, expiration {dur} — analyze the chart.",
    chatAnalysisComplete: "Analysis complete. Priority signal — {dir}.",
    chatUntil: "until",
    chatNewSignal: "🔄 Get a new signal",
    copied: "Copied!",
  },
  ru: {
    settingsTitle: "Настройки сигнала",
    pairLabel: "Валютная пара",
    durationLabel: "Время сделки",
    getSignal: "ПОЛУЧИТЬ СИГНАЛ",
    accuracy: "Уверенность сигнала",
    analyzingChart: "ИИ сканирует свечной паттерн и объёмы...",
    fetchingData: "Загрузка котировок...",
    enterIn: "Вход через",
    tradeActive: "🔥 Вход открыт!",
    expiry: "Время экспирации",
    expiryOver: "Время сделки завершено",
    tradeClosed: "Торговая сессия по этому сигналу окончена.",
    btnWin: "+1 ПОБЕДА (Стрим)",
    btnNewSignal: "Новый сигнал",
    navSignal: "СИГНАЛЫ",
    navChat: "ИИ ЧАТ",
    navStats: "РЕЙТИНГ",
    selectPair: "Выбор валютной пары",
    searchPair: "Поиск пары (напр. EUR, USD, OTC)...",
    selectModel: "Выбор нейросети",
    analyzeBtn: "Анализировать",
    waitSignal: "Ждите сигнала · {s}с",
    liveSessionStats: "СТРИМ ТАБЛО",
    liveWins: "ПОБЕДЫ",
    liveLosses: "МИНУСЫ",
    liveWinrate: "ВИНРЕЙТ",
    reset: "Сброс",
    progressTitle: "Мой прогресс",
    pointsWeek: "баллов за неделю",
    rankLabel: "место",
    streakLabel: "дней подряд",
    leaderboardTitle: "Топ недели",
    feedTitle: "Сигналы в эфире",
    feedToday: "🔥 Сегодня: {n}",
    feedTotal: "👥 {n} трейдеров с нами",
    feedEmpty: "Сигналов пока нет",
    depositTitle: "Демо-сигналы исчерпаны",
    depositDesc: "Вы использовали 3 из 3 бесплатных демо-сигнала! Откройте безлимитный доступ к сигналам, OTC-алгоритмам и всем нейросетям.",
    promoBonus: "+50% к депозиту от $50",
    depositNow: "ПОПОЛНИТЬ (+50% БОНУС)",
    close: "Закрыть",
    riskHint: "Совет по риску: ставка ≤ 3% депозита",
    chatWelcome: "Привет! Я твой ИИ-аналитик. Выбери валютную пару, таймфрейм и нейросеть для полного разбора структуры графика.",
    chatUserQuery: "{pair}, время экспирации {dur} — проанализируй график.",
    chatAnalysisComplete: "Анализ завершён. Приоритетный сигнал — {dir}.",
    chatUntil: "до",
    chatNewSignal: "🔄 Получить новый сигнал",
    copied: "Скопировано!",
  },
};

/* ==================== Состояние приложения ==================== */

const state = {
  lang: localStorage.getItem("winky_lang") || "en",
  market: "otc",
  pair: "EUR/USD OTC",
  duration: "5s",
  model: "winky-v4",
  forceDir: null, // Скрытый режим стримера: BUY — клик по бренду, SELL — клик по настройкам
  tgId: null,
  isVip: false,
  freeSignalsLeft: 3,
  busy: false,
  activeTimer: null,
  activeInterval: null,
  history: null,
  // Live session widget stats
  liveWins: parseInt(localStorage.getItem("winky_live_wins") || "42", 10),
  liveLosses: parseInt(localStorage.getItem("winky_live_losses") || "1", 10),
  liveVisible: localStorage.getItem("winky_live_vis") === "true",
};

/* ==================== Инициализация Telegram WebApp ==================== */

const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe?.user?.id) {
      state.tgId = tg.initDataUnsafe.user.id;
    }
  } catch (e) {
    console.warn("Telegram WebApp init error:", e);
  }
}
if (!state.tgId) {
  // Для тестирования в обычном браузере
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
const winCountEl = document.getElementById("winCount");
const lossCountEl = document.getElementById("lossCount");
const winRateValEl = document.getElementById("winRateVal");
const btnWinMinus = document.getElementById("btnWinMinus");
const btnWinPlus = document.getElementById("btnWinPlus");
const btnLossMinus = document.getElementById("btnLossMinus");
const btnLossPlus = document.getElementById("btnLossPlus");
const btnResetLive = document.getElementById("btnResetLive");
const liveClockEl = document.getElementById("liveClock");
const livePairEl = document.getElementById("livePair");

const langSwitchEl = document.getElementById("langSwitch");
const langButtons = Array.from(document.querySelectorAll(".lang-btn"));
const badgeVip = document.getElementById("badgeVip");
const badgeGuest = document.getElementById("badgeGuest");
const guestCountEl = document.getElementById("guestCount");

const btnMarketOtc = document.getElementById("btnMarketOtc");
const btnMarketRegular = document.getElementById("btnMarketRegular");
const marketBadge = document.getElementById("marketBadge");
const pairTrigger = document.getElementById("pairTrigger");
const pairFlagsEl = document.getElementById("pairFlags");
const pairDisplayEl = document.getElementById("pairDisplay");
const durationPills = Array.from(document.querySelectorAll(".duration-pill"));
const durationHint = document.getElementById("durationHint");
const signalBtn = document.getElementById("signalBtn");
const ctaText = document.getElementById("ctaText");
const ctaSpinner = document.getElementById("ctaSpinner");

// Сканер (Elite Option Style)
const scannerBackdrop = document.getElementById("scannerBackdrop");
const btnCloseScanner = document.getElementById("btnCloseScanner");
const phase1 = document.getElementById("phase1");
const phase2 = document.getElementById("phase2");
const phase3 = document.getElementById("phase3");
const laserCanvas = document.getElementById("laserCanvas");
const phase1Title = document.getElementById("phase1Title");
const phase1Pair = document.getElementById("phase1Pair");
const phase2Flags = document.getElementById("phase2Flags");
const phase2Pair = document.getElementById("phase2Pair");
const phase2Duration = document.getElementById("phase2Duration");
const bigIndicator = document.getElementById("bigIndicator");
const indicatorArrow = document.getElementById("indicatorArrow");
const indicatorLabel = document.getElementById("indicatorLabel");
const entryText = document.getElementById("entryText");
const confidenceVal = document.getElementById("confidenceVal");
const expiryDigits = document.getElementById("expiryDigits");
const expiryProgressFill = document.getElementById("expiryProgressFill");
const btnSignalWin = document.getElementById("btnSignalWin");
const btnNewSignal = document.getElementById("btnNewSignal");

// Вкладки и навигация
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const tabPanes = Array.from(document.querySelectorAll(".tab-pane"));

// Шторка выбора пары
const pairModalBackdrop = document.getElementById("pairModalBackdrop");
const btnClosePairModal = document.getElementById("btnClosePairModal");
const pairSearchInput = document.getElementById("pairSearchInput");
const pairListEl = document.getElementById("pairList");

// Чат
const chatModelAvatar = document.getElementById("chatModelAvatar");
const chatModelName = document.getElementById("chatModelName");
const chatModelSub = document.getElementById("chatModelSub");
const chatChipFlags = document.getElementById("chatChipFlags");
const chatChipPair = document.getElementById("chatChipPair");
const chatChipDuration = document.getElementById("chatChipDuration");
const chatPairChip = document.getElementById("chatPairChip");
const chatDurationChip = document.getElementById("chatDurationChip");
const chatHistory = document.getElementById("chatHistory");
const modelPickerTrigger = document.getElementById("modelPickerTrigger");
const triggerModelIcon = document.getElementById("triggerModelIcon");
const triggerModelName = document.getElementById("triggerModelName");
const btnAnalyze = document.getElementById("btnAnalyze");
const analyzeText = document.getElementById("analyzeText");

// Шторка выбора модели
const modelSheetBackdrop = document.getElementById("modelSheetBackdrop");
const btnCloseModelSheet = document.getElementById("btnCloseModelSheet");
const modelListEl = document.getElementById("modelList");

// Модалка депозита
const depositModalBackdrop = document.getElementById("depositModalBackdrop");
const btnCloseDeposit = document.getElementById("btnCloseDeposit");
const btnCopyPromo = document.getElementById("btnCopyPromo");
const btnDepositLink = document.getElementById("btnDepositLink");

// Прогресс и лента
const progPoints = document.getElementById("progPoints");
const progRank = document.getElementById("progRank");
const progStreak = document.getElementById("progStreak");
const progPersonal = document.getElementById("progPersonal");
const lbList = document.getElementById("lbList");
const lbRules = document.getElementById("lbRules");
const feedToday = document.getElementById("feedToday");
const feedTotal = document.getElementById("feedTotal");
const feedList = document.getElementById("feedList");

/* ==================== Утилиты и локализация ==================== */

function t(key, vars = {}) {
  const dict = I18N[state.lang] || I18N.en;
  let str = dict[key] || I18N.en[key] || key;
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
  renderChatModelInfo();
  updateDurationHint();
}

function updateCtaLabel() {
  const durObj = DURATIONS.find((d) => d.value === state.duration) || DURATIONS[0];
  ctaText.textContent = `${t("getSignal")} (${durObj.label})`;
}

function updateDurationHint() {
  const durObj = DURATIONS.find((d) => d.value === state.duration) || DURATIONS[0];
  durationHint.textContent = durObj.full[state.lang] || durObj.full.en;
}

function updateDepositLinks() {
  const isRu = state.lang === "ru";
  const base = isRu
    ? "https://po-ru4.click/cabinet/deposit?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START&promo=50START"
    : "https://u3.shortink.io/cabinet/deposit?utm_campaign=871226&utm_source=affiliate&utm_medium=sr&a=ng70XXOKb9ECCk&al=1808145&ac=wink&cid=988258&code=50START&promo=50START";
  btnDepositLink.href = `${base}&sub_id1=${state.tgId}&click_id=${state.tgId}`;
}

/* ==================== Часы и Live Session Stats ==================== */

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
  livePairEl.textContent = state.pair;

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

btnWinPlus.addEventListener("click", () => {
  state.liveWins++;
  updateLiveStatsUI();
  haptic("light");
});

btnWinMinus.addEventListener("click", () => {
  if (state.liveWins > 0) state.liveWins--;
  updateLiveStatsUI();
  haptic("light");
});

btnLossPlus.addEventListener("click", () => {
  state.liveLosses++;
  updateLiveStatsUI();
  haptic("light");
});

btnLossMinus.addEventListener("click", () => {
  if (state.liveLosses > 0) state.liveLosses--;
  updateLiveStatsUI();
  haptic("light");
});

btnResetLive.addEventListener("click", () => {
  state.liveWins = 0;
  state.liveLosses = 0;
  updateLiveStatsUI();
  haptic("medium");
});

/* ==================== Праздничные конфетти (1-Click WIN) ==================== */

const confettiCanvas = document.getElementById("confettiCanvas");
const ctx = confettiCanvas.getContext("2d");
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
  const count = 75;
  const colors = ["#00ff88", "#a855f7", "#ec4899", "#3b82f6", "#fef08a", "#ffffff"];
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
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
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

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    confettiAnimationId = null;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ==================== Лазерная анимация сканера (Canvas) ==================== */

let laserAnimId = null;
function startLaserScanAnimation(pairName) {
  const canvas = laserCanvas;
  const c = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  let step = 0;
  // Генерируем псевдо-свечи
  const points = [];
  let y = h * 0.5;
  for (let x = 0; x < w; x += 12) {
    y += (Math.random() - 0.48) * 14;
    y = Math.max(20, Math.min(h - 20, y));
    points.push({ x, y });
  }

  function render() {
    c.clearRect(0, 0, w, h);

    // Сетка
    c.strokeStyle = "rgba(168, 85, 247, 0.12)";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let py = 0; py < h; py += 30) {
      c.beginPath();
      c.moveTo(0, py);
      c.lineTo(w, py);
      c.stroke();
    }

    // Траектория цены
    c.strokeStyle = "#a855f7";
    c.lineWidth = 2.5;
    c.beginPath();
    points.forEach((pt, i) => {
      if (i === 0) c.moveTo(pt.x, pt.y);
      else c.lineTo(pt.x, pt.y);
    });
    c.stroke();

    // Заливка под графиком
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(168, 85, 247, 0.25)");
    grad.addColorStop(1, "rgba(168, 85, 247, 0.0)");
    c.fillStyle = grad;
    c.fill();

    step++;
    laserAnimId = requestAnimationFrame(render);
  }

  render();
}

function stopLaserScanAnimation() {
  if (laserAnimId) {
    cancelAnimationFrame(laserAnimId);
    laserAnimId = null;
  }
}

/* ==================== Управление парами и рынком ==================== */

function setMarket(marketKey) {
  state.market = marketKey;
  btnMarketOtc.classList.toggle("active", marketKey === "otc");
  btnMarketRegular.classList.toggle("active", marketKey === "classic");
  marketBadge.textContent = marketKey === "otc" ? "OTC 24/7" : "REGULAR";

  // Проверяем, подходит ли текущая пара
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

  pairFlagsEl.textContent = found.flags;
  pairDisplayEl.textContent = found.id;
  chatChipFlags.textContent = found.flags;
  chatChipPair.textContent = found.id;
  livePairEl.textContent = found.id;

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
        <span class="pair-item-flags">${p.flags}</span>
        <span class="pair-item-name">${p.id}</span>
      </div>
      <div class="pair-item-right">
        ${p.market === "otc" ? '<span class="pair-item-badge">OTC</span>' : ""}
        ${p.id === state.pair ? '<span class="pair-item-check">✓</span>' : ""}
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
  // Циклическое переключение таймфрейма по тапу
  const idx = DURATIONS.findIndex((d) => d.value === state.duration);
  const next = DURATIONS[(idx + 1) % DURATIONS.length];
  state.duration = next.value;
  durationPills.forEach((p) => p.classList.toggle("active", p.dataset.duration === next.value));
  updateCtaLabel();
  updateDurationHint();
  chatChipDuration.textContent = next.label;
  haptic("light");
});

/* ==================== Шторка выбора AI-Модели ==================== */

function selectModel(modelId) {
  state.model = modelId;
  modelSheetBackdrop.hidden = true;
  renderChatModelInfo();
  haptic("light");
}

function renderChatModelInfo() {
  let found = null;
  for (const cat of AI_MODELS) {
    const it = cat.items.find((m) => m.id === state.model);
    if (it) {
      found = it;
      break;
    }
  }
  if (!found) found = AI_MODELS[0].items[0];

  chatModelAvatar.textContent = found.icon;
  chatModelName.textContent = found.name;
  chatModelSub.textContent = found.tier;
  triggerModelIcon.textContent = found.icon;
  triggerModelName.textContent = found.name.split(" ")[0] + " " + (found.name.split(" ")[1] || "");
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
          <span class="model-item-icon">${m.icon}</span>
          <div class="model-item-info">
            <span class="model-item-name">${m.name}</span>
            <span class="model-item-tier">${m.tier}</span>
          </div>
        </div>
        ${m.id === state.model ? '<span class="pair-item-check">✓</span>' : ""}
      `;
      row.addEventListener("click", () => selectModel(m.id));
      modelListEl.appendChild(row);
    });
  });
}

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
});

settingsTitleEl.addEventListener("click", () => {
  state.forceDir = "SELL";
  console.debug("[streamer] force_dir armed: SELL");
});

/* ==================== 3-ФАЗНЫЙ СКАНЕР СИГНАЛОВ (ELITE OPTION) ==================== */

async function requestSignal() {
  if (state.busy) return;
  state.busy = true;
  ctaSpinner.hidden = false;
  signalBtn.disabled = true;

  const currentPair = state.pair;
  const currentDuration = state.duration;
  const pairMeta = PAIRS.find((p) => p.id === currentPair) || { flags: "🇪🇺🇺🇸" };

  // Открываем модалку сканера
  scannerBackdrop.hidden = false;
  phase1.hidden = false;
  phase2.hidden = true;
  phase3.hidden = true;

  phase1Title.textContent = t("fetchingData");
  phase1Pair.textContent = currentPair;
  startLaserScanAnimation(currentPair);
  haptic("light");

  const forceDir = state.forceDir;
  state.forceDir = null; // Одноразовый сброс

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
      const errJson = await res.json().catch(() => ({}));
      scannerBackdrop.hidden = true;
      stopLaserScanAnimation();
      state.busy = false;
      ctaSpinner.hidden = true;
      signalBtn.disabled = false;
      openDepositModal();
      return;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    signalData = await res.json();
  } catch (err) {
    console.error("Signal request error:", err);
    fetchError = err;
  }

  // Фаза 1 длится минимум 1.6 с
  await new Promise((r) => setTimeout(r, 1600));
  stopLaserScanAnimation();

  if (fetchError || !signalData) {
    scannerBackdrop.hidden = true;
    state.busy = false;
    ctaSpinner.hidden = true;
    signalBtn.disabled = false;
    alert(t("error") || "Error fetching signal");
    return;
  }

  // Обновляем статус гостя/VIP
  state.isVip = signalData.is_vip;
  state.freeSignalsLeft = signalData.free_signals_left;
  updateStatusBadge();

  // Переход к ФАЗЕ 2
  phase1.hidden = true;
  phase2.hidden = false;
  phase3.hidden = true;

  phase2Flags.textContent = pairMeta.flags;
  phase2Pair.textContent = currentPair;
  phase2Duration.textContent = `Expiration ${currentDuration.toUpperCase()}`;

  const isBuy = signalData.direction === "BUY";
  bigIndicator.className = `big-indicator ${isBuy ? "buy" : "sell"}`;
  indicatorArrow.textContent = isBuy ? "⬆️" : "⬇️";
  indicatorLabel.textContent = isBuy ? (state.lang === "ru" ? "ВВЕРХ" : "UP") : (state.lang === "ru" ? "ВНИЗ" : "DOWN");

  confidenceVal.textContent = `${signalData.accuracy}%`;
  confidenceVal.className = `confidence-val ${signalData.accuracy >= 86 ? "high" : "mid"}`;

  // 3-секундный отсчёт входа
  let entrySec = signalData.entry_delay_sec || 3;
  entryText.textContent = `${t("enterIn")} ${entrySec}...`;
  haptic("medium");

  const entryInterval = setInterval(() => {
    entrySec--;
    if (entrySec > 0) {
      entryText.textContent = `${t("enterIn")} ${entrySec}...`;
      haptic("light");
    } else {
      clearInterval(entryInterval);
      entryText.textContent = t("tradeActive");
      haptic("heavy");
      startExpirationCountdown(signalData.duration_sec || 5);
    }
  }, 1000);
}

function startExpirationCountdown(totalSeconds) {
  let remaining = totalSeconds;
  expiryProgressFill.style.width = "100%";

  function formatTime(s) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  expiryDigits.textContent = formatTime(remaining);

  const startTime = performance.now();
  const totalMs = totalSeconds * 1000;

  state.activeInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const leftMs = Math.max(0, totalMs - elapsed);
    const leftSec = Math.ceil(leftMs / 1000);

    expiryDigits.textContent = formatTime(leftSec);
    const pct = Math.max(0, (leftMs / totalMs) * 100);
    expiryProgressFill.style.width = `${pct}%`;

    if (leftMs <= 0) {
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

  state.busy = false;
  ctaSpinner.hidden = true;
  signalBtn.disabled = false;
  loadHistory();
  loadProgress();
}

btnCloseScanner.addEventListener("click", () => {
  stopLaserScanAnimation();
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

btnSignalWin.addEventListener("click", () => {
  state.liveWins++;
  updateLiveStatsUI();
  fireConfetti();
});

signalBtn.addEventListener("click", requestSignal);

/* ==================== ИИ-АНАЛИТИК ЧАТ (NOVA AI STYLE) ==================== */

function appendChatMessage(sender, data) {
  const msgEl = document.createElement("div");
  msgEl.className = `chat-msg ${sender}`;

  if (sender === "user") {
    msgEl.innerHTML = `<div class="msg-bubble">${data.text}</div>`;
  } else {
    // Ответ нейросети с неоновой карточкой
    const isBuy = data.direction === "BUY";
    const dirText = isBuy
      ? state.lang === "ru" ? "ВВЕРХ (BUY)" : "BUY"
      : state.lang === "ru" ? "ВНИЗ (SELL)" : "SELL";

    const rationaleItems = (state.lang === "ru" ? data.rationale_ru : data.rationale_en) || [];
    const rationaleHtml = rationaleItems
      .map((r) => `<div class="chat-rationale-item">${r}</div>`)
      .join("");

    msgEl.innerHTML = `
      <div class="msg-author-row">
        <span>${data.modelIcon || "💖"}</span>
        <span class="msg-author-badge">${data.modelName || "Winky AI"}</span>
      </div>
      <div class="chat-signal-card ${isBuy ? "buy" : "sell"}">
        <div class="chat-signal-head">
          <div class="chat-signal-dir">
            <span>${isBuy ? "▲" : "▼"}</span>
            <span>${dirText}</span>
          </div>
          <div class="chat-accuracy-circle">
            <span>⭕</span>
            <span>${data.accuracy}%</span>
          </div>
        </div>

        <div class="chat-tags-row">
          <span class="chat-tag">${data.pair}</span>
          <span class="chat-tag">${data.duration}</span>
        </div>

        <div class="chat-rationale-list">
          ${rationaleHtml}
        </div>

        <div class="chat-countdown-row">
          <span>${t("chatUntil")} ${data.expireTimeStr}</span>
          <span>100%</span>
        </div>

        <button type="button" class="btn-chat-new-signal" onclick="requestChatAnalysis()">
          ${t("chatNewSignal")}
        </button>
      </div>
    `;
  }

  chatHistory.appendChild(msgEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Начальное приветственное сообщение
function initChatWelcome() {
  chatHistory.innerHTML = "";
  const welcome = document.createElement("div");
  welcome.className = "chat-msg bot";
  welcome.innerHTML = `
    <div class="msg-author-row">
      <span>💖</span>
      <span class="msg-author-badge">Winky AI</span>
    </div>
    <div class="msg-bubble" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 12px; font-size: 13px; line-height: 1.4;">
      ${t("chatWelcome")}
    </div>
  `;
  chatHistory.appendChild(welcome);
}

async function requestChatAnalysis() {
  if (state.busy) return;
  state.busy = true;
  btnAnalyze.disabled = true;

  const currentPair = state.pair;
  const currentDuration = state.duration;
  const currentModel = state.model;

  let modelInfo = { icon: "💖", name: "Winky Neural v4" };
  for (const cat of AI_MODELS) {
    const f = cat.items.find((m) => m.id === currentModel);
    if (f) {
      modelInfo = f;
      break;
    }
  }

  // 1) Сообщение пользователя
  const userText = t("chatUserQuery", { pair: currentPair, dur: currentDuration });
  appendChatMessage("user", { text: userText });
  haptic("light");

  const forceDir = state.forceDir;
  state.forceDir = null;

  try {
    const res = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tg_id: state.tgId,
        pair: currentPair,
        duration: currentDuration,
        model: currentModel,
        ...(forceDir ? { force_dir: forceDir } : {}),
      }),
    });

    if (res.status === 403) {
      state.busy = false;
      btnAnalyze.disabled = false;
      openDepositModal();
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    state.isVip = data.is_vip;
    state.freeSignalsLeft = data.free_signals_left;
    updateStatusBadge();

    // Расчёт времени экспирации для карточки
    const durSec = data.duration_sec || 5;
    const expireDate = new Date(Date.now() + durSec * 1000);
    const expireTimeStr = expireDate.toTimeString().split(" ")[0];

    appendChatMessage("bot", {
      modelIcon: modelInfo.icon,
      modelName: modelInfo.name,
      direction: data.direction,
      accuracy: data.accuracy,
      pair: data.pair,
      duration: data.duration,
      rationale_ru: data.rationale_ru,
      rationale_en: data.rationale_en,
      expireTimeStr: expireTimeStr,
    });

    haptic("medium");

    // Блокируем кнопку таймером экспирации
    let left = durSec;
    const lockTimer = setInterval(() => {
      left--;
      if (left > 0) {
        analyzeText.textContent = t("waitSignal", { s: left });
      } else {
        clearInterval(lockTimer);
        analyzeText.textContent = t("analyzeBtn");
        btnAnalyze.disabled = false;
        state.busy = false;
      }
    }, 1000);

  } catch (err) {
    console.error("Chat analysis error:", err);
    state.busy = false;
    btnAnalyze.disabled = false;
    alert(t("error") || "Connection error");
  }
}

btnAnalyze.addEventListener("click", requestChatAnalysis);

/* ==================== Модалка депозита и статус ==================== */

function openDepositModal() {
  depositModalBackdrop.hidden = false;
  haptic("heavy");
}

btnCloseDeposit.addEventListener("click", () => (depositModalBackdrop.hidden = true));
depositModalBackdrop.addEventListener("click", (e) => {
  if (e.target === depositModalBackdrop) depositModalBackdrop.hidden = true;
});

btnCopyPromo.addEventListener("click", () => {
  navigator.clipboard.writeText("50START").then(() => {
    btnCopyPromo.textContent = "✓";
    setTimeout(() => (btnCopyPromo.textContent = "📋"), 1500);
    haptic("light");
  });
});

function updateStatusBadge() {
  if (state.isVip) {
    badgeVip.hidden = false;
    badgeGuest.hidden = true;
  } else {
    badgeVip.hidden = true;
    badgeGuest.hidden = false;
    guestCountEl.textContent = `${Math.max(0, state.freeSignalsLeft)}/3`;
  }
}

/* ==================== Загрузка данных прогресса и ленты ==================== */

async function loadProgress() {
  if (!state.tgId) return;
  try {
    const res = await fetch(`/api/me?tg_id=${state.tgId}`);
    if (!res.ok) return;
    const data = await res.json();

    progPoints.textContent = data.points_week ?? 0;
    progRank.textContent = data.rank ? `#${data.rank}` : "—";
    progStreak.textContent = data.streak_days ?? 0;

    if (data.total_signals) {
      progPersonal.textContent = data.favorite_pair
        ? `${data.total_signals} signals · favorite: ${data.favorite_pair}`
        : `${data.total_signals} signals`;
    }

    if (data.is_vip !== undefined) {
      state.isVip = data.is_vip;
      state.freeSignalsLeft = data.free_signals_left ?? 0;
      updateStatusBadge();
    }
  } catch (e) {
    console.warn("Failed to load progress:", e);
  }

  // Загрузка лидерборда
  try {
    const lbRes = await fetch(`/api/leaderboard?tg_id=${state.tgId}`);
    if (lbRes.ok) {
      const lbData = await lbRes.json();
      renderLeaderboard(lbData.entries || [], lbData.your_rank);
    }
  } catch (e) {
    console.warn("Failed to load leaderboard:", e);
  }
}

function renderLeaderboard(entries, yourRank) {
  lbList.innerHTML = "";
  if (!entries.length) {
    lbList.innerHTML = `<div style="font-size: 12px; color: var(--text-faint); padding: 8px 0;">No tournament points yet this week</div>`;
    return;
  }

  entries.slice(0, 10).forEach((entry) => {
    const isMe = yourRank && entry.place === yourRank;
    const item = document.createElement("div");
    item.className = `lb-item ${isMe ? "highlight" : ""}`;
    const medal = entry.place === 1 ? "🥇" : entry.place === 2 ? "🥈" : entry.place === 3 ? "🥉" : `#${entry.place}`;
    item.innerHTML = `
      <span class="lb-place">${medal}</span>
      <span class="lb-name">${entry.name || "Trader"}</span>
      <span class="lb-pts">${entry.points} pts</span>
    `;
    lbList.appendChild(item);
  });
}

async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const data = await res.json();
    state.history = data;

    if (data.today_traders) {
      feedToday.hidden = false;
      feedToday.textContent = t("feedToday", { n: data.today_traders });
    }
    if (data.total_traders) {
      feedTotal.hidden = false;
      feedTotal.textContent = t("feedTotal", { n: data.total_traders });
    }

    renderFeed(data.signals || []);
  } catch (e) {
    console.warn("Failed to load history:", e);
  }
}

function renderFeed(signals) {
  feedList.innerHTML = "";
  if (!signals.length) {
    feedList.innerHTML = `<div style="font-size: 12px; color: var(--text-faint); padding: 8px 0;">${t("feedEmpty")}</div>`;
    return;
  }

  signals.slice(0, 6).forEach((sig) => {
    const item = document.createElement("div");
    item.className = "feed-item";

    const isBuy = sig.direction === "BUY";
    const dirClass = isBuy ? "buy" : "sell";
    const dirArrow = isBuy ? "▲" : "▼";

    const createdAt = new Date(sig.created_at);
    const secAgo = Math.max(1, Math.round((Date.now() - createdAt.getTime()) / 1000));
    const timeStr = secAgo < 60 ? `${secAgo}s ago` : `${Math.round(secAgo / 60)}m ago`;

    item.innerHTML = `
      <div class="feed-item-left">
        <span class="feed-dir-tag ${dirClass}">${dirArrow} ${sig.direction}</span>
        <span class="feed-pair">${sig.pair}</span>
      </div>
      <div class="feed-item-right">
        <span class="feed-acc">${sig.accuracy}%</span>
        <span class="feed-time">${timeStr}</span>
      </div>
    `;
    feedList.appendChild(item);
  });
}

/* ==================== Переключение языка ==================== */

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.lang = btn.dataset.lang;
    localStorage.setItem("winky_lang", state.lang);
    applyLang();
    initChatWelcome();
    loadProgress();
    loadHistory();
    haptic("light");
  });
});

/* ==================== Запуск приложения ==================== */

function initApp() {
  applyLang();
  initChatWelcome();
  updateLiveStatsUI();
  updateStatusBadge();
  setMarket("otc");
  loadProgress();
  loadHistory();
  setInterval(loadHistory, 30000);
}

document.addEventListener("DOMContentLoaded", initApp);
