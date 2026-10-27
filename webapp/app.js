/* Wink Trade — Telegram Mini App (Vanilla JS, без сборки). */

"use strict";

/* ==================== Данные ==================== */

const PAIR_GROUPS = [
  {
    key: "otc",
    items: [
      "AUD/CHF OTC", "EUR/USD OTC", "GBP/USD OTC", "USD/JPY OTC",
      "AUD/CAD OTC", "EUR/GBP OTC", "USD/CHF OTC", "NZD/USD OTC",
    ],
  },
  { key: "classic", items: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"] },
];

const DURATIONS = [
  { value: "5s",  seconds: 5,   label: { en: "5 seconds",  ru: "5 секунд"  }, short: { en: "5s",  ru: "5с" } },
  { value: "15s", seconds: 15,  label: { en: "15 seconds", ru: "15 секунд" }, short: { en: "15s", ru: "15с" } },
  { value: "30s", seconds: 30,  label: { en: "30 seconds", ru: "30 секунд" }, short: { en: "30s", ru: "30с" } },
  { value: "1m",  seconds: 60,  label: { en: "1 minute",   ru: "1 минута"  }, short: { en: "1m",  ru: "1м" } },
  { value: "3m",  seconds: 180, label: { en: "3 minutes",  ru: "3 минуты"  }, short: { en: "3m",  ru: "3м" } },
  { value: "5m",  seconds: 300, label: { en: "5 minutes",  ru: "5 минут"   }, short: { en: "5m",  ru: "5м" } },
];

const I18N = {
  en: {
    settingsTitle: "Signal settings",
    pairLabel: "Trading pair",
    durationLabel: "Trade duration",
    getSignal: "Get signal",
    accuracy: "Accuracy",
    standby: "STANDBY",
    noAccessTitle: "NO ACCESS",
    errorTitle: "ERROR",
    noAccess: "Access is not unlocked yet. Register via the bot link and make a deposit to activate the signals.",
    error: "Connection error. Please try again.",
    groupOtc: "OTC markets",
    groupClassic: "Classic pairs",
    stage1: "Loading market data",
    stage2: "RSI analysis",
    stage3: "EMA verification",
    stage4: "Signal confirmation",
    expiry: "Expiration",
    secShort: "s",
    feedTitle: "Live signals",
    feedToday: "🔥 Today: {n}",
    feedTotal: "👥 {n} traders with us",
    feedEmpty: "No signals yet",
    agoSec: "{n}s ago",
    agoMin: "{n}m ago",
    progressTitle: "My progress",
    pointsWeek: "points this week",
    rankLabel: "rank",
    streakLabel: "day streak",
    leaderboardTitle: "Weekly top",
    lbEmpty: "No points yet this week",
    personalStats: "{n} signals · favorite: {pair}",
    personalStatsShort: "{n} signals",
    riskHint: "Risk tip: stake ≤ 3% of your deposit",
  },
  ru: {
    settingsTitle: "Настройки сигнала",
    pairLabel: "Валютная пара",
    durationLabel: "Время сделки",
    getSignal: "Получить сигнал",
    accuracy: "Точность",
    standby: "ОЖИДАНИЕ",
    noAccessTitle: "НЕТ ДОСТУПА",
    errorTitle: "ОШИБКА",
    noAccess: "Доступ ещё не открыт. Зарегистрируйтесь по ссылке из бота и внесите депозит, чтобы активировать сигналы.",
    error: "Ошибка соединения. Попробуйте ещё раз.",
    groupOtc: "OTC-рынки",
    groupClassic: "Классические пары",
    stage1: "Загрузка данных рынка",
    stage2: "Анализ RSI",
    stage3: "Проверка EMA",
    stage4: "Подтверждение сигнала",
    expiry: "Экспирация",
    secShort: "с",
    feedTitle: "Сигналы в эфире",
    feedToday: "🔥 Сегодня: {n}",
    feedTotal: "👥 {n} трейдеров с нами",
    feedEmpty: "Сигналов пока нет",
    agoSec: "{n}с назад",
    agoMin: "{n}мин назад",
    progressTitle: "Мой прогресс",
    pointsWeek: "баллов за неделю",
    rankLabel: "место",
    streakLabel: "дней подряд",
    leaderboardTitle: "Топ недели",
    lbEmpty: "На этой неделе баллов пока нет",
    personalStats: "{n} сигналов · любимая пара: {pair}",
    personalStatsShort: "{n} сигналов",
    riskHint: "Совет по риску: ставка ≤ 3% депозита",
  },
};

const ICONS = {
  swap: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4"/><path d="M3 8h13"/><path d="m17 20 4-4-4-4"/><path d="M21 16H8"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5.5 5.5L20 6.5"/></svg>',
};

/* Драматургия анализа: 4 этапа по 600 мс + пауза перед reveal (SPEC: спиннер 1.2 c+) */
const STAGE_MS = 600;
const ANALYSIS_MIN_MS = 2600;

/* ==================== Состояние ==================== */

const state = {
  lang: "en",
  pair: "AUD/CHF OTC",
  duration: "5s",
  forceDir: null, // скрытый «режим стримера»: BUY — тап по логотипу, SELL — тап по заголовку
  tgId: null,
  busy: false,
  accuracyShown: 0,
  lastOutcome: null,
  history: null,
};

/* ==================== DOM ==================== */

const brandEl = document.getElementById("brand");
const settingsTitleEl = document.getElementById("settingsTitle");
const langSwitchEl = document.getElementById("langSwitch");
const langButtons = Array.from(document.querySelectorAll(".lang-btn"));
const pairSelectEl = document.getElementById("pairSelect");
const durationSelectEl = document.getElementById("durationSelect");
const signalBtn = document.getElementById("signalBtn");
const ctaText = document.getElementById("ctaText");
const ctaSpinner = document.getElementById("ctaSpinner");
const resultCard = document.getElementById("resultCard");
const analysisBlock = document.getElementById("analysisBlock");
const analysisStages = Array.from(document.querySelectorAll(".analysis-stage"));
const analysisFill = document.getElementById("analysisFill");
const resultChip = document.getElementById("resultChip");
const chipText = document.getElementById("chipText");
const resultDirection = document.getElementById("resultDirection");
const resultMessage = document.getElementById("resultMessage");
const resultPair = document.getElementById("resultPair");
const resultDuration = document.getElementById("resultDuration");
const accuracyValue = document.getElementById("accuracyValue");
const barFill = document.getElementById("barFill");
const expiryBlock = document.getElementById("expiryBlock");
const expiryTime = document.getElementById("expiryTime");
const expiryFill = document.getElementById("expiryFill");
const feedToday = document.getElementById("feedToday");
const feedList = document.getElementById("feedList");
const feedTotal = document.getElementById("feedTotal");
const progPoints = document.getElementById("progPoints");
const progRank = document.getElementById("progRank");
const progStreak = document.getElementById("progStreak");
const progPersonal = document.getElementById("progPersonal");
const progRules = document.getElementById("lbRules");
const lbList = document.getElementById("lbList");

/* ==================== Утилиты ==================== */

function t(key, params) {
  let text = I18N[state.lang][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split("{" + name + "}").join(String(value));
    }
  }
  return text;
}

function durationInfo(value) {
  return DURATIONS.find((d) => d.value === value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function haptic(style) {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
  } catch {
    /* вне Telegram хаптика нет — не ошибка */
  }
}

function hapticNotify(type) {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(type);
  } catch {
    /* вне Telegram */
  }
}

function hapticSelect() {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  } catch {
    /* вне Telegram */
  }
}

/* ==================== Звук (WebAudio, без файлов) ==================== */

let audioContext = null;

function ensureAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playDing() {
  if (!audioContext) return;
  try {
    const base = audioContext.currentTime;
    const notes = [
      [880.0, 0.0],
      [1318.5, 0.09], // E6 — мажорная терция к A5
    ];
    for (const [frequency, offset] of notes) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, base + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, base + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, base + offset + 0.28);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(base + offset);
      oscillator.stop(base + offset + 0.32);
    }
  } catch {
    /* звук не критичен */
  }
}

/* ==================== Telegram ==================== */

function initTelegram() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor?.("#0b1512");
    webApp.setBackgroundColor?.("#070d0b");
  } catch {
    /* старые клиенты Telegram */
  }
}

function detectLang() {
  const saved = localStorage.getItem("wink_lang");
  if (saved === "ru" || saved === "en") return saved;
  const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || "";
  return code.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function detectTgId() {
  const fromTelegram = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  if (fromTelegram) return fromTelegram;
  // Фоллбэк для открытия в обычном браузере (тест/демо): ?tg_id=123
  const fromUrl = new URLSearchParams(location.search).get("tg_id");
  return fromUrl ? Number(fromUrl) : null;
}

/* ==================== Кастомный селект ==================== */

function closeAllSelects() {
  document.querySelectorAll(".select.open").forEach((el) => {
    el.classList.remove("open");
    el.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", closeAllSelects);

function buildSelect(container, config) {
  container.innerHTML =
    '<button type="button" class="select-trigger" aria-expanded="false">' +
    '<span class="sel-icon">' + config.icon + "</span>" +
    '<span class="select-value"></span>' +
    '<span class="select-chevron">' + ICONS.chevron + "</span>" +
    '</button><div class="select-menu" role="listbox"></div>';

  const trigger = container.querySelector(".select-trigger");
  const menu = container.querySelector(".select-menu");
  const valueEl = container.querySelector(".select-value");

  function renderMenu() {
    menu.innerHTML = "";
    for (const group of config.groups()) {
      if (group.label) {
        const head = document.createElement("div");
        head.className = "select-group";
        head.textContent = group.label;
        menu.appendChild(head);
      }
      for (const item of group.items) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "select-option" + (item.value === config.value() ? " selected" : "");
        option.setAttribute("role", "option");
        option.innerHTML = "<span>" + item.text + '</span><span class="select-check">' + ICONS.check + "</span>";
        option.addEventListener("click", (event) => {
          event.stopPropagation();
          close();
          if (config.value() !== item.value) {
            config.onChange(item.value);
            renderValue();
            hapticSelect();
          }
        });
        menu.appendChild(option);
      }
    }
  }

  function renderValue() {
    valueEl.textContent = config.displayValue();
  }

  function open() {
    closeAllSelects();
    renderMenu();
    container.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function close() {
    container.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (container.classList.contains("open")) close();
    else open();
  });

  menu.addEventListener("click", (event) => event.stopPropagation());

  container.refresh = () => {
    renderValue();
    if (container.classList.contains("open")) renderMenu();
  };
}

/* ==================== Локализация ==================== */

function updateCta() {
  const short = durationInfo(state.duration).short[state.lang];
  ctaText.textContent = t("getSignal") + " (" + short + ") ↗";
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = I18N[state.lang][el.dataset.i18n];
  });
  langSwitchEl.dataset.active = state.lang;
  langButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === state.lang));
  localStorage.setItem("wink_lang", state.lang);
  updateCta();
  pairSelectEl.refresh();
  durationSelectEl.refresh();
  if (state.lastOutcome) renderOutcome(state.lastOutcome, true);
  if (state.history) renderHistory();
  loadProgress(); // правила и личные данные на текущем языке
}

/* ==================== Анимация анализа ==================== */

/* --- Живой свечной график: свечи прорисовываются, последняя «формируется» --- */

const CHART_CANDLES = 14;
const CHART_CANDLE_MS = 130; // интервал появления свечи
const CHART_BEAM_MS = 950; // проход сканирующего луча

let chartFrame = null;

function stopChartAnimation() {
  if (chartFrame) {
    cancelAnimationFrame(chartFrame);
    chartFrame = null;
  }
}

function startChartAnimation() {
  stopChartAnimation();
  const canvas = document.getElementById("analysisChart");
  const context = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 300;
  const height = canvas.clientHeight || 150;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Случайная рыночная серия: каждое нажатие — новый «рынок»
  let price = height * 0.55;
  const candles = [];
  for (let i = 0; i < CHART_CANDLES; i += 1) {
    const open = price;
    const drift = (Math.random() - 0.45) * height * 0.14;
    const close = Math.min(height * 0.9, Math.max(height * 0.1, open + drift));
    candles.push({
      open,
      close,
      high: Math.max(open, close) + Math.random() * height * 0.05,
      low: Math.min(open, close) - Math.random() * height * 0.05,
    });
    price = close;
  }

  const pad = 10;
  const slot = (width - pad * 2) / CHART_CANDLES;
  const bodyWidth = Math.max(6, slot * 0.55);
  const startTs = performance.now();
  let lastClose = candles[0].close;

  function drawCandle(candle, x, alpha) {
    const up = candle.close >= candle.open;
    const color = up ? "#00e676" : "#ff4d4d";
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 1.5;
    context.beginPath(); // тень свечи
    context.moveTo(x + bodyWidth / 2, height - candle.high);
    context.lineTo(x + bodyWidth / 2, height - candle.low);
    context.stroke();
    const top = height - Math.max(candle.open, candle.close);
    context.fillRect(x, top, bodyWidth, Math.max(2, Math.abs(candle.close - candle.open)));
    context.globalAlpha = 1;
  }

  function frame(now) {
    const elapsed = now - startTs;
    context.clearRect(0, 0, width, height);

    // фоновая сетка
    context.strokeStyle = "rgba(255,255,255,0.05)";
    context.lineWidth = 1;
    for (let i = 1; i <= 3; i += 1) {
      const y = (height / 4) * i;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    // свечи появляются по очереди; последняя «живёт» — цена формируется
    const shown = Math.min(CHART_CANDLES, Math.floor(elapsed / CHART_CANDLE_MS) + 1);
    for (let i = 0; i < shown; i += 1) {
      const progress = Math.min(1, (elapsed - i * CHART_CANDLE_MS) / 220);
      const eased = 1 - Math.pow(1 - progress, 3);
      const candle = candles[i];
      const isLive = i === shown - 1 && progress >= 1;
      if (isLive) {
        candle.close = Math.min(height * 0.9, Math.max(height * 0.1, candle.close + (Math.random() - 0.5) * 2.4));
        candle.high = Math.max(candle.high, candle.close);
        candle.low = Math.min(candle.low, candle.close);
        context.shadowColor = candle.close >= candle.open ? "#00e676" : "#ff4d4d";
        context.shadowBlur = 10;
      }
      drawCandle(candle, pad + i * slot, 0.35 + 0.65 * eased);
      context.shadowBlur = 0;
      if (progress >= 1) lastClose = candle.close;
    }

    // пунктирная линия последней цены
    context.strokeStyle = "rgba(0,230,118,0.55)";
    context.setLineDash([5, 5]);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, height - lastClose);
    context.lineTo(width, height - lastClose);
    context.stroke();
    context.setLineDash([]);

    // сканирующий луч по графику
    const beamX = ((elapsed % CHART_BEAM_MS) / CHART_BEAM_MS) * (width + 40) - 20;
    const beam = context.createLinearGradient(beamX - 16, 0, beamX + 16, 0);
    beam.addColorStop(0, "rgba(0,230,118,0)");
    beam.addColorStop(0.5, "rgba(0,230,118,0.18)");
    beam.addColorStop(1, "rgba(0,230,118,0)");
    context.fillStyle = beam;
    context.fillRect(beamX - 16, 0, 32, height);
    context.fillStyle = "rgba(0,230,118,0.45)";
    context.fillRect(beamX - 0.5, 0, 1, height);

    chartFrame = requestAnimationFrame(frame);
  }

  chartFrame = requestAnimationFrame(frame);
}

function startAnalysis() {
  stopExpiry();
  resultCard.classList.add("analyzing");
  analysisBlock.hidden = false;
  startChartAnimation();
  analysisStages.forEach((stage) => stage.classList.remove("active", "done"));
  analysisFill.style.transition = "none";
  analysisFill.style.width = "0%";
  void analysisFill.offsetWidth;
  analysisFill.style.transition = "width " + (STAGE_MS * 4) + "ms linear";
  analysisFill.style.width = "100%";
  analysisStages.forEach((stage, index) => {
    setTimeout(() => stage.classList.add("active"), index * STAGE_MS);
    setTimeout(() => stage.classList.add("done"), index * STAGE_MS + STAGE_MS * 0.75);
  });
}

function finishAnalysis() {
  stopChartAnimation();
  analysisBlock.hidden = true;
  resultCard.classList.remove("analyzing");
}

/* ==================== Таймер экспирации ==================== */

let expiryTimer = null;

function startExpiry(seconds) {
  stopExpiry();
  expiryBlock.hidden = false;
  expiryBlock.classList.remove("expired");
  const endTimestamp = performance.now() + seconds * 1000;
  expiryFill.style.transition = "none";
  expiryFill.style.width = "100%";
  void expiryFill.offsetWidth;
  expiryFill.style.transition = "width " + seconds + "s linear";
  expiryFill.style.width = "0%";

  function tick() {
    const left = Math.max(0, Math.ceil((endTimestamp - performance.now()) / 1000));
    expiryTime.textContent = left + t("secShort");
    if (left <= 0) {
      // Нейтральное затухание: выдуманный исход не показываем
      clearInterval(expiryTimer);
      expiryTimer = null;
      expiryBlock.classList.add("expired");
      setTimeout(() => {
        expiryBlock.hidden = true;
      }, 900);
    }
  }

  tick();
  expiryTimer = setInterval(tick, 200);
}

function stopExpiry() {
  if (expiryTimer) {
    clearInterval(expiryTimer);
    expiryTimer = null;
  }
  expiryBlock.hidden = true;
  expiryBlock.classList.remove("expired");
}

/* ==================== Живая лента ==================== */

function timeAgo(isoString) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (seconds < 60) return t("agoSec", { n: seconds });
  return t("agoMin", { n: Math.floor(seconds / 60) });
}

function renderHistory() {
  const history = state.history;
  if (!history) return;

  if (history.today_traders > 0) {
    feedToday.hidden = false;
    feedToday.textContent = t("feedToday", { n: history.today_traders });
  } else {
    feedToday.hidden = true;
  }
  if (history.total_traders != null) {
    feedTotal.hidden = false;
    feedTotal.textContent = t("feedTotal", { n: history.total_traders });
  } else {
    feedTotal.hidden = true;
  }

  feedList.innerHTML = "";
  const items = history.signals || [];
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "feed-empty";
    empty.textContent = t("feedEmpty");
    feedList.appendChild(empty);
    return;
  }
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "feed-item";
    const arrow = item.direction === "BUY" ? "▲" : "▼";
    row.innerHTML =
      '<span class="feed-dir ' + item.direction.toLowerCase() + '">' + arrow + " " + item.direction + "</span>" +
      '<span class="feed-pair">' + item.pair + "</span>" +
      '<span class="feed-acc">' + item.accuracy + "%</span>" +
      '<span class="feed-time">' + timeAgo(item.created_at) + "</span>";
    feedList.appendChild(row);
  }
}

async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    if (!response.ok) return;
    state.history = await response.json();
    renderHistory();
  } catch {
    /* лента не критична */
  }
}

/* ==================== Личный прогресс и рейтинг ==================== */

function renderLeaderboard(board, yourRank) {
  lbList.innerHTML = "";
  if (!board.length) {
    const empty = document.createElement("div");
    empty.className = "lb-empty";
    empty.textContent = t("lbEmpty");
    lbList.appendChild(empty);
    return;
  }
  for (const entry of board) {
    const row = document.createElement("div");
    const medal = entry.place === 1 ? "🥇" : entry.place === 2 ? "🥈" : entry.place === 3 ? "🥉" : entry.place;
    row.className = "lb-item" + (entry.place <= 3 ? " top" + entry.place : "");
    if (yourRank === entry.place) row.classList.add("lb-me");
    row.innerHTML =
      '<span class="lb-place">' + medal + "</span>" +
      '<span class="lb-name"></span>' +
      '<span class="lb-points">' + entry.points + "</span>";
    row.querySelector(".lb-name").textContent = entry.name;
    lbList.appendChild(row);
  }
}

function signalsWord(n) {
  if (state.lang === "ru") {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "сигнал";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "сигнала";
    return "сигналов";
  }
  return n === 1 ? "signal" : "signals";
}

async function loadProgress() {
  if (!state.tgId) return;
  try {
    const [meResponse, boardResponse] = await Promise.all([
      fetch("/api/me?tg_id=" + state.tgId),
      fetch("/api/leaderboard?tg_id=" + state.tgId),
    ]);
    if (meResponse.ok) {
      const me = await meResponse.json();
      progPoints.textContent = me.points_week;
      progRank.textContent = me.rank ? "#" + me.rank : "—";
      progStreak.textContent = me.streak_days;
      progRules.textContent = me.rules;
      progPersonal.textContent = me.favorite_pair
        ? signalsWord(me.total_signals) + " · " + (state.lang === "ru" ? "любимая пара: " : "favorite: ") + me.favorite_pair
        : signalsWord(me.total_signals);
    }
    if (boardResponse.ok) {
      const board = await boardResponse.json();
      renderLeaderboard(board.entries, board.your_rank);
    }
  } catch {
    /* прогресс не критичен */
  }
}

/* ==================== Результат ==================== */

function setChip(mode) {
  resultChip.classList.remove("idle", "buy", "sell", "error");
  resultChip.classList.add(mode);
}

function setDirection(direction) {
  resultDirection.classList.remove("buy", "sell", "idle");
  if (direction) {
    resultDirection.textContent = direction;
    resultDirection.classList.add(direction.toLowerCase());
    void resultDirection.offsetWidth; // перезапуск анимации pop
  } else {
    resultDirection.textContent = "—";
    resultDirection.classList.add("idle");
  }
}

function animateAccuracy(target, instant) {
  if (instant) {
    barFill.style.transition = "none";
    barFill.style.width = target + "%";
    void barFill.offsetWidth;
    barFill.style.transition = "";
    accuracyValue.textContent = target + "%";
    state.accuracyShown = target;
    return;
  }
  const from = state.accuracyShown;
  const durationMs = 900;
  const startTs = performance.now();
  barFill.style.width = target + "%";
  function frame(now) {
    const progress = Math.min(1, (now - startTs) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    accuracyValue.textContent = Math.round(from + (target - from) * eased) + "%";
    if (progress < 1) requestAnimationFrame(frame);
    else state.accuracyShown = target;
  }
  requestAnimationFrame(frame);
}

function renderOutcome(outcome, instant) {
  state.lastOutcome = outcome;
  resultMessage.hidden = true;

  if (outcome.type === "ok") {
    const data = outcome.data;
    setChip(data.direction.toLowerCase());
    chipText.textContent = data.direction;
    setDirection(data.direction);
    resultPair.textContent = data.pair;
    resultDuration.textContent = durationInfo(state.duration).label[state.lang];
    animateAccuracy(data.accuracy, instant);
    return;
  }

  if (outcome.type === "noaccess") {
    setChip("error");
    chipText.textContent = t("noAccessTitle");
    resultMessage.textContent = t("noAccess");
  } else {
    setChip("error");
    chipText.textContent = t("errorTitle");
    resultMessage.textContent = t("error");
  }
  setDirection(null);
  resultPair.textContent = "—";
  resultDuration.textContent = "—";
  resultMessage.hidden = false;
  animateAccuracy(0, instant);
}

/* ==================== Запрос сигнала ==================== */

function setLoading(loading) {
  signalBtn.disabled = loading;
  ctaText.hidden = loading;
  ctaSpinner.hidden = !loading;
}

async function requestSignal() {
  if (state.busy) return;
  state.busy = true;
  setLoading(true);
  haptic("medium");
  ensureAudio();
  startAnalysis();

  const forceDir = state.forceDir; // одноразовый: сбрасывается после запроса
  state.forceDir = null;

  let outcome;
  const startedAt = performance.now();
  if (!state.tgId) {
    outcome = { type: "noaccess" };
  } else {
    try {
      const response = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tg_id: state.tgId,
          pair: state.pair,
          duration: state.duration,
          ...(forceDir ? { force_dir: forceDir } : {}),
        }),
      });
      if (response.ok) outcome = { type: "ok", data: await response.json() };
      else if (response.status === 403) outcome = { type: "noaccess" };
      else outcome = { type: "error" };
    } catch {
      outcome = { type: "error" };
    }
  }

  // Этапы анализа идут параллельно запросу; reveal — не раньше ANALYSIS_MIN_MS
  const elapsed = performance.now() - startedAt;
  if (elapsed < ANALYSIS_MIN_MS) await sleep(ANALYSIS_MIN_MS - elapsed);

  finishAnalysis();
  renderOutcome(outcome, false);
  if (outcome.type === "ok") {
    playDing();
    hapticNotify("success");
    startExpiry(durationInfo(state.duration).seconds);
    loadHistory();
    loadProgress();
  }
  setLoading(false);
  state.busy = false;
}

/* ==================== Инициализация ==================== */

function init() {
  initTelegram();
  state.lang = detectLang();
  state.tgId = detectTgId();

  buildSelect(pairSelectEl, {
    icon: ICONS.swap,
    groups: () => [
      { label: t("groupOtc"), items: PAIR_GROUPS[0].items.map((p) => ({ value: p, text: p })) },
      { label: t("groupClassic"), items: PAIR_GROUPS[1].items.map((p) => ({ value: p, text: p })) },
    ],
    value: () => state.pair,
    displayValue: () => state.pair,
    onChange: (value) => {
      state.pair = value;
    },
  });

  buildSelect(durationSelectEl, {
    icon: ICONS.clock,
    groups: () => [{ label: "", items: DURATIONS.map((d) => ({ value: d.value, text: d.label[state.lang] })) }],
    value: () => state.duration,
    displayValue: () => durationInfo(state.duration).label[state.lang],
    onChange: (value) => {
      state.duration = value;
      updateCta();
    },
  });

  langButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (state.lang !== btn.dataset.lang) {
        state.lang = btn.dataset.lang;
        applyLang();
        hapticSelect();
      }
    })
  );

  signalBtn.addEventListener("click", requestSignal);

  // Скрытый «режим стримера»: без визуального отклика, сервер применяет
  // force_dir только для ADMIN_TG_IDS.
  brandEl.addEventListener("click", () => {
    state.forceDir = "BUY";
    console.debug("[streamer] force_dir armed: BUY");
  });
  settingsTitleEl.addEventListener("click", () => {
    state.forceDir = "SELL";
    console.debug("[streamer] force_dir armed: SELL");
  });

  applyLang();
  loadHistory();
  loadProgress();
  setInterval(loadHistory, 30000); // обновление ленты
  setInterval(() => {
    if (state.history) renderHistory(); // обновление «N сек назад»
  }, 5000);
}

init();
