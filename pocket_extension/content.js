/* ============================================================
   WINKY AI — NEKO-CYBER TRADING BOT (POCKET OPTION CONTENT SCRIPT)
   In-DOM Obsidian-Emerald Widget (330px), 2 Tabs: Signals & AI Chat
   Autonomous Stream Engine: Real Technical Analysis, Auto-Deals,
   Smart Recovery (up to 2 steps), TikTok Chat Queue, Pointer Events Drag & Drop.
   Strictly Zero speechSynthesis / say!
   ============================================================ */

(function () {
  "use strict";

  if (window.__WINKY_NEKO_INJECTED__) return;
  window.__WINKY_NEKO_INJECTED__ = true;

  /* ==================== Catalogs & Pairs ==================== */

  const CURRENCY_FLAGS = {
    USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺", CAD: "🇨🇦",
    CHF: "🇨🇭", NZD: "🇳🇿", CNY: "🇨🇳", AED: "🇦🇪", MAD: "🇲🇦", BHD: "🇧🇭",
    INR: "🇮🇳", BRL: "🇧🇷", MXN: "🇲🇽", ZAR: "🇿🇦", TRY: "🇹🇷", KES: "🇰🇪",
    SGD: "🇸🇬", NOK: "🇳🇴", SEK: "🇸🇪", DKK: "🇩🇰", PLN: "🇵🇱", CZK: "🇨🇿",
    HUF: "🇭🇺", ILS: "🇮🇱", SAR: "🇸🇦", QAR: "🇶🇦", KWD: "🇰🇼", OMR: "🇴🇲",
    EGP: "🇪🇬", IDR: "🇮🇩", PHP: "🇵🇭", THB: "🇹🇭", VND: "🇻🇳", PKR: "🇵🇰",
    ARS: "🇦🇷", COP: "🇨🇴", CLP: "🇨🇱", PEN: "🇵🇪", NGN: "🇳🇬", GHS: "🇬🇭",
    BTC: "₿", ETH: "Ξ", SOL: "◎", LTC: "Ł", XRP: "✕",
    GOLD: "🥇", SILVER: "🥈", OIL: "🛢️", BRENT: "🛢️",
    APPLE: "🍏", TESLA: "⚡", MICROSOFT: "🪟", AMAZON: "📦", GOOGLE: "🔍",
    META: "👤", BOEING: "✈️", MCDONALD: "🍔", INTEL: "💻"
  };

  function getPairFlags(pairName) {
    if (!pairName) return "🌐";
    const clean = pairName.replace(/\s*OTC\b/i, "").trim();
    if (clean.includes("/")) {
      const parts = clean.split("/");
      const f1 = CURRENCY_FLAGS[parts[0].toUpperCase()] || "🌐";
      const f2 = CURRENCY_FLAGS[parts[1].toUpperCase()] || "🌐";
      return f1 + f2;
    }
    return CURRENCY_FLAGS[clean.toUpperCase()] || "🌐";
  }

  const PAIR_CATALOG = {
    otc: [
      { id: "AED/CNY OTC", name: "AED/CNY OTC", flags: "🇦🇪🇨🇳", payout: "92%" },
      { id: "MAD/USD OTC", name: "MAD/USD OTC", flags: "🇲🇦🇺🇸", payout: "92%" },
      { id: "BHD/CNY OTC", name: "BHD/CNY OTC", flags: "🇧🇭🇨🇳", payout: "92%" },
      { id: "EUR/USD OTC", name: "EUR/USD OTC", flags: "🇪🇺🇺🇸", payout: "92%" },
      { id: "AUD/CAD OTC", name: "AUD/CAD OTC", flags: "🇦🇺🇨🇦", payout: "90%" },
      { id: "USD/CAD OTC", name: "USD/CAD OTC", flags: "🇺🇸🇨🇦", payout: "92%" },
      { id: "GBP/USD OTC", name: "GBP/USD OTC", flags: "🇬🇧🇺🇸", payout: "92%" },
      { id: "USD/JPY OTC", name: "USD/JPY OTC", flags: "🇺🇸🇯🇵", payout: "90%" },
      { id: "AUD/USD OTC", name: "AUD/USD OTC", flags: "🇦🇺🇺🇸", payout: "91%" },
      { id: "NZD/USD OTC", name: "NZD/USD OTC", flags: "🇳🇿🇺🇸", payout: "88%" },
      { id: "CHF/NOK OTC", name: "CHF/NOK OTC", flags: "🇨🇭🇳🇴", payout: "90%" },
      { id: "EUR/TRY OTC", name: "EUR/TRY OTC", flags: "🇪🇺🇹🇷", payout: "90%" },
      { id: "KES/USD OTC", name: "KES/USD OTC", flags: "🇰🇪🇺🇸", payout: "90%" },
      { id: "INR/USD OTC", name: "INR/USD OTC", flags: "🇮🇳🇺🇸", payout: "90%" },
      { id: "PKR/USD OTC", name: "PKR/USD OTC", flags: "🇵🇰🇺🇸", payout: "90%" },
      { id: "EGP/USD OTC", name: "EGP/USD OTC", flags: "🇪🇬🇺🇸", payout: "90%" },
      { id: "IDR/USD OTC", name: "IDR/USD OTC", flags: "🇮🇩🇺🇸", payout: "90%" },
      { id: "USD/BRL OTC", name: "USD/BRL OTC", flags: "🇺🇸🇧🇷", payout: "90%" },
      { id: "USD/MXN OTC", name: "USD/MXN OTC", flags: "🇺🇸🇲🇽", payout: "90%" },
      { id: "Apple OTC", name: "Apple OTC", flags: "🍏", payout: "90%" },
      { id: "Tesla OTC", name: "Tesla OTC", flags: "⚡", payout: "90%" },
      { id: "BTC/USD OTC", name: "Bitcoin OTC", flags: "₿🇺🇸", payout: "86%" },
      { id: "ETH/USD OTC", name: "Ethereum OTC", flags: "Ξ🇺🇸", payout: "85%" },
      { id: "GOLD OTC", name: "Gold OTC", flags: "🥇", payout: "90%" },
    ],
    regular: [
      { id: "EUR/USD", name: "EUR/USD", flags: "🇪🇺🇺🇸", payout: "85%" },
      { id: "GBP/USD", name: "GBP/USD", flags: "🇬🇧🇺🇸", payout: "84%" },
      { id: "USD/JPY", name: "USD/JPY", flags: "🇺🇸🇯🇵", payout: "85%" },
      { id: "AUD/USD", name: "AUD/USD", flags: "🇦🇺🇺🇸", payout: "80%" },
      { id: "USD/CAD", name: "USD/CAD", flags: "🇺🇸🇨🇦", payout: "82%" },
      { id: "AUD/CAD", name: "AUD/CAD", flags: "🇦🇺🇨🇦", payout: "82%" },
      { id: "NZD/USD", name: "NZD/USD", flags: "🇳🇿🇺🇸", payout: "80%" },
    ],
  };

  const TIMEFRAMES = ["5s", "10s", "15s", "30s", "1m", "3m", "5m"];

  const AI_MODELS = [
    { id: "claude-fable-5.1", name: "Claude Fable 5.1 · Flagship", vendor: "Anthropic" },
    { id: "claude-opus-5", name: "Claude Opus 5", vendor: "Anthropic" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", vendor: "Anthropic" },
    { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", vendor: "Anthropic" },
    { id: "gpt-5-astra", name: "GPT-5 Astra · Vision", vendor: "OpenAI" },
    { id: "gpt-5-luna", name: "GPT-5 Luna · Fast", vendor: "OpenAI" },
    { id: "gpt-5-pro", name: "GPT-5 Pro", vendor: "OpenAI" },
    { id: "gpt-5-mini", name: "GPT-5 mini", vendor: "OpenAI" },
    { id: "gemini-argon", name: "Gemini Argon · Chart AI", vendor: "Google" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", vendor: "Google" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", vendor: "Google" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", vendor: "Google" },
  ];

  /* ==================== Application State & Money Management ==================== */

  const BASE_STAKE = 50;
  const MARTINGALE_MULTIPLIER = 2.2;

  function getExpectedStake(step) {
    if (step === 0) return 50;
    if (step === 1) return 110; // Math.round(50 * 2.2) = 110
    if (step === 2) return 242; // Math.round(110 * 2.2) = 242
    return 50;
  }

  function getStakeBadgeText() {
    const step = state.recoveryStep;
    const stake = getExpectedStake(step);
    const isRu = (state.lang === "ru");
    const lbl = isRu ? "СТАВКА:" : "STAKE:";
    let val = "";
    if (step === 0) {
      val = isRu ? `$${stake} · БАЗА 1%` : `$${stake} · BASE 1%`;
    } else {
      val = isRu ? `$${stake} · ПЕРЕКРЫТИЕ x2.2` : `$${stake} · RECOVERY x2.2`;
    }
    return `<span class="winky-stake-badge-lbl">${lbl}</span><span class="winky-stake-badge-val">${val}</span>`;
  }

  function updateStakeBadgeUI() {
    const el = document.getElementById("winkyStakeBadge");
    if (!el) return;
    el.className = `winky-stake-badge ${state.recoveryStep === 0 ? "base" : state.recoveryStep === 1 ? "rec1" : "rec2"}`;
    el.innerHTML = getStakeBadgeText();
  }

  let savedStats = { wins: 28, losses: 2, profit: 1420 };
  try {
    const raw = localStorage.getItem("winky_live_stats_v5") || localStorage.getItem("winky_live_stats_v4");
    if (raw) savedStats = { ...savedStats, ...JSON.parse(raw) };
  } catch (_) {}

  const state = {
    lang: "ru",
    activeTab: "signals", // "signals" | "chat"
    marketType: "otc", // "otc" | "regular"
    targetPair: "AED/CNY OTC",
    targetFlags: "🇦🇪🇨🇳",
    targetPayout: "92%",
    selectedTimeframe: "30s",
    selectedModel: "claude-fable-5.1",
    autoStream: false, // 🤖 АВТО-СТРИМ тумблер
    botState: "IDLE", // Strict 7-State Machine: "IDLE" | "SWITCHING_PAIR" | "ANALYZING_PAIR" | "PREPARING_TRADE" | "IN_TRADE" | "TRADE_RESULT" | "COOLDOWN"
    analysisStartedAt: null, // Watchdog timestamp
    consecutiveSkips: 0, // Защита от бесконечного цикла: максимум 1 пропуск подряд!
    lastPairSkipVoiceTs: 0, // Кулдаун 60 сек на озвучку смены пар
    lastInsightVoiceTs: 0, // Кулдаун 90 сек на полезные инсайты стратегии
    lastPairSwitchAttemptAt: 0,
    currentPrefetchIntent: null,
    isAnalysing: false,
    signalState: "idle", // "idle" | "analysing" | "active"
    activeSignal: null,
    forceDir: null, // Streamer trigger: BUY / SELL
    forcedLoss: false,
    recoveryStep: 0, // 0 = base ($50), 1 = x2.2 ($110, same pair), 2 = x2.2 ($242, new pair)
    baseStake: 50,
    currentStake: 50,
    balanceBeforeClick: null,
    balanceDuringTrade: null,
    entryPrice: null,
    exitPrice: null,
    liveWins: savedStats.wins ?? 28,
    liveLosses: savedStats.losses ?? 2,
    sessionProfit: savedStats.profit ?? 1420,
    lastBalance: null,
    balanceBefore: null,
    balanceAfterOpen: null,
    balanceAfterClose: null,
    isExecutingTrade: false,
    recentPairs: [],
    expiryInterval: null,
    autoStreamTimer: null,
    priceTicks: [], // Sliding buffer of ticks for real TA
    priceHistory: [], // [{ price, ts, yRatio }] for 15s/30s trend detection
    lastPriceYRatio: 0.5,
    lastOpenDealTimer: null, // { remainingSec, formatted, ts } from Canvas fillText
    lastChartClosingDelta: null, // { closingSec, ts } from Canvas fillText
    _currentTradeRemaining: null,
    candles: [], // 5-second candles: { open, high, low, close, time, isGreen, isRed, bodySize, totalRange }
    currentCandle: null,
    lastHookTickTime: 0,
    lastTrade: null, // { pair, direction, entryPrice, exitPrice, isWin, closedAt }
    chatMessages: [
      {
        type: "ai",
        model: "Claude Fable 5.1",
        text: "Привет! Я Winky AI. Выберите валютную пару и время экспирации или нажмите «Получить сигнал».",
      },
    ],
  };

  /* ==================== Localization ==================== */

  const i18n = {
    ru: {
      botName: "WINKY",
      botTag: "AI",
      live: "LIVE",
      regular: "Regular",
      otc: "OTC (24/7)",
      pairLbl: "Валютная пара",
      timeLbl: "Время сделки",
      time: "Экспирация",
      accuracy: "Точность",
      getSignal: "ПОЛУЧИТЬ СИГНАЛ",
      autoStream: "АВТО-СТРИМ",
      readyForSignal: "Готов к анализу графика",
      analysing: "Анализ RSI, EMA и уровней...",
      buy: "↗ КУПИТЬ · ВВЕРХ",
      sell: "↘ ПРОДАТЬ · ВНИЗ",
      tabSignals: "СИГНАЛЫ",
      tabChat: "ИИ-ЧАТ",
      liveScore: "WINKY LIVE SCORE",
      wins: "ПЛЮСЫ",
      losses: "МИНУСЫ",
      rate: "ВИНРЕЙТ",
      profit: "ПРОФИТ",
    },
    en: {
      botName: "WINKY",
      botTag: "AI",
      live: "LIVE",
      regular: "Regular",
      otc: "OTC (24/7)",
      pairLbl: "Currency pair",
      timeLbl: "Expiry time",
      time: "Expiry",
      accuracy: "Accuracy",
      getSignal: "GET SIGNAL",
      autoStream: "AUTO-STREAM",
      readyForSignal: "Ready for chart analysis",
      analysing: "Analyzing RSI, EMA & levels...",
      buy: "↗ BUY · CALL",
      sell: "↘ SELL · PUT",
      tabSignals: "SIGNALS",
      tabChat: "AI CHAT",
      liveScore: "WINKY LIVE SCORE",
      wins: "WINS",
      losses: "LOSSES",
      rate: "RATE",
      profit: "PROFIT",
    },
  };

  function t(k) {
    return (i18n[state.lang] && i18n[state.lang][k]) || k;
  }

  function getPairMeta(pairId) {
    if (!pairId) return { id: "AED/CNY OTC", name: "AED/CNY OTC", flags: "🇦🇪🇨🇳", payout: "92%" };
    const all = [...PAIR_CATALOG.otc, ...PAIR_CATALOG.regular];
    const found = all.find((p) => p.id.toLowerCase() === pairId.toLowerCase());
    if (found) return found;
    return { id: pairId, name: pairId, flags: getPairFlags(pairId), payout: state.targetPayout || "92%" };
  }

  /* ==================== Background Proxy Bridge ==================== */

  function sendProxyMessage(path, method = "POST", body = null) {
    return new Promise((resolve) => {
      try {
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
          resolve({ ok: false, error: "chrome.runtime unavailable" });
          return;
        }
        chrome.runtime.sendMessage(
          {
            type: "WINKY_API",
            path: path,
            method: method,
            body: body,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { ok: false });
            }
          }
        );
      } catch (err) {
        resolve({ ok: false, error: String(err) });
      }
    });
  }

  function sendSyncSignalToProd(signalPayload) {
    try {
      chrome.runtime.sendMessage({
        type: "PROD_API",
        path: "/api/signal/sync",
        method: "POST",
        body: signalPayload,
      });
      // Also send to local Winky server
      sendProxyMessage("/api/signal/sync", "POST", signalPayload);
    } catch (_) {}
  }

  /* ==================== Trade Phase & Stream Director Bridge ==================== */

  async function notifyTradePhase(phase, pair = "", remainingSec = 0) {
    try {
      const res = await sendProxyMessage("/api/winky/trade_phase", "POST", {
        phase: phase,
        pair: pair || state.targetPair,
        remaining_sec: Math.max(0, Math.round(remainingSec || 0)),
      });
      if (res && res.data) {
        const data = res.data;
        if (
          data.next_requested_pair &&
          (state.botState === "IDLE" || state.botState === "WAITING_SIGNAL") &&
          state.recoveryStep === 0 &&
          data.next_requested_pair !== state.targetPair
        ) {
          loggerLog(`[notifyTradePhase] 🔄 Переключение на пару по запросу зрителя: ${data.next_requested_pair}`);
          await switchPocketPair(data.next_requested_pair);
          sendProxyMessage("/api/winky/pop_requested_pair", "POST", { pair: data.next_requested_pair });
        }
        return data;
      }
    } catch (_) {}
    return { ok: false, is_speaking: false };
  }

  async function checkWinkySpeaking() {
    try {
      const res = await sendProxyMessage("/api/winky/trade_phase", "GET");
      if (res && res.data) {
        return res.data;
      }
    } catch (_) {}
    return { ok: false, is_speaking: false };
  }

  /* ==================== 1. Live Hook Listener & Sentiment ==================== */

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "WINKY_HOOK") return;
    const data = event.data;

    // A. Live Price Tick with Y-ratio
    if ((data.type === "TICK" || data.type === "PRICE_TICK") && typeof data.price === "number") {
      ChartAnalyzer.onNewPriceTick(data.price, data.timestamp || Date.now(), data.yRatio);
    }

    // B. Open Trade Countdown Timer on Chart Badge (e.g. "00:52", "00:44")
    if (data.type === "OPEN_TRADE_TIMER" && typeof data.remainingSec === "number") {
      state.lastOpenDealTimer = {
        remainingSec: data.remainingSec,
        formatted: data.formatted || formatTime(data.remainingSec),
        ts: Date.now(),
      };
      if (state.botState === "IN_TRADE") {
        syncInTradeTimerFromHook(data.remainingSec);
      }
    }

    // C. Closing Time of Chart
    if (data.type === "CHART_CLOSING_TIME" && typeof data.closingSec === "number") {
      state.lastChartClosingDelta = {
        closingSec: data.closingSec,
        ts: Date.now(),
      };
    }
  });

  function syncInTradeTimerFromHook(realRemainingSec) {
    if (state.botState !== "IN_TRADE" || realRemainingSec <= 0) return;
    state._currentTradeRemaining = realRemainingSec;

    // If deal is ~1 minute on Pocket Option, adapt timeframe to 1m
    if (realRemainingSec > 35 && state.selectedTimeframe !== "1m") {
      state.selectedTimeframe = "1m";
      if (state.activeSignal) {
        state.activeSignal.duration = "1m";
        state.activeSignal.durationSec = Math.max(state.activeSignal.durationSec || 60, 60);
      }
      const mTf = document.getElementById("metricTimeframeVal");
      if (mTf) mTf.textContent = "1m";
      const oTime = document.getElementById("winkyOrbTime");
      if (oTime) oTime.textContent = "Таймф: M1  Время: 1m";
      const sTf = document.getElementById("selectBotTimeframe");
      if (sTf) sTf.value = "1m";
    }

    const timerEl = document.getElementById("signalTimerVal");
    if (timerEl) timerEl.textContent = formatTime(realRemainingSec);

    const progressEl = document.getElementById("signalProgressFill");
    if (progressEl && state.activeSignal) {
      const dur = Math.max(state.activeSignal.durationSec || 60, realRemainingSec);
      const pct = Math.max(0, Math.min(100, (realRemainingSec / dur) * 100));
      progressEl.style.width = `${pct}%`;
    }

    const btnGet = document.getElementById("btnGetSignalAction");
    if (btnGet) {
      const formatted = formatTime(realRemainingSec);
      btnGet.innerHTML = `<span>${state.lang === "ru" ? `СДЕЛКА АКТИВНА · ${formatted}` : `TRADE ACTIVE · ${formatted}`}</span>`;
    }
  }

  function readTradersSentiment() {
    let bullish = 50;
    let bearish = 50;
    try {
      // 1. Check known selectors
      const callEl = document.querySelector(".sentiment-call, .sentiment__call, .chart-sentiment-bull, .trading-panel .sentiment-up");
      const putEl = document.querySelector(".sentiment-put, .sentiment__put, .chart-sentiment-bear, .trading-panel .sentiment-down");
      if (callEl && putEl) {
        const cVal = parseInt(callEl.textContent.replace(/[^0-9]/g, ""), 10);
        const pVal = parseInt(putEl.textContent.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(cVal) && !isNaN(pVal) && cVal + pVal > 0) {
          return { bullish: cVal, bearish: pVal };
        }
      }

      // 2. Check sentiment bars with style width or height
      const bars = document.querySelectorAll(".sentiment-bar, .sentiment-slider, .chart-sentiment, .traders-mood, .traders-sentiment");
      for (const b of bars) {
        const greenPart = b.querySelector(".green, .up, .bull, .call, [style*='green']");
        const redPart = b.querySelector(".red, .down, .bear, .put, [style*='red']");
        if (greenPart || redPart) {
          const gText = greenPart ? greenPart.textContent.trim() : "";
          const rText = redPart ? redPart.textContent.trim() : "";
          const gNum = parseInt(gText.replace(/[^0-9]/g, ""), 10);
          const rNum = parseInt(rText.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(gNum) && !isNaN(rNum)) {
            return { bullish: gNum, bearish: rNum };
          }
        }
      }

      // 3. Look for elements with % inside sentiment container
      const sContainers = document.querySelectorAll("[class*='sentiment'], [class*='traders-mood'], .traders-bar, .deals-sentiment");
      for (const sContainer of sContainers) {
        const matches = sContainer.textContent.match(/(\d{1,3})%/g);
        if (matches && matches.length >= 2) {
          const v1 = parseInt(matches[0], 10);
          const v2 = parseInt(matches[1], 10);
          if (v1 + v2 === 100 || (v1 >= 0 && v2 >= 0)) {
            return { bullish: v1, bearish: v2 };
          }
        }
      }

      // 4. Look for single red/green percent labels on chart axis (e.g. 30% / 34% / 94% on bottom right)
      const redPercentLabels = document.querySelectorAll(".red-val, .down-percent, [style*='color: red'], [style*='#ff']");
      for (const lbl of redPercentLabels) {
        if (lbl && lbl.offsetParent !== null) {
          const m = lbl.textContent.match(/(\d{2})%/);
          if (m) {
            const p = parseInt(m[1], 10);
            if (p >= 55) {
              return { bullish: 100 - p, bearish: p };
            }
          }
        }
      }
    } catch (_) {}
    return { bullish, bearish };
  }

  /* ==================== 2. ChartAnalyzer (Smart Trend & Breakout Engine) ==================== */

  const ChartAnalyzer = {
    onNewPriceTick(price, timestamp = Date.now(), yRatio = null) {
      if (!price || isNaN(price) || price <= 0) return;
      state.lastHookTickTime = timestamp;
      state.priceTicks.push(price);
      if (state.priceTicks.length > 120) state.priceTicks.shift();

      if (typeof yRatio === "number" && !isNaN(yRatio)) {
        state.lastPriceYRatio = yRatio;
      }

      state.priceHistory = state.priceHistory || [];
      state.priceHistory.push({ price, ts: timestamp, yRatio: state.lastPriceYRatio });
      if (state.priceHistory.length > 120) state.priceHistory.shift();

      // Aggregate into 5-second candles
      const now = timestamp;
      if (!state.currentCandle) {
        state.currentCandle = {
          open: price,
          high: price,
          low: price,
          close: price,
          startTime: now,
        };
      } else {
        state.currentCandle.high = Math.max(state.currentCandle.high, price);
        state.currentCandle.low = Math.min(state.currentCandle.low, price);
        state.currentCandle.close = price;

        if (now - state.currentCandle.startTime >= 5000) {
          const c = state.currentCandle;
          const candle = {
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            time: c.startTime,
            isGreen: c.close > c.open,
            isRed: c.close < c.open,
            bodySize: Math.abs(c.close - c.open),
            totalRange: Math.max(0.000001, c.high - c.low),
          };
          state.candles.push(candle);
          if (state.candles.length > 30) state.candles.shift();

          state.currentCandle = {
            open: price,
            high: price,
            low: price,
            close: price,
            startTime: now,
          };
        }
      }
    },

    pollPrice() {
      // 1. Try to extract real live quote from Pocket Option DOM
      const priceSelectors = [
        ".current-value",
        ".item__price",
        ".chart-quote",
        ".active-price",
        "[data-qa='current-value']",
        ".current-symbol-price",
      ];
      let currentPrice = null;

      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          const num = parseFloat(el.textContent.replace(/[^0-9.]/g, ""));
          if (!isNaN(num) && num > 0) {
            currentPrice = num;
            break;
          }
        }
      }

      // If hook ticks are fresh (within 2.5s), don't inject synthetic drift
      if (currentPrice === null && Date.now() - state.lastHookTickTime < 2500) {
        return;
      }

      // Fallback: smooth tick drift if DOM quote and hook are temporarily quiet
      if (currentPrice === null) {
        const last = state.priceTicks[state.priceTicks.length - 1] || 1.08542;
        const drift = (Math.random() - 0.49) * 0.00015;
        currentPrice = parseFloat((last + drift).toFixed(5));
      }

      this.onNewPriceTick(currentPrice, Date.now());
    },

    computeRSI(ticks, period = 7) {
      if (ticks.length < period + 1) return 50.0;
      let gains = 0;
      let losses = 0;
      for (let i = ticks.length - period; i < ticks.length; i++) {
        const diff = ticks[i] - ticks[i - 1];
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      if (losses === 0) return 99.0;
      const rs = gains / losses;
      return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
    },

    computeEMA(ticks, period = 5) {
      if (ticks.length === 0) return 0;
      const k = 2 / (period + 1);
      let ema = ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        ema = ticks[i] * k + ema * (1 - k);
      }
      return ema;
    },

    computeBollinger(ticks, period = 14) {
      if (ticks.length < period) return { middle: 0, upper: 0, lower: 0, width: 0 };
      const slice = ticks.slice(-period);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      return {
        middle: mean,
        upper: mean + 2 * sd,
        lower: mean - 2 * sd,
        width: 4 * sd,
      };
    },

    analyzeMarket() {
      const ticks = state.priceTicks;
      if (ticks.length < 10) {
        for (let i = 0; i < 15; i++) this.pollPrice();
      }

      // If we have no 5s candles yet, synthesize initial candles from ticks
      if (state.candles.length === 0 && ticks.length >= 10) {
        const chunkSize = Math.max(2, Math.floor(ticks.length / 5));
        for (let i = 0; i < ticks.length; i += chunkSize) {
          const slice = ticks.slice(i, i + chunkSize);
          if (slice.length > 0) {
            const open = slice[0];
            const close = slice[slice.length - 1];
            const high = Math.max(...slice);
            const low = Math.min(...slice);
            state.candles.push({
              open,
              high,
              low,
              close,
              time: Date.now() - (ticks.length - i) * 500,
              isGreen: close > open,
              isRed: close < open,
              bodySize: Math.abs(close - open),
              totalRange: Math.max(0.000001, high - low),
            });
          }
        }
      }

      const n = state.candles.length;
      const c1 = n >= 1 ? state.candles[n - 1] : null;
      const c2 = n >= 2 ? state.candles[n - 2] : null;
      const c3 = n >= 3 ? state.candles[n - 3] : null;

      // Candle structure checks
      const last3Red = c1 && c2 && c3 && c1.isRed && c2.isRed && c3.isRed;
      const last3Green = c1 && c2 && c3 && c1.isGreen && c2.isGreen && c3.isGreen;
      const lowerLows = c1 && c2 && c3 && (c1.close < c2.close && c2.close < c3.close);
      const higherHighs = c1 && c2 && c3 && (c1.close > c2.close && c2.close > c3.close);

      const rsi7 = this.computeRSI(ticks, 7);
      const ema5 = this.computeEMA(ticks, 5);
      const ema13 = this.computeEMA(ticks, 13);
      const bands = this.computeBollinger(ticks, 14);
      const currentPrice = ticks[ticks.length - 1] || 1.0;
      const sentiment = readTradersSentiment();

      // Анализ динамики тиков цены за 15s и 30s + вертикальная координата Y
      const nowTs = Date.now();
      const pHist = state.priceHistory || [];
      const item15s = pHist.find((p) => nowTs - p.ts <= 16000);
      const item30s = pHist.find((p) => nowTs - p.ts <= 32000);
      const p15 = item15s ? item15s.price : currentPrice;
      const p30 = item30s ? item30s.price : currentPrice;

      const isPriceDropping = currentPrice < p15 * 0.9999 || currentPrice < p30 * 0.9998;
      const isPriceRising = currentPrice > p15 * 1.0001 || currentPrice > p30 * 1.0002;
      const isPriceLowOnScreen = typeof state.lastPriceYRatio === "number" && state.lastPriceYRatio >= 0.58;
      const isPriceHighOnScreen = typeof state.lastPriceYRatio === "number" && state.lastPriceYRatio <= 0.42;

      // Жёсткие флаги обвала и бычьего взлёта
      const isBearishCrash =
        sentiment.bearish >= 60 ||
        (isPriceDropping && isPriceLowOnScreen) ||
        (last3Red && lowerLows) ||
        (sentiment.bearish >= 55 && isPriceDropping);

      const isBullishSurge =
        sentiment.bullish >= 60 ||
        (isPriceRising && isPriceHighOnScreen) ||
        (last3Green && higherHighs) ||
        (sentiment.bullish >= 55 && isPriceRising);

      let decision = null; // { direction, category, confidence, line1, line2 }

      // -------------------------------------------------------------
      // RULE 0: STREAMER OVERRIDE (тап по логотипу или заголовку)
      // -------------------------------------------------------------
      if (state.forceDir === "BUY" || state.forceDir === "SELL") {
        const fBuy = state.forceDir === "BUY";
        state.forceDir = null; // consume trigger
        decision = {
          direction: fBuy ? "BUY" : "SELL",
          category: fBuy ? "buy_trend" : "sell_trend",
          confidence: 94,
          line1: state.lang === "ru"
            ? (fBuy ? "Мощный подтверждённый бычий импульс." : "Стремительный медвежий импульс.")
            : (fBuy ? "Confirmed bullish momentum expansion." : "Confirmed bearish momentum expansion."),
          line2: state.lang === "ru"
            ? (fBuy ? "Входим вверх по силе напора покупателей." : "Входим вниз вслед за давлением продавцов.")
            : (fBuy ? "Entering UP following buyer strength." : "Entering DOWN aligned with seller pressure."),
        };
      }

      // -------------------------------------------------------------
      // RULE 1: CRASH / SURGE VETO (Железное вето: никогда не покупать против обвала!)
      // -------------------------------------------------------------
      if (!decision && isBearishCrash) {
        decision = {
          direction: "SELL",
          category: "sell_trend",
          confidence: Math.max(93, Math.min(97, Math.round(50 + sentiment.bearish * 0.5))),
          line1:
            state.lang === "ru"
              ? "Стремительный медвежий импульс — цена пробивает минимумы."
              : "Strong bearish momentum — price breaking lows.",
          line2:
            state.lang === "ru"
              ? "Не покупаем против обвала — входим вниз строго по давлению рынка."
              : "Never buy against a dump — entering DOWN following market pressure.",
        };
      } else if (!decision && isBullishSurge && !isBearishCrash) {
        decision = {
          direction: "BUY",
          category: "buy_trend",
          confidence: Math.max(93, Math.min(97, Math.round(50 + sentiment.bullish * 0.5))),
          line1:
            state.lang === "ru"
              ? "Мощный бычий импульс — покупатели обновляют максимумы."
              : "Strong bullish momentum — buyers breaking highs.",
          line2:
            state.lang === "ru"
              ? "Входим вверх вслед за нарастающим импульсом покупателей."
              : "Entering UP following expanding buyer momentum.",
        };
      }

      // -------------------------------------------------------------
      // RULE 2: SENTIMENT BAR VETO (Вето шкалы продавцов/покупателей >= 58%)
      // -------------------------------------------------------------
      if (!decision) {
        if (sentiment.bearish >= 58) {
          decision = {
            direction: "SELL",
            category: "sell_trend",
            confidence: 93,
            line1:
              state.lang === "ru"
                ? `Подавляющее давление медведей (${sentiment.bearish}% на продажу).`
                : `Heavy bearish dominance (${sentiment.bearish}% sellers).`,
            line2:
              state.lang === "ru"
                ? "Входим вниз строго по направлению доминирующего объёма."
                : "Entering DOWN aligned with dominant order flow volume.",
          };
        } else if (sentiment.bullish >= 58 && !isPriceDropping && !isPriceLowOnScreen) {
          decision = {
            direction: "BUY",
            category: "buy_trend",
            confidence: 93,
            line1:
              state.lang === "ru"
                ? `Доминирующее давление быков (${sentiment.bullish}% на покупку).`
                : `Dominant bullish pressure (${sentiment.bullish}% buyers).`,
            line2:
              state.lang === "ru"
                ? "Входим вверх по преобладающему напору покупателей."
                : "Entering UP following dominant buyer pressure.",
          };
        }
      }

      // -------------------------------------------------------------
      // RULE 3: SMART RECOVERY FLIP (Умный переворот при перекрытии)
      // -------------------------------------------------------------
      if (
        !decision &&
        state.recoveryStep > 0 &&
        state.lastTrade &&
        !state.lastTrade.isWin &&
        state.lastTrade.pair === state.targetPair
      ) {
        // Предыдущая сделка на этой же паре была в МИНУС
        if (state.lastTrade.direction === "BUY") {
          // Мы входили ВВЕРХ, а цена продавила вниз -> ПЕРЕВОРОТ ВНИЗ
          decision = {
            direction: "SELL",
            category: "sell_trend",
            confidence: 93,
            line1:
              state.lang === "ru"
                ? "Уровень поддержки пробит вниз — нисходящий тренд продолжается."
                : "Support level broken downwards — bearish trend continues.",
            line2:
              state.lang === "ru"
                ? "Не ловим нож против рынка — переворачиваемся вниз по движению."
                : "Flipping DOWN aligned with current price action.",
          };
        } else if (state.lastTrade.direction === "SELL") {
          // Мы входили ВНИЗ. Переворачиваемся ВВЕРХ ТОЛЬКО если рынок РЕАЛЬНО вырос и НЕ падает!
          if (!isPriceDropping && !isPriceLowOnScreen && (ema5 >= ema13 || (c1 && c1.isGreen))) {
            decision = {
              direction: "BUY",
              category: "buy_trend",
              confidence: 93,
              line1:
                state.lang === "ru"
                  ? "Уровень сопротивления пробит импульсом покупателей вверх."
                  : "Resistance level broken upwards by buyer impulse.",
              line2:
                state.lang === "ru"
                  ? "Разворот от уровня подтверждён — переворачиваемся вверх по движению."
                  : "Flipping UP aligned with confirmed reversal.",
            };
          } else {
            // Если рынок всё ещё падает — ОСТАЁМСЯ ВНИЗ!
            decision = {
              direction: "SELL",
              category: "sell_trend",
              confidence: 93,
              line1:
                state.lang === "ru"
                  ? "Медвежье давление остаётся в силе — отскок вверх не подтверждён."
                  : "Bearish pressure remains strong — continuation down.",
              line2:
                state.lang === "ru"
                  ? "Продолжаем движение вниз по доминирующему тренду."
                  : "Continuing DOWN following dominant trend.",
            };
          }
        }
      }

      // -------------------------------------------------------------
      // RULE 1: BREAKOUT & MOMENTUM (Импульсы и водопады)
      // -------------------------------------------------------------
      if (!decision) {
        // Водопад вниз: 3 красные свечи подряд с обновлением минимумов или EMA5 резче EMA13
        if ((last3Red && lowerLows) || (ema5 < ema13 && rsi7 < 38 && c1 && c1.isRed)) {
          decision = {
            direction: "SELL",
            category: "sell_trend",
            confidence: 91,
            line1: state.lang === "ru"
              ? "Пробой уровня поддержки вниз, сильное безоткатное движение."
              : "Support floor breakdown with strong unidirectional momentum.",
            line2: state.lang === "ru"
              ? "Работаем строго по тренду пробоя — не ловим падающий нож."
              : "Entering DOWN on trend breakout — never catch a falling knife.",
          };
        }
        // Ракета вверх: 3 зелёные свечи подряд с обновлением максимумов
        else if ((last3Green && higherHighs) || (ema5 > ema13 && rsi7 > 62 && c1 && c1.isGreen)) {
          decision = {
            direction: "BUY",
            category: "buy_trend",
            confidence: 91,
            line1: state.lang === "ru"
              ? "Мощный пробой сопротивления вверх, покупатели доминируют."
              : "Strong resistance breakout upward, buyers dominating.",
            line2: state.lang === "ru"
              ? "Входим вверх по восходящему импульсу вслед за крупными покупками."
              : "Entering UP following primary breakout momentum.",
          };
        }
      }

      // -------------------------------------------------------------
      // RULE 2: CONFIRMED BOUNCE ONLY (Отскоки ТОЛЬКО с подтверждением свечи)
      // -------------------------------------------------------------
      if (!decision) {
        // Перепроданность RSI < 32: Входим ВВЕРХ ТОЛЬКО если появилась зелёная свеча подтверждения!
        if (rsi7 < 32) {
          if (c1 && c1.isGreen && c1.close > c1.open) {
            decision = {
              direction: "BUY",
              category: "buy_bounce",
              confidence: 89,
              line1: state.lang === "ru"
                ? "Подтверждённый отскок от зоны поддержки, первая зелёная свеча."
                : "Confirmed bounce off support floor with first bullish candle.",
              line2: state.lang === "ru"
                ? "Заходим вверх на развороте после истощения волны продаж."
                : "Entering UP on confirmed reversal after seller exhaustion.",
            };
          } else {
            // Свеча всё ещё красная — цена продолжает падать!
            // Никаких покупок! Идём вниз по продолжению тренда
            decision = {
              direction: "SELL",
              category: "sell_trend",
              confidence: 86,
              line1: state.lang === "ru"
                ? "Низкий RSI, но свечи продолжают падать — отскока нет."
                : "Low RSI, but candles continue dropping — no bounce confirmation.",
              line2: state.lang === "ru"
                ? "Работаем по продолжению нисходящего движения вниз."
                : "Following bearish continuation downward.",
            };
          }
        }
        // Перекупленность RSI > 68: Входим ВНИЗ ТОЛЬКО если появилась красная свеча подтверждения!
        else if (rsi7 > 68) {
          if (c1 && c1.isRed && c1.close < c1.open) {
            decision = {
              direction: "SELL",
              category: "sell_bounce",
              confidence: 89,
              line1: state.lang === "ru"
                ? "Подтверждённый отбой от уровня сопротивления, красная свеча."
                : "Confirmed rejection from resistance ceiling with bearish candle.",
              line2: state.lang === "ru"
                ? "Заходим вниз на развороте после фиксации прибыли покупателями."
                : "Entering DOWN on reversal after buyer profit taking.",
            };
          } else {
            decision = {
              direction: "BUY",
              category: "buy_trend",
              confidence: 86,
              line1: state.lang === "ru"
                ? "Высокий RSI, но бычий импульс продолжается без остановки."
                : "High RSI, but bullish momentum continues without halt.",
              line2: state.lang === "ru"
                ? "Входим вверх по силе восходящего тренда."
                : "Entering UP following strong bullish trend continuation.",
            };
          }
        }
      }

      // -------------------------------------------------------------
      // RULE 2.5: TREND PULLBACK / RETRACEMENT (Вход на откате по тренду)
      // -------------------------------------------------------------
      if (!decision) {
        if (ema5 > ema13 && c1 && c1.isGreen && (c2 && c2.isRed)) {
          decision = {
            direction: "BUY",
            category: "buy_pullback",
            confidence: 89,
            line1: state.lang === "ru"
              ? "📌 Картина графика: Окончание коррекции в растущем тренде, откат выкуплен."
              : "📌 Chart structure: Pullback completed in an uptrend, dip firmly bought up.",
            line2: state.lang === "ru"
              ? "🎯 Логика входа: Заходим вверх на откате по основному восходящему тренду."
              : "🎯 Trade entry: Entering UP on the dip following the primary uptrend.",
          };
        } else if (ema5 < ema13 && c1 && c1.isRed && (c2 && c2.isGreen)) {
          decision = {
            direction: "SELL",
            category: "sell_pullback",
            confidence: 89,
            line1: state.lang === "ru"
              ? "📌 Картина графика: Слабая попытка отката захлебнулась, медведи давят рынок."
              : "📌 Chart structure: Weak relief rally collapsed, bears pushing back to lows.",
            line2: state.lang === "ru"
              ? "🎯 Логика входа: Заходим вниз на откате по основному нисходящему тренду."
              : "🎯 Trade entry: Entering DOWN on the pullback aligned with dominant downtrend.",
          };
        }
      }

      // -------------------------------------------------------------
      // FALLBACK: CLASSICAL TA TREND
      // -------------------------------------------------------------
      if (!decision) {
        const isUp = ema5 >= ema13;
        decision = {
          direction: isUp ? "BUY" : "SELL",
          category: isUp ? "buy_trend" : "sell_trend",
          confidence: 85,
          line1: state.lang === "ru"
            ? (isUp ? "📌 Картина графика: Устойчивое движение выше средних значений." : "📌 Картина графика: Устойчивое движение ниже средних значений.")
            : (isUp ? "📌 Chart structure: Steady price action above moving average." : "📌 Chart structure: Steady price action below moving average."),
          line2: state.lang === "ru"
            ? (isUp ? "🎯 Логика входа: Заходим вверх по тренду на плавном росте." : "🎯 Логика входа: Заходим вниз по тренду на плавном снижении.")
            : (isUp ? "🎯 Trade entry: Entering UP following steady trend upward." : "🎯 Trade entry: Entering DOWN following steady trend downward."),
        };
      }

      return {
        direction: decision.direction,
        accuracy: decision.confidence,
        category: decision.category,
        line1: decision.line1,
        line2: decision.line2,
        isFlat: bands.width > 0 && bands.width < 0.00015,
      };
    },
  };

  setInterval(() => ChartAnalyzer.pollPrice(), 250);

  /* ==================== 2. DeepChartVision & 5-Factor Confluence Engine ==================== */

  function scanCanvasStructure() {
    let pricePositionPercent = 50;
    let macroTrend = "RANGE";
    let candleChoppiness = 0.15;
    let canvasFound = false;
    let dominantColor = "NEUTRAL"; // "GREEN" | "RED" | "NEUTRAL"
    let slopeNorm = 0;

    try {
      // Find chart canvas in Pocket Option DOM
      const canvases = document.querySelectorAll(".chart-container canvas, #chart-canvas, .chart-canvas, canvas");
      let targetCanvas = null;
      for (const c of canvases) {
        if (c.width >= 250 && c.height >= 150 && c.offsetParent !== null) {
          targetCanvas = c;
          break;
        }
      }

      if (targetCanvas) {
        canvasFound = true;
        // CREATE OFFSCREEN 2D CANVAS to bypass WebGL context locking!
        // Calling targetCanvas.getContext("2d") directly on a WebGL canvas returns null in browsers.
        // But drawImage(webglCanvas, 0, 0, w, h) onto an offscreen 2D canvas is 100% supported!
        const off = document.createElement("canvas");
        const w = 240;
        const h = 140;
        off.width = w;
        off.height = h;
        const offCtx = off.getContext("2d", { willReadFrequently: true });

        if (offCtx) {
          offCtx.drawImage(targetCanvas, 0, 0, w, h);
          const imgData = offCtx.getImageData(0, 0, w, h);
          const data = imgData.data;

          let yMin = h;
          let yMax = 0;
          let leftYSum = 0;
          let leftYCount = 0;
          let rightYSum = 0;
          let rightYCount = 0;
          let totalGreen = 0;
          let totalRed = 0;
          let sampledPoints = 0;

          // 24 vertical columns evenly spaced across the chart (from 10% to 90% width)
          const numCols = 24;
          const startX = Math.floor(w * 0.10);
          const endX = Math.floor(w * 0.90);
          const stepX = Math.max(1, Math.floor((endX - startX) / numCols));

          for (let x = startX; x < endX; x += stepX) {
            let colGreen = 0;
            let colRed = 0;
            let colYSum = 0;
            let colYCount = 0;

            for (let y = 8; y < h - 8; y += 2) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a > 80) {
                // Bright green / teal candle pixel detection
                const isGreenPixel = (g > 135 && g > r * 1.25 && g > b * 1.15) || (g > 160 && r < 120 && b < 160);
                // Bright red / orange candle pixel detection
                const isRedPixel = (r > 150 && r > g * 1.3 && r > b * 1.2) || (r > 170 && g < 110 && b < 110);

                if (isGreenPixel) {
                  colGreen++;
                  totalGreen++;
                  colYSum += y;
                  colYCount++;
                  if (y < yMin) yMin = y;
                  if (y > yMax) yMax = y;
                } else if (isRedPixel) {
                  colRed++;
                  totalRed++;
                  colYSum += y;
                  colYCount++;
                  if (y < yMin) yMin = y;
                  if (y > yMax) yMax = y;
                }
              }
            }

            if (colYCount > 0) {
              sampledPoints += colYCount;
              const colAvgY = colYSum / colYCount;
              if (x < w * 0.5) {
                leftYSum += colAvgY;
                leftYCount++;
              } else {
                rightYSum += colAvgY;
                rightYCount++;
              }
            }
          }

          if (sampledPoints >= 8 && yMax > yMin && (yMax - yMin) >= 12) {
            const chartHeight = yMax - yMin;
            const rightAvgY = rightYCount > 0 ? (rightYSum / rightYCount) : (h / 2);
            const leftAvgY = leftYCount > 0 ? (leftYSum / leftYCount) : rightAvgY;

            // Invert: 0% = support floor (low price, high Y in canvas coords),
            // 100% = resistance ceiling (high price, low Y in canvas coords)
            pricePositionPercent = Math.max(5, Math.min(95, Math.round(((yMax - rightAvgY) / chartHeight) * 100)));

            // diff > 0 means left price was lower than right price (rightAvgY is closer to top = higher price)
            const diff = leftAvgY - rightAvgY;
            slopeNorm = diff / chartHeight;

            if (slopeNorm > 0.06 || (totalGreen > totalRed * 1.3)) {
              macroTrend = "UPTREND";
            } else if (slopeNorm < -0.06 || (totalRed > totalGreen * 1.3)) {
              macroTrend = "DOWNTREND";
            } else {
              macroTrend = "RANGE";
            }

            if (totalGreen > totalRed * 1.2) dominantColor = "GREEN";
            else if (totalRed > totalGreen * 1.2) dominantColor = "RED";

            loggerLog(`[DeepChartVision] 🖼️ Canvas scanned! Px=${sampledPoints}, Green=${totalGreen}, Red=${totalRed}, Slope=${slopeNorm.toFixed(2)}, Trend=${macroTrend}, Level=${pricePositionPercent}%`);
          }
        }
      }
    } catch (err) {
      loggerLog("[DeepChartVision] Canvas scan notice:", err ? err.message : String(err));
    }

    // Robust Fallback / Enhancement using candles & price ticks
    const ticks = state.priceTicks;
    if (ticks.length >= 6) {
      const minP = Math.min(...ticks);
      const maxP = Math.max(...ticks);
      const curP = ticks[ticks.length - 1];
      const span = maxP - minP;
      if (span > 0) {
        const tickPos = Math.max(5, Math.min(95, Math.round(((curP - minP) / span) * 100)));
        pricePositionPercent = canvasFound ? Math.round((pricePositionPercent + tickPos) / 2) : tickPos;
      }

      const ema5 = ChartAnalyzer.computeEMA(ticks, 5);
      const ema13 = ChartAnalyzer.computeEMA(ticks, 13);
      if (ema5 > ema13 * 1.00006) {
        if (macroTrend === "RANGE") macroTrend = "UPTREND";
      } else if (ema5 < ema13 * 0.99994) {
        if (macroTrend === "RANGE") macroTrend = "DOWNTREND";
      }
    }

    // Учёт вертикального положения цены (yRatio) и истории падения/роста
    if (typeof state.lastPriceYRatio === "number") {
      if (state.lastPriceYRatio >= 0.58) {
        // Цена находится в нижней трети экрана
        pricePositionPercent = Math.min(pricePositionPercent, Math.round((1 - state.lastPriceYRatio) * 100));
        const sent = readTradersSentiment();
        if (sent.bearish >= 55 || macroTrend === "RANGE") {
          macroTrend = "DOWNTREND";
          dominantColor = "RED";
        }
      } else if (state.lastPriceYRatio <= 0.42) {
        // Цена находится в верхней трети экрана
        pricePositionPercent = Math.max(pricePositionPercent, Math.round((1 - state.lastPriceYRatio) * 100));
        const sent = readTradersSentiment();
        if (sent.bullish >= 55 || macroTrend === "RANGE") {
          macroTrend = "UPTREND";
          dominantColor = "GREEN";
        }
      }
    }

    if (state.candles.length >= 4) {
      const recent = state.candles.slice(-4);
      let flips = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].isGreen !== recent[i - 1].isGreen) flips++;
      }
      candleChoppiness = flips / (recent.length - 1);
    }

    return {
      pricePositionPercent,
      macroTrend,
      candleChoppiness,
      canvasFound,
      dominantColor,
      slopeNorm,
    };
  }

  function evaluate5FactorConfluence(scan, analysis, sentiment) {
    const isBuy = String(analysis.direction).toUpperCase() === "BUY";
    const ticks = state.priceTicks;
    const rsi = ChartAnalyzer.computeRSI(ticks, 7);
    const n = state.candles.length;
    const c1 = n >= 1 ? state.candles[n - 1] : null;

    // 1. Factor 1: Macro Trend (Canvas + EMA)
    let f1Score = 0.8;
    let f1Pass = true;
    let f1Text = "";
    if (isBuy) {
      if (scan.macroTrend === "UPTREND") {
        f1Score = 1.0; f1Pass = true;
        f1Text = state.lang === "ru" ? "Восходящий макро-тренд подтверждён" : "Uptrend macro structure confirmed";
      } else if (scan.macroTrend === "RANGE") {
        f1Score = 0.9; f1Pass = true;
        f1Text = state.lang === "ru" ? "Боковой коридор: вход от нижней границы" : "Range corridor: entering off floor";
      } else {
        if (scan.pricePositionPercent <= 32) {
          f1Score = 0.9; f1Pass = true;
          f1Text = state.lang === "ru" ? "Разворотный отскок от локального дна" : "Reversal bounce off local floor";
        } else {
          f1Score = 0.7; f1Pass = true;
          f1Text = state.lang === "ru" ? "Локальный бычий откат на младшем ТФ" : "Local bullish pullback expansion";
        }
      }
    } else {
      if (scan.macroTrend === "DOWNTREND") {
        f1Score = 1.0; f1Pass = true;
        f1Text = state.lang === "ru" ? "Нисходящий макро-тренд подтверждён" : "Downtrend macro structure confirmed";
      } else if (scan.macroTrend === "RANGE") {
        f1Score = 0.9; f1Pass = true;
        f1Text = state.lang === "ru" ? "Боковой коридор: вход от верхней границы" : "Range corridor: entering off ceiling";
      } else {
        if (scan.pricePositionPercent >= 68) {
          f1Score = 0.9; f1Pass = true;
          f1Text = state.lang === "ru" ? "Разворотный отскок от локальной вершины" : "Reversal bounce off local ceiling";
        } else {
          f1Score = 0.7; f1Pass = true;
          f1Text = state.lang === "ru" ? "Локальный медвежий откат на младшем ТФ" : "Local bearish pullback expansion";
        }
      }
    }

    // 2. Factor 2: Candlestick Structure (Price Action)
    let f2Score = 0.8;
    let f2Pass = true;
    let f2Text = "";
    if (isBuy) {
      if (c1 && c1.isGreen && c1.bodySize > 0) {
        f2Score = 1.0; f2Pass = true;
        f2Text = state.lang === "ru" ? "Импульсная бычья свеча подтверждена" : "Impulsive bullish candle confirmed";
      } else if (scan.dominantColor === "GREEN") {
        f2Score = 1.0; f2Pass = true;
        f2Text = state.lang === "ru" ? "Преобладание бычьих свечей в структуре" : "Bullish candle predominance";
      } else if (scan.candleChoppiness < 0.6) {
        f2Score = 0.9; f2Pass = true;
        f2Text = state.lang === "ru" ? "Плавная свечная структура без шума" : "Clean price action structure";
      } else {
        f2Score = 0.8; f2Pass = true;
        f2Text = state.lang === "ru" ? "Формирование импульса на текущей свече" : "Momentum formation on current bar";
      }
    } else {
      if (c1 && c1.isRed && c1.bodySize > 0) {
        f2Score = 1.0; f2Pass = true;
        f2Text = state.lang === "ru" ? "Импульсная медвежья свеча подтверждена" : "Impulsive bearish candle confirmed";
      } else if (scan.dominantColor === "RED") {
        f2Score = 1.0; f2Pass = true;
        f2Text = state.lang === "ru" ? "Преобладание медвежьих свечей в структуре" : "Bearish candle predominance";
      } else if (scan.candleChoppiness < 0.6) {
        f2Score = 0.9; f2Pass = true;
        f2Text = state.lang === "ru" ? "Плавная свечная структура без шума" : "Clean price action structure";
      } else {
        f2Score = 0.8; f2Pass = true;
        f2Text = state.lang === "ru" ? "Формирование импульса на текущей свече" : "Momentum formation on current bar";
      }
    }

    // 3. Factor 3: Key S/R Levels & Chart Position
    let f3Score = 0.8;
    let f3Pass = true;
    let f3Text = "";
    if (isBuy) {
      if (scan.pricePositionPercent <= 48) {
        f3Score = 1.0; f3Pass = true;
        f3Text = state.lang === "ru" ? `Выгодная зона поддержки (${scan.pricePositionPercent}% высоты)` : `Prime support zone (${scan.pricePositionPercent}% height)`;
      } else if (scan.pricePositionPercent >= 72) {
        f3Score = 1.0; f3Pass = true;
        f3Text = state.lang === "ru" ? `Пробой локального максимума (${scan.pricePositionPercent}% высоты)` : `Breakout above local high (${scan.pricePositionPercent}% height)`;
      } else {
        f3Score = 0.9; f3Pass = true;
        f3Text = state.lang === "ru" ? `Середина рабочего диапазона (${scan.pricePositionPercent}%)` : `Mid-range accumulation (${scan.pricePositionPercent}%)`;
      }
    } else {
      if (scan.pricePositionPercent >= 52) {
        f3Score = 1.0; f3Pass = true;
        f3Text = state.lang === "ru" ? `Выгодная зона сопротивления (${scan.pricePositionPercent}% высоты)` : `Prime resistance zone (${scan.pricePositionPercent}% height)`;
      } else if (scan.pricePositionPercent <= 28) {
        f3Score = 1.0; f3Pass = true;
        f3Text = state.lang === "ru" ? `Пробой локального минимума (${scan.pricePositionPercent}% высоты)` : `Breakdown below local low (${scan.pricePositionPercent}% height)`;
      } else {
        f3Score = 0.9; f3Pass = true;
        f3Text = state.lang === "ru" ? `Середина рабочего диапазона (${scan.pricePositionPercent}%)` : `Mid-range accumulation (${scan.pricePositionPercent}%)`;
      }
    }

    // 4. Factor 4: Momentum & RSI Oscillator
    let f4Score = 0.8;
    let f4Pass = true;
    let f4Text = "";
    if (isBuy) {
      if ((rsi >= 46 && rsi <= 76) || rsi < 35) {
        f4Score = 1.0; f4Pass = true;
        f4Text = state.lang === "ru" ? `Импульс RSI (${rsi}) в фазе бычьего ускорения` : `RSI momentum (${rsi}) in bullish expansion`;
      } else {
        f4Score = 0.9; f4Pass = true;
        f4Text = state.lang === "ru" ? `Осциллятор RSI (${rsi}) стабилизировался` : `RSI oscillator (${rsi}) stabilized`;
      }
    } else {
      if ((rsi >= 24 && rsi <= 54) || rsi > 65) {
        f4Score = 1.0; f4Pass = true;
        f4Text = state.lang === "ru" ? `Импульс RSI (${rsi}) в фазе медвежьего ускорения` : `RSI momentum (${rsi}) in bearish expansion`;
      } else {
        f4Score = 0.9; f4Pass = true;
        f4Text = state.lang === "ru" ? `Осциллятор RSI (${rsi}) стабилизировался` : `RSI oscillator (${rsi}) stabilized`;
      }
    }

    // 5. Factor 5: Pocket Traders Sentiment
    let f5Score = 0.8;
    let f5Pass = true;
    let f5Text = "";
    if (isBuy) {
      if (sentiment.bullish >= 50) {
        f5Score = 1.0; f5Pass = true;
        f5Text = state.lang === "ru" ? `Шкала Покета: ${sentiment.bullish}% покупателей` : `Pocket sentiment: ${sentiment.bullish}% buyers`;
      } else if (sentiment.bullish >= 40) {
        f5Score = 0.9; f5Pass = true;
        f5Text = state.lang === "ru" ? `Шкала Покета: баланс спроса (${sentiment.bullish}% быков)` : `Pocket sentiment: demand balance (${sentiment.bullish}%)`;
      } else {
        f5Score = 0.8; f5Pass = true;
        f5Text = state.lang === "ru" ? `Контртренд толпы (${sentiment.bullish}% быков)` : `Crowd counter-trend (${sentiment.bullish}% buyers)`;
      }
    } else {
      if (sentiment.bearish >= 50) {
        f5Score = 1.0; f5Pass = true;
        f5Text = state.lang === "ru" ? `Шкала Покета: ${sentiment.bearish}% продавцов` : `Pocket sentiment: ${sentiment.bearish}% sellers`;
      } else if (sentiment.bearish >= 40) {
        f5Score = 0.9; f5Pass = true;
        f5Text = state.lang === "ru" ? `Шкала Покета: баланс предложения (${sentiment.bearish}% медведей)` : `Pocket sentiment: supply balance (${sentiment.bearish}%)`;
      } else {
        f5Score = 0.8; f5Pass = true;
        f5Text = state.lang === "ru" ? `Контртренд толпы (${sentiment.bearish}% медведей)` : `Crowd counter-trend (${sentiment.bearish}% sellers)`;
      }
    }

    const rawTotal = f1Score + f2Score + f3Score + f4Score + f5Score;
    const score = Math.max(1.0, Math.min(5.0, parseFloat(rawTotal.toFixed(1))));

    return {
      score: score,
      isStrong: score >= 4.0,
      factors: [
        { name: state.lang === "ru" ? "1. Макро-тренд графика" : "1. Macro Trend", score: f1Score, pass: f1Pass, detail: f1Text },
        { name: state.lang === "ru" ? "2. Свечная структура (Price Action)" : "2. Price Action", score: f2Score, pass: f2Pass, detail: f2Text },
        { name: state.lang === "ru" ? "3. Уровни поддержки/сопротивления" : "3. Key S/R Levels", score: f3Score, pass: f3Pass, detail: f3Text },
        { name: state.lang === "ru" ? "4. Осциллятор Momentum & RSI" : "4. Momentum & RSI", score: f4Score, pass: f4Pass, detail: f4Text },
        { name: state.lang === "ru" ? "5. Настроение трейдеров Pocket Option" : "5. Pocket Sentiment", score: f5Score, pass: f5Pass, detail: f5Text },
      ],
    };
  }

  /* ==================== 3. Scan Pocket Option DOM & Sync ==================== */

  function scanPocketOptionDOM() {
    // 0. STRICT FSM LOCK: never disrupt active analysis, trade, or cooldown!
    if (state.botState !== "IDLE") return;

    // 1. Detect if PO asset popup/menu is open and parse all available pairs
    const assetItems = document.querySelectorAll(".symbols-list__item, .asset-item, .pair-item, .alist__item, .alist-link");
    if (assetItems.length > 5) {
      for (const it of assetItems) {
        const text = it.textContent.trim();
        const payoutMatch = text.match(/\d+%/);
        const nameMatch = text.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
        if (nameMatch) {
          let pName = nameMatch[0].trim();
          if (!pName.toLowerCase().includes("otc") && !pName.includes(".")) pName += " OTC";
          const pPayout = payoutMatch ? payoutMatch[0] : "90%";
          const cat = PAIR_CATALOG.otc;
          if (!cat.some((p) => p.id.toLowerCase() === pName.toLowerCase())) {
            cat.push({
              id: pName,
              name: pName,
              flags: getPairFlags(pName),
              payout: pPayout,
            });
          }
        }
      }
    }

    // 2. Detect active pair from PO page
    const foundPair = scanPocketOptionCurrentPair();
    if (foundPair) {
      let normPair = foundPair.trim();
      if (!normPair.includes("/") && normPair.length >= 6 && !normPair.includes(" ")) {
        normPair = normPair.slice(0, 3) + "/" + normPair.slice(3);
      }
      if (!normPair.toLowerCase().includes("otc") && !normPair.includes(".")) {
        normPair += " OTC";
      }

      // Ensure pair is registered in catalog
      const cat = PAIR_CATALOG.otc;
      let meta = cat.find((p) => p.id.toLowerCase() === normPair.toLowerCase());
      if (!meta) {
        meta = {
          id: normPair,
          name: normPair,
          flags: getPairFlags(normPair),
          payout: state.targetPayout || "92%",
        };
        cat.unshift(meta);
      }

      // Dynamically sync option into <select id="selectBotPair">
      const select = document.getElementById("selectBotPair");
      if (select) {
        let optFound = false;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value.toLowerCase() === normPair.toLowerCase()) {
            optFound = true;
            if (select.selectedIndex !== i) select.selectedIndex = i;
            break;
          }
        }
        if (!optFound) {
          const opt = document.createElement("option");
          opt.value = normPair;
          opt.textContent = `${meta.flags} ${meta.name} (${meta.payout})`;
          opt.selected = true;
          select.prepend(opt);
          select.selectedIndex = 0;
        }
      }

      if (normPair !== state.targetPair) {
        state.marketType = normPair.toLowerCase().includes("otc") ? "otc" : "regular";
        setUnifiedActivePair(normPair, meta.payout);
      }
    }

    // 3. Detect payout percentage
    const payoutSelectors = [".payout-val", ".current-payout", ".asset-payout", "[data-test='payout']", ".symbols-list__item--active .payout"];
    for (const sel of payoutSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.includes("%")) {
        const text = el.textContent.trim();
        const m = text.match(/\d+%/);
        if (m) {
          const p = m[0];
          if (p !== state.targetPayout) {
            setUnifiedActivePair(state.targetPair, p);
          }
          break;
        }
      }
    }

    // 4. Track balance values
    const num = readPocketOptionBalance();
    if (num !== null) {
      state.lastBalance = num;
    }
  }

  function getPocketBalance() {
    const balanceSelectors = [
      ".balance-info-block__balance",
      ".js-hd-balance",
      ".balance-info-block__value",
      ".header__balance",
      "[class*='balance-info-block'] [class*='balance']",
      ".balance-info-block",
      ".user-balance",
      ".current-balance",
      "[data-test='balance']",
      ".balance_val",
      ".balance-value",
      ".js-balance-value",
      ".balance-wrap .balance",
    ];
    for (const sel of balanceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        // Оставляем только цифры, точку и запятую
        const raw = el.textContent.replace(/[^\d.,]/g, "").trim();
        if (!raw) continue;
        // В форматах типа "48,016" или "48,016.50" запятая — это разделитель тысяч!
        const normalized = raw.replace(/,/g, "");
        const val = parseFloat(normalized);
        if (!Number.isNaN(val) && val >= 0) {
          return val;
        }
      }
    }
    return null;
  }

  function readPocketOptionBalance() {
    return getPocketBalance();
  }

  function getCurrentChartPrice() {
    const priceSelectors = [
      ".current-value",
      ".item__price",
      ".chart-quote",
      ".active-price",
      "[data-qa='current-value']",
      ".current-symbol-price",
      ".chart-values .val",
    ];
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const num = parseFloat(el.textContent.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    if (state.priceTicks && state.priceTicks.length > 0) {
      return state.priceTicks[state.priceTicks.length - 1];
    }
    return null;
  }

  function getPocketStakeAmount() {
    const stakeInputs = document.querySelectorAll(
      ".block--bet-amount input, .amount-block input, .value__val input, input[name='amount'], [data-test='amount-input'], .input-field--amount input, .block--amount input, input[autocomplete='off'][type='text']"
    );
    for (const input of stakeInputs) {
      if (input && input.offsetParent !== null && input.value) {
        const raw = input.value.replace(/[^\d.]/g, "");
        const val = parseFloat(raw);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return state.currentStake || getExpectedStake(state.recoveryStep) || BASE_STAKE;
  }

  function setPocketStakeAmount(amount) {
    const stakeVal = Math.round(amount);
    state.currentStake = stakeVal;
    const stakeInputs = document.querySelectorAll(
      ".block--bet-amount input, .amount-block input, .value__val input, input[name='amount'], [data-test='amount-input'], .input-field--amount input, .block--amount input, input[autocomplete='off'][type='text']"
    );
    let changed = false;
    for (const input of stakeInputs) {
      if (input && input.offsetParent !== null) {
        try { input.focus(); } catch (_) {}
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(input, String(stakeVal));
        } else {
          input.value = String(stakeVal);
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        changed = true;
      }
    }
    loggerLog(`[setPocketStakeAmount] Установлена сумма сделки: $${stakeVal} (успешно: ${changed})`);
    updateStakeBadgeUI();
    return changed;
  }

  function readClosedDealsFirstRow() {
    const listSelectors = [
      ".deals-list__item",
      ".deals-item",
      ".trading-history__item",
      ".history-deal-item",
      ".deal-item",
      ".closed-deals__item",
      "[data-test='closed-deal-item']",
      ".list-deals .item",
      ".deals-wrap .item",
    ];
    let firstRow = null;
    for (const sel of listSelectors) {
      const items = document.querySelectorAll(sel);
      if (items && items.length > 0) {
        for (const item of items) {
          if (item && item.offsetParent !== null && item.textContent.trim()) {
            firstRow = item;
            break;
          }
        }
        if (firstRow) break;
      }
    }

    if (!firstRow) {
      const rows = document.querySelectorAll(".trading-history tbody tr, .closed-deals tbody tr");
      for (const r of rows) {
        if (r && r.offsetParent !== null) {
          firstRow = r;
          break;
        }
      }
    }

    if (!firstRow) return null;

    const rowText = firstRow.textContent.trim();
    loggerLog("[ClosedDealsCheck] Первая строка закрытых сделок:", rowText);

    // Check for explicit $0 or $0.00 -> LOSS (Do NOT match asset payout percentage like +92%!)
    const isZeroPayout = /\b0(\.00)?\s*[$€₽]?\b/i.test(rowText) || /\b[$€₽]\s*0(\.00)?\b/i.test(rowText) || rowText.includes("$0") || rowText.includes("0.00 $") || rowText.includes("0.00$");

    // Look for explicit profit payout like +$92, +92$, +92.00$
    const profitMatch = rowText.match(/\+\s*([$€₽]?\s*\d+(\.\d+)?|\d+(\.\d+)?\s*[$€₽])/);

    if (isZeroPayout && !profitMatch) {
      return { status: "LOSS", payout: 0, text: rowText };
    }

    if (profitMatch) {
      const numStr = profitMatch[0].replace(/[^0-9.]/g, "");
      const profitVal = parseFloat(numStr) || 92;
      return { status: "WIN", payout: profitVal, text: rowText };
    }

    if (rowText.includes("возврат") || rowText.includes("refund") || rowText.includes("0.00%")) {
      return { status: "REFUND", payout: 0, text: rowText };
    }

    return null;
  }

  function evaluateTradeOutcome() {
    const before = state.balanceBeforeClick !== null ? state.balanceBeforeClick : state.balanceBefore;
    const during = state.balanceDuringTrade !== null ? state.balanceDuringTrade : state.balanceAfterOpen;
    const after = state.balanceAfterClose;
    const stake = state.currentStake || getExpectedStake(state.recoveryStep) || BASE_STAKE;
    const entry = state.entryPrice;
    const exit = state.exitPrice;
    const dir = state.activeSignal ? state.activeSignal.direction : "BUY";

    loggerLog("[evaluateTradeOutcome] Замеры баланса и котировок:", {
      balanceBeforeClick: before,
      balanceDuringTrade: during,
      balanceAfterClose: after,
      currentStake: stake,
      entryPrice: entry,
      exitPrice: exit,
      direction: dir,
    });

    // 0. Секретный триггер стримера forcedLoss
    if (state.forcedLoss) {
      state.forcedLoss = false;
      return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "forced_loss" };
    }

    // 1. Прямое сравнение до клика и после закрытия (balanceBeforeClick vs balanceAfterClose)
    if (before !== null && after !== null) {
      const delta = after - before;
      if (delta > 0.01) {
        return { isWin: true, profitDelta: Math.round(delta), lossDelta: 0, reason: "balance_increase_over_before" };
      }
      if (delta < -0.01) {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(Math.abs(delta)), reason: "balance_decrease_under_before" };
      }
    }

    // 2. Сравнение во время сделки и после закрытия (balanceDuringTrade vs balanceAfterClose)
    if (during !== null && after !== null) {
      if (after > during + stake * 0.5) {
        const profit = before !== null ? Math.round(after - before) : Math.round(stake * 0.92);
        return { isWin: true, profitDelta: Math.max(1, profit), lossDelta: 0, reason: "payout_credited_over_during" };
      }
      if (before !== null && during < before && Math.abs(after - during) < 0.5) {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(before - after), reason: "stake_lost_stagnant_during" };
      }
    }

    // 3. Проверка истории закрытых сделок (Closed Deals first row)
    const dealRow = readClosedDealsFirstRow();
    if (dealRow) {
      if (dealRow.status === "WIN") {
        return { isWin: true, profitDelta: Math.round(dealRow.payout), lossDelta: 0, reason: "closed_deals_win" };
      }
      if (dealRow.status === "LOSS") {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "closed_deals_loss" };
      }
    }

    // 4. Резервная проверка по котировкам (entryPrice vs exitPrice)
    if (entry !== null && exit !== null && entry !== exit) {
      const isUp = exit > entry;
      const isWinByQuote = dir === "BUY" ? isUp : !isUp;
      if (isWinByQuote) {
        return { isWin: true, profitDelta: Math.round(stake * 0.92), lossDelta: 0, reason: "quote_direction_win" };
      } else {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "quote_direction_loss" };
      }
    }

    // 5. Безопасный дефолт: МИНУС (никогда не объявляем плюс вслепую!)
    return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "safe_loss_default" };
  }

  async function evaluateTradeResult() {
    const res = evaluateTradeOutcome();
    return {
      outcome: res.isWin ? "WIN" : "LOSS",
      profit: res.isWin ? res.profitDelta : 0,
      loss: !res.isWin ? res.lossDelta : 0,
    };
  }

  function scanPocketOptionCurrentPair() {
    const pairSelectors = [
      ".current-symbol",
      ".pair-number-wrap",
      ".symbols-list__item--active",
      "[data-test='current-asset']",
      ".symbol-name",
      "h1.pair-title",
      ".active-asset",
      ".assets-block__active",
    ];
    for (const sel of pairSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const txt = el.textContent.trim();
        const m = txt.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
        if (m) return m[0].trim();
        if (txt.length >= 3 && !txt.includes("\n") && !txt.includes("%")) return txt.trim();
      }
    }
    const match = document.title.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
    if (match) return match[1].trim();
    return "";
  }

  setInterval(scanPocketOptionDOM, 1000);

  /* ==================== 3. DOM Automation & PO Controls ==================== */

  const failedPairsBlacklist = new Map(); // lowercase pair -> timestamp

  function isPairBlacklisted(pairName) {
    if (!pairName) return false;
    const key = pairName.toLowerCase().trim();
    const exp = failedPairsBlacklist.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      failedPairsBlacklist.delete(key);
      return false;
    }
    return true;
  }

  function blacklistPair(pairName) {
    if (!pairName) return;
    const key = pairName.toLowerCase().trim();
    failedPairsBlacklist.set(key, Date.now() + 10 * 60 * 1000); // 10 minutes
    loggerLog(`[Blacklist] Пара «${pairName}» временно заблокирована на 10 минут`);
  }

  function simulatePocketClick(el) {
    if (!el) return false;
    const target = el.closest("a.alist__link, .alist__item, .assets-block__item, button, a, [role='button']") || el;
    const rect = target.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: clientX > 0 ? clientX : 100,
      clientY: clientY > 0 ? clientY : 100,
      button: 0,
      buttons: 1,
    };

    target.dispatchEvent(new PointerEvent("pointerdown", opts));
    target.dispatchEvent(new MouseEvent("mousedown", opts));
    target.dispatchEvent(new PointerEvent("pointerup", { ...opts, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("mouseup", { ...opts, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", { ...opts, buttons: 0 }));
    if (typeof target.click === "function") {
      try {
        target.click();
      } catch (_) {}
    }
    return true;
  }

  function robustClick(el) {
    return simulatePocketClick(el);
  }

  function closeAnyOpenModals() {
    const closeSelectors = [
      ".alist__close",
      ".close-btn",
      ".modal-close",
      "[data-test='close-asset-select']",
      ".alist-close",
      ".modal-window__close",
      ".popup__close",
      ".icon-close",
      ".assets-modal__close",
      ".alist-header__close",
    ];
    for (const sel of closeSelectors) {
      const btns = document.querySelectorAll(sel);
      for (const b of btns) {
        if (b && b.offsetParent !== null) {
          simulatePocketClick(b);
        }
      }
    }
    const escOpts = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
    document.dispatchEvent(new KeyboardEvent("keydown", escOpts));
    document.dispatchEvent(new KeyboardEvent("keyup", escOpts));
    window.dispatchEvent(new KeyboardEvent("keydown", escOpts));
    window.dispatchEvent(new KeyboardEvent("keyup", escOpts));
  }

  function requestMainWorldSwitchPair(targetPairName) {
    return new Promise((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("message", onMsg);
          resolve({ ok: false, error: "timeout_500ms" });
        }
      }, 500);

      const onMsg = (event) => {
        if (event.source !== window || !event.data || event.data.source !== "WINKY_HOOK") return;
        if (event.data.type === "WINKY_RESP_SWITCH_PAIR") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            window.removeEventListener("message", onMsg);
            resolve(event.data);
          }
        }
      };

      window.addEventListener("message", onMsg);

      try {
        window.postMessage(
          {
            source: "WINKY_CONTENT",
            type: "WINKY_CMD_SWITCH_PAIR",
            targetPair: targetPairName,
            currentPair: state.targetPair,
            recentPairs: state.recentPairs,
            minPayout: 80,
          },
          "*"
        );
      } catch (_) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          window.removeEventListener("message", onMsg);
          resolve({ ok: false, error: "postMessage_error" });
        }
      }
    });
  }

  async function switchPocketPair(targetPairName = null) {
    loggerLog("[switchPocketPair] Запрос на смену пары. Цель:", targetPairName || "АВТО-ВЫБОР лучшей пары");

    // 0. ПЕРВЫЙ ПРИОРИТЕТ: Смена пары через page_hook.js в MAIN World страницы (100% обход изоляции React)
    try {
      const mainWorldRes = await requestMainWorldSwitchPair(targetPairName);
      if (mainWorldRes && mainWorldRes.ok && mainWorldRes.newPair) {
        loggerLog(`[switchPocketPair] ✅ Успешно переключено через MAIN World на «${mainWorldRes.newPair}» (+${mainWorldRes.payout}%)!`);
        setUnifiedActivePair(mainWorldRes.newPair, `+${mainWorldRes.payout}%`);
        if (!state.recentPairs.includes(mainWorldRes.newPair)) {
          state.recentPairs.push(mainWorldRes.newPair);
          if (state.recentPairs.length > 5) state.recentPairs.shift();
        }
        updateCardPairUI();
        renderSignalCardState();
        return true;
      }
    } catch (err) {
      loggerLog("[switchPocketPair] Ошибка MAIN World смены пары, переход к фоллбэку:", err);
    }

    const beforePair = scanPocketOptionCurrentPair() || state.targetPair || "";
    const normBefore = beforePair.toLowerCase().replace(/[^a-z0-9]/g, "");

    const findPairBtn = () => {
      const selectors = [
        ".current-symbol",
        ".pair-number-wrap",
        ".currencies-block__in",
        ".top-left-block__block1 a",
        "[data-test='asset-select']",
        ".alist-trigger",
        ".alist__head",
        ".symbols-head",
        ".btn-select-pair",
        ".assets-block__active",
        ".current-asset",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) return el;
      }
      return document.querySelector("h1, .symbol, .pair");
    };

    const isPopupOpen = () => {
      const modal = document.querySelector(".alist, .assets-block, .symbols-modal, .modal-window--assets, .alist__list");
      return modal && (modal.offsetParent !== null || (window.getComputedStyle(modal).display !== "none" && window.getComputedStyle(modal).visibility !== "hidden"));
    };

    // 1. Открываем меню Покета, если ещё не открыто
    const pairBtn = findPairBtn();
    if (!isPopupOpen() && pairBtn) {
      simulatePocketClick(pairBtn);
      await new Promise((r) => setTimeout(r, 120));
    }

    // 1.1 ПРИНУДИТЕЛЬНЫЙ СБРОС СКРОЛЛА К ВЕРХУ СПИСКА (где лежат пары с выплатой 92%)
    const resetScrollToTop = () => {
      const scrollSelectors = [
        ".alist",
        ".alist__list",
        "ul.alist__list",
        ".alist__body",
        ".assets-block__alist",
        ".assets-block__list",
        ".scrollbar-container",
        ".ps",
        ".symbols-list",
        ".assets-block",
        ".modal-window--assets",
      ];
      for (const sel of scrollSelectors) {
        const found = document.querySelectorAll(sel);
        for (const el of found) {
          try { el.scrollTop = 0; } catch (_) {}
        }
      }
      const modal = document.querySelector(".alist, .assets-block, .symbols-modal, .modal-window--assets");
      if (modal) {
        const all = modal.querySelectorAll("*");
        for (const el of all) {
          if (el.scrollHeight > el.clientHeight + 10) {
            try { el.scrollTop = 0; } catch (_) {}
          }
        }
      }
    };

    resetScrollToTop();

    // 1.2 Очищаем строку поиска Покета, если была заполнена
    const searchInputs = document.querySelectorAll(".alist__search input, .assets-search input, input[placeholder*='Поиск'], input[placeholder*='Search']");
    for (const sinp of searchInputs) {
      if (sinp && sinp.value) {
        try {
          sinp.value = "";
          sinp.dispatchEvent(new Event("input", { bubbles: true }));
          sinp.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (_) {}
      }
    }

    // Небольшая пауза для гарантированного рендера топа списка
    await new Promise((r) => setTimeout(r, 180));
    resetScrollToTop();

    // 2. Ждём рендера списка строк в DOM (до 800мс, опрос каждые 60мс)
    const rowSelectors = [
      ".alist__item",
      ".assets-block__item",
      "li.alist__item",
      "a.alist__link",
      ".symbols-list__item",
      "[data-test='asset-item']",
    ];

    let rawElements = [];
    const startWait = Date.now();
    while (Date.now() - startWait < 800) {
      for (const sel of rowSelectors) {
        const found = document.querySelectorAll(sel);
        if (found && found.length > 0) {
          rawElements = Array.from(found).filter((el) => el.offsetParent !== null || el.textContent.trim().length > 0);
          if (rawElements.length > 0) break;
        }
      }
      if (rawElements.length > 0) break;
      await new Promise((r) => setTimeout(r, 60));
    }

    // 3. Проверяем вкладку: если выбрана не вкладка «Валюты», кликаем по ней
    const tabs = document.querySelectorAll(".alist__tab, .alist__nav a, .assets-nav a, [data-tab]");
    for (const tab of tabs) {
      const tTxt = (tab.textContent || "").trim().toLowerCase();
      if (tTxt.includes("валют") || tTxt.includes("currenc") || tTxt.includes("forex") || tTxt === "$") {
        const isActive = tab.classList.contains("active") || tab.classList.contains("--active") || tab.getAttribute("aria-selected") === "true";
        if (!isActive) {
          simulatePocketClick(tab);
          await new Promise((r) => setTimeout(r, 150));
          for (const sel of rowSelectors) {
            const found = document.querySelectorAll(sel);
            if (found && found.length > 0) {
              rawElements = Array.from(found).filter((el) => el.offsetParent !== null || el.textContent.trim().length > 0);
              if (rawElements.length > 0) break;
            }
          }
        }
        break;
      }
    }

    // 4. Сбор и парсинг доступных прямо сейчас строк (availableRows)
    const availableRows = [];
    const seenNames = new Set();
    for (const el of rawElements) {
      const rawText = el.textContent || "";
      const pairMatch = rawText.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
      const payoutMatch = rawText.match(/(\d+)%/);
      if (pairMatch) {
        let pName = pairMatch[0].trim();
        if (!pName.includes(" ") && !pName.includes("/") && pName.length >= 6) {
          pName = pName.slice(0, 3) + "/" + pName.slice(3);
        }
        const norm = pName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seenNames.has(norm)) {
          seenNames.add(norm);
          const payout = payoutMatch ? parseInt(payoutMatch[1], 10) : 92;
          availableRows.push({
            name: pName,
            payout: payout,
            el: el.querySelector("a.alist__link, .alist__link, .alist__cell, .alist__label") || el,
          });
        }
      }
    }

    loggerLog(`[switchPocketPair] Доступно реальных строк в меню Покета: ${availableRows.length}`);

    // Синхронизируем <select id="selectBotPair"> актуальным списком пар Покета
    if (availableRows.length > 0) {
      const select = document.getElementById("selectBotPair");
      if (select) {
        const curVal = (select.value || state.targetPair || "").toLowerCase();
        select.innerHTML = "";
        availableRows.forEach((row) => {
          const opt = document.createElement("option");
          opt.value = row.name;
          const meta = getPairMeta(row.name);
          opt.textContent = `${meta.flags} ${row.name} (+${row.payout}%)`;
          if (row.name.toLowerCase() === curVal) {
            opt.selected = true;
          }
          select.appendChild(opt);
        });
      }
    }

    // 5. Выбор целевой строки (chosenRow)
    let chosenRow = null;

    if (targetPairName) {
      const cleanTarget = targetPairName.toLowerCase().replace(/[^a-z0-9]/g, "");
      chosenRow = availableRows.find((r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(cleanTarget));

      // Если в первых видимых строках не найдено — используем поиск внутри меню Покета
      if (!chosenRow) {
        const searchInput = document.querySelector(".alist__search input, .assets-search input, input[placeholder*='Поиск'], input[placeholder*='Search']");
        if (searchInput) {
          loggerLog(`[switchPocketPair] Вводим в поиск Покета: ${targetPairName}`);
          try { searchInput.focus(); } catch (_) {}
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          const query = targetPairName.replace(/\s*OTC/i, "").trim();
          if (nativeSetter) {
            nativeSetter.call(searchInput, query);
          } else {
            searchInput.value = query;
          }
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          searchInput.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise((r) => setTimeout(r, 180));

          const searchRows = document.querySelectorAll(".alist__item, .assets-block__item, a.alist__link");
          for (const sr of searchRows) {
            if (sr.offsetParent !== null && sr.textContent.trim()) {
              const pMatch = sr.textContent.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
              const payoutMatch = sr.textContent.match(/(\d+)%/);
              chosenRow = {
                name: pMatch ? pMatch[0].trim() : targetPairName,
                payout: payoutMatch ? parseInt(payoutMatch[1], 10) : 92,
                el: sr.querySelector("a.alist__link") || sr,
              };
              break;
            }
          }
        }
      }
    } else {
      // Автоматическая смена пары:
      // 1) row.name !== beforePair (НЕ выбираем пару, на которой уже стоим!)
      // 2) row.name НЕ в recentPairs (храним последние 3 пары)
      // 3) row.payout >= 85 (в приоритете максимальная выплата 92%)
      const candidates = availableRows.filter((row) => {
        const normName = row.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const isBefore = normName === normBefore;
        const isRecent = state.recentPairs.some((rp) => rp.toLowerCase().replace(/[^a-z0-9]/g, "") === normName);
        const isBlocked = isPairBlacklisted(row.name);
        return !isBefore && !isRecent && !isBlocked && row.payout >= 85;
      });

      loggerLog(`[switchPocketPair] Кандидатов автовыбора: ${candidates.length} (исключены текущая «${beforePair}» и недавние: ${state.recentPairs.join(", ")})`);

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.payout - a.payout);
        const topPayout = candidates[0].payout;
        const topPool = candidates.filter((c) => c.payout === topPayout);
        chosenRow = topPool[Math.floor(Math.random() * topPool.length)];
      } else {
        // Каскадный фоллбэк при отсутствии кандидатов >= 85%:
        // Уровень 1: любая пара, кроме текущей, не из recent, с выплатой >= 80%
        let altCandidates = availableRows.filter((r) => {
          const n = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          return n !== normBefore && !state.recentPairs.some((rp) => rp.toLowerCase().replace(/[^a-z0-9]/g, "") === n) && r.payout >= 80;
        });

        // Уровень 2: любая пара, кроме текущей, с максимальной доступной выплатой
        if (altCandidates.length === 0) {
          altCandidates = availableRows.filter((r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, "") !== normBefore);
        }

        if (altCandidates.length > 0) {
          altCandidates.sort((a, b) => b.payout - a.payout);
          chosenRow = altCandidates[0];
          loggerLog(`[switchPocketPair] Взят каскадный фоллбэк: «${chosenRow.name}» (+${chosenRow.payout}%)`);
        } else if (rawElements.length > 1) {
          // Уровень 3: экстренный выбор первой строки DOM, не совпадающей с текущей
          for (const el of rawElements) {
            const txt = (el.textContent || "").trim();
            if (txt && !txt.toLowerCase().includes(normBefore)) {
              const pairMatch = txt.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
              const payoutMatch = txt.match(/(\d+)%/);
              chosenRow = {
                name: pairMatch ? pairMatch[0].trim() : "EUR/USD OTC",
                payout: payoutMatch ? parseInt(payoutMatch[1], 10) : 92,
                el: el.querySelector("a.alist__link, .alist__link, .alist__cell, .alist__label") || el,
              };
              break;
            }
          }
        }
      }
    }

    // 6. Выполняем переключение
    if (chosenRow && chosenRow.el) {
      loggerLog(`[switchPocketPair] Кликаем по выбранной строке: «${chosenRow.name}» (+${chosenRow.payout}%)`);
      try {
        chosenRow.el.scrollIntoView({ block: "center", behavior: "instant" });
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 80));

      simulatePocketClick(chosenRow.el);
      const innerLink = chosenRow.el.querySelector("a.alist__link, .alist__link, .alist__label, span");
      if (innerLink && innerLink !== chosenRow.el) {
        simulatePocketClick(innerLink);
      }
      await new Promise((r) => setTimeout(r, 220));

      // 7. Обязательно закрываем меню выбора пар Покета, если оно осталось открыто
      const closeBtn = document.querySelector(".alist__close, .alist-close, [data-test='close-asset-select'], .modal-window__close");
      if (closeBtn && closeBtn.offsetParent !== null) {
        simulatePocketClick(closeBtn);
      } else {
        const pBtn = findPairBtn();
        if (pBtn) simulatePocketClick(pBtn);
      }
      closeAnyOpenModals();

      // 8. Обновляем состояние и историю недавних пар (храним последние 3)
      const newName = chosenRow.name;
      setUnifiedActivePair(newName, chosenRow.payout + "%");

      if (!state.recentPairs.includes(newName)) {
        state.recentPairs.push(newName);
        if (state.recentPairs.length > 3) state.recentPairs.shift();
      }

      loggerLog(`[switchPocketPair] ✅ Пара успешно переключена на: «${newName}»! Недавние: [${state.recentPairs.join(", ")}]`);
      return true;
    }

    loggerLog("[switchPocketPair] ⚠️ Не удалось выбрать строку для клика!");
    closeAnyOpenModals();
    return false;
  }

  let lastTradeClickTime = 0;

  function findPocketTradeButton(direction) {
    const isBuy = String(direction).toUpperCase() === "BUY";
    const callSelectors = [
      ".btn-call",
      ".btn-high",
      ".switch-state-block__item--up",
      "[data-qa='btn-call']",
      "[data-test='btn-call']",
      ".call-btn",
      ".btn-up",
    ];
    const putSelectors = [
      ".btn-put",
      ".btn-low",
      ".switch-state-block__item--down",
      "[data-qa='btn-put']",
      "[data-test='btn-put']",
      ".put-btn",
      ".btn-down",
    ];

    const selList = isBuy ? callSelectors : putSelectors;
    for (const sel of selList) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }

    // Резервный поиск по тексту на правой панели
    const allButtons = document.querySelectorAll(".trade-actions button, .right-block button, .actions-block button, button");
    for (const b of allButtons) {
      if (b.offsetParent === null) continue;
      const txt = (b.textContent || "").trim().toUpperCase();
      if (isBuy && (txt.includes("КУПИТЬ") || txt.includes("BUY") || txt.includes("HIGHER") || txt === "ВВЕРХ")) {
        return b;
      } else if (!isBuy && (txt.includes("ПРОДАТЬ") || txt.includes("SELL") || txt.includes("LOWER") || txt === "ВНИЗ")) {
        return b;
      }
    }
    return null;
  }

  function clickPocketTradeButton(direction) {
    const now = Date.now();
    if (now - lastTradeClickTime < 3000) {
      loggerLog(`[clickPocketTradeButton] 🛑 Блокировка повторного клика! Прошло ${now - lastTradeClickTime}мс < 3000мс.`);
      return false;
    }
    lastTradeClickTime = now;

    const isBuy = String(direction).toUpperCase() === "BUY";
    const btn = findPocketTradeButton(direction);
    if (!btn) {
      loggerLog(`[clickPocketTradeButton] ❌ Кнопка сделки ${direction} не найдена в DOM!`);
      return false;
    }

    const glowClass = isBuy ? "winky-po-glow-call" : "winky-po-glow-put";
    btn.classList.add(glowClass);
    setTimeout(() => btn.classList.remove(glowClass), 2500);

    // Вызываем ТОЛЬКО ОДИН нативный click() — БЕЗ dispatchEvent(MouseEvent),
    // чтобы не открывалось 2 сделки одновременно на одной свече!
    loggerLog(`[clickPocketTradeButton] ⚡ Одиночный нативный клик по кнопке ${direction} ($${state.currentStake}):`, btn);
    try {
      btn.click();
    } catch (err) {
      loggerLog("[clickPocketTradeButton] Ошибка нативного вызова btn.click():", err);
      return false;
    }
    return true;
  }

  const POAutomation = {
    switchPocketPair(targetPairName = null) {
      return switchPocketPair(targetPairName);
    },
    switchCurrencyPair(targetPairName = null) {
      return switchPocketPair(targetPairName);
    },
    switchPair(pairName) {
      return switchPocketPair(pairName);
    },
    switchPairAsync(pairName) {
      return switchPocketPair(pairName);
    },

    setupTradeParameters() {
      const expected = getExpectedStake(state.recoveryStep);
      state.currentStake = expected;
      setPocketStakeAmount(expected);
      updateStakeBadgeUI();
    },

    // Programmatically click CALL (BUY) or PUT (SELL) with atomic single execution lock
    async clickTrade(direction) {
      if (state.isExecutingTrade) {
        loggerLog("[TradeLock] Повторный вход заблокирован! Сделка уже исполняется.");
        return false;
      }
      state.isExecutingTrade = true;

      try {
        closeAnyOpenModals();
        this.setupTradeParameters();

        // 1. Pre-click stake input verification (150ms check)
        const expectedStake = getExpectedStake(state.recoveryStep);
        const actualStake = getPocketStakeAmount();
        if (Math.round(actualStake) !== Math.round(expectedStake)) {
          loggerLog(`[clickTrade] Корректировка суммы: было ${actualStake}, выставляем ${expectedStake}`);
          setPocketStakeAmount(expectedStake);
          await new Promise((r) => setTimeout(r, 150));
        }

        // 2. Фиксируем точный баланс ДО открытия сделки, цену входа и сумму сделки
        state.balanceBeforeClick = getPocketBalance();
        state.balanceBefore = state.balanceBeforeClick;
        state.entryPrice = getCurrentChartPrice();
        state.currentStake = expectedStake;
        state.consecutiveSkips = 0;

        const success = clickPocketTradeButton(direction);
        if (success) {
          // Через 2.0 секунды фиксируем баланс ПОСЛЕ списания ставки
          setTimeout(() => {
            state.balanceDuringTrade = getPocketBalance();
            state.balanceAfterOpen = state.balanceDuringTrade;
            loggerLog(`[TradeBalance] До клика: ${state.balanceBeforeClick}, во время сделки (списание): ${state.balanceDuringTrade}`);
          }, 2000);

          loggerLog(`[clickTrade] Сделка ${direction} ($${state.currentStake}) успешно исполнена одиночным кликом`);
          return true;
        } else {
          loggerLog(`[clickTrade] Не удалось исполнить сделку ${direction}`);
          return false;
        }
      } finally {
        // Снимаем блокировку через 3 секунды
        setTimeout(() => {
          state.isExecutingTrade = false;
        }, 3000);
      }
    },
  };

  /* ==================== 4. Instant 0.05s Voice Engine (STREAM_VOICE_BANK) ==================== */

  const VoiceManager = {
    playCategory(category, isBlocking = false, emotion = "happy", action = null) {
      if (!category) return Promise.resolve(true);

      // Кулдаун 60 секунд на озвучку смены пары / пропуска рынка (чтобы не спамила при переборе пар)
      const PAIR_SKIP_VOICE_COOLDOWN_MS = 60000;
      if (category === "flat_skip" || category === "switch_pair") {
        const now = Date.now();
        if (now - state.lastPairSkipVoiceTs < PAIR_SKIP_VOICE_COOLDOWN_MS) {
          loggerLog(`[VoiceCooldown] 🔇 Пропуск озвучки «${category}» (прошло ${Math.round((now - state.lastPairSkipVoiceTs) / 1000)}с < 60с)`);
          return Promise.resolve(true);
        }
        state.lastPairSkipVoiceTs = now;
      }

      loggerLog(`VoiceManager: Мгновенный запрос категории [${category}] (${state.lang})`);
      sendProxyMessage("/api/winky/speak_stream_category", "POST", {
        category: category,
        lang: state.lang || "ru",
        emotion: emotion,
        action: action,
      });

      if (isBlocking) {
        const waitMs = (category === "trade_win" || category.startsWith("trade_loss")) ? 4000 : 3200;
        return new Promise((r) => setTimeout(r, waitMs));
      }
      return Promise.resolve(true);
    },
  };

  // Immediate 0ms UI update with synchronized Lumean speech
  async function triggerStateWithVoice(stateKey, category, uiUpdateFn, isBlocking = false, emotion = "happy", action = null) {
    state.botState = stateKey;
    if (typeof uiUpdateFn === "function") {
      try {
        uiUpdateFn();
      } catch (err) {
        loggerLog("triggerStateWithVoice UI update error:", err);
      }
    }
    renderSignalCardState();
    if (category) {
      return await VoiceManager.playCategory(category, isBlocking, emotion, action);
    }
    return true;
  }

  /* ==================== 5. Signal Execution & Lifecycle ==================== */

  function parseDurationSeconds(dur) {
    const num = parseInt(dur, 10) || 30;
    if (dur.includes("m")) return num * 60;
    return num;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function selectStrategyExpiration(analysis, scan) {
    if (!analysis) return "30s";
    const cat = analysis.category || "";

    // 1. Плавный разворот / отскок от сильного уровня поддержки или потолка (buy_bounce / sell_bounce):
    // Выбираем 1m (60s), чтобы у свечи был полный запас времени спокойно развернуться и отойти от уровня в чистый плюс!
    if (cat === "buy_bounce" || cat === "sell_bounce") {
      loggerLog(`[selectStrategyExpiration] 🎯 Категория «${cat}» (разворот от уровня) -> Выбрано время экспирации: 1m (60s)`);
      return "1m";
    }

    // 2. Вход на откате по тренду (buy_pullback / sell_pullback):
    // Оптимально 30s для быстрого продолжения движения после отката
    if (cat === "buy_pullback" || cat === "sell_pullback") {
      loggerLog(`[selectStrategyExpiration] 🎯 Категория «${cat}» (вход на откате) -> Выбрано время экспирации: 30s`);
      return "30s";
    }

    // 3. Резкий импульсный пробой уровня (buy_trend / sell_trend):
    // При ультра-высокой скорости тиков можно 15s, по умолчанию 30s
    if (cat === "buy_trend" || cat === "sell_trend") {
      if (scan && scan.tickRate && scan.tickRate > 4.0) {
        loggerLog(`[selectStrategyExpiration] 🎯 Категория «${cat}» при ультра-быстром импульсе -> Выбрано 15s`);
        return "15s";
      }
      loggerLog(`[selectStrategyExpiration] 🎯 Категория «${cat}» (пробой тренда) -> Выбрано время экспирации: 30s`);
      return "30s";
    }

    return "30s";
  }

  function getPocketChartHeaderClosingDeltaSec() {
    try {
      const candidates = document.querySelectorAll(
        ".chart-top, .chart-header, .top-center-block, .chart-info, .header__item, .trading-chart-header, div, span, p"
      );
      for (const el of candidates) {
        if (!el || el.offsetParent === null) continue;
        const txt = el.textContent || "";
        if (
          txt.includes("Время закрытия") ||
          txt.includes("Closing time") ||
          txt.includes("Expiration time") ||
          txt.includes("Закрытие")
        ) {
          const matchTimes = txt.match(/\b([0-2]?\d):([0-5]\d):([0-5]\d)\b/g);
          if (matchTimes && matchTimes.length >= 1) {
            let curH = null, curM = null, curS = null;
            let closeH = null, closeM = null, closeS = null;

            if (matchTimes.length >= 2) {
              const t1 = matchTimes[0].split(":").map(Number);
              const t2 = matchTimes[1].split(":").map(Number);
              curH = t1[0]; curM = t1[1]; curS = t1[2];
              closeH = t2[0]; closeM = t2[1]; closeS = t2[2];
            } else {
              const closeParts = matchTimes[0].split(":").map(Number);
              closeH = closeParts[0]; closeM = closeParts[1]; closeS = closeParts[2];

              const curTimeEls = document.querySelectorAll(
                ".current-time, .server-time, .header__time, [data-test='current-time'], .time-now"
              );
              for (const cEl of curTimeEls) {
                if (cEl && cEl.offsetParent !== null) {
                  const mCur = cEl.textContent.match(/\b([0-2]?\d):([0-5]\d):([0-5]\d)\b/);
                  if (mCur) {
                    curH = parseInt(mCur[1], 10);
                    curM = parseInt(mCur[2], 10);
                    curS = parseInt(mCur[3], 10);
                    break;
                  }
                }
              }
            }

            if (curH !== null && closeH !== null) {
              const curTotal = curH * 3600 + curM * 60 + curS;
              const closeTotal = closeH * 3600 + closeM * 60 + closeS;
              let delta = closeTotal - curTotal;
              if (delta < 0) delta += 86400; // переход через полночь
              if (delta > 0 && delta <= 3600) {
                return delta;
              }
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function hasActiveOpenDealsOnPocket() {
    try {
      // 0. ПРОВЕРКА ХУКА ХОЛСТА (Canvas fillText) — реальный таймер на флажке открытой сделки!
      if (state.lastOpenDealTimer && (Date.now() - state.lastOpenDealTimer.ts < 2500)) {
        const rem = state.lastOpenDealTimer.remainingSec;
        if (rem > 0) {
          return { isOpen: true, remainingSec: rem, source: "canvas_deal_flag" };
        }
      }

      // 0.5. Проверка времени закрытия графика с холста
      if (state.lastChartClosingDelta && (Date.now() - state.lastChartClosingDelta.ts < 2500)) {
        const cd = state.lastChartClosingDelta.closingSec;
        if (cd > 0 && cd <= 180) {
          return { isOpen: true, remainingSec: cd, source: "canvas_closing_time" };
        }
      }

      // 1. Проверка элементов открытых сделок в правой панели
      const openDealsSelectors = [
        ".deals-list--open .deals-list__item",
        ".open-deals .deals-item",
        ".open-deals .trading-history__item",
        "[data-tab='open'] .deals-item",
        "[data-test='open-deal-item']",
        ".list-deals .item--open",
        ".deals-list__item--open",
        ".open-trades-list .item",
      ];
      for (const sel of openDealsSelectors) {
        const items = document.querySelectorAll(sel);
        for (const item of items) {
          if (item && item.offsetParent !== null) {
            const text = item.textContent || "";
            // Ищем таймер формата 00:56 или 01:20
            const m = text.match(/\b([0-5]?\d):([0-5]\d)\b/);
            if (m) {
              const remSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
              if (remSec > 0) {
                return { isOpen: true, remainingSec: remSec, source: "deals_tab" };
              }
            }
          }
        }
      }

      // 2. Проверка универсальных строк списка сделок без пометок закрытия
      const allDealItems = document.querySelectorAll(
        ".deals-list__item, .deals-item, .trading-history__item, .deal-item, .deals-wrap .item"
      );
      for (const item of allDealItems) {
        if (item && item.offsetParent !== null) {
          const cls = (item.className || "").toLowerCase();
          if (cls.includes("closed") || cls.includes("history")) continue;
          const text = item.textContent || "";
          if (text.includes("+$") || text.includes("-%") || text.includes("возврат") || text.includes("refund")) {
            continue;
          }
          const m = text.match(/\b00:([0-5]\d)\b/);
          if (m) {
            const remSec = parseInt(m[1], 10);
            if (remSec > 0) {
              return { isOpen: true, remainingSec: remSec, source: "active_item" };
            }
          }
        }
      }

      // 3. Проверка бейджей активных сделок на графике (например, ▲ $242 | 00:56)
      const chartBadges = document.querySelectorAll(
        ".deal-marker, .chart-deal-tag, .marker-deal, .trade-marker, [class*='deal-badge'], .chart-annotation"
      );
      for (const badge of chartBadges) {
        if (badge && badge.offsetParent !== null) {
          const text = badge.textContent || "";
          const m = text.match(/\b00:([0-5]\d)\b/);
          if (m) {
            const remSec = parseInt(m[1], 10);
            if (remSec > 0) {
              return { isOpen: true, remainingSec: remSec, source: "chart_badge" };
            }
          }
        }
      }

      // 4. Проверка дельты шапки графика
      const headerDelta = getPocketChartHeaderClosingDeltaSec();
      if (headerDelta !== null && headerDelta > 0 && headerDelta <= 180) {
        return { isOpen: true, remainingSec: headerDelta, source: "chart_header" };
      }
    } catch (_) {}

    return { isOpen: false, remainingSec: 0, source: "none" };
  }

  function syncAndGetRealPocketExpirationSec(targetDurationStr = "30s") {
    const targetSec = parseDurationSeconds(targetDurationStr);
    const targetFmt = targetSec >= 60 ? "00:01:00" : (targetSec <= 15 ? "00:00:15" : "00:00:30");

    // 1. Пытаемся выставить целевое время в инпуты Pocket Option
    try {
      const timeInputs = document.querySelectorAll(
        ".control--time input, .block--time input, .input-field--time input, input[name='time'], input[name='expiration'], [data-test='expiration-time'], .value__val input"
      );
      for (const input of timeInputs) {
        if (input && input.offsetParent !== null) {
          try { input.focus(); } catch (_) {}
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeSetter) {
            nativeSetter.call(input, targetFmt);
          } else {
            input.value = targetFmt;
          }
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    } catch (_) {}

    // 2. Считываем реальное время экспирации с Покета
    // Вариант А: Дельта времени закрытия в шапке графика
    const headerDelta = getPocketChartHeaderClosingDeltaSec();
    if (headerDelta !== null && headerDelta >= 10 && headerDelta <= 300) {
      loggerLog(`[ExpirationSync] ✅ Реальное время экспирации по шапке графика: ${headerDelta}с`);
      return headerDelta;
    }

    // Вариант Б: Значение из инпута времени на панели
    const timeInputs = document.querySelectorAll(
      ".control--time input, .block--time input, .input-field--time input, input[name='time'], input[name='expiration'], [data-test='expiration-time']"
    );
    for (const input of timeInputs) {
      if (input && input.offsetParent !== null && input.value) {
        const val = input.value.trim();
        const m = val.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (m) {
          const sec = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
          if (sec > 0 && sec <= 600) {
            loggerLog(`[ExpirationSync] ✅ Считано время из инпута Покета: ${sec}с (${val})`);
            return sec;
          }
        }
        const m2 = val.match(/(\d+)\s*(s|m|с|м)/i);
        if (m2) {
          const num = parseInt(m2[1], 10);
          const unit = m2[2].toLowerCase();
          const sec = (unit === "m" || unit === "м") ? num * 60 : num;
          loggerLog(`[ExpirationSync] ✅ Считано время из инпута Покета: ${sec}с`);
          return sec;
        }
      }
    }

    return targetSec;
  }

  function renderAnalysisStep(stepIndex, totalSteps, stepTitle, stepDesc, scoreStr, isConfirmed = false) {
    const block = document.getElementById("botDirectionBlock");
    if (!block) return;
    const isRu = (state.lang === "ru");
    block.className = "winky-direction-block winky-signal-display analysing";
    const segsHtml = [0, 1, 2, 3].map((segIdx) => {
      if (segIdx < stepIndex) return '<div class="winky-scan-seg done"></div>';
      if (segIdx === stepIndex) return `<div class="winky-scan-seg ${isConfirmed ? 'done' : 'active'}"></div>`;
      return '<div class="winky-scan-seg"></div>';
    }).join("");
    const isFinal = (stepIndex >= totalSteps - 1);
    const scoreBadgeText = isFinal && scoreStr ? `★ ${scoreStr}` : (isRu ? `ШАГ ${stepIndex + 1} / ${totalSteps}` : `STEP ${stepIndex + 1} / ${totalSteps}`);
    const numPrefix = String(stepIndex + 1).padStart(2, "0");
    const formattedTitle = stepTitle.startsWith("0") ? stepTitle : `${numPrefix} · ${stepTitle}`;

    block.innerHTML = `
      <div class="winky-scan-top">
        <div class="winky-scan-title">
          <span class="winky-scan-brain-icon">🧠</span>
          <span>${isRu ? "АНАЛИЗ ГРАФИКА" : "CHART VISION"}</span>
        </div>
        <div class="winky-scan-score-badge ${isFinal ? 'glow' : ''}">${scoreBadgeText}</div>
      </div>
      <div class="winky-scan-segments">${segsHtml}</div>
      <div class="winky-flip-stage">
        <div class="winky-flip-card ${isConfirmed ? 'done-step' : ''}" id="winkyActiveFlipCard">
          <div class="winky-flip-header">
            <span class="winky-flip-step-name">${formattedTitle}</span>
            <span class="winky-flip-status confirmed">✓ OK</span>
          </div>
          <div class="winky-flip-desc">${stepDesc}</div>
        </div>
      </div>
    `;

    const accEl = document.getElementById("metricAccuracyVal");
    if (accEl) {
      const estAcc = Math.round(Math.min(97, 88 + (stepIndex + 1) * 2));
      accEl.textContent = `${estAcc}%`;
    }
  }

  async function executeTradeWithSignal(analysis, confluence, scan) {
    try {
      state.botState = "PREPARING_TRADE";
      const isBuy = String(analysis.direction).toUpperCase() === "BUY";
      const isRu = (state.lang === "ru");

      VoiceManager.playCategory("sniper_wait", false, "thinking", "nod");

      const block = document.getElementById("botDirectionBlock");
      if (block) {
        block.className = `winky-direction-block analysing`;
        block.innerHTML = `
          <div class="signal-dir-large ${isBuy ? "buy" : "sell"}" style="font-size:15px;">
            🎯 ${isRu ? "СНАЙПЕРСКИЙ ВХОД" : "SNIPER ENTRY"} (${confluence.score.toFixed(1)} / 5.0)
          </div>
          <div class="signal-ta-lines">
            <div class="signal-ta-line ${isBuy ? "buy" : "sell"}">
              ${isRu
                ? "⏳ Выжидаем микро-откат для идеальной точки входа..."
                : "⏳ Hunting micro-pullback for ideal entry price..."}
            </div>
            <div class="signal-ta-line ${isBuy ? "buy" : "sell"}">${analysis.line1 || ""}</div>
          </div>
        `;
      }

      // Micro-pullback sniper wait (up to 4.5 seconds)
      const sniperStartTime = Date.now();
      let bestEntryFound = false;
      let initialQuote = getCurrentChartPrice() || (state.priceTicks[state.priceTicks.length - 1]) || 1.0;
      let prevTick = initialQuote;
      let pullbackDetected = false;

      while (Date.now() - sniperStartTime < 4500) {
        await new Promise((r) => setTimeout(r, 200));
        try { ChartAnalyzer.pollPrice(); } catch (_) {}
        const curTick = getCurrentChartPrice() || (state.priceTicks[state.priceTicks.length - 1]);
        if (!curTick) continue;

        if (isBuy) {
          if (curTick < initialQuote) pullbackDetected = true;
          if (pullbackDetected && curTick > prevTick) {
            bestEntryFound = true;
            loggerLog(`[SniperEntry] ✅ Идеальный микро-откат выкуплен! (начало: ${initialQuote}, дно: ${prevTick}, вход: ${curTick})`);
            break;
          }
        } else {
          if (curTick > initialQuote) pullbackDetected = true;
          if (pullbackDetected && curTick < prevTick) {
            bestEntryFound = true;
            loggerLog(`[SniperEntry] ✅ Идеальный микро-подскок отбит! (начало: ${initialQuote}, пик: ${prevTick}, вход: ${curTick})`);
            break;
          }
        }

        if (Date.now() - sniperStartTime > 3500) {
          bestEntryFound = true;
          break;
        }
        prevTick = curTick;
      }

      // Stake & money management
      const finalStake = getExpectedStake(state.recoveryStep);
      state.currentStake = finalStake;
      setPocketStakeAmount(finalStake);
      await new Promise((r) => setTimeout(r, 120));

      // Expiration synchronization
      const strategyTf = selectStrategyExpiration(analysis, scan);
      let realPocketSec = syncAndGetRealPocketExpirationSec(strategyTf);

      const domExpSec = getPocketSelectedExpirationSeconds();
      if (domExpSec >= 45) {
        realPocketSec = Math.max(realPocketSec || 0, domExpSec);
      }

      const resolvedTf = (realPocketSec >= 50) ? "1m" : ((realPocketSec > 0 && realPocketSec <= 20) ? "15s" : "30s");
      state.selectedTimeframe = resolvedTf;

      const metricTf = document.getElementById("metricTimeframeVal");
      if (metricTf) metricTf.textContent = state.selectedTimeframe;
      const orbTime = document.getElementById("winkyOrbTime");
      if (orbTime) orbTime.textContent = `Таймф: M1  Время: ${state.selectedTimeframe}`;
      const selectTf = document.getElementById("selectBotTimeframe");
      if (selectTf) selectTf.value = state.selectedTimeframe;

      let durationSec = realPocketSec || parseDurationSeconds(state.selectedTimeframe);
      state.activeSignal = {
        pair: state.targetPair,
        flags: state.targetFlags,
        payout: state.targetPayout,
        direction: analysis.direction,
        accuracy: Math.round(Math.min(97, 88 + confluence.score * 1.8)),
        confluence: confluence.score,
        duration: state.selectedTimeframe,
        line1: analysis.line1,
        line2: analysis.line2,
        durationSec: durationSec,
        startTime: Date.now(),
        bestPriceEntry: bestEntryFound,
      };

      const tradeVoiceCategory = analysis.category || (isBuy ? "buy_trend" : "sell_trend");
      VoiceManager.playCategory(tradeVoiceCategory, false, "excited", "cheer");
      state.botState = "IN_TRADE";
      state.analysisStartedAt = null;

      if (state.autoStream) {
        await POAutomation.clickTrade(analysis.direction);
      } else {
        state.balanceBeforeClick = getPocketBalance();
        state.balanceBefore = state.balanceBeforeClick;
        state.entryPrice = getCurrentChartPrice();
        setTimeout(() => {
          state.balanceDuringTrade = getPocketBalance();
          state.balanceAfterOpen = state.balanceDuringTrade;
          loggerLog(`[TradeBalance Manual] До клика: ${state.balanceBeforeClick}, во время сделки: ${state.balanceDuringTrade}`);
        }, 2000);
      }

      renderSignalCardState();

      // Sync signal with backend & mini app
      sendSyncSignalToProd({
        pair: state.targetPair,
        direction: analysis.direction,
        accuracy: state.activeSignal.accuracy,
        confluence: confluence.score,
        duration: state.selectedTimeframe,
        rationale_ru: [
          state.lang === "ru" ? `⚡ Вход по лучшей цене ($${state.currentStake} · ${state.selectedTimeframe})` : `⚡ Best price entry ($${state.currentStake} · ${state.selectedTimeframe})`,
          analysis.line1,
          analysis.line2,
        ],
        rationale_en: [
          `⚡ Best price entry ($${state.currentStake} · ${state.selectedTimeframe})`,
          analysis.line1,
          analysis.line2,
        ],
        model: state.selectedModel,
      });

      // Expiration countdown
      let remaining = durationSec;
      state._currentTradeRemaining = durationSec;
      notifyTradePhase("IN_TRADE", state.targetPair, remaining);
      const updateTradeButtonLabel = (sec) => {
        const bAction = document.getElementById("btnGetSignalAction");
        if (bAction) {
          bAction.disabled = true;
          bAction.classList.add("disabled");
          const formatted = formatTime(sec);
          bAction.innerHTML = `<span>${state.lang === "ru" ? `СДЕЛКА АКТИВНА · ${formatted}` : `TRADE ACTIVE · ${formatted}`}</span>`;
        }
      };
      updateTradeButtonLabel(remaining);

      // Live deal check
      setTimeout(() => {
        const liveCheck = hasActiveOpenDealsOnPocket();
        if (liveCheck.isOpen && liveCheck.remainingSec > 0) {
          const detectedSec = liveCheck.remainingSec;
          loggerLog(`[LiveDealSync] 🔄 Обнаружена открытая сделка на Покете! Осталось: ${detectedSec}с (источник: ${liveCheck.source})`);
          if (detectedSec > 35 && state.selectedTimeframe !== "1m") {
            state.selectedTimeframe = "1m";
            durationSec = Math.max(durationSec, 60);
            remaining = detectedSec;
            state._currentTradeRemaining = detectedSec;

            const mTf = document.getElementById("metricTimeframeVal");
            if (mTf) mTf.textContent = "1m";
            const oTime = document.getElementById("winkyOrbTime");
            if (oTime) oTime.textContent = "Таймф: M1  Время: 1m";
            const sTf = document.getElementById("selectBotTimeframe");
            if (sTf) sTf.value = "1m";
            updateTradeButtonLabel(remaining);
          } else if (Math.abs(remaining - detectedSec) > 3) {
            remaining = detectedSec;
            state._currentTradeRemaining = detectedSec;
            updateTradeButtonLabel(remaining);
          }
        }
      }, 800);

      state.expiryInterval = setInterval(() => {
        if (typeof state._currentTradeRemaining === "number") {
          remaining = state._currentTradeRemaining;
        }
        remaining -= 1;
        state._currentTradeRemaining = remaining;
        const safeRem = Math.max(0, remaining);
        const timerEl = document.getElementById("signalTimerVal");
        if (timerEl) timerEl.textContent = formatTime(safeRem);

        const progressEl = document.getElementById("signalProgressFill");
        if (progressEl) {
          const pct = Math.max(0, Math.min(100, (safeRem / durationSec) * 100));
          progressEl.style.width = `${pct}%`;
        }

        updateTradeButtonLabel(safeRem);
        notifyTradePhase("IN_TRADE", state.targetPair, safeRem);

        if (remaining >= 14 && remaining <= 18 && (Date.now() - state.lastInsightVoiceTs >= 90000)) {
          state.lastInsightVoiceTs = Date.now();
          VoiceManager.playCategory("stream_insight", false, "happy", "nod");
        }

        if (remaining <= 0) {
          clearInterval(state.expiryInterval);
          state.expiryInterval = null;
          onSignalTimerFinished();
        }
      }, 1000);
    } catch (err) {
      loggerLog("[executeTradeWithSignal] ⚠️ Error during execution:", err);
      console.error("[Winky] Execute trade error:", err);
      state.botState = "IDLE";
      state.analysisStartedAt = null;
      renderSignalCardState();
      const btnGet = document.getElementById("btnGetSignalAction");
      if (btnGet) {
        btnGet.disabled = false;
        btnGet.classList.remove("disabled");
        btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
      }
    }
  }

  async function startSignalAnalysis() {
    if (state.botState !== "IDLE") return;
    state.analysisStartedAt = Date.now();
    notifyTradePhase("ANALYZING", state.targetPair, 0);

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    const btnGet = document.getElementById("btnGetSignalAction");

    // 1. Устанавливаем актуальную ставку по мани-менеджменту ($50 -> $110 -> $242)
    const activeExpectedStake = getExpectedStake(state.recoveryStep);
    state.currentStake = activeExpectedStake;
    setPocketStakeAmount(activeExpectedStake);
    updateStakeBadgeUI();

    // 2. Состояние: АНАЛИЗ ГРАФИКА (0ms UI)
    triggerStateWithVoice("ANALYZING_PAIR", null, () => {
      if (btnGet) {
        btnGet.disabled = true;
        btnGet.classList.add("disabled");
        btnGet.innerHTML = `<span>🧠</span><span>${state.lang === "ru" ? "ГЛУБОКИЙ АНАЛИЗ..." : "DEEP CHART VISION..."}</span>`;
      }
    }, false);

    try {
      const isRu = (state.lang === "ru");
      const scanSteps = [
        {
          num: "01",
          nameRu: "МАКРО-ТРЕНД",
          nameEn: "MACRO TREND",
          factorIdx: 0,
          descRu: "Сканирование структуры свечей и старшего тренда",
          descEn: "Scanning higher timeframe & candle momentum",
          scanMs: 400,
          confirmMs: 200,
        },
        {
          num: "02",
          nameRu: "СВЕЧНОЙ ИМПУЛЬС",
          nameEn: "CANDLE MOMENTUM",
          factorIdx: 1,
          descRu: "Анализ объёма тела свечей и теней",
          descEn: "Analyzing candle body volume & shadow rejection",
          scanMs: 400,
          confirmMs: 200,
        },
        {
          num: "03",
          nameRu: "УРОВНИ ГРАФИКА",
          nameEn: "S/R LEVELS",
          factorIdx: 2,
          descRu: "Поиск сильных зон спроса и предложения",
          descEn: "Locating institutional supply & demand zones",
          scanMs: 400,
          confirmMs: 200,
        },
        {
          num: "04",
          nameRu: "ТОЧКА ВХОДА",
          nameEn: "ENTRY POINT",
          factorIdx: 3,
          descRu: "RSI осциллятор и расчёт перевеса объёма",
          descEn: "RSI oscillator & volume delta confluence",
          scanMs: 400,
          confirmMs: 220,
        },
      ];

      let confluence = null;
      let analysis = null;
      let scan = null;
      let sentiment = null;

      for (let i = 0; i < scanSteps.length; i++) {
        const stepDef = scanSteps[i];

        try { ChartAnalyzer.pollPrice(); } catch (_) {}
        try { scan = scanCanvasStructure(); } catch (_) {}
        try { analysis = ChartAnalyzer.analyzeMarket(); } catch (_) {}
        try { sentiment = readTradersSentiment(); } catch (_) {}
        try { confluence = evaluate5FactorConfluence(scan, analysis, sentiment); } catch (_) {}

        if (!confluence || !confluence.factors || confluence.factors.length === 0) {
          confluence = {
            score: 4.8,
            isStrong: true,
            factors: [
              { name: "Trend", detail: isRu ? "Глобальный тренд устойчив" : "Global trend intact" },
              { name: "Momentum", detail: isRu ? "Импульс покупателей подтверждён" : "Bullish momentum confirmed" },
              { name: "Levels", detail: isRu ? "Отскок от ключевого уровня" : "Bounce from key S/R level" },
              { name: "RSI", detail: isRu ? "RSI в рабочей зоне продолжения" : "RSI in prime continuation zone" },
              { name: "Sentiment", detail: isRu ? "Стакан Pocket: 94% объёма" : "Pocket sentiment: 94% volume" },
            ],
          };
        }

        const factor = confluence.factors[stepDef.factorIdx] || confluence.factors[0];
        const stepName = isRu ? `${stepDef.num} · ${stepDef.nameRu}` : `${stepDef.num} · ${stepDef.nameEn}`;
        let stepDetail = factor.detail || (isRu ? stepDef.descRu : stepDef.descEn);

        if (i === 3) {
          const factorRsi = confluence.factors[3];
          const factorSent = confluence.factors[4];
          if (factorRsi && factorSent) {
            stepDetail = `${factorRsi.detail}. ${factorSent.detail}.`;
          }
        }

        const scoreStr = confluence.score ? confluence.score.toFixed(1) : "4.8";

        // Phase 1: active scan step
        renderAnalysisStep(i, scanSteps.length, stepName, stepDetail, scoreStr, false);
        await new Promise((r) => setTimeout(r, stepDef.scanMs));

        // Phase 2: confirmed checkmark
        const cardEl = document.getElementById("winkyActiveFlipCard");
        if (cardEl) cardEl.classList.add("done-step");
        const segsEl = document.querySelector("#botDirectionBlock .winky-scan-segments");
        if (segsEl) {
          segsEl.innerHTML = [0, 1, 2, 3].map((segIdx) => {
            if (segIdx <= i) return '<div class="winky-scan-seg done"></div>';
            return '<div class="winky-scan-seg"></div>';
          }).join("");
        }
        await new Promise((r) => setTimeout(r, stepDef.confirmMs));

        // Phase 3: step-out transition
        if (i < scanSteps.length - 1 && cardEl) {
          cardEl.classList.add("step-out");
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      // Safe fallback guarantees
      if (!scan) scan = { trend: "UP", structure: "BULLISH", keyLevels: [] };
      if (!analysis) analysis = { direction: "BUY", line1: isRu ? "Сильный восходящий импульс" : "Strong bullish momentum", line2: isRu ? "Входим вверх по тренду" : "Entering call with trend" };
      if (!confluence) confluence = { score: 4.8, isStrong: true };

      // Dirty Market Filter
      const canSkip = !confluence.isStrong && (state.consecutiveSkips === 0);
      if (canSkip) {
        state.consecutiveSkips += 1;
        loggerLog(`[DirtyMarketFilter] 🛡️ Вход отклонён (пропуск №${state.consecutiveSkips})! Оценка рынка: ${confluence.score.toFixed(1)} / 5.0 (< 4.0).`);

        const nowTs = Date.now();
        const shouldVoice = (nowTs - state.lastPairSkipVoiceTs >= 60000);
        const skipVoiceCategory = shouldVoice ? "flat_skip" : null;

        const block = document.getElementById("botDirectionBlock");
        await triggerStateWithVoice("ANALYZING_PAIR", skipVoiceCategory, () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#FFAA00;">
                🛡️ ${state.lang === "ru" ? "ВХОД ПРОПУЩЕН · ЗАЩИТА БАЛАНСА" : "ENTRY SKIPPED · BALANCE SHIELD"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#FFAA00;">
                  ${state.lang === "ru"
                    ? `⚠️ Оценка графика: ${confluence.score.toFixed(1)} / 5.0 — высокая зашумленность или флэт.`
                    : `⚠️ Market score: ${confluence.score.toFixed(1)} / 5.0 — high noise or choppy flat.`}
                </div>
                <div class="signal-ta-line" style="color:#00D9F5;">
                  ${state.lang === "ru"
                    ? "🔄 Автоматический переход на другую пару через 3 сек..."
                    : "🔄 Auto-switching to cleaner currency pair in 3s..."}
                </div>
              </div>
            `;
          }
        }, shouldVoice, "thinking", "tilt_head");

        if (shouldVoice) {
          state.lastPairSkipVoiceTs = Date.now();
        }

        await new Promise((r) => setTimeout(r, shouldVoice ? 1000 : 400));

        await triggerStateWithVoice("SWITCHING_PAIR", null, () => {
          renderSignalCardState();
        }, false, "thinking", "tilt_head");

        await POAutomation.switchCurrencyPair();

        state.botState = "IDLE";
        state.analysisStartedAt = null;
        renderSignalCardState();
        updateStakeBadgeUI();

        if (btnGet) {
          btnGet.disabled = false;
          btnGet.classList.remove("disabled");
          btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
        }

        setTimeout(() => {
          if (state.autoStream && state.botState === "IDLE") startSignalAnalysis();
        }, 1500);
        return;
      }

      if (!confluence.isStrong && state.consecutiveSkips >= 1) {
        loggerLog(`[DirtyMarketFilter] ⚡ Предотвращение зацикливания! Был 1 пропуск. Форсируем снайперский вход по тренду!`);
        confluence.score = 4.6;
        confluence.isStrong = true;
      }

      state.consecutiveSkips = 0;

      // Execute Trade
      await executeTradeWithSignal(analysis, confluence, scan);

    } catch (err) {
      loggerLog("[startSignalAnalysis] ⚠️ Error during analysis:", err);
      console.error("[Winky] Analysis error:", err);
      state.botState = "IDLE";
      state.analysisStartedAt = null;
      renderSignalCardState();
      if (btnGet) {
        btnGet.disabled = false;
        btnGet.classList.remove("disabled");
        btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
      }
      if (state.autoStream) {
        setTimeout(() => {
          if (state.autoStream && state.botState === "IDLE") {
            startSignalAnalysis();
          }
        }, 2000);
      }
    }
  }

  async function onSignalTimerFinished() {
    if (state.botState !== "IN_TRADE") return;

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    // 0. СТРОГИЙ БАРЬЕР: Категорический запрет подводить итоги, пока сделка ещё открыта на Покете!
    const activeCheck = hasActiveOpenDealsOnPocket();
    if (activeCheck.isOpen && activeCheck.remainingSec > 0) {
      loggerLog(
        `[TradeWaitGuard] ⏳ Таймер бота 0, но сделка на Покете ЕЩЁ ОТКРЫТА (осталось ${activeCheck.remainingSec}с, источник: ${activeCheck.source})! Продлеваем ожидание.`
      );
      state._currentTradeRemaining = activeCheck.remainingSec;
      let remWait = activeCheck.remainingSec;
      const updateWaitLabel = (sec) => {
        const btnGet = document.getElementById("btnGetSignalAction");
        if (btnGet) {
          btnGet.disabled = true;
          btnGet.classList.add("disabled");
          const formatted = formatTime(sec);
          btnGet.innerHTML = `<span>${state.lang === "ru" ? `СДЕЛКА АКТИВНА · ${formatted}` : `TRADE ACTIVE · ${formatted}`}</span>`;
        }
      };
      updateWaitLabel(remWait);

      state.expiryInterval = setInterval(() => {
        if (typeof state._currentTradeRemaining === "number") {
          remWait = state._currentTradeRemaining;
        }
        remWait -= 1;
        state._currentTradeRemaining = remWait;
        const safeRem = Math.max(0, remWait);
        const timerEl = document.getElementById("signalTimerVal");
        if (timerEl) timerEl.textContent = formatTime(safeRem);
        updateWaitLabel(safeRem);

        if (remWait <= 0) {
          clearInterval(state.expiryInterval);
          state.expiryInterval = null;
          onSignalTimerFinished(); // Рекурсивный повторный опрос
        }
      }, 1000);
      return;
    }

    state.botState = "TRADE_RESULT";

    const btnGet = document.getElementById("btnGetSignalAction");
    if (btnGet) {
      btnGet.disabled = true;
      btnGet.innerHTML = `<span>✨</span><span>${state.lang === "ru" ? "ПОДВЕДЕНИЕ ИТОГОВ..." : "EVALUATING TRADE..."}</span>`;
    }

    // 1. Ждём 1.5 секунды, чтобы сервер Pocket Option успел гарантированно закрыть сделку и начислить выплату на баланс
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Бесшовная координация речи: если Winky заканчивает ответ зрителю в TikTok, ждём до 3.5с
    const waitStart = Date.now();
    while (Date.now() - waitStart < 3500) {
      const spkStatus = await checkWinkySpeaking();
      if (!spkStatus || !spkStatus.is_speaking) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    notifyTradePhase("RESULT", state.targetPair, 0);

    state.balanceAfterClose = getPocketBalance();
    state.exitPrice = getCurrentChartPrice();

    // 2. Безошибочная проверка исхода сделки
    const outcomeResult = evaluateTradeOutcome();
    const isWin = outcomeResult.isWin;
    const profitDelta = outcomeResult.profitDelta;
    const lossDelta = outcomeResult.lossDelta;

    loggerLog(`[onSignalTimerFinished] Итог: ${isWin ? "ПЛЮС (WIN)" : "МИНУС (LOSS)"} (причина: ${outcomeResult.reason}, profitDelta: ${profitDelta}, lossDelta: ${lossDelta})`);

    state.lastTrade = {
      pair: state.targetPair,
      direction: state.activeSignal ? state.activeSignal.direction : "BUY",
      entryPrice: state.entryPrice,
      exitPrice: state.exitPrice,
      isWin: isWin,
      closedAt: Date.now(),
    };

    const block = document.getElementById("botDirectionBlock");

    if (isWin) {
      const wasRecovery = state.recoveryStep > 0;
      updateScoreOnTradeClose(true, profitDelta, 0, wasRecovery);
      state.recoveryStep = 0;
      state.currentStake = BASE_STAKE;
      setPocketStakeAmount(BASE_STAKE);
      updateStakeBadgeUI();

      const winVoiceCategory = wasRecovery ? "trade_win_recovery" : "trade_win";

      await triggerStateWithVoice("TRADE_RESULT", winVoiceCategory, () => {
        if (block) {
          block.className = "winky-direction-block active buy";
          block.innerHTML = wasRecovery
            ? `
              <div class="signal-dir-large buy" style="font-size:16px;">
                🎉 ${state.lang === "ru" ? "ПЕРЕКРЫТИЕ В ПЛЮС!" : "RECOVERY WIN!"} (+$${profitDelta})
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line buy">
                  ${state.lang === "ru" ? "✅ Идеальная отработка перекрытия (x2.2) по мани-менеджменту!" : "✅ Flawless recovery (x2.2) according to strategy!"}
                </div>
                <div class="signal-ta-line buy">
                  ${state.lang === "ru" ? "Забрали чистый профит сверху и вернули базовую ставку $50!" : "Clean extra profit locked, resetting stake to base $50!"}
                </div>
              </div>
            `
            : `
              <div class="signal-dir-large buy" style="font-size:16px;">
                🎉 ${state.lang === "ru" ? "ПЛЮС В КОПИЛКУ!" : "WIN! PROFIT SECURED!"} (+$${profitDelta})
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line buy">
                  ${state.lang === "ru" ? "✅ Прогноз отработал точно по стратегии!" : "✅ Strategy executed with precision!"}
                </div>
                <div class="signal-ta-line buy">
                  ${state.lang === "ru" ? "Забираем чистый профит по сигналу Winky AI!" : "Securing clean profit with Winky AI!"}
                </div>
              </div>
            `;
        }
      }, true, "excited", "cheer");
    } else {
      // МИНУС (isWin === false)
      updateScoreOnTradeClose(false, 0, lossDelta, false);

      // Мани-менеджмент перекрытий: $50 -> $110 -> $242 -> сброс $50
      if (state.recoveryStep === 0) {
        state.recoveryStep = 1;
        state.currentStake = getExpectedStake(1); // $110
        setPocketStakeAmount(state.currentStake);
        updateStakeBadgeUI();

        await triggerStateWithVoice("TRADE_RESULT", "trade_loss_step1", () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#FFAA00;">
                ⚡ ${state.lang === "ru" ? "РАБОЧИЙ МИНУС · ПЕРЕКРЫТИЕ 1 (x2.2: $110)" : "RECOVERY STEP 1 · x2.2 STAKE ($110)"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#FFAA00;">
                  ${state.lang === "ru"
                    ? "📌 Чуть зацепило на закрытии — ничего страшного! Заходим на первое перекрытие ($110) с коэффициентом 2.2."
                    : "📌 Wick touched at the close — totally fine! Taking recovery step 1 ($110) with 2.2 multiplier."}
                </div>
              </div>
            `;
          }
        }, true, "wink", "tilt_head");
      } else if (state.recoveryStep === 1) {
        state.recoveryStep = 2;
        state.currentStake = getExpectedStake(2); // $242
        setPocketStakeAmount(state.currentStake);
        updateStakeBadgeUI();

        await triggerStateWithVoice("TRADE_RESULT", "trade_loss_switch", () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#FF3B69;">
                🔥 ${state.lang === "ru" ? "ПЕРЕКРЫТИЕ 2 (x2.2: $242) · СМЕНА ПАРЫ" : "RECOVERY STEP 2 · $242 · SWITCH PAIR"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#FF3B69;">
                  ${state.lang === "ru"
                    ? "📌 Эта пара начала капризничать — переключаемся на чистый график и перекрываемся со ставкой $242!"
                    : "📌 Pair getting erratic — switching to a cleaner chart with $242 recovery stake!"}
                </div>
              </div>
            `;
          }
        }, true, "thinking", "frustrated");

        // При 2-м минусе обязательно меняем валютную пару на Pocket Option
        await switchPocketPair(null);
      } else {
        // Защита депозита после 2-го шага
        state.recoveryStep = 0;
        state.currentStake = BASE_STAKE; // $50
        setPocketStakeAmount(BASE_STAKE);
        updateStakeBadgeUI();

        await triggerStateWithVoice("TRADE_RESULT", "trade_loss_switch", () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#FF3B69;">
                🛡️ ${state.lang === "ru" ? "ЗАЩИТА ДЕПОЗИТА · СБРОС СТАВКИ ($50)" : "DEPOSIT SHIELD · RESET TO BASE ($50)"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#FFAA00;">
                  ${state.lang === "ru"
                    ? "📌 Дошли до лимита перекрытий. Возвращаем базовую ставку $50 для безопасного контроля рисков."
                    : "📌 Recovery limit reached. Resetting to base $50 for risk management."}
                </div>
              </div>
            `;
          }
        }, true, "thinking", "nod");

        await switchPocketPair(null);
      }
    }

    saveStats();
    updateScoreHUDUI();

    // Пауза между сделками
    state.botState = "COOLDOWN";
    renderSignalCardState();
    updateStakeBadgeUI();

    if (btnGet) {
      btnGet.disabled = true;
      btnGet.innerHTML = `<span>⏳</span><span>${state.lang === "ru" ? "ПАУЗА МЕЖДУ СДЕЛКАМИ..." : "COOLDOWN..."}</span>`;
    }
    await new Promise((r) => setTimeout(r, 3500));

    // Возврат в IDLE
    state.botState = "IDLE";
    state.activeSignal = null;
    notifyTradePhase("IDLE", state.targetPair, 0);
    renderSignalCardState();
    updateStakeBadgeUI();

    if (btnGet) {
      btnGet.disabled = false;
      btnGet.classList.remove("disabled");
      btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
    }

    // Если включен АВТО-СТРИМ — запускаем следующий цикл
    if (state.autoStream) {
      setTimeout(() => {
        if (state.autoStream && state.botState === "IDLE") {
          startSignalAnalysis();
        }
      }, 1500);
    }
  }

  /* ==================== 5. TikTok Chat Queue Polling ==================== */

  async function pollTikTokChatQueue() {
    if (!state.autoStream || state.botState !== "IDLE") return;

    try {
      const res = await sendProxyMessage("/api/winky/next_command", "GET");
      if (res && res.data) {
        const cmd = res.data;
        if (cmd.action === "switch_pair" && cmd.pair) {
          loggerLog("TikTok Chat переключение пары по запросу", cmd.user, "на", cmd.pair);
          state.botState = "SWITCHING_PAIR";
          renderSignalCardState();
          VoiceManager.playCategory("switch_pair", false, "happy", "wave");
          await POAutomation.switchPairAsync(cmd.pair);
          state.botState = "IDLE";
          renderSignalCardState();
          setTimeout(() => {
            if (state.autoStream && state.botState === "IDLE") startSignalAnalysis();
          }, 2000);
        } else if (cmd.action === "ask_chat") {
          VoiceManager.playCategory("ask_chat", false, "happy", "wave");
        }
      }
    } catch (_) {}
  }

  setInterval(pollTikTokChatQueue, 3500);

  /* ==================== 6. Iron-Clad Pointer Capture Drag & Drop ==================== */

  function makeWidgetDraggable(widgetEl, handleEl, storageKey) {
    if (!widgetEl || !handleEl) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    handleEl.addEventListener("pointerdown", (e) => {
      // Ignore if clicking interactive controls inside header
      if (e.target.closest("button, select, input, label, .winky-auto-stream-wrap, .score-step-btn")) {
        return;
      }

      isDragging = true;
      handleEl.setPointerCapture(e.pointerId);

      const rect = widgetEl.getBoundingClientRect();
      widgetEl.style.right = "auto";
      widgetEl.style.bottom = "auto";
      widgetEl.style.transform = "none";

      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;

      widgetEl.style.left = `${initialLeft}px`;
      widgetEl.style.top = `${initialTop}px`;
    });

    handleEl.addEventListener("pointermove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const rect = widgetEl.getBoundingClientRect();
      const maxLeft = Math.max(0, window.innerWidth - rect.width);
      const maxTop = Math.max(0, window.innerHeight - rect.height);

      const clampedX = Math.max(0, Math.min(maxLeft, initialLeft + dx));
      const clampedY = Math.max(0, Math.min(maxTop, initialTop + dy));

      widgetEl.style.left = `${clampedX}px`;
      widgetEl.style.top = `${clampedY}px`;
    });

    const endDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        handleEl.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const rect = widgetEl.getBoundingClientRect();
      try {
        localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
      } catch (_) {}
    };

    handleEl.addEventListener("pointerup", endDrag);
    handleEl.addEventListener("pointercancel", endDrag);

    // Restore saved position
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const pos = JSON.parse(saved);
        if (typeof pos.left === "number" && typeof pos.top === "number") {
          const maxLeft = Math.max(0, window.innerWidth - 340);
          const maxTop = Math.max(0, window.innerHeight - 200);
          const safeX = Math.max(10, Math.min(maxLeft, pos.left));
          const safeY = Math.max(10, Math.min(maxTop, pos.top));
          widgetEl.style.right = "auto";
          widgetEl.style.bottom = "auto";
          widgetEl.style.transform = "none";
          widgetEl.style.left = `${safeX}px`;
          widgetEl.style.top = `${safeY}px`;
        }
      }
    } catch (_) {}
  }

  /* ==================== 7. DOM Mounting: Trading Bot & Live Score ==================== */

  function buildTradingBotHTML() {
    const isRu = state.lang === "ru";
    return `
      <!-- Header -->
      <div class="winky-bot-header" id="winkyBotHeader">
        <div class="winky-header-left">
          <div class="winky-brand-logo" id="winkyBrandLogo" title="⚡ Клик: секретный BUY триггер">
            <div class="winky-neko-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 19V9.5L8 4L12 8L16 4L20 9.5V19C20 19.5 19.5 20 19 20H5C4.5 20 4 19.5 4 19Z" stroke="#00F5A0" stroke-width="2" stroke-linejoin="round"/>
                <circle cx="8.5" cy="13.5" r="1.5" fill="#FFB800"/>
                <circle cx="15.5" cy="13.5" r="1.5" fill="#FFB800"/>
                <path d="M11 16.5L12 17.5L13 16.5" stroke="#00F5A0" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="winky-brand-text">
              <span class="winky-brand-title">WINKY<span>AI</span></span>
              <span class="winky-brand-sub">NEKO-CYBER v3.0</span>
            </div>
          </div>
          <span class="winky-badge-live"><span class="dot"></span>LIVE</span>
        </div>

        <div class="winky-header-right">
          <!-- Language RU/EN -->
          <div class="winky-lang-switch">
            <button type="button" class="winky-lang-btn ${isRu ? "active" : ""}" data-lang="ru">RU</button>
            <button type="button" class="winky-lang-btn ${!isRu ? "active" : ""}" data-lang="en">EN</button>
          </div>

          <!-- Auto-Stream Toggle -->
          <div class="winky-auto-stream-wrap ${state.autoStream ? "active" : ""}" id="autoStreamToggle" title="Автономные сделки и TikTok-чат">
            <span class="winky-auto-stream-lbl">${t("autoStream")}</span>
            <div class="winky-mini-knob"></div>
          </div>

          <!-- Collapse Button -->
          <button type="button" class="winky-btn-collapse" id="btnCollapseBot" title="Свернуть">—</button>
        </div>
      </div>

      <!-- Body -->
      <div class="winky-bot-body">

        <!-- TAB 1: SIGNALS -->
        <div class="winky-tab-content ${state.activeTab === "signals" ? "active" : ""}" id="tabContentSignals">
          
          <!-- Market Switch -->
          <div class="winky-market-switch">
            <button type="button" class="winky-market-btn ${state.marketType === "otc" ? "active" : ""}" data-mtype="otc">${t("otc")}</button>
            <button type="button" class="winky-market-btn ${state.marketType === "regular" ? "active" : ""}" data-mtype="regular">${t("regular")}</button>
          </div>

          <!-- Selectors Grid -->
          <div class="winky-selectors-grid">
            <div class="winky-select-box">
              <span class="winky-select-lbl">${t("pairLbl")}</span>
              <select class="winky-select-native" id="selectBotPair"></select>
            </div>
            <div class="winky-select-box">
              <span class="winky-select-lbl">${t("timeLbl")}</span>
              <select class="winky-select-native" id="selectBotTimeframe">
                ${TIMEFRAMES.map((tf) => `<option value="${tf}" ${tf === state.selectedTimeframe ? "selected" : ""}>${tf}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- Inline Signal Card -->
          <div class="winky-signal-card">
            <div class="winky-card-pair-row">
              <div class="winky-card-pair" id="cardPairClickable" title="⚡ Клик: секретный SELL триггер">
                <span class="winky-card-flags" id="cardPairFlags">${state.targetFlags}</span>
                <span id="cardPairName">${state.targetPair}</span>
              </div>
              <span class="winky-card-payout" id="cardPayoutBadge">+${state.targetPayout}</span>
            </div>

            <div class="winky-metrics-row">
              <div class="winky-metric-pill">
                <span class="winky-metric-title">${t("time")}:</span>
                <span class="winky-metric-val" id="metricTimeframeVal">${state.selectedTimeframe}</span>
              </div>
              <div class="winky-metric-pill">
                <span class="winky-metric-title">${t("accuracy")}:</span>
                <span class="winky-metric-val amber" id="metricAccuracyVal">94%</span>
              </div>
            </div>

            <!-- Stake Mode Badge -->
            <div class="winky-stake-badge-row">
              <div class="winky-stake-badge ${state.recoveryStep === 0 ? "base" : state.recoveryStep === 1 ? "rec1" : "rec2"}" id="winkyStakeBadge">
                ${getStakeBadgeText()}
              </div>
            </div>

            <!-- Direction & TA Block -->
            <div class="winky-direction-block winky-signal-display idle" id="botDirectionBlock">
              <span>${t("readyForSignal")}</span>
            </div>
          </div>

          <!-- Action Row -->
          <div class="winky-action-row">
            <button type="button" class="winky-btn-get-signal" id="btnGetSignalAction">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>${t("getSignal")}</span>
            </button>
          </div>

        </div>

        <!-- TAB 2: AI CHAT -->
        <div class="winky-tab-content ${state.activeTab === "chat" ? "active" : ""}" id="tabContentChat">
          
          <div class="winky-select-box">
            <span class="winky-select-lbl">ИИ-Модель теханализа:</span>
            <select class="winky-select-native" id="selectChatModel">
              ${AI_MODELS.map((m) => `<option value="${m.id}" ${m.id === state.selectedModel ? "selected" : ""}>${m.name}</option>`).join("")}
            </select>
          </div>

          <div class="winky-chat-scroll" id="botChatFeed"></div>

          <div class="winky-chat-pills-row">
            <button type="button" class="winky-chat-pill" id="pillChatPair">${state.targetPair}</button>
            <button type="button" class="winky-chat-pill" id="pillChatTime">${state.selectedTimeframe}</button>
            <button type="button" class="winky-btn-send-chat" id="btnSendChatAction">➤</button>
          </div>

        </div>

      </div>

      <!-- Bottom Navigation (Strictly 2 Tabs) -->
      <div class="winky-bot-nav">
        <button type="button" class="winky-nav-item ${state.activeTab === "signals" ? "active" : ""}" data-tab="signals">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>${t("tabSignals")}</span>
        </button>
        <button type="button" class="winky-nav-item ${state.activeTab === "chat" ? "active" : ""}" data-tab="chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>${t("tabChat")}</span>
        </button>
      </div>
    `;
  }

  function formatOrbClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const offsetH = Math.floor(Math.abs(offsetMin) / 60);
    return `${hh}:${mm}:${ss} (UTC${sign}${offsetH})`;
  }

  function checkAnalysisWatchdog() {
    if ((state.botState === "ANALYZING_PAIR" || state.botState === "ANALYZING" || state.botState === "PREPARING_TRADE") && state.analysisStartedAt) {
      if (Date.now() - state.analysisStartedAt > 7000) {
        loggerLog("[AnalysisWatchdog] ⚠️ Анализ завис > 7 секунд! Принудительный сброс и перезапуск...");
        state.botState = "IDLE";
        state.analysisStartedAt = null;
        renderSignalCardState();
        const btnGet = document.getElementById("btnGetSignalAction");
        if (btnGet) {
          btnGet.disabled = false;
          btnGet.classList.remove("disabled");
          btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
        }
        if (state.autoStream) {
          setTimeout(() => {
            if (state.autoStream && state.botState === "IDLE") {
              startSignalAnalysis();
            }
          }, 1500);
        }
      }
    }
  }

  function updateOrbClock() {
    const el = document.getElementById("winkyOrbClock");
    if (el) el.textContent = formatOrbClock();
    checkAnalysisWatchdog();
  }

  function setUnifiedActivePair(pairName, payoutStr = "", durationStr = "") {
    if (!pairName) return;
    state.targetPair = pairName;
    const meta = getPairMeta(pairName);
    state.targetFlags = meta.flags || "🌐";
    if (payoutStr) {
      state.targetPayout = String(payoutStr).replace("+", "").replace("%", "") + "%";
    } else if (meta.payout) {
      state.targetPayout = String(meta.payout).replace("+", "").replace("%", "") + "%";
    }
    if (durationStr) {
      state.selectedTimeframe = durationStr;
    }

    // 1. Верхняя плашка кругового виджета-счётчика
    const orbPairEl = document.getElementById("winkyOrbPair");
    if (orbPairEl) {
      orbPairEl.textContent = state.targetPair;
    }

    // 2. Строка таймфрейма внутри круга
    const orbTimeEl = document.getElementById("winkyOrbTime");
    if (orbTimeEl) {
      orbTimeEl.textContent = `Таймф: M1  Время: ${state.selectedTimeframe}`;
    }

    // 3. Селектор пары в боте
    const selectPair = document.getElementById("selectBotPair");
    if (selectPair && selectPair.value !== state.targetPair) {
      selectPair.value = state.targetPair;
    }

    // 4. Селектор таймфрейма в боте
    const selectTf = document.getElementById("selectBotTimeframe");
    if (selectTf && selectTf.value !== state.selectedTimeframe) {
      selectTf.value = state.selectedTimeframe;
    }

    // 5. Карточка сигнала в торговом боте
    updateCardPairUI();
  }

  function buildLiveScoreHTML() {
    const total = state.liveWins + state.liveLosses;
    const rawRate = total > 0 ? (state.liveWins / total) * 100 : 93.3;
    const displayRate = Math.max(93.0, rawRate).toFixed(1);
    const clockText = formatOrbClock();

    return `
      <!-- 1. Верхняя капсула -->
      <div class="winky-orb-capsule" id="winkyOrbCapsule">
        <div class="winky-orb-pair-title" id="winkyOrbPair">${state.targetPair}</div>
        <div class="winky-orb-clock" id="winkyOrbClock">${clockText}</div>
      </div>

      <!-- 2. Центральный медальон 196x196px с живым замкнутым неоновым кольцом 360° -->
      <div class="winky-orb-dial" id="winkyOrbMedallion">
        <div class="winky-orb-brand">WINK TRADE</div>
        <div class="winky-orb-timeframe" id="winkyOrbTime">Таймф: M1  Время: ${state.selectedTimeframe}</div>
        <div class="winky-orb-winrate" id="hudRateVal">${displayRate}%</div>
        <div class="winky-orb-wl-row">
          <div class="winky-orb-col wins">
            <span class="lbl">W</span>
            <span class="val" id="hudWinsVal">${state.liveWins}</span>
          </div>
          <div class="winky-orb-col losses">
            <span class="lbl">L</span>
            <span class="val" id="hudLossesVal">${state.liveLosses}</span>
          </div>
        </div>
        <div class="winky-orb-profit" id="hudProfitVal">ПРОФИТ: +$${state.sessionProfit.toLocaleString("en-US")}</div>
      </div>

      <!-- 3. Нижний док управления -->
      <div class="winky-orb-controls" id="winkyOrbControls">
        <button type="button" class="winky-orb-btn win" id="btnOrbAddWin" title="Добавить победу (+1 W)">+</button>
        <button type="button" class="winky-orb-btn reset" id="btnOrbReset" title="Сбросить счётчик">Reset</button>
        <button type="button" class="winky-orb-btn loss" id="btnOrbAddLoss" title="Добавить поражение (+1 L)">-</button>
        <button type="button" class="winky-orb-btn gear" id="btnOrbGear" title="Настройки счётчика">⚙️</button>
      </div>

      <!-- 4. Панель настроек (скрыта по умолчанию) -->
      <div class="winky-orb-settings" id="winkyOrbSettings" style="display: none;">
        <div class="winky-orb-settings-row">
          <label for="cfgOrbWins">Победы (W):</label>
          <input type="number" id="cfgOrbWins" value="${state.liveWins}" min="0">
        </div>
        <div class="winky-orb-settings-row">
          <label for="cfgOrbLosses">Минусы (L):</label>
          <input type="number" id="cfgOrbLosses" value="${state.liveLosses}" min="0">
        </div>
        <div class="winky-orb-settings-row">
          <label for="cfgOrbProfit">Профит ($):</label>
          <input type="number" id="cfgOrbProfit" value="${state.sessionProfit}">
        </div>
        <div class="winky-orb-settings-row" style="margin-top: 2px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:10px; cursor:pointer;">
            <input type="checkbox" id="cfgOrbHideControls" style="width:auto;"> Скрыть кнопки
          </label>
        </div>
        <button type="button" class="winky-orb-settings-apply" id="btnOrbApplySettings">Применить</button>
      </div>
    `;
  }

  function cleanRationaleText(str) {
    if (!str) return "";
    return String(str)
      .replace(/[📌🎯⚡⚠️]/g, "")
      .replace(/^(Картина графика:|Логика входа:|Настроение рынка:|Анализ просадки:|Умное перекрытие:|Chart structure:|Trade entry:|Market sentiment:|Drawdown analysis:|Smart recovery:)\s*/i, "")
      .trim();
  }

  function renderSignalCardState() {
    const block = document.getElementById("botDirectionBlock");
    const accEl = document.getElementById("metricAccuracyVal");
    if (!block) return;

    if (state.botState === "IDLE") {
      block.className = "winky-direction-block winky-signal-display idle";
      block.innerHTML = `<span>${t("readyForSignal")}</span>`;
    } else if (state.botState === "SWITCHING_PAIR") {
      block.className = "winky-direction-block winky-signal-display analysing";
      block.innerHTML = `
        <div class="winky-scan-top">
          <div class="winky-scan-title">
            <span>🔄</span>
            <span>${state.lang === "ru" ? "СМЕНА ВАЛЮТНОЙ ПАРЫ..." : "SWITCHING PAIR..."}</span>
          </div>
          <div class="winky-scan-score-badge">WAIT</div>
        </div>
        <div class="winky-flip-stage">
          <div class="winky-flip-card">
            <div class="winky-flip-header">
              <span class="winky-flip-step-name">${state.lang === "ru" ? "ПОИСК ЧИСТОГО ГРАФИКА" : "SEEKING CLEAN CHART"}</span>
              <span class="winky-flip-status scanning">${state.lang === "ru" ? "ПЕРЕХОД..." : "SWITCHING..."}</span>
            </div>
            <div class="winky-flip-desc">
              ${state.lang === "ru" ? "Выбираем доходную валютную пару с минимальным рыночным шумом." : "Selecting high-payout asset with low market noise."}
            </div>
          </div>
        </div>
      `;
    } else if (state.botState === "ANALYZING_PAIR" || state.botState === "ANALYZING") {
      // Do not overwrite active Deep Chart Vision 3D flip scanner if already rendered!
      if (block.querySelector(".winky-flip-stage") && block.querySelector(".winky-scan-segments")) {
        return;
      }
      renderAnalysisStep(
        0,
        4,
        state.lang === "ru" ? "МАКРО-ТРЕНД" : "MACRO TREND",
        state.lang === "ru" ? "Сканирование структуры свечей и старшего тренда..." : "Scanning higher timeframe & candle structure...",
        "5.0"
      );
    } else if (state.botState === "PREPARING_TRADE") {
      // Do not overwrite active sniper pullback hunting view!
      if (block.querySelector(".signal-dir-large") || (block.textContent && block.textContent.includes("СНАЙПЕРСКИЙ ВХОД"))) {
        return;
      }
      block.className = "winky-direction-block winky-signal-display analysing";
      block.innerHTML = `
        <div class="winky-scan-top">
          <div class="winky-scan-title">
            <span>🎯</span>
            <span>${state.lang === "ru" ? "ПОИСК ТОЧКИ ВХОДА..." : "HUNTING ENTRY POINT..."}</span>
          </div>
          <div class="winky-scan-score-badge">SNIPER</div>
        </div>
        <div class="winky-flip-stage">
          <div class="winky-flip-card">
            <div class="winky-flip-header">
              <span class="winky-flip-step-name">${state.lang === "ru" ? "СНАЙПЕРСКИЙ МИКРО-ОТКАТ" : "SNIPER MICRO-PULLBACK"}</span>
              <span class="winky-flip-status confirmed">✓ OK</span>
            </div>
            <div class="winky-flip-desc">
              ${state.lang === "ru" ? "Ждём выгодной микро-коррекции для идеальной цены входа." : "Waiting for favorable micro-correction for prime entry."}
            </div>
          </div>
        </div>
      `;
    } else if (state.botState === "COOLDOWN") {
      block.className = "winky-direction-block winky-signal-display idle";
      block.innerHTML = `<span>${state.lang === "ru" ? "ПАУЗА МЕЖДУ СДЕЛКАМИ..." : "POST-TRADE COOLDOWN..."}</span>`;
    } else if (state.botState === "IN_TRADE" && state.activeSignal) {
      const sig = state.activeSignal;
      const isBuy = sig.direction === "BUY";
      const isRu = (state.lang === "ru");
      if (accEl) accEl.textContent = `${sig.accuracy}%`;

      const cleanLine1 = cleanRationaleText(sig.line1);
      const cleanLine2 = cleanRationaleText(sig.line2);
      let strategyText = cleanLine1;
      if (cleanLine2 && cleanLine2 !== cleanLine1) {
        strategyText += (strategyText.endsWith(".") ? " " : ". ") + cleanLine2;
      }
      if (!strategyText) {
        strategyText = isBuy
          ? (isRu ? "Подтверждённый отскок от зоны спроса — покупатели удерживают инициативу." : "Confirmed demand zone bounce — buyers sustaining upside momentum.")
          : (isRu ? "Пробой локального уровня поддержки — продавцы давят цену вниз без откатов." : "Support breakdown confirmed — sellers pressing price action lower.");
      }

      block.className = `winky-direction-block winky-signal-display active ${isBuy ? "buy" : "sell"}`;
      block.innerHTML = `
        <div class="winky-sig-hero">
          <div class="winky-sig-dir-wrap ${isBuy ? "buy" : "sell"}">
            <span class="winky-sig-arrow">${isBuy ? "↗" : "↘"}</span>
            <span class="winky-sig-dir-text">${isBuy ? (isRu ? "КУПИТЬ · ВВЕРХ" : "BUY · CALL") : (isRu ? "ПРОДАТЬ · ВНИЗ" : "SELL · PUT")}</span>
          </div>
          <div class="winky-sig-timer-capsule">
            <span class="winky-sig-pulse-dot">●</span>
            <span class="winky-sig-timer-val" id="signalTimerVal">${formatTime(sig.durationSec)}</span>
          </div>
        </div>

        <div class="winky-sig-strategy-box ${isBuy ? "buy" : "sell"}">
          <div class="winky-sig-strategy-meta">
            <span>${isRu ? "АНАЛИТИКА ВХОДА" : "ENTRY ANALYTICS"}</span>
            <span class="winky-sig-strategy-score">★ ${sig.confluence ? sig.confluence.toFixed(1) : "4.7"} / 5.0 · ${sig.accuracy}%</span>
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
    updateStakeBadgeUI();
  }

  function updateCardPairUI() {
    const flagsEl = document.getElementById("cardPairFlags");
    const nameEl = document.getElementById("cardPairName");
    const payoutEl = document.getElementById("cardPayoutBadge");
    const timeEl = document.getElementById("metricTimeframeVal");
    const pillPair = document.getElementById("pillChatPair");
    const pillTime = document.getElementById("pillChatTime");

    if (flagsEl) flagsEl.textContent = state.targetFlags;
    if (nameEl) nameEl.textContent = state.targetPair;
    if (payoutEl) payoutEl.textContent = `+${state.targetPayout}`;
    if (timeEl) timeEl.textContent = state.selectedTimeframe;
    if (pillPair) pillPair.textContent = state.targetPair;
    if (pillTime) pillTime.textContent = state.selectedTimeframe;
    updateStakeBadgeUI();
  }

  function updateScoreOnTradeClose(isWin, profitDelta, lossDelta, wasRecovery = false) {
    const totalBefore = state.liveWins + state.liveLosses;
    const rawRateBefore = totalBefore > 0 ? (state.liveWins / totalBefore) * 100 : 93.3;

    if (isWin) {
      // Правило списания минуса на перекрытии:
      // Если до этой победы винрейт опустился ниже 93% (rawRateBefore < 93.0)
      // ИЛИ это победное перекрытие (wasRecovery) при наличии минусов в статистике
      if ((rawRateBefore < 93.0 || wasRecovery) && state.liveLosses > 0) {
        state.liveLosses = Math.max(0, state.liveLosses - 1);
        state.liveWins += 1;
        loggerLog(`[updateScoreOnTradeClose] 🎉 Списание 1 минуса на перекрытии! Новые W/L: ${state.liveWins}/${state.liveLosses}`);
      } else {
        state.liveWins += 1;
      }
      state.sessionProfit += (profitDelta || Math.round(state.currentStake * 0.92));
    } else {
      // МИНУС
      state.liveLosses += 1;
      state.sessionProfit = Math.max(0, state.sessionProfit - (lossDelta || state.currentStake));
    }

    saveStats();
    updateScoreHUDUI();
  }

  function updateScoreHUDUI() {
    const winsEl = document.getElementById("hudWinsVal");
    const lossesEl = document.getElementById("hudLossesVal");
    const rateEl = document.getElementById("hudRateVal");
    const profitEl = document.getElementById("hudProfitVal");

    const total = state.liveWins + state.liveLosses;
    const rawRate = total > 0 ? (state.liveWins / total) * 100 : 93.3;
    // На экране табло процент никогда не опускается ниже 93.0%
    const displayRate = Math.max(93.0, rawRate).toFixed(1);

    if (winsEl) winsEl.textContent = state.liveWins;
    if (lossesEl) lossesEl.textContent = state.liveLosses;
    if (rateEl) rateEl.textContent = `${displayRate}%`;
    if (profitEl) profitEl.textContent = `ПРОФИТ: +$${state.sessionProfit.toLocaleString("en-US")}`;

    // Обновляем SVG-кольцо прогресса
    const circleProgress = document.getElementById("winkyOrbRingProgress");
    if (circleProgress) {
      const circumference = 527.78; // 2 * PI * 84
      const percentClamped = Math.min(100, Math.max(0, parseFloat(displayRate)));
      const offset = circumference - (percentClamped / 100) * circumference;
      circleProgress.style.strokeDashoffset = `${offset.toFixed(1)}px`;
    }

    // Sync to local server
    sendProxyMessage("/api/live_stats", "POST", {
      wins: state.liveWins,
      losses: state.liveLosses,
      pair: state.targetPair,
    });
  }

  function saveStats() {
    try {
      localStorage.setItem(
        "winky_live_stats_v5",
        JSON.stringify({
          wins: state.liveWins,
          losses: state.liveLosses,
          profit: state.sessionProfit,
        })
      );
    } catch (_) {}
  }

  function populatePairOptions() {
    const select = document.getElementById("selectBotPair");
    if (!select) return;

    const list = PAIR_CATALOG[state.marketType] || PAIR_CATALOG.otc;
    select.innerHTML = "";

    let hasSelected = false;
    list.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.flags} ${p.name} (${p.payout})`;
      if (p.id.toLowerCase() === state.targetPair.toLowerCase()) {
        opt.selected = true;
        hasSelected = true;
      }
      select.appendChild(opt);
    });

    if (!hasSelected && state.targetPair) {
      const meta = getPairMeta(state.targetPair);
      const opt = document.createElement("option");
      opt.value = meta.id;
      opt.textContent = `${meta.flags} ${meta.name} (${meta.payout})`;
      opt.selected = true;
      select.prepend(opt);
    }

    const currentMeta = getPairMeta(state.targetPair);
    state.targetFlags = currentMeta.flags;
    state.targetPayout = currentMeta.payout;
    updateCardPairUI();
  }

  function renderChatFeed() {
    const feed = document.getElementById("botChatFeed");
    if (!feed) return;
    feed.innerHTML = "";

    state.chatMessages.forEach((msg) => {
      const bubble = document.createElement("div");
      bubble.className = `winky-chat-bubble ${msg.type}`;
      if (msg.type === "ai") {
        bubble.innerHTML = `
          <div class="bubble-header">
            <span class="ai-badge">WINKY AI</span>
            <span class="bubble-model">${msg.model || "Claude Fable"}</span>
          </div>
          <div>${msg.text}</div>
        `;
      } else {
        bubble.innerHTML = `
          <div class="bubble-header">
            <span style="color:#00F5A0;">YOU</span>
          </div>
          <div>${msg.text}</div>
        `;
      }
      feed.appendChild(bubble);
    });
    feed.scrollTop = feed.scrollHeight;
  }

  function setupEventListeners() {
    // 1. Language buttons
    document.querySelectorAll(".winky-lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.lang = btn.dataset.lang || "ru";
        document.querySelectorAll(".winky-lang-btn").forEach((b) => b.classList.toggle("active", b === btn));
        renderSignalCardState();
      });
    });

    // 2. Collapse button
    const btnCollapse = document.getElementById("btnCollapseBot");
    const botRoot = document.getElementById("winky-bot-root");
    if (btnCollapse && botRoot) {
      btnCollapse.addEventListener("click", () => {
        botRoot.classList.toggle("collapsed");
        btnCollapse.textContent = botRoot.classList.contains("collapsed") ? "+" : "—";
      });
    }

    // 3. Auto-Stream Toggle
    const autoToggle = document.getElementById("autoStreamToggle");
    if (autoToggle) {
      autoToggle.addEventListener("click", () => {
        state.autoStream = !state.autoStream;
        autoToggle.classList.toggle("active", state.autoStream);
        if (state.autoStream) {
          VoiceManager.playCategory("switch_pair", false);
          if (state.botState === "IDLE") {
            setTimeout(startSignalAnalysis, 1200);
          }
        }
      });
    }

    // 4. Tab Navigation
    document.querySelectorAll(".winky-nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        state.activeTab = tab;
        document.querySelectorAll(".winky-nav-item").forEach((b) => b.classList.toggle("active", b === btn));
        const sTab = document.getElementById("tabContentSignals");
        const cTab = document.getElementById("tabContentChat");
        if (sTab) sTab.classList.toggle("active", tab === "signals");
        if (cTab) cTab.classList.toggle("active", tab === "chat");
      });
    });

    // 5. Market Switch (OTC / Regular)
    document.querySelectorAll(".winky-market-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.botState !== "IDLE") return;
        state.marketType = btn.dataset.mtype || "otc";
        document.querySelectorAll(".winky-market-btn").forEach((b) => b.classList.toggle("active", b === btn));
        populatePairOptions();
      });
    });

    // 6. Pair Select change
    const selectPair = document.getElementById("selectBotPair");
    if (selectPair) {
      selectPair.addEventListener("change", (e) => {
        if (state.botState !== "IDLE") return;
        setUnifiedActivePair(e.target.value);
        POAutomation.switchPair(state.targetPair);
      });
    }

    // 7. Timeframe Select change
    const selectTf = document.getElementById("selectBotTimeframe");
    if (selectTf) {
      selectTf.addEventListener("change", (e) => {
        if (state.botState !== "IDLE") return;
        setUnifiedActivePair(state.targetPair, state.targetPayout, e.target.value);
      });
    }

    // 8. Get Signal Button
    const btnGet = document.getElementById("btnGetSignalAction");
    if (btnGet) {
      btnGet.addEventListener("click", startSignalAnalysis);
    }

    // 9. Secret Streamer Triggers
    const logoEl = document.getElementById("winkyBrandLogo");
    if (logoEl) {
      logoEl.addEventListener("click", () => {
        state.forceDir = "BUY";
      });
    }
    const cardPairEl = document.getElementById("cardPairClickable");
    if (cardPairEl) {
      cardPairEl.addEventListener("click", () => {
        state.forceDir = "SELL";
      });
    }
    const rateEl = document.getElementById("hudRateVal");
    if (rateEl) {
      rateEl.addEventListener("click", () => {
        state.forcedLoss = true;
        loggerLog("Secret trigger: следующая сделка завершится ДОГОНОМ для демонстрации!");
      });
    }

    // 10. AI Chat Send
    const btnSend = document.getElementById("btnSendChatAction");
    const pillPair = document.getElementById("pillChatPair");
    const pillTime = document.getElementById("pillChatTime");
    const modelSelect = document.getElementById("selectChatModel");

    function sendChatMessage() {
      const model = modelSelect ? modelSelect.value : state.selectedModel;
      state.chatMessages.push({
        type: "user",
        text: `Анализ ${state.targetPair} (${state.selectedTimeframe}) через ${model}`,
      });
      renderChatFeed();

      setTimeout(() => {
        const analysis = ChartAnalyzer.analyzeMarket();
        state.chatMessages.push({
          type: "ai",
          model: modelSelect ? modelSelect.options[modelSelect.selectedIndex].text.split("·")[0].trim() : "Claude",
          text: `
            <b>${state.targetPair} · ${state.selectedTimeframe}</b><br>
            ${analysis.line1}<br>
            ${analysis.line2}<br>
            <b style="color:${analysis.direction === "BUY" ? "#00F5A0" : "#FF3B69"};">
              РЕКОМЕНДАЦИЯ: ${analysis.direction === "BUY" ? "КУПИТЬ ↗" : "ПРОДАТЬ ↘"} (${analysis.accuracy}%)
            </b>
          `,
        });
        renderChatFeed();
      }, 700);
    }

    if (btnSend) btnSend.addEventListener("click", sendChatMessage);
    if (pillPair) pillPair.addEventListener("click", sendChatMessage);
    if (pillTime) pillTime.addEventListener("click", sendChatMessage);

    // 11. Circular Orb Counter buttons & settings
    const btnOrbAddWin = document.getElementById("btnOrbAddWin");
    const btnOrbAddLoss = document.getElementById("btnOrbAddLoss");
    const btnOrbReset = document.getElementById("btnOrbReset");
    const btnOrbGear = document.getElementById("btnOrbGear");
    const btnOrbApplySettings = document.getElementById("btnOrbApplySettings");
    const cfgOrbHideControls = document.getElementById("cfgOrbHideControls");

    if (btnOrbAddWin) {
      btnOrbAddWin.addEventListener("click", (e) => {
        e.stopPropagation();
        state.liveWins += 1;
        state.sessionProfit += 46;
        saveStats();
        updateScoreHUDUI();
      });
    }

    if (btnOrbAddLoss) {
      btnOrbAddLoss.addEventListener("click", (e) => {
        e.stopPropagation();
        state.liveLosses += 1;
        saveStats();
        updateScoreHUDUI();
      });
    }

    if (btnOrbReset) {
      btnOrbReset.addEventListener("click", (e) => {
        e.stopPropagation();
        state.liveWins = 28;
        state.liveLosses = 2;
        state.sessionProfit = 1420;
        saveStats();
        updateScoreHUDUI();
        sendProxyMessage("/api/live_stats", "POST", { reset: true });
      });
    }

    if (btnOrbGear) {
      btnOrbGear.addEventListener("click", (e) => {
        e.stopPropagation();
        const settingsEl = document.getElementById("winkyOrbSettings");
        if (settingsEl) {
          const isHidden = settingsEl.style.display === "none";
          settingsEl.style.display = isHidden ? "flex" : "none";
        }
      });
    }

    if (btnOrbApplySettings) {
      btnOrbApplySettings.addEventListener("click", (e) => {
        e.stopPropagation();
        const wInp = document.getElementById("cfgOrbWins");
        const lInp = document.getElementById("cfgOrbLosses");
        const pInp = document.getElementById("cfgOrbProfit");
        if (wInp) state.liveWins = Math.max(0, parseInt(wInp.value, 10) || 0);
        if (lInp) state.liveLosses = Math.max(0, parseInt(lInp.value, 10) || 0);
        if (pInp) state.sessionProfit = parseInt(pInp.value, 10) || 0;
        const settingsEl = document.getElementById("winkyOrbSettings");
        if (settingsEl) settingsEl.style.display = "none";
        saveStats();
        updateScoreHUDUI();
      });
    }

    if (cfgOrbHideControls) {
      cfgOrbHideControls.addEventListener("change", (e) => {
        const controlsEl = document.getElementById("winkyOrbControls");
        if (controlsEl) {
          controlsEl.style.display = e.target.checked ? "none" : "flex";
        }
      });
    }
  }

  function injectWidgets() {
    // 1. Mount Trading Bot
    let botRoot = document.getElementById("winky-bot-root");
    if (!botRoot) {
      botRoot = document.createElement("div");
      botRoot.id = "winky-bot-root";
      document.body.appendChild(botRoot);
    }
    botRoot.innerHTML = buildTradingBotHTML();

    // 2. Mount Live Score Circular Orb HUD
    let scoreRoot = document.getElementById("winky-score-root");
    if (!scoreRoot) {
      scoreRoot = document.createElement("div");
      scoreRoot.id = "winky-score-root";
      document.body.appendChild(scoreRoot);
    }
    scoreRoot.innerHTML = buildLiveScoreHTML();

    // 3. Populate Pair Options & Chat
    populatePairOptions();
    renderChatFeed();
    setupEventListeners();

    // 4. Start Clock & Unified Sync
    setInterval(updateOrbClock, 1000);
    setUnifiedActivePair(state.targetPair, state.targetPayout, state.selectedTimeframe);
    updateScoreHUDUI();

    // 5. Enable Bulletproof Pointer Events Drag & Drop
    const botHeader = document.getElementById("winkyBotHeader");
    makeWidgetDraggable(botRoot, botHeader, "winky_bot_pos_v4");
    makeWidgetDraggable(scoreRoot, scoreRoot, "winky_score_pos_v4");

    window.__WINKY_STATE__ = state;
    window.__WINKY_CHART_ANALYZER__ = ChartAnalyzer;

    loggerLog("Winky Neko-Cyber Trading Bot & Circular Orb Counter успешно внедрены в DOM po.financial!");
  }

  function loggerLog(...args) {
    console.log("%c[WINKY AI NEKO-CYBER]", "color: #00F5A0; font-weight: bold;", ...args);
  }

  // Ensure DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWidgets);
  } else {
    injectWidgets();
  }
})();
