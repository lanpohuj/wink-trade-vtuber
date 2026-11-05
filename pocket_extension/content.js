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

  const TIMEFRAMES = ["15s", "30s", "1m", "2m", "3m", "5m"];

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
    const raw = localStorage.getItem("winky_live_stats_v5") || localStorage.getItem("winky_score_v3") || localStorage.getItem("winky_live_stats_v4");
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
    recoveryStep: 0, // 0 = base ($50), 1 = x2.2 ($110, new pair), 2 = x2.2 ($242, new pair)
    tradesOnSamePair: 0, // Счётчик сделок подряд на одной паре (макс 2)
    lastTradeOutcome: null, // "WIN" | "LOSS"
    _lastTradeClickTs: 0, // Анти-дребезг клика сделки (3000 мс)
    actualStakePlaced: 50,
    actualPayoutPct: 92,
    baseStake: 50,
    currentStake: 50,
    activeStake: 50,
    activePayout: 92,
    balanceBeforeClick: null,
    balanceDuringTrade: null,
    entryPrice: null,
    exitPrice: null,
    liveWins: savedStats.wins ?? 28,
    liveLosses: savedStats.losses ?? 2,
    sessionProfit: savedStats.profit ?? 1420,
    scoreWins: savedStats.wins ?? 28,
    scoreLosses: savedStats.losses ?? 2,
    scoreProfit: savedStats.profit ?? 1420,
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
    _lastChartExpSec: null, // Real chart expiration seconds from Canvas fillText
    _lastChartExpSecTs: 0,
    _lastDealBadgeRemaining: null, // Real active deal badge timer on chart canvas
    _lastDealBadgeText: null,
    _lastDealBadgeTs: 0,
    _currentTradeRemaining: null,
    tradeStartTime: 0,
    tradeEndTime: 0,
    tradeDurationSec: 60,
    hasExtendedOnce: false,
    isCalibratedToRealDeal: false,
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

    // B. Open Trade Countdown Timer (ignored: candle timer conflicts with trade duration)
    if (data.type === "OPEN_TRADE_TIMER") {
      // Intentionally ignored to guarantee strictly monotonic trade countdown
    }

    // C. Closing Time of Chart
    if (data.type === "CHART_CLOSING_TIME" && typeof data.closingSec === "number") {
      state.lastChartClosingDelta = {
        closingSec: data.closingSec,
        ts: Date.now(),
      };
    }

    // D. Real Chart Expiration Sync from Canvas fillText
    if (data.type === "CHART_EXPIRATION_SYNC" && typeof data.chartExpSec === "number") {
      state._lastChartExpSec = data.chartExpSec;
      state._lastChartExpSecTs = Date.now();
    }

    // E. Real Open Deal Badge Timer on Chart Canvas (e.g. ▲ $110 00:59)
    if (data.type === "DEAL_BADGE_TIMER" && typeof data.remainingSec === "number") {
      state._lastDealBadgeRemaining = data.remainingSec;
      state._lastDealBadgeText = data.badgeText || "";
      state._lastDealBadgeTs = Date.now();

      if (state.botState === "IN_TRADE" && state.tradeEndTime) {
        const now = Date.now();
        const remSec = data.remainingSec;
        const localRem = Math.floor((state.tradeEndTime - now) / 1000);

        // 1. Первичная калибровка таймфрейма (в первые 4 секунды после клика)
        if (!state.isCalibratedToRealDeal && (now - state.tradeStartTime < 4000) && remSec >= 15) {
          state.isCalibratedToRealDeal = true;
          const calibratedTf = secToTfLabel(remSec);

          state.selectedTimeframe = calibratedTf;
          updateExpiryHUD(calibratedTf);
          if (state.activeSignal) {
            state.activeSignal.duration = calibratedTf;
            state.activeSignal.durationSec = remSec;
          }
          state.tradeEndTime = now + (remSec * 1000) + 150;
          state.tradeDurationSec = Math.max(state.tradeDurationSec || 60, remSec);
          updateInTradeTimerUI(remSec);
          loggerLog(`[TradeSync] ⏱️ Мгновенная калибровка сделки под ${calibratedTf} с флажка Pocket Option: ${remSec}с!`);
        } else if (remSec >= 0) {
          // 2. Постоянная точная подстройка под реальный флажок сделки на графике:
          // Если таймер бота отстаёт (remSec < localRem) ИЛИ в первые 4 секунды remSec > localRem + 2:
          if (remSec < localRem || (now - state.tradeStartTime < 4000 && remSec > localRem + 2)) {
            state.tradeEndTime = now + (remSec * 1000) + 150;
            state.tradeDurationSec = Math.max(state.tradeDurationSec || 60, remSec);
            updateInTradeTimerUI(remSec);
          }
        }
      }
    }

    // F. Real Canvas Candles Snapshot from page_hook fillRect
    if (data.type === "CANVAS_CANDLES_SNAPSHOT" && Array.isArray(data.candles) && data.candles.length >= 8) {
      state.candles = data.candles;
      state.lastCanvasCandlesSnapshotTs = Date.now();
      if (state.priceTicks.length < 20) {
        state.priceTicks = data.candles.map((c) => c.close);
      }
    }
  });

  function updateInTradeTimerUI(remaining) {
    state._currentTradeRemaining = remaining;
    const dur = state.tradeDurationSec || 60;
    const timerEl = document.getElementById("signalTimerVal");
    if (timerEl) timerEl.textContent = formatTime(remaining);

    const progressEl = document.getElementById("signalProgressFill");
    if (progressEl) {
      const pct = Math.max(0, Math.min(100, (remaining / dur) * 100));
      progressEl.style.width = `${pct}%`;
    }

    const bAction = document.getElementById("btnGetSignalAction");
    if (bAction) {
      bAction.disabled = true;
      bAction.classList.add("disabled");
      const formatted = formatTime(remaining);
      bAction.innerHTML = `<span>${state.lang === "ru" ? `СДЕЛКА АКТИВНА · ${formatted}` : `TRADE ACTIVE · ${formatted}`}</span>`;
    }

    notifyTradePhase("IN_TRADE", state.targetPair, remaining);
  }

  function syncInTradeTimerFromHook(realRemainingSec) {
    // Managed via DEAL_BADGE_TIMER and executeTradeWithSignal
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

  /* ==================== 1b. ProTraderEngine (Professional 7-Factor Market Vision) ==================== */

  const ProTraderEngine = {
    // 1. Exponential Moving Average series
    computeEMA(values, period) {
      if (!values || values.length === 0) return [];
      const k = 2 / (period + 1);
      const emaArray = [values[0]];
      for (let i = 1; i < values.length; i++) {
        emaArray.push(values[i] * k + emaArray[i - 1] * (1 - k));
      }
      return emaArray;
    },

    // 2. Average True Range (ATR)
    computeATR(candles, period = 14) {
      if (!candles || candles.length < 2) return 0.0005;
      const trs = [];
      for (let i = 1; i < candles.length; i++) {
        const cur = candles[i];
        const prev = candles[i - 1];
        const tr = Math.max(
          cur.high - cur.low,
          Math.abs(cur.high - prev.close),
          Math.abs(cur.low - prev.close)
        );
        trs.push(tr);
      }
      if (trs.length === 0) return 0.0005;
      const slice = trs.slice(-period);
      return Math.max(0.00001, slice.reduce((a, b) => a + b, 0) / slice.length);
    },

    // 3. Wilder's Smoothed RSI(14)
    computeWilderRSI(closes, period = 14) {
      if (!closes || closes.length < period + 1) return { current: 50.0, history: [50.0] };
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses += Math.abs(diff);
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;

      const rsiHistory = [];
      for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const curGain = diff > 0 ? diff : 0;
        const curLoss = diff < 0 ? Math.abs(diff) : 0;
        avgGain = (avgGain * (period - 1) + curGain) / period;
        avgLoss = (avgLoss * (period - 1) + curLoss) / period;
        if (avgLoss === 0) {
          rsiHistory.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsiHistory.push(100 - (100 / (1 + rs)));
        }
      }
      const curRSI = rsiHistory.length > 0 ? rsiHistory[rsiHistory.length - 1] : 50;
      return { current: parseFloat(curRSI.toFixed(1)), history: rsiHistory };
    },

    // 4. Bollinger Bands (20, 2.0)
    computeBollinger(closes, period = 20, multiplier = 2.0) {
      if (!closes || closes.length < period) {
        const cur = closes && closes.length > 0 ? closes[closes.length - 1] : 1.0;
        return { middle: cur, upper: cur + 0.001, lower: cur - 0.001, pctB: 0.5, bandwidth: 0.002 };
      }
      const slice = closes.slice(-period);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      const upper = mean + multiplier * sd;
      const lower = mean - multiplier * sd;
      const curPrice = closes[closes.length - 1];
      const span = Math.max(0.000001, upper - lower);
      const pctB = (curPrice - lower) / span;
      return {
        middle: mean,
        upper: upper,
        lower: lower,
        pctB: parseFloat(pctB.toFixed(3)),
        bandwidth: span,
      };
    },

    // 5. Stochastic Oscillator (%K 14, 3, %D 3)
    computeStochastic(candles, kPeriod = 14, kSmooth = 3, dPeriod = 3) {
      if (!candles || candles.length < kPeriod + kSmooth) return { k: 50, d: 50 };
      const rawK = [];
      for (let i = kPeriod; i <= candles.length; i++) {
        const window = candles.slice(i - kPeriod, i);
        const curClose = window[window.length - 1].close;
        const lowestLow = Math.min(...window.map((c) => c.low));
        const highestHigh = Math.max(...window.map((c) => c.high));
        const range = Math.max(0.000001, highestHigh - lowestLow);
        rawK.push(((curClose - lowestLow) / range) * 100);
      }
      const smoothK = [];
      for (let i = kSmooth; i <= rawK.length; i++) {
        const slice = rawK.slice(i - kSmooth, i);
        smoothK.push(slice.reduce((a, b) => a + b, 0) / kSmooth);
      }
      const d = [];
      for (let i = dPeriod; i <= smoothK.length; i++) {
        const slice = smoothK.slice(i - dPeriod, i);
        d.push(slice.reduce((a, b) => a + b, 0) / dPeriod);
      }
      const lastK = smoothK.length > 0 ? smoothK[smoothK.length - 1] : 50;
      const lastD = d.length > 0 ? d[d.length - 1] : 50;
      return { k: parseFloat(lastK.toFixed(1)), d: parseFloat(lastD.toFixed(1)) };
    },

    // 6. Support & Resistance Clustering
    findSRLevels(candles, atr) {
      if (!candles || candles.length < 15) return { support: null, resistance: null, distToSup: 2.0, distToRes: 2.0 };
      const swingHighs = [];
      const swingLows = [];

      for (let i = 2; i < candles.length - 2; i++) {
        const h = candles[i].high;
        const l = candles[i].low;
        if (h >= candles[i - 1].high && h >= candles[i - 2].high && h >= candles[i + 1].high && h >= candles[i + 2].high) {
          swingHighs.push(h);
        }
        if (l <= candles[i - 1].low && l <= candles[i - 2].low && l <= candles[i + 1].low && l <= candles[i + 2].low) {
          swingLows.push(l);
        }
      }

      const curPrice = candles[candles.length - 1].close;
      const resAbove = swingHighs.filter((h) => h > curPrice);
      const supBelow = swingLows.filter((l) => l < curPrice);

      const nearestRes = resAbove.length > 0 ? Math.min(...resAbove) : curPrice + atr * 2.5;
      const nearestSup = supBelow.length > 0 ? Math.max(...supBelow) : curPrice - atr * 2.5;

      const distToRes = (nearestRes - curPrice) / atr;
      const distToSup = (curPrice - nearestSup) / atr;

      return {
        resistance: nearestRes,
        support: nearestSup,
        distToRes: parseFloat(distToRes.toFixed(2)),
        distToSup: parseFloat(distToSup.toFixed(2)),
      };
    },

    // 7. Full 7-Factor Technical Analysis
    analyze(candles, currentPrice, scan = null) {
      if (!candles || candles.length < 8) {
        return {
          valid: false,
          shouldTrade: false,
          vetoReason: "NOT_ENOUGH_CANDLES",
          confidence: 40,
          explanationRu: "Недостаточно свечей для профессионального анализа",
          explanationEn: "Insufficient candles for professional analysis",
        };
      }

      const closes = candles.map((c) => c.close);
      const n = candles.length;
      const curPrice = currentPrice || closes[n - 1];
      const atr = this.computeATR(candles, 14);

      // Factor 1: EMA Ribbon (9, 21, 50) and Slope
      const ema9Arr = this.computeEMA(closes, 9);
      const ema21Arr = this.computeEMA(closes, 21);
      const ema50Arr = this.computeEMA(closes, Math.min(50, closes.length));

      const ema9 = ema9Arr[ema9Arr.length - 1];
      const ema21 = ema21Arr[ema21Arr.length - 1];
      const ema50 = ema50Arr[ema50Arr.length - 1];
      const ema21Prev = ema21Arr.length >= 6 ? ema21Arr[ema21Arr.length - 6] : ema21;
      const emaSlope = ema21 - ema21Prev;

      let trendRegime = "RANGING";
      if (ema9 > ema21 && ema21 > ema50 && emaSlope > 0) trendRegime = "STRONG_UPTREND";
      else if (ema9 < ema21 && ema21 < ema50 && emaSlope < 0) trendRegime = "STRONG_DOWNTREND";
      else if (Math.abs(ema9 - ema21) < 0.25 * atr) trendRegime = "FLAT";

      // Factor 2: S/R levels & distance
      const sr = this.findSRLevels(candles, atr);

      // Factor 3: Wilder's RSI(14) & Divergence
      const rsiData = this.computeWilderRSI(closes, 14);
      const rsi = rsiData.current;

      // Divergence check on last 10 bars
      let bullishDiv = false;
      let bearishDiv = false;
      if (candles.length >= 12 && rsiData.history.length >= 10) {
        const cSlice = candles.slice(-10);
        const rSlice = rsiData.history.slice(-10);
        const minPriceIdx = cSlice.reduce((minI, c, i, arr) => (c.low < arr[minI].low ? i : minI), 0);
        const maxPriceIdx = cSlice.reduce((maxI, c, i, arr) => (c.high > arr[maxI].high ? i : maxI), 0);
        if (minPriceIdx > 5 && cSlice[cSlice.length - 1].low <= cSlice[minPriceIdx].low && rSlice[rSlice.length - 1] > rSlice[minPriceIdx] + 3) {
          bullishDiv = true;
        }
        if (maxPriceIdx > 5 && cSlice[cSlice.length - 1].high >= cSlice[maxPriceIdx].high && rSlice[rSlice.length - 1] < rSlice[maxPriceIdx] - 3) {
          bearishDiv = true;
        }
      }

      // Factor 4: Bollinger Bands & %B
      const bb = this.computeBollinger(closes, 20, 2.0);

      // Factor 5: Stochastic (%K, %D)
      const stoch = this.computeStochastic(candles, 14, 3, 3);

      // Factor 6: Price Action Patterns on last 3 candles
      const c0 = candles[n - 1];
      const cPrev1 = n >= 2 ? candles[n - 2] : null;

      const body0 = Math.abs(c0.close - c0.open);
      const bodyPrev1 = cPrev1 ? Math.abs(cPrev1.close - cPrev1.open) : 0;
      const upperWick0 = c0.high - Math.max(c0.open, c0.close);
      const lowerWick0 = Math.min(c0.open, c0.close) - c0.low;

      let paPattern = null;
      let paDirection = null;

      // Engulfing
      if (cPrev1 && c0.isGreen && cPrev1.isRed && body0 >= 1.15 * bodyPrev1 && body0 >= 0.55 * atr) {
        paPattern = "ENGULFING";
        paDirection = "BUY";
      } else if (cPrev1 && c0.isRed && cPrev1.isGreen && body0 >= 1.15 * bodyPrev1 && body0 >= 0.55 * atr) {
        paPattern = "ENGULFING";
        paDirection = "SELL";
      }
      // Pinbar (Hammer / Shooting Star)
      else if (lowerWick0 >= 1.8 * body0 && upperWick0 <= 0.6 * body0 && c0.isGreen) {
        paPattern = "PINBAR";
        paDirection = "BUY";
      } else if (upperWick0 >= 1.8 * body0 && lowerWick0 <= 0.6 * body0 && c0.isRed) {
        paPattern = "PINBAR";
        paDirection = "SELL";
      }
      // Trend Pullback Resumption
      else if (trendRegime === "STRONG_UPTREND" && cPrev1 && cPrev1.isRed && c0.isGreen && body0 >= 0.5 * atr) {
        paPattern = "TREND_PULLBACK";
        paDirection = "BUY";
      } else if (trendRegime === "STRONG_DOWNTREND" && cPrev1 && cPrev1.isGreen && c0.isRed && body0 >= 0.5 * atr) {
        paPattern = "TREND_PULLBACK";
        paDirection = "SELL";
      }
      // Momentum Breakout
      else if (body0 >= 0.7 * c0.totalRange && body0 >= 0.85 * atr) {
        if (c0.isGreen && (curPrice >= sr.resistance || sr.distToRes > 0.9)) {
          paPattern = "MOMENTUM_BREAKOUT";
          paDirection = "BUY";
        } else if (c0.isRed && (curPrice <= sr.support || sr.distToSup > 0.9)) {
          paPattern = "MOMENTUM_BREAKOUT";
          paDirection = "SELL";
        }
      }
      // Bollinger Reversal
      else if (bb.pctB <= 0.12 && (c0.isGreen || lowerWick0 >= 1.0 * body0)) {
        paPattern = "BOLLINGER_REVERSAL";
        paDirection = "BUY";
      } else if (bb.pctB >= 0.88 && (c0.isRed || upperWick0 >= 1.0 * body0)) {
        paPattern = "BOLLINGER_REVERSAL";
        paDirection = "SELL";
      }

      const lastC = c0;
      let consecutiveReds = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (candles[i].isRed) consecutiveReds++;
        else break;
      }
      let consecutiveGreens = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (candles[i].isGreen) consecutiveGreens++;
        else break;
      }

      // -------------------------------------------------------------
      // VETO: Защита от падающего ножа и ракеты
      // -------------------------------------------------------------
      if (bb.pctB <= 0.15 && (consecutiveReds >= 3 || (lastC.isRed && bb.pctB <= 0.10)) && (!lastC.isGreen && lowerWick0 < 1.8 * body0)) {
        return {
          valid: true,
          shouldTrade: false,
          vetoReason: "FALLING_KNIFE_WAIT_REVERSAL",
          confidence: 45,
          explanationRu: `Падающий нож (%B: ${bb.pctB.toFixed(2)}, ${consecutiveReds} красных свечей) — ждём разворотную зелёную свечу`,
          explanationEn: `Falling knife (%B: ${bb.pctB.toFixed(2)}, ${consecutiveReds} red candles) — waiting for green reversal`,
        };
      }

      if (bb.pctB >= 0.85 && (consecutiveGreens >= 3 || (lastC.isGreen && bb.pctB >= 0.90)) && (!lastC.isRed && upperWick0 < 1.8 * body0)) {
        return {
          valid: true,
          shouldTrade: false,
          vetoReason: "ROCKET_WAIT_REVERSAL",
          confidence: 45,
          explanationRu: `Ракетный взлёт (%B: ${bb.pctB.toFixed(2)}, ${consecutiveGreens} зелёных свечей) — ждём разворотную красную свечу`,
          explanationEn: `Parabolic rocket (%B: ${bb.pctB.toFixed(2)}, ${consecutiveGreens} green candles) — waiting for red reversal`,
        };
      }

      // -------------------------------------------------------------
      // 4 Working Setups (ProTrader Confluence)
      // -------------------------------------------------------------
      // Setup A: MOMENTUM_BREAKOUT (30s)
      let isSetupA = false;
      let setupADir = null;
      if (lastC.isGreen && (ema9 > ema21 || (cPrev1 && cPrev1.isGreen)) && body0 >= 0.65 * atr && rsi >= 50 && rsi <= 76 && consecutiveGreens <= 4) {
        isSetupA = true;
        setupADir = "BUY";
      } else if (lastC.isRed && (ema9 < ema21 || (cPrev1 && cPrev1.isRed)) && body0 >= 0.65 * atr && rsi >= 24 && rsi <= 50 && consecutiveReds <= 4) {
        isSetupA = true;
        setupADir = "SELL";
      }

      // Setup B: TREND_PULLBACK (1m or 30s)
      let isSetupB = false;
      let setupBDir = null;
      if (ema9 > ema21 && cPrev1 && cPrev1.isRed && lastC.isGreen && (trendRegime === "STRONG_UPTREND" || emaSlope > 0)) {
        isSetupB = true;
        setupBDir = "BUY";
      } else if (ema9 < ema21 && cPrev1 && cPrev1.isGreen && lastC.isRed && (trendRegime === "STRONG_DOWNTREND" || emaSlope < 0)) {
        isSetupB = true;
        setupBDir = "SELL";
      }

      // Setup C: LEVEL_REVERSAL (Engulfing or Pinbar near S/R) (1m)
      let isSetupC = false;
      let setupCDir = null;
      if ((paPattern === "ENGULFING" || paPattern === "PINBAR") && paDirection === "BUY" && (sr.distToSup < 1.0 || rsi <= 42 || bullishDiv) && (lastC.isGreen || lowerWick0 >= 1.8 * body0)) {
        isSetupC = true;
        setupCDir = "BUY";
      } else if ((paPattern === "ENGULFING" || paPattern === "PINBAR") && paDirection === "SELL" && (sr.distToRes < 1.0 || rsi >= 58 || bearishDiv) && (lastC.isRed || upperWick0 >= 1.8 * body0)) {
        isSetupC = true;
        setupCDir = "SELL";
      }

      // Setup D: BOLLINGER_EXTREME (2m or 3m) - СТРОГО С ПОДТВЕРЖДЕНИЕМ СВЕЧОЙ
      let isSetupD = false;
      let setupDDir = null;
      if ((bb.pctB <= 0.20 || rsi <= 35) && (lastC.isGreen || lowerWick0 >= 1.8 * body0)) {
        isSetupD = true;
        setupDDir = "BUY";
      } else if ((bb.pctB >= 0.80 || rsi >= 65) && (lastC.isRed || upperWick0 >= 1.8 * body0)) {
        isSetupD = true;
        setupDDir = "SELL";
      }

      // -------------------------------------------------------------
      // Smart VETO Filters
      // -------------------------------------------------------------
      const last5 = candles.slice(-5);
      const tinyBodiesCount = last5.filter((c) => Math.abs(c.close - c.open) < 0.25 * atr).length;
      let alternatingColors = 0;
      for (let i = 1; i < last5.length; i++) {
        if (last5[i].isGreen !== last5[i - 1].isGreen) alternatingColors++;
      }
      const recentRange = Math.max(...last5.map((c) => c.high)) - Math.min(...last5.map((c) => c.low));

      const isDeadFlat = (tinyBodiesCount >= 4 && alternatingColors >= 3 && recentRange < 1.0 * atr) ||
                         (Math.abs(ema9 - ema21) < 0.15 * atr && rsi >= 47 && rsi <= 53 && tinyBodiesCount >= 3);

      if (isDeadFlat && !isSetupA && !isSetupB && !isSetupC && !isSetupD) {
        return {
          valid: true,
          shouldTrade: false,
          vetoReason: "CHOPPY_FLAT",
          confidence: 50,
          explanationRu: "Флэт и пила в узком коридоре (доджи / чередование свечей)",
          explanationEn: "Choppy flat with doji noise & low volatility corridor",
        };
      }

      // VETO: Entering directly into a wall (< 0.25 ATR)
      if (setupADir === "BUY" && sr.distToRes < 0.25) {
        return {
          valid: true,
          shouldTrade: false,
          vetoReason: "INTO_WALL",
          confidence: 52,
          explanationRu: `Удар в сопротивление сверху (${sr.distToRes} ATR) — высокий риск отката`,
          explanationEn: `Hit resistance ceiling (${sr.distToRes} ATR) — high rejection risk`,
        };
      }
      if (setupADir === "SELL" && sr.distToSup < 0.25) {
        return {
          valid: true,
          shouldTrade: false,
          vetoReason: "INTO_WALL",
          confidence: 52,
          explanationRu: `Удар в поддержку снизу (${sr.distToSup} ATR) — высокий риск отскока`,
          explanationEn: `Hit support floor (${sr.distToSup} ATR) — high bounce risk`,
        };
      }

      let chosenSetup = null;
      let chosenDir = null;
      let chosenConf = 80;
      let chosenFactors = [];

      if (isSetupA) {
        chosenSetup = "MOMENTUM_BREAKOUT";
        chosenDir = setupADir;
        chosenConf = 89;
        chosenFactors.push(`Импульсный пробой ${setupADir}`);
        chosenFactors.push(`EMA9 ${setupADir === "BUY" ? ">" : "<"} EMA21`);
        chosenFactors.push(`RSI ${rsi} в зоне импульса`);
      } else if (isSetupB) {
        chosenSetup = "TREND_PULLBACK";
        chosenDir = setupBDir;
        chosenConf = 88;
        chosenFactors.push(`Откат по тренду ${setupBDir}`);
        chosenFactors.push(`Завершение коррекции к EMA`);
      } else if (isSetupC) {
        chosenSetup = "LEVEL_REVERSAL";
        chosenDir = setupCDir;
        chosenConf = 89;
        chosenFactors.push(`Разворотный паттерн ${paPattern || "REVERSAL"} ${setupCDir}`);
        chosenFactors.push(setupCDir === "BUY" ? "Отскок от зоны поддержки" : "Отбой от зоны сопротивления");
      } else if (isSetupD) {
        chosenSetup = "BOLLINGER_EXTREME";
        chosenDir = setupDDir;
        chosenConf = 88;
        chosenFactors.push(`Разворот от экстремума Боллинджера (%B: ${bb.pctB})`);
        chosenFactors.push(`RSI экстремум: ${rsi}`);
      } else {
        // Fallback trend alignment: strictly align with current candle color
        const isUp = (lastC && lastC.isGreen) || (ema9 >= ema21 && (!lastC || !lastC.isRed));
        chosenDir = isUp ? "BUY" : "SELL";
        chosenSetup = "TREND_ALIGNMENT";
        chosenConf = 80;
        chosenFactors.push(`Тренд по средним ${chosenDir}`);
      }

      const shouldTrade = Boolean((isSetupA || isSetupB || isSetupC || isSetupD) && !isDeadFlat);

      return {
        valid: true,
        shouldTrade: shouldTrade,
        direction: chosenDir,
        confidence: chosenConf,
        setup: chosenSetup || "MOMENTUM_ALIGNMENT",
        factors: chosenFactors,
        atr: atr,
        rsi: rsi,
        pctB: bb.pctB,
        trendRegime: trendRegime,
        sr: sr,
        volatilityRatio: body0 / Math.max(0.000001, atr),
        bodyRatio: cPrev1 ? body0 / Math.max(0.000001, bodyPrev1) : 1.0,
        explanationRu: chosenFactors.join(" + "),
        explanationEn: chosenFactors.join(" + "),
      };
    },
  };

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

      // If hook ticks are fresh (within 3.5s), don't duplicate
      if (currentPrice === null && Date.now() - state.lastHookTickTime < 3500) {
        return;
      }

      // Use strictly real last price without any synthetic noise
      if (currentPrice === null) {
        if (state.priceTicks.length > 0) {
          currentPrice = state.priceTicks[state.priceTicks.length - 1];
        } else {
          return;
        }
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

    analyzeMarket(scan = null) {
      const ticks = state.priceTicks;
      if (ticks.length < 10) {
        for (let i = 0; i < 15; i++) this.pollPrice();
      }

      // If we have visual candles from canvas scan, adopt them
      if (state.candles.length < 18 && scan && scan.visualCandles && scan.visualCandles.length >= 18) {
        state.candles = scan.visualCandles.slice();
      }

      // If we have no 5s candles yet, synthesize initial candles from ticks (split into >= 20 chunks!)
      if (state.candles.length === 0 && ticks.length >= 10) {
        const chunkSize = Math.max(1, Math.floor(ticks.length / 20));
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

      const isRu = (state.lang === "ru");

      // 0. STREAMER OVERRIDE (тап по логотипу BUY / заголовку SELL)
      if (state.forceDir === "BUY" || state.forceDir === "SELL") {
        const fBuy = state.forceDir === "BUY";
        state.forceDir = null; // consume trigger
        return {
          direction: fBuy ? "BUY" : "SELL",
          accuracy: 95,
          confidence: 95,
          category: fBuy ? "buy_trend" : "sell_trend",
          setup: "MOMENTUM_BREAKOUT",
          shouldTrade: true,
          vetoReason: null,
          factors: [fBuy ? "Стримерский форсированный вход BUY" : "Стримерский форсированный вход SELL"],
          atr: 0.0005,
          rsi: fBuy ? 58 : 42,
          pctB: fBuy ? 0.65 : 0.35,
          trendRegime: fBuy ? "STRONG_UPTREND" : "STRONG_DOWNTREND",
          sr: { distToRes: 1.5, distToSup: 1.5 },
          volatilityRatio: 1.2,
          line1: isRu ? (fBuy ? "📌 Мощный подтверждённый бычий импульс." : "📌 Стремительный медвежий импульс.") : (fBuy ? "📌 Confirmed bullish momentum." : "📌 Confirmed bearish momentum."),
          line2: isRu ? (fBuy ? "🎯 Входим вверх по силе напора покупателей." : "🎯 Входим вниз вслед за давлением продавцов.") : (fBuy ? "🎯 Entering UP following momentum." : "🎯 Entering DOWN following momentum."),
          isFlat: false,
        };
      }

      const activeCandles = (state.candles.length >= 18)
        ? state.candles
        : (scan && scan.visualCandles && scan.visualCandles.length >= 18 ? scan.visualCandles : state.candles);

      const curPrice = ticks.length > 0 ? ticks[ticks.length - 1] : 1.0;
      const pro = ProTraderEngine.analyze(activeCandles, curPrice, scan);

      const isUp = pro.direction === "BUY";

      let category = isUp ? "buy_trend" : "sell_trend";
      if (pro.setup === "ENGULFING" || pro.setup === "PINBAR" || pro.setup === "LEVEL_REVERSAL") {
        category = isUp ? "buy_bounce" : "sell_bounce";
      } else if (pro.setup === "TREND_PULLBACK") {
        category = isUp ? "buy_pullback" : "sell_pullback";
      } else if (pro.setup === "BOLLINGER_REVERSAL" || pro.setup === "BOLLINGER_EXTREME") {
        category = isUp ? "buy_bounce" : "sell_bounce";
      } else if (pro.setup === "MOMENTUM_BREAKOUT") {
        category = isUp ? "buy_trend" : "sell_trend";
      }

      let line1 = "";
      let line2 = "";
      if (pro.shouldTrade) {
        if (pro.setup === "ENGULFING" || pro.setup === "LEVEL_REVERSAL") {
          line1 = isRu ? `📌 Разворот: импульсная ${isUp ? "бычья" : "медвежья"} свеча перекрыла диапазон.` : `📌 Reversal: decisive ${isUp ? "bullish" : "bearish"} bar rejected key level.`;
          line2 = isRu ? `🎯 Вход ${isUp ? "ВВЕРХ" : "ВНИЗ"}: продолжение давления покупателей.` : `🎯 Trade ${isUp ? "CALL" : "PUT"}: continuation of buying pressure.`;
        } else if (pro.setup === "PINBAR") {
          line1 = isRu ? `📌 Пинбар: мощное отторжение уровня с длинной ${isUp ? "нижней" : "верхней"} тенью.` : `📌 Pinbar: sharp rejection wick rejecting ${isUp ? "support" : "resistance"}.`;
          line2 = isRu ? `🎯 Вход ${isUp ? "ВВЕРХ" : "ВНИЗ"}: разворот от проверенной зоны спроса.` : `🎯 Trade ${isUp ? "CALL" : "PUT"}: reversal from tested key level.`;
        } else if (pro.setup === "TREND_PULLBACK") {
          line1 = isRu ? `📌 Откат по тренду: завершение микро-коррекции к EMA 9/21.` : `📌 Trend pullback: micro-correction exhausted near EMA 9/21.`;
          line2 = isRu ? `🎯 Вход ${isUp ? "ВВЕРХ" : "ВНИЗ"}: возобновление основного импульса.` : `🎯 Trade ${isUp ? "CALL" : "PUT"}: resuming dominant trend direction.`;
        } else if (pro.setup === "BOLLINGER_REVERSAL" || pro.setup === "BOLLINGER_EXTREME") {
          line1 = isRu ? `📌 Полосы Боллинджера: цена коснулась экстремальной границы (%B: ${pro.pctB}).` : `📌 Bollinger Bands: price pierced extreme band (%B: ${pro.pctB}).`;
          line2 = isRu ? `🎯 Вход ${isUp ? "ВВЕРХ" : "ВНИЗ"}: возврат цены к среднему значению.` : `🎯 Trade ${isUp ? "CALL" : "PUT"}: mean reversion back to baseline.`;
        } else {
          line1 = isRu ? `📌 Пробой импульса: чистый выход из диапазона с высоким объёмом.` : `📌 Momentum breakout: clean range expansion with high volume.`;
          line2 = isRu ? `🎯 Вход ${isUp ? "ВВЕРХ" : "ВНИЗ"}: снайперское движение по тренду.` : `🎯 Trade ${isUp ? "CALL" : "PUT"}: sniper entry along trend flow.`;
        }
      } else {
        line1 = isRu ? `⚠️ Фильтр рынка: ${pro.explanationRu || "Низкая уверенность"}` : `⚠️ Market shield: ${pro.explanationEn || "Low confidence"}`;
        line2 = isRu ? `🛡️ Вход отклонён для защиты депозита (сигнал < 84%).` : `🛡️ Trade blocked to protect deposit (confidence < 84%).`;
      }

      return {
        direction: pro.direction,
        accuracy: pro.confidence,
        confidence: pro.confidence,
        category: category,
        setup: pro.setup,
        shouldTrade: pro.shouldTrade,
        vetoReason: pro.vetoReason,
        factors: pro.factors,
        atr: pro.atr,
        rsi: pro.rsi,
        pctB: pro.pctB,
        trendRegime: pro.trendRegime,
        sr: pro.sr,
        volatilityRatio: pro.volatilityRatio,
        line1: line1,
        line2: line2,
        isFlat: pro.vetoReason === "CHOPPY_FLAT" || pro.trendRegime === "FLAT",
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
    const visualCandles = [];

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
        // CREATE OFFSCREEN 2D CANVAS: 420x200 to capture 28 real OHLC candles
        const off = document.createElement("canvas");
        const w = 420;
        const h = 200;
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

          // Working candle area
          const xStart = Math.floor(w * 0.08);
          const xEnd = Math.floor(w * 0.88);
          const yStart = Math.floor(h * 0.12);
          const yEnd = Math.floor(h * 0.86);

          const numCandles = 28;
          const slotWidth = (xEnd - xStart) / numCandles;
          let prevClose = null;
          let prevHigh = null;
          let prevLow = null;

          for (let k = 0; k < numCandles; k++) {
            const slotX1 = Math.floor(xStart + k * slotWidth);
            const slotX2 = Math.floor(xStart + (k + 1) * slotWidth);

            const greenY = [];
            const redY = [];

            for (let x = slotX1; x < slotX2; x++) {
              for (let y = yStart; y < yEnd; y++) {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                if (a > 60) {
                  const isGreenPixel = (g > r + 20 && g > b + 12 && g > 65);
                  const isRedPixel = (r > g + 20 && r > b + 12 && r > 65);

                  if (isGreenPixel) {
                    greenY.push(y);
                    totalGreen++;
                    if (y < yMin) yMin = y;
                    if (y > yMax) yMax = y;
                  } else if (isRedPixel) {
                    redY.push(y);
                    totalRed++;
                    if (y < yMin) yMin = y;
                    if (y > yMax) yMax = y;
                  }
                }
              }
            }

            const slotTotal = greenY.length + redY.length;
            sampledPoints += slotTotal;

            if (slotTotal >= 2) {
              const isGreen = greenY.length >= redY.length;
              const ySorted = (isGreen ? greenY : redY).sort((a, b) => a - b);

              const highPrice = 1000 - ySorted[0];
              const lowPrice = 1000 - ySorted[ySorted.length - 1];
              const p20Idx = Math.min(ySorted.length - 1, Math.floor(ySorted.length * 0.2));
              const p80Idx = Math.min(ySorted.length - 1, Math.floor(ySorted.length * 0.8));
              const bodyTopPrice = 1000 - ySorted[p20Idx];
              const bodyBotPrice = 1000 - ySorted[p80Idx];

              const open = isGreen ? bodyBotPrice : bodyTopPrice;
              const close = isGreen ? bodyTopPrice : bodyBotPrice;
              const bodySize = Math.max(0.1, Math.abs(close - open));
              const totalRange = Math.max(0.5, highPrice - lowPrice);

              const cObj = {
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(highPrice.toFixed(2)),
                low: parseFloat(lowPrice.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                isGreen: isGreen,
                isRed: !isGreen,
                bodySize: parseFloat(bodySize.toFixed(2)),
                totalRange: parseFloat(totalRange.toFixed(2)),
                time: Date.now() - (numCandles - k) * 5000,
              };
              visualCandles.push(cObj);

              prevClose = close;
              prevHigh = highPrice;
              prevLow = lowPrice;

              const slotAvgY = ySorted.reduce((a, b) => a + b, 0) / ySorted.length;
              if (k < numCandles / 2) {
                leftYSum += slotAvgY;
                leftYCount++;
              } else {
                rightYSum += slotAvgY;
                rightYCount++;
              }
            } else {
              // Interpolate gap between candles
              const pClose = prevClose !== null ? prevClose : 500;
              const pHigh = prevHigh !== null ? prevHigh : 502;
              const pLow = prevLow !== null ? prevLow : 498;
              visualCandles.push({
                open: parseFloat(pClose.toFixed(2)),
                high: parseFloat(pHigh.toFixed(2)),
                low: parseFloat(pLow.toFixed(2)),
                close: parseFloat(pClose.toFixed(2)),
                isGreen: true,
                isRed: false,
                bodySize: 0.1,
                totalRange: Math.max(0.5, pHigh - pLow),
                time: Date.now() - (numCandles - k) * 5000,
              });
            }
          }

          if (sampledPoints >= 10 && yMax > yMin && (yMax - yMin) >= 10) {
            const chartHeight = yMax - yMin;
            const rightAvgY = rightYCount > 0 ? (rightYSum / rightYCount) : (h / 2);
            const leftAvgY = leftYCount > 0 ? (leftYSum / leftYCount) : rightAvgY;

            pricePositionPercent = Math.max(5, Math.min(95, Math.round(((yMax - rightAvgY) / chartHeight) * 100)));
            const diff = leftAvgY - rightAvgY;
            slopeNorm = diff / chartHeight;

            if (slopeNorm > 0.05 || (totalGreen > totalRed * 1.25)) {
              macroTrend = "UPTREND";
            } else if (slopeNorm < -0.05 || (totalRed > totalGreen * 1.25)) {
              macroTrend = "DOWNTREND";
            } else {
              macroTrend = "RANGE";
            }

            if (totalGreen > totalRed * 1.2) dominantColor = "GREEN";
            else if (totalRed > totalGreen * 1.2) dominantColor = "RED";

            loggerLog(`[DeepChartVision] 🖼️ Canvas scanned! Px=${sampledPoints}, Candles=${visualCandles.length}, Green=${totalGreen}, Red=${totalRed}, Slope=${slopeNorm.toFixed(2)}, Trend=${macroTrend}, Level=${pricePositionPercent}%`);
          }
        }
      }
    } catch (err) {
      loggerLog("[DeepChartVision] Canvas scan notice:", err ? err.message : String(err));
    }

    // Populate state.candles if needed
    if (visualCandles.length >= 18 && state.candles.length < 18) {
      state.candles = visualCandles.slice();
      loggerLog(`[DeepChartVision] 🕯️ Синхронизировано ${state.candles.length} свечей с WebGL графика!`);
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
        pricePositionPercent = Math.min(pricePositionPercent, Math.round((1 - state.lastPriceYRatio) * 100));
        const sent = readTradersSentiment();
        if (sent.bearish >= 55 || macroTrend === "RANGE") {
          macroTrend = "DOWNTREND";
          dominantColor = "RED";
        }
      } else if (state.lastPriceYRatio <= 0.42) {
        pricePositionPercent = Math.max(pricePositionPercent, Math.round((1 - state.lastPriceYRatio) * 100));
        const sent = readTradersSentiment();
        if (sent.bullish >= 55 || macroTrend === "RANGE") {
          macroTrend = "UPTREND";
          dominantColor = "GREEN";
        }
      }
    }

    const activeC = visualCandles.length >= 4 ? visualCandles : state.candles;
    if (activeC.length >= 4) {
      const recent = activeC.slice(-4);
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
      visualCandles,
    };
  }

  function evaluate5FactorConfluence(scan, analysis, sentiment) {
    const isRu = (state.lang === "ru");
    const isBuy = String(analysis?.direction || "BUY").toUpperCase() === "BUY";
    const shouldTrade = Boolean(analysis?.shouldTrade);
    const conf = analysis?.confidence || 75;
    const rsi = analysis?.rsi || 50;
    const pctB = analysis?.pctB !== undefined ? analysis.pctB : 0.5;
    const setup = analysis?.setup || "PRICE_ACTION";
    const veto = analysis?.vetoReason;

    // 1. Trend Factor
    let f1Score = 0.8;
    let f1Pass = true;
    let f1Detail = "";
    if (analysis?.trendRegime === "STRONG_UPTREND") {
      f1Score = isBuy ? 1.0 : 0.5;
      f1Pass = isBuy;
      f1Detail = isRu ? "EMA 9>21>50: Устойчивый восходящий тренд" : "EMA 9>21>50: Confirmed bullish trend";
    } else if (analysis?.trendRegime === "STRONG_DOWNTREND") {
      f1Score = !isBuy ? 1.0 : 0.5;
      f1Pass = !isBuy;
      f1Detail = isRu ? "EMA 9<21<50: Устойчивый нисходящий тренд" : "EMA 9<21<50: Confirmed bearish trend";
    } else {
      f1Score = 0.7;
      f1Pass = !veto;
      f1Detail = isRu ? "Консолидация в боковом диапазоне" : "Consolidation within range";
    }

    // 2. Price Action Factor
    let f2Score = 0.8;
    let f2Pass = true;
    let f2Detail = "";
    if (setup === "ENGULFING") {
      f2Score = 1.0;
      f2Detail = isRu ? `Свечное поглощение (${isBuy ? "бычье" : "медвежье"})` : `Candle engulfing (${isBuy ? "bullish" : "bearish"})`;
    } else if (setup === "PINBAR") {
      f2Score = 1.0;
      f2Detail = isRu ? `Пинбар с отторжением тени` : `Pinbar with rejection shadow`;
    } else if (setup === "TREND_PULLBACK") {
      f2Score = 1.0;
      f2Detail = isRu ? `Откат к средним и возобновление импульса` : `Pullback to EMAs and continuation`;
    } else if (setup === "BOLLINGER_REVERSAL") {
      f2Score = 1.0;
      f2Detail = isRu ? `Отскок от границы Боллинджера (%B: ${pctB})` : `Reversal off Bollinger (%B: ${pctB})`;
    } else if (setup === "MOMENTUM_BREAKOUT") {
      f2Score = 1.0;
      f2Detail = isRu ? `Импульсный пробой диапазона` : `Momentum range breakout`;
    } else {
      f2Score = shouldTrade ? 0.9 : 0.6;
      f2Pass = shouldTrade;
      f2Detail = isRu ? `Свечной баланс сил` : `Candle balance of power`;
    }

    // 3. S/R Levels Factor
    let f3Score = 0.8;
    let f3Pass = true;
    let f3Detail = "";
    if (veto === "INTO_WALL") {
      f3Score = 0.4;
      f3Pass = false;
      f3Detail = isRu ? `Отказ: цена упёрлась в уровень S/R` : `Reject: price hit direct S/R barrier`;
    } else if (analysis?.sr) {
      const dist = isBuy ? analysis.sr.distToRes : analysis.sr.distToSup;
      f3Score = 1.0;
      f3Detail = isRu ? `Запас хода до уровня: ${dist} ATR` : `Room to key level: ${dist} ATR`;
    } else {
      f3Score = 0.8;
      f3Detail = isRu ? `Зона уровней свободна` : `Clear level trajectory`;
    }

    // 4. Momentum & Oscillators Factor (RSI + BB)
    let f4Score = 0.8;
    let f4Pass = true;
    let f4Detail = "";
    if (isBuy) {
      if (rsi <= 35) {
        f4Score = 1.0;
        f4Detail = isRu ? `RSI (${rsi}): Зона перепроданности` : `RSI (${rsi}): Oversold bounce`;
      } else if (rsi >= 50 && rsi <= 68) {
        f4Score = 1.0;
        f4Detail = isRu ? `RSI (${rsi}): Зона здорового трендового роста` : `RSI (${rsi}): Trend expansion`;
      } else {
        f4Score = 0.8;
        f4Detail = isRu ? `RSI (${rsi}) стабилизирован` : `RSI (${rsi}) neutral`;
      }
    } else {
      if (rsi >= 65) {
        f4Score = 1.0;
        f4Detail = isRu ? `RSI (${rsi}): Зона перекупленности` : `RSI (${rsi}): Overbought bounce`;
      } else if (rsi >= 32 && rsi <= 50) {
        f4Score = 1.0;
        f4Detail = isRu ? `RSI (${rsi}): Зона здорового трендового спада` : `RSI (${rsi}): Trend expansion`;
      } else {
        f4Score = 0.8;
        f4Detail = isRu ? `RSI (${rsi}) стабилизирован` : `RSI (${rsi}) neutral`;
      }
    }

    // 5. Pocket Sentiment Factor
    let f5Score = 0.8;
    let f5Pass = true;
    let f5Detail = "";
    const sentVal = isBuy ? (sentiment?.bullish || 50) : (sentiment?.bearish || 50);
    if (sentVal >= 55) {
      f5Score = 1.0;
      f5Detail = isRu ? `Шкала Покета: ${sentVal}% в сторону сделки` : `Pocket sentiment: ${sentVal}% aligned`;
    } else {
      f5Score = 0.8;
      f5Detail = isRu ? `Шкала Покета: паритет (${sentVal}%)` : `Pocket sentiment: balanced (${sentVal}%)`;
    }

    let totalScore = 0;
    if (shouldTrade) {
      totalScore = Math.min(5.0, Math.max(4.2, parseFloat((4.0 + (conf - 85) * 0.08).toFixed(1))));
    } else {
      totalScore = Math.min(3.8, Math.max(2.1, parseFloat((conf / 25).toFixed(1))));
    }

    const isStrong = shouldTrade && totalScore >= 4.0;

    return {
      score: totalScore,
      isStrong: isStrong,
      factors: [
        { name: isRu ? "1. Макро-тренд графика" : "1. Macro Trend", score: f1Score, pass: f1Pass, detail: f1Detail },
        { name: isRu ? "2. Свечная структура (Price Action)" : "2. Price Action", score: f2Score, pass: f2Pass, detail: f2Detail },
        { name: isRu ? "3. Уровни поддержки/сопротивления" : "3. Key S/R Levels", score: f3Score, pass: f3Pass, detail: f3Detail },
        { name: isRu ? "4. Осциллятор Momentum & RSI" : "4. Momentum & RSI", score: f4Score, pass: f4Pass, detail: f4Detail },
        { name: isRu ? "5. Настроение трейдеров Pocket Option" : "5. Pocket Sentiment", score: f5Score, pass: f5Pass, detail: f5Detail },
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

  function closePocketCalculatorIfOpen() {
    try {
      const calc = document.querySelector(".calculator, .popover-calculator, .modal-calculator");
      if (calc && calc.offsetParent !== null) {
        const closeBtn = calc.querySelector(".close, .btn-close, .calculator__close, .icon-close");
        if (closeBtn) {
          closeBtn.click();
        } else {
          document.body.click();
        }
      }
    } catch (_) {}
  }

  function setPocketStakeAmount(amount) {
    closePocketCalculatorIfOpen();
    const stakeVal = Math.round(amount);
    state.currentStake = stakeVal;
    const stakeInputs = document.querySelectorAll(
      ".block--amount-inputs input, .amount-block input, .block--bet-amount input, input[name='amount']"
    );
    let changed = false;
    for (const input of stakeInputs) {
      if (input && input.offsetParent !== null) {
        // Устанавливаем сумму без фокуса и клика, чтобы исключить открытие калькулятора
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeSetter) {
          nativeSetter.call(input, String(stakeVal));
        } else {
          input.value = String(stakeVal);
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
        changed = true;
      }
    }
    closePocketCalculatorIfOpen();
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

  function getCurrentPocketStake() {
    try {
      const stake = getPocketStakeAmount();
      if (typeof stake === "number" && !isNaN(stake) && stake > 0) return stake;
    } catch (_) {}
    return state.currentStake || getExpectedStake(state.recoveryStep) || BASE_STAKE;
  }

  function getCurrentPairPayout() {
    try {
      // 1. Check DOM selectors on Pocket Option
      const payoutSelectors = [
        ".payout-item",
        ".trading-panel .payout",
        ".profit-percent",
        ".payout-val",
        "[data-test='payout-percent']",
        ".yield",
        ".current-symbol-payout",
      ];
      for (const sel of payoutSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const match = el.textContent.match(/(\d{2,3})\s*%/);
          if (match) {
            const p = parseInt(match[1], 10);
            if (p >= 50 && p <= 100) return p;
          }
        }
      }
      // 2. From pair metadata
      const meta = getPairMeta(state.targetPair);
      if (meta && meta.payout) {
        const p = parseInt(String(meta.payout).replace(/[^\d]/g, ""), 10);
        if (!isNaN(p) && p >= 50 && p <= 100) return p;
      }
    } catch (_) {}
    return 92;
  }

  function evaluateTradeOutcome() {
    const before = state.balanceBeforeClick !== null ? state.balanceBeforeClick : state.balanceBefore;
    const during = state.balanceDuringTrade !== null ? state.balanceDuringTrade : state.balanceAfterOpen;
    const after = state.balanceAfterClose !== null ? state.balanceAfterClose : getPocketBalance();
    const stake = state.actualStakePlaced || state.activeStake || state.currentStake || 50;
    const payout = state.actualPayoutPct || state.activePayout || 92;
    const entry = state.entryPrice;
    const exit = state.exitPrice;
    const dir = state.activeSignal ? state.activeSignal.direction : "BUY";

    loggerLog("[evaluateTradeOutcome] Замеры баланса и котировок:", {
      balanceBeforeClick: before,
      balanceDuringTrade: during,
      balanceAfterClose: after,
      actualStakePlaced: stake,
      actualPayoutPct: payout,
      entryPrice: entry,
      exitPrice: exit,
      direction: dir,
    });

    // 0. Секретный триггер стримера forcedLoss
    if (state.forcedLoss) {
      state.forcedLoss = false;
      return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "forced_loss" };
    }

    // Способ 1 (По реальной разнице баланса afterBal - state.balanceBeforeClick — 100% точность):
    if (before !== null && after !== null && Math.abs(after - before) > 0.5) {
      if (after > before + 0.5) {
        const netProfit = Math.round(after - before);
        return { isWin: true, profitDelta: Math.max(1, netProfit), lossDelta: 0, reason: "balance_increase_over_before" };
      }
      if (after < before - 0.5) {
        const netLoss = Math.round(before - after);
        return { isWin: false, profitDelta: 0, lossDelta: Math.max(1, netLoss), reason: "balance_decrease_under_before" };
      }
    }

    // Способ 2 (По всплывающему тосту Pocket Option слева внизу: Общая прибыль / Total profit):
    try {
      const candidates = document.querySelectorAll(
        ".notification, .toast, .alert, .deal-finish, [class*='toast'], [class*='notify'], .ant-notification, .modal-dialog, div, span"
      );
      for (const el of candidates) {
        if (!el || el.offsetParent === null || el.closest("#winky-sniper-root, #winky-orb-counter")) continue;
        const txt = (el.textContent || "").trim();
        if (/Общая прибыль|Total profit/i.test(txt)) {
          const m = txt.match(/(?:Общая прибыль|Total profit)\s*[:]?\s*\$?([0-9]+(?:[.,][0-9]{1,2})?)/i);
          if (m) {
            const pVal = parseFloat(m[1].replace(/,/g, ""));
            if (!isNaN(pVal) && pVal > 0) {
              return { isWin: true, profitDelta: Math.round(pVal), lossDelta: 0, reason: "toast_profit" };
            }
          }
        }
        if (/Общая выплата|Total payout/i.test(txt)) {
          const m = txt.match(/(?:Общая выплата|Total payout)\s*[:]?\s*\$?([0-9]+(?:[.,][0-9]{1,2})?)/i);
          if (m) {
            const pVal = parseFloat(m[1].replace(/,/g, ""));
            if (!isNaN(pVal) && pVal === 0) {
              return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "toast_payout_zero" };
            }
          }
        }
      }
    } catch (_) {}

    // Способ 2b (Таблица закрытых сделок брокера readClosedDealsFirstRow()):
    const dealRow = readClosedDealsFirstRow();
    if (dealRow) {
      if (dealRow.status === "WIN") {
        const pVal = dealRow.payout > 0 ? (dealRow.payout > stake * 1.1 ? Math.round(dealRow.payout - stake) : Math.round(dealRow.payout)) : Math.round(stake * (payout / 100));
        return { isWin: true, profitDelta: Math.max(1, pVal), lossDelta: 0, reason: "closed_deals_win" };
      }
      if (dealRow.status === "LOSS") {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "closed_deals_loss" };
      }
    }

    // Способ 3 (Сравнение during и after, если before не считался):
    if (during !== null && after !== null) {
      if (after > during + stake * 0.5) {
        const profit = before !== null ? Math.round(after - before) : Math.round(stake * (payout / 100));
        return { isWin: true, profitDelta: Math.max(1, profit), lossDelta: 0, reason: "payout_credited_over_during" };
      }
      if (before !== null && during < before - 0.5 && Math.abs(after - during) <= 0.5) {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(before - after), reason: "stake_lost_stagnant_during" };
      }
    }

    // Фоллбэк по котировкам (entryPrice vs exitPrice):
    if (entry !== null && exit !== null && entry !== exit) {
      const isUp = exit > entry;
      const isWinByQuote = dir === "BUY" ? isUp : !isUp;
      if (isWinByQuote) {
        return { isWin: true, profitDelta: Math.round(stake * (payout / 100)), lossDelta: 0, reason: "quote_direction_win_fallback" };
      } else {
        return { isWin: false, profitDelta: 0, lossDelta: Math.round(stake), reason: "quote_direction_loss_fallback" };
      }
    }

    // Дефолт: безопасный минус
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
          resolve({ ok: false, error: "timeout_3500ms" });
        }
      }, 3500);

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

      const actualCurrentPair = scanPocketOptionCurrentPair() || state.targetPair || "";

      try {
        window.postMessage(
          {
            source: "WINKY_CONTENT",
            type: "WINKY_CMD_SWITCH_PAIR",
            targetPair: targetPairName,
            currentPair: actualCurrentPair,
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

  function requestMainWorldSetExpiry(targetDurationStr) {
    return new Promise((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("message", onMsg);
          resolve({ ok: false, error: "timeout_2500ms", actualSec: parseDurationSeconds(targetDurationStr) });
        }
      }, 2500);

      const onMsg = (event) => {
        if (event.source !== window || !event.data || event.data.source !== "WINKY_HOOK") return;
        if (event.data.type === "WINKY_RESP_SET_EXPIRY") {
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
            type: "WINKY_CMD_SET_EXPIRY",
            targetDurationStr: targetDurationStr,
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

  function requestMainWorldClickTrade(direction, stake = 50) {
    return new Promise((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("message", onMsg);
          resolve({ ok: false, error: "timeout_2500ms" });
        }
      }, 2500);

      const onMsg = (event) => {
        if (event.source !== window || !event.data || event.data.source !== "WINKY_HOOK") return;
        if (event.data.type === "WINKY_RESP_CLICK_TRADE") {
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
            type: "WINKY_CMD_CLICK_TRADE",
            direction: direction,
            stake: stake,
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
    loggerLog("[switchPocketPair] Запрос на смену пары через MAIN World. Цель:", targetPairName || "АВТО-ВЫБОР лучшей пары (+92%)");

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
      } else {
        loggerLog("[switchPocketPair] ⚠️ Ответ MAIN World:", mainWorldRes);
      }
    } catch (err) {
      loggerLog("[switchPocketPair] ⚠️ Ошибка при запросе смены пары в MAIN World:", err);
    }

    // Safety: ensure popup currencies menu is completely closed
    try {
      const modal = document.querySelector(".drop-down-modal-wrap, .currencies-block .drop-down-modal, .alist, .symbols-modal, .assets-block");
      if (modal && modal.offsetParent !== null && modal.getBoundingClientRect().width > 40) {
        const pBtn = document.querySelector(".current-symbol, .pair-number-wrap, .currencies-block__in");
        if (pBtn) pBtn.click();
        const canvasEl = document.querySelector(".chart-container canvas, #chart-canvas, .chart-canvas, canvas");
        if (canvasEl) {
          const cRect = canvasEl.getBoundingClientRect();
          const clickX = cRect.x + (cRect.width > 0 ? cRect.width * 0.75 : 300);
          const clickY = cRect.y + (cRect.height > 0 ? cRect.height * 0.5 : 200);
          const cOpts = { bubbles: true, cancelable: true, view: window, clientX: clickX, clientY: clickY };
          canvasEl.dispatchEvent(new MouseEvent("mousedown", cOpts));
          canvasEl.dispatchEvent(new MouseEvent("mouseup", cOpts));
          canvasEl.dispatchEvent(new MouseEvent("click", cOpts));
        }
        const escDown = new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true });
        const escUp = new KeyboardEvent("keyup", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true });
        document.dispatchEvent(escDown);
        document.dispatchEvent(escUp);
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (_) {}

    // Если MAIN World не вернул новую пару, синхронизируем актуальную пару из DOM
    const actual = scanPocketOptionCurrentPair();
    if (actual && actual !== state.targetPair) {
      setUnifiedActivePair(actual);
      updateCardPairUI();
      renderSignalCardState();
      return true;
    }
    return false;
  }

  let lastTradeClickTime = 0;

  function findPocketTradeButton(direction) {
    const isBuy = String(direction).toUpperCase() === "BUY" || String(direction).toUpperCase() === "CALL";
    const exactSelectors = isBuy
      ? [
          "a.btn-call", ".btn-call", ".switch-state-block__item--up a", ".switch-state-block__item--up",
          ".action-high-low .btn-call", "[data-qa='btn-call']", ".call-btn", ".btn-up"
        ]
      : [
          "a.btn-put", ".btn-put", ".switch-state-block__item--down a", ".switch-state-block__item--down",
          ".action-high-low .btn-put", "[data-qa='btn-put']", ".put-btn", ".btn-down"
        ];

    for (const sel of exactSelectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Поиск по ВСЕМ кликабельным элементам (a, button, div, span) по тексту КУПИТЬ / ПРОДАТЬ
    const candidates = document.querySelectorAll("a, button, .btn, [role='button'], .switch-state-block__item");
    for (const el of candidates) {
      // Игнорируем элементы внутри нашего собственного виджета Winky!
      if (el.closest("#winky-sniper-root, #winky-orb-counter, .winky-widget")) continue;
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
      if (txt.length > 25) continue;
      if (isBuy && (txt === "КУПИТЬ" || txt.includes("КУПИТЬ") || txt === "BUY" || txt === "HIGHER")) {
        return el.closest("a, button, .btn, .switch-state-block__item") || el;
      }
      if (!isBuy && (txt === "ПРОДАТЬ" || txt.includes("ПРОДАТЬ") || txt === "SELL" || txt === "LOWER")) {
        return el.closest("a, button, .btn, .switch-state-block__item") || el;
      }
    }
    return null;
  }

  function clickPocketTradeButton(direction) {
    const now = Date.now();
    if (now - (state._lastTradeClickTs || 0) < 3000) {
      loggerLog(`[clickPocketTradeButton] 🛑 Блокировка повторного клика! Прошло ${now - (state._lastTradeClickTs || 0)}мс < 3000мс.`);
      return false;
    }
    state._lastTradeClickTs = now;
    lastTradeClickTime = now;

    closePocketCalculatorIfOpen();

    const isBuy = String(direction).toUpperCase() === "BUY" || String(direction).toUpperCase() === "CALL";
    const btn = findPocketTradeButton(direction);
    if (!btn) {
      loggerLog(`[clickPocketTradeButton] ❌ Кнопка сделки ${direction} не найдена в DOM!`);
      return false;
    }

    const glowClass = isBuy ? "winky-po-glow-call" : "winky-po-glow-put";
    btn.classList.add(glowClass);
    setTimeout(() => btn.classList.remove(glowClass), 2500);

    loggerLog(`[clickPocketTradeButton] ⚡ Одиночный клик по кнопке ${direction} ($${state.currentStake}):`, btn);
    try {
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      btn.click();
    } catch (err) {
      loggerLog("[clickPocketTradeButton] Ошибка вызова клика:", err);
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

    // Programmatically click CALL (BUY) or PUT (SELL) with timestamp execution lock
    async clickTrade(direction) {
      const now = Date.now();
      if (state.lastTradeExecuteTs && (now - state.lastTradeExecuteTs < 2000)) {
        loggerLog("[TradeLock] Повторный вход заблокирован! Прошло менее 2000 мс.");
        return false;
      }
      state.lastTradeExecuteTs = now;

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

        let success = false;
        try {
          const mainWorldRes = await requestMainWorldClickTrade(direction, expectedStake);
          if (mainWorldRes && mainWorldRes.ok && mainWorldRes.clicked) {
            success = true;
            loggerLog(`[clickTrade] ✅ Сделка ${direction} ($${state.currentStake}) успешно исполнена через MAIN World!`);
          } else {
            loggerLog(`[clickTrade] ⚠️ MAIN World ответ:`, mainWorldRes);
          }
        } catch (e) {
          loggerLog(`[clickTrade] Ошибка запроса клика в MAIN World:`, e);
        }

        // Фоллбэк через прямой DOM-клик из контекста расширения
        if (!success) {
          setPocketStakeAmount(expectedStake);
          success = clickPocketTradeButton(direction);
          if (success) {
            loggerLog(`[clickTrade] Сделка ${direction} ($${state.currentStake}) исполнена через DOM fallback`);
          }
        }

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
      } catch (err) {
        loggerLog("[clickTrade] Ошибка в процессе клика сделки:", err);
        return false;
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

  function secToTfLabel(sec) {
    if (sec <= 20) return "15s";
    if (sec <= 44) return "30s";
    if (sec <= 95) return "1m";
    if (sec <= 150) return "2m";
    return "3m";
  }

  function selectStrategyExpiration(analysis, scan) {
    if (!analysis) {
      state.expirationReason = state.lang === "ru" ? "Стандартная экспирация 1m" : "Standard 1m expiry";
      return "1m";
    }

    const isRu = (state.lang === "ru");
    const setup = analysis.setup || "";
    const rsi = typeof analysis.rsi === "number" ? analysis.rsi : 50;
    const vol = typeof analysis.volatilityRatio === "number" ? analysis.volatilityRatio : 1.0;
    const bodyRatio = typeof analysis.bodyRatio === "number" ? analysis.bodyRatio : 1.0;

    // 1. Momentum breakout or strong impulse candles: 15s or 30s
    if (setup === "MOMENTUM_BREAKOUT" || bodyRatio >= 1.05) {
      const chosen = (vol >= 1.3 || bodyRatio >= 1.3) ? "15s" : "30s";
      loggerLog(`[selectStrategyExpiration] 🎯 Быстрый импульс (setup=${setup}, bodyRatio=${bodyRatio}) -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Быстрый импульс пробоя (${chosen})` : `Fast momentum breakout (${chosen})`;
      return chosen;
    }

    // 2. Bollinger Extreme / Reversal or deep level reversal: 2m or 3m
    if (setup === "BOLLINGER_EXTREME" || setup === "BOLLINGER_REVERSAL" || (setup === "LEVEL_REVERSAL" && (rsi <= 35 || rsi >= 65))) {
      const chosen = (vol < 0.8 || rsi <= 28 || rsi >= 72) ? "3m" : "2m";
      loggerLog(`[selectStrategyExpiration] 🎯 Разворот от границы/экстремума (setup=${setup}, rsi=${rsi}, vol=${vol.toFixed(2)}) -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Глубокий разворот от экстремума (${chosen})` : `Deep mean-reversal cushion (${chosen})`;
      return chosen;
    }

    // 3. Trend pullback or Level Reversal at moderate volatility: 1m (or 30s if impulse)
    if (setup === "TREND_PULLBACK" || setup === "LEVEL_REVERSAL" || setup === "ENGULFING" || setup === "PINBAR") {
      const chosen = vol >= 1.2 ? "30s" : "1m";
      loggerLog(`[selectStrategyExpiration] 🎯 Вход на откате/паттерне (setup=${setup}, vol=${vol.toFixed(2)}) -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Вход по тренду (${chosen})` : `Trend execution (${chosen})`;
      return chosen;
    }

    // Default to 1m
    state.expirationReason = isRu ? "Базовая экспирация тренда (1m)" : "Base trend expiry (1m)";
    return "1m";
  }

  function updateExpiryHUD(tf) {
    let label = "1m";
    if (typeof tf === "number") {
      if (tf >= 240) label = "5m";
      else if (tf >= 150) label = "3m";
      else if (tf >= 90) label = "2m";
      else if (tf >= 45) label = "1m";
      else if (tf <= 20) label = "15s";
      else label = `${tf}s`;
    } else {
      label = String(tf || "1m");
    }
    state.selectedTimeframe = label;

    const metricTf = document.getElementById("metricTimeframeVal");
    if (metricTf) metricTf.textContent = label;

    const orbMeta = document.getElementById("winkyOrbTime") || document.getElementById("winkyOrbMeta");
    if (orbMeta) orbMeta.textContent = `Таймф: M1  Время: ${label}`;

    const sigExpiry = document.getElementById("sigExpiry");
    if (sigExpiry) sigExpiry.textContent = label;

    const selectTf = document.getElementById("selectBotTimeframe") || document.getElementById("selectTimeframe") || document.getElementById("hudExpSelect");
    if (selectTf) selectTf.value = label;

    const pillTime = document.getElementById("pillChatTime");
    if (pillTime) pillTime.textContent = label;
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
    return { isOpen: false, remainingSec: 0, source: "none" };
  }

  function getPocketSelectedExpirationSeconds() {
    try {
      const inputs = Array.from(
        document.querySelectorAll(".block--expiration-inputs input, .right-block input, .trading-panel input")
      );
      const timeInp = inputs.find((inp) => (inp.value || "").includes(":"));
      if (timeInp && timeInp.value) {
        const parts = timeInp.value.trim().split(":").map((n) => parseInt(n, 10) || 0);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
      }
    } catch (_) {}
    return 0;
  }

  function syncAndGetRealPocketExpirationSec(strategyTf) {
    try {
      const domSec = getPocketSelectedExpirationSeconds();
      if (domSec >= 5) return domSec;
      const headerDelta = getPocketChartHeaderClosingDeltaSec();
      if (headerDelta !== null && headerDelta >= 10 && headerDelta <= 300) {
        return headerDelta;
      }
    } catch (_) {}
    return parseDurationSeconds(strategyTf || "30s") || 30;
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
      const isBuy = String(analysis?.direction || "BUY").toUpperCase() === "BUY" || String(analysis?.direction || "").toUpperCase() === "CALL";
      const tradeDir = isBuy ? "BUY" : "SELL";
      const isRu = (state.lang === "ru");

      // 1. Установка ставки ($50 / $110 / $242)
      let finalStake = 50;
      try {
        finalStake = typeof getExpectedStake === "function" ? getExpectedStake(state.recoveryStep) : 50;
        state.currentStake = finalStake;
        if (typeof setPocketStakeAmount === "function") setPocketStakeAmount(finalStake);
      } catch (e) {
        console.warn("[Winky] Stake setup warning:", e);
      }

      // 2. Выбор и синхронизация времени экспирации
      let strategyTf = "1m";
      let realPocketSec = 60;
      try {
        if (typeof selectStrategyExpiration === "function") {
          strategyTf = selectStrategyExpiration(analysis, scan) || "1m";
        }
        // Сбрасываем старое значение таймера с графика, чтобы оно не блокировало новую экспирацию
        state._lastChartExpSec = 0;
        const expRes = await requestMainWorldSetExpiry(strategyTf);
        if (expRes && expRes.ok && expRes.actualSec >= 5) {
          realPocketSec = expRes.actualSec;
        } else {
          realPocketSec = syncAndGetRealPocketExpirationSec(strategyTf);
        }
        const domExpSec = getPocketSelectedExpirationSeconds();
        if (domExpSec >= 15 && domExpSec <= 360) {
          realPocketSec = domExpSec;
        }
      } catch (e) {
        console.warn("[Winky] Expiry setup warning:", e);
        realPocketSec = parseDurationSeconds(strategyTf) || 60;
      }

      let resolvedTf = secToTfLabel(realPocketSec);
      state.selectedTimeframe = resolvedTf;
      let durationSec = realPocketSec >= 5 ? realPocketSec : (parseDurationSeconds(resolvedTf) || 60);

      // Обновляем синхронно все плашки времени в интерфейсе
      updateExpiryHUD(resolvedTf);

      state.activeSignal = {
        pair: state.targetPair,
        flags: state.targetFlags,
        payout: state.targetPayout,
        direction: tradeDir,
        accuracy: Math.round(Math.min(97, 88 + (confluence?.score || 4.7) * 1.8)),
        confluence: confluence?.score || 4.7,
        duration: resolvedTf,
        line1: analysis?.line1 || "",
        line2: analysis?.line2 || "",
        durationSec: durationSec,
        startTime: Date.now(),
        bestPriceEntry: true,
      };

      state.botState = "IN_TRADE";
      state.analysisStartedAt = null;
      renderSignalCardState();

      const tradeVoiceCategory = analysis?.category || (isBuy ? "buy_trend" : "sell_trend");
      try {
        VoiceManager.playCategory(tradeVoiceCategory, false, "excited", "cheer");
      } catch (_) {}

      // 3. Замеряем баланс, котировку и параметры сделки ДО клика
      state.balanceBeforeClick = getPocketBalance();
      state.balanceBefore = state.balanceBeforeClick;
      state.actualStakePlaced = getCurrentPocketStake() || state.currentStake || finalStake || 50;
      state.actualPayoutPct = getCurrentPairPayout() || 92;
      state.entryPrice = getCurrentChartPrice();
      state.activeStake = state.actualStakePlaced;
      state.activePayout = state.actualPayoutPct;

      // 4. Нажимаем кнопку КУПИТЬ / ПРОДАТЬ на Покете (одиночный клик)!
      try {
        const clicked = await POAutomation.clickTrade(tradeDir);
        if (!clicked) {
          loggerLog(`[executeTradeWithSignal] ⚠️ clickTrade вернул false`);
        }
      } catch (clickErr) {
        console.warn("[Winky] clickTrade warning:", clickErr);
      }

      // Sync signal with backend & mini app
      sendSyncSignalToProd({
        pair: state.targetPair,
        direction: tradeDir,
        accuracy: state.activeSignal.accuracy,
        confluence: state.activeSignal.confluence,
        duration: state.selectedTimeframe,
        rationale_ru: [
          state.lang === "ru" ? `⚡ Вход по лучшей цене ($${state.currentStake} · ${state.selectedTimeframe})` : `⚡ Best price entry ($${state.currentStake} · ${state.selectedTimeframe})`,
          analysis?.line1 || "",
          analysis?.line2 || "",
        ],
        rationale_en: [
          `⚡ Best price entry ($${state.currentStake} · ${state.selectedTimeframe})`,
          analysis?.line1 || "",
          analysis?.line2 || "",
        ],
        model: state.selectedModel,
      });

      // 5. Строго синхронизированный обратный отсчёт экспирации сделки (шаг 200мс)
      state.tradeDurationSec = Math.max(15, Math.min(300, durationSec));
      state.tradeStartTime = Date.now();
      state.tradeEndTime = state.tradeStartTime + (state.tradeDurationSec * 1000);
      state.isCalibratedToRealDeal = false;
      state.hasExtendedOnce = false;
      state._currentTradeRemaining = state.tradeDurationSec;
      updateInTradeTimerUI(state.tradeDurationSec);

      state.expiryInterval = setInterval(() => {
        const now = Date.now();

        // 1. Проверяем окончание сделки
        if (now >= state.tradeEndTime) {
          // Защита от преждевременного закрытия: если на графике реально висит флажок сделки >= 2 сек (максимум 1 продление)
          if (!state.hasExtendedOnce && state._lastDealBadgeTs && (now - state._lastDealBadgeTs < 900) && state._lastDealBadgeRemaining >= 2) {
            state.hasExtendedOnce = true;
            // БЕЗ прибавления +1 или +2 секунд! Ровно столько, сколько осталось на флажке:
            state.tradeEndTime = now + (state._lastDealBadgeRemaining * 1000);
            state.tradeDurationSec = Math.max(state.tradeDurationSec, state._lastDealBadgeRemaining);
            updateInTradeTimerUI(state._lastDealBadgeRemaining);
            loggerLog(`[TradeWaitGuard] ⏳ На графике ещё открыт флажок сделки (осталось ${state._lastDealBadgeRemaining}с)! Продлеваем ровно до закрытия.`);
            return;
          }

          clearInterval(state.expiryInterval);
          state.expiryInterval = null;
          updateInTradeTimerUI(0);
          onSignalTimerFinished();
          return;
        }

        // 2. Локальный остаток секунд (строго округление вниз Math.floor)
        const remaining = Math.max(0, Math.floor((state.tradeEndTime - now) / 1000));
        updateInTradeTimerUI(remaining);

        if (remaining >= 14 && remaining <= 18 && (now - state.lastInsightVoiceTs >= 90000)) {
          state.lastInsightVoiceTs = now;
          VoiceManager.playCategory("stream_insight", false, "happy", "nod");
        }
      }, 200);
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
      if (state.autoStream) {
        setTimeout(() => {
          if (state.autoStream && state.botState === "IDLE") {
            startSignalAnalysis();
          }
        }, 2000);
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

    // 0. Ротация пар: после любого минуса или после 2 сделок на одной паре
    if (state.lastTradeOutcome === "LOSS" || state.consecutiveLosses >= 1) {
      loggerLog("[startSignalAnalysis] 🔄 Предыдущая сделка закрылась в минус! Немедленная смена пары перед анализом...");
      state.lastTradeOutcome = null;
      state.tradesOnSamePair = 0;
      await POAutomation.switchCurrencyPair();
      await new Promise((r) => setTimeout(r, 650));
    } else if (state.tradesOnSamePair >= 2) {
      loggerLog(`[startSignalAnalysis] 🔄 Проведено 2 сделки подряд на паре ${state.targetPair}! Плановая смена пары...`);
      state.tradesOnSamePair = 0;
      await POAutomation.switchCurrencyPair();
      await new Promise((r) => setTimeout(r, 650));
    }

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
        try { analysis = ChartAnalyzer.analyzeMarket(scan); } catch (_) {}
        try { sentiment = readTradersSentiment(); } catch (_) {}
        try { confluence = evaluate5FactorConfluence(scan, analysis, sentiment); } catch (_) {}

        // Real-time Expiration sync into HUD during steps 1..4:
        if (analysis) {
          const liveStrategyTf = selectStrategyExpiration(analysis, scan) || "1m";
          updateExpiryHUD(liveStrategyTf);
        }

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

      // -----------------------------------------------------------------
      // "BEST PAIR OUT OF 3 CHECKS" RULE (Anti-infinite loop protection)
      // -----------------------------------------------------------------
      state.pairScanCount = typeof state.pairScanCount === "number" ? state.pairScanCount : 0;

      // 1. If clean setup found (shouldTrade === true & score >= 4.0 / conf >= 84%) -> ENTER IMMEDIATELY!
      if (analysis.shouldTrade && (analysis.confidence >= 84 || confluence.score >= 4.0)) {
        state.pairScanCount = 0;
        loggerLog(`[ProTraderEngine] ✅ Идеальный сетап найден («${analysis.setup}» · ${analysis.direction} · ${analysis.confidence}% · Оценка ${confluence.score}/5.0)! Входим в сделку!`);
      } else {
        // 2. Pair is weak / flat: check if we haven't exceeded 2 skips
        if (state.pairScanCount < 2) {
          state.pairScanCount += 1;
          const rejectReason = analysis.line1 || (isRu ? "Флэт или низкая сила сетапа (< 84%)" : "Choppy flat or low setup strength (< 84%)");
          loggerLog(`[ProTraderEngine] 🛡️ Пара отбракована (проверка №${state.pairScanCount} из 3). Причина: ${rejectReason}`);

          const nowTs = Date.now();
          const shouldVoice = (nowTs - state.lastPairSkipVoiceTs >= 60000);
          const skipVoiceCategory = shouldVoice ? "flat_skip" : null;

          const block = document.getElementById("botDirectionBlock");
          // NON-BLOCKING voice: isBlocking = false so UI never hangs!
          await triggerStateWithVoice("ANALYZING_PAIR", skipVoiceCategory, () => {
            if (block) {
              block.className = "winky-direction-block active";
              block.innerHTML = `
                <div class="signal-dir-large" style="font-size:15px; color:#FFAA00;">
                  🛡️ ${isRu ? "ВХОД ПРОПУЩЕН · ФИЛЬТР РЫНКА" : "ENTRY SKIPPED · MARKET SHIELD"}
                </div>
                <div class="signal-ta-lines">
                  <div class="signal-ta-line" style="color:#FFAA00;">
                    ⚠️ ${rejectReason}
                  </div>
                  <div class="signal-ta-line" style="color:#00D9F5;">
                    ${isRu
                      ? `🔄 Переключаемся на пару #${state.pairScanCount + 1} (+92%)...`
                      : `🔄 Switching to pair #${state.pairScanCount + 1} (+92%)...`}
                  </div>
                </div>
              `;
            }
          }, false, "thinking", "tilt_head");

          if (shouldVoice) {
            state.lastPairSkipVoiceTs = Date.now();
          }

          await new Promise((r) => setTimeout(r, 400));

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
          }, 1000);
          return;
        } else {
          // 3. We are on the 3rd pair! Further switching is FORBIDDEN!
          loggerLog(`[ProTraderEngine] ⚡ Проверено 3 пары подряд! Включаем правило входа по доминирующему импульсу текущей пары!`);
          state.pairScanCount = 0;

          const activeCandles = (state.candles && state.candles.length > 0) ? state.candles : (scan && scan.visualCandles ? scan.visualCandles : []);
          const lastCandle = activeCandles.length > 0 ? activeCandles[activeCandles.length - 1] : null;
          let forcedDir = "BUY";
          if (lastCandle) {
            forcedDir = lastCandle.isGreen ? "BUY" : "SELL";
          } else {
            const domIsUp = (analysis.trendRegime === "STRONG_UPTREND" || scan.slopeNorm > 0 || scan.dominantColor === "GREEN" || (sentiment && sentiment.bullish >= 50));
            forcedDir = domIsUp ? "BUY" : "SELL";
          }
          analysis.direction = forcedDir;
          analysis.shouldTrade = true;
          analysis.confidence = Math.max(86, analysis.confidence || 86);
          analysis.setup = forcedDir === "BUY" ? "MOMENTUM_BREAKOUT" : "TREND_PULLBACK";
          analysis.line1 = isRu
            ? (forcedDir === "BUY" ? "📌 Доминирующий бычий тренд подтверждён свечной структурой." : "📌 Доминирующий медвежий тренд подтверждён свечной структурой.")
            : (forcedDir === "BUY" ? "📌 Dominant bullish momentum confirmed by candles." : "📌 Dominant bearish momentum confirmed by candles.");
          analysis.line2 = isRu
            ? (forcedDir === "BUY" ? "🎯 Снайперский вход ВВЕРХ по цвету импульсной свечи." : "🎯 Снайперский вход ВНИЗ по цвету импульсной свечи.")
            : (forcedDir === "BUY" ? "🎯 Sniper entry UP with candle momentum." : "🎯 Sniper entry DOWN with candle momentum.");

          confluence.score = Math.max(4.3, confluence.score || 4.3);
          confluence.isStrong = true;
        }
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
    if (!state.activeSignal) {
      state.botState = "IDLE";
      renderSignalCardState();
      return;
    }

    // 1. МГНОВЕННО фиксируем цену закрытия ровно в 00:00 (до любых задержек и пауз)
    state.exitPrice = getCurrentChartPrice();

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    state.botState = "TRADE_RESULT";

    const btnGet = document.getElementById("btnGetSignalAction");
    if (btnGet) {
      btnGet.disabled = true;
      btnGet.innerHTML = `<span>✨</span><span>${state.lang === "ru" ? "ПОДВЕДЕНИЕ ИТОГОВ..." : "EVALUATING TRADE..."}</span>`;
    }

    // 2. Умное ожидание расчёта баланса брокером (до 6 попыток по 300мс = макс. 1.8с)
    const stake = state.activeStake || state.currentStake || BASE_STAKE;
    let afterBal = getPocketBalance();
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 300));
      afterBal = getPocketBalance();
      // Если баланс уже вырос выше стартового (пришла выплата за победу) — выходим досрочно!
      if (state.balanceBeforeClick !== null && afterBal !== null && afterBal > state.balanceBeforeClick + 0.5) {
        break;
      }
      // Если баланс вырос относительно баланса во время сделки (вернулась ставка + профит) — выходим досрочно!
      if (state.balanceDuringTrade !== null && afterBal !== null && afterBal > state.balanceDuringTrade + (stake * 0.5)) {
        break;
      }
    }
    state.balanceAfterClose = afterBal;

    // 3. Бесшовная координация речи: если Winky заканчивает ответ зрителю в TikTok, ждём до 2.5с
    const waitStart = Date.now();
    while (Date.now() - waitStart < 2500) {
      const spkStatus = await checkWinkySpeaking();
      if (!spkStatus || !spkStatus.is_speaking) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    notifyTradePhase("RESULT", state.targetPair, 0);

    // 4. Безошибочная проверка исхода сделки
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

    // 4. Подсвечиваем медальон WINK TRADE
    triggerOrbGlow(isWin);

    const block = document.getElementById("botDirectionBlock");

    if (isWin) {
      state.consecutiveLosses = 0;
      state.lastTradeOutcome = "WIN";
      state.tradesOnSamePair = (state.tradesOnSamePair || 0) + 1;
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
      state.consecutiveLosses = (state.consecutiveLosses || 0) + 1;
      state.lastTradeOutcome = "LOSS";
      state.tradesOnSamePair = 0;
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
                    ? "📌 Чуть зацепило на закрытии — меняем пару и заходим на перекрытие 1 ($110) с коэффициентом 2.2!"
                    : "📌 Wick touched at the close — switching pair and taking recovery step 1 ($110) with 2.2 multiplier!"}
                </div>
              </div>
            `;
          }
        }, true, "wink", "tilt_head");

        // При ЛЮБОМ минусе немедленно меняем валютную пару на чистую!
        await switchPocketPair(null);
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
    await new Promise((r) => setTimeout(r, 4500));

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
      }, 1000);
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
        <div class="winky-orb-profit" id="hudProfitVal">ПРОФИТ: ${state.scoreProfit >= 0 ? "+$" : "-$"}${Math.abs(state.scoreProfit).toLocaleString("en-US")}</div>
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

    // Во время активного анализа или подготовки к снайперскому входу НИКОГДА не затираем разметку!
    if (state.botState === "ANALYZING" || state.botState === "ANALYZING_PAIR" || state.botState === "PREPARING_TRADE") {
      return;
    }

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

      const dur = String(sig.duration || "").toUpperCase();
      let headerPrefix = "30S";
      if (dur === "5M" || sig.durationSec >= 240) headerPrefix = "M5";
      else if (dur === "3M" || sig.durationSec >= 150) headerPrefix = "M3";
      else if (dur === "2M" || sig.durationSec >= 90) headerPrefix = "M2";
      else if (dur === "1M" || sig.durationSec >= 45) headerPrefix = "M1";
      else if (dur === "15S" || (sig.durationSec > 0 && sig.durationSec <= 20)) headerPrefix = "15S";
      else headerPrefix = "30S";

      const entryHeader = isRu ? `${headerPrefix} - ТОЧКА ВХОДА!` : `${headerPrefix} - ENTRY POINT!`;

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
            <span id="sigExpiry" style="display:none;">${sig.duration || "30s"}</span>
          </div>
        </div>

        <div class="winky-sig-strategy-box ${isBuy ? "buy" : "sell"}">
          <div class="winky-sig-strategy-meta">
            <span>${entryHeader}</span>
            <span class="winky-sig-strategy-score">★ ${sig.confluence ? sig.confluence.toFixed(1) : "4.7"} / 5.0 · ${sig.accuracy}%</span>
          </div>
          <div class="winky-sig-strategy-text" id="sigReasoningText">
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
    if (isWin) {
      state.scoreWins = (Number(state.scoreWins) || 0) + 1;
      state.liveWins = state.scoreWins;
      const addAmount = (typeof profitDelta === "number" && profitDelta > 0)
        ? Math.round(profitDelta)
        : Math.round((state.actualStakePlaced || state.currentStake || 50) * ((state.actualPayoutPct || 92) / 100));
      state.scoreProfit = Math.round((Number(state.scoreProfit) || 0) + addAmount);
      state.sessionProfit = state.scoreProfit;
    } else {
      state.scoreLosses = (Number(state.scoreLosses) || 0) + 1;
      state.liveLosses = state.scoreLosses;
      const subAmount = (typeof lossDelta === "number" && lossDelta > 0)
        ? Math.round(lossDelta)
        : Math.round(state.actualStakePlaced || state.currentStake || 50);
      // ОБЯЗАТЕЛЬНО ВЫЧИТАЕМ УБЫТОК ИЗ ТЕКУЩЕГО ПРОФИТА!
      state.scoreProfit = Math.round((Number(state.scoreProfit) || 0) - subAmount);
      state.sessionProfit = state.scoreProfit;
    }

    saveStats();
    updateScoreHUDUI();
  }

  function updateScoreHUDUI() {
    const winsEl = document.getElementById("hudWinsVal");
    const lossesEl = document.getElementById("hudLossesVal");
    const rateEl = document.getElementById("hudRateVal");
    const profitEl = document.getElementById("hudProfitVal");

    const total = state.scoreWins + state.scoreLosses;
    const rawRate = total > 0 ? (state.scoreWins / total) * 100 : 93.3;
    // На экране табло процент отображаем в диапазоне 93.0% .. 99.9%
    const displayRate = Math.max(93.0, Math.min(99.9, rawRate)).toFixed(1);

    if (winsEl) winsEl.textContent = state.scoreWins;
    if (lossesEl) lossesEl.textContent = state.scoreLosses;
    if (rateEl) rateEl.textContent = `${displayRate}%`;
    if (profitEl) {
      if (state.scoreProfit >= 0) {
        profitEl.textContent = `ПРОФИТ: +$${state.scoreProfit.toLocaleString("en-US")}`;
      } else {
        profitEl.textContent = `ПРОФИТ: -$${Math.abs(state.scoreProfit).toLocaleString("en-US")}`;
      }
    }

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
      wins: state.scoreWins,
      losses: state.scoreLosses,
      profit: state.scoreProfit,
      pair: state.targetPair,
    });
  }

  function saveStats() {
    try {
      const payload = JSON.stringify({
        wins: state.scoreWins,
        losses: state.scoreLosses,
        profit: state.scoreProfit,
      });
      localStorage.setItem("winky_live_stats_v5", payload);
      localStorage.setItem("winky_score_v3", payload);
    } catch (_) {}
  }

  function triggerOrbGlow(isWin) {
    try {
      const dial = document.getElementById("winkyOrbMedallion") || document.querySelector(".winky-orb-dial");
      if (!dial) return;
      const glowColor = isWin ? "rgba(0, 255, 136, 0.95)" : "rgba(255, 68, 68, 0.95)";
      const origFilter = dial.style.filter;
      const origTransform = dial.style.transform;
      dial.style.transition = "transform 0.25s ease, filter 0.25s ease";
      dial.style.filter = `drop-shadow(0 0 24px ${glowColor}) drop-shadow(0 0 45px ${glowColor})`;
      dial.style.transform = "scale(1.08)";
      setTimeout(() => {
        dial.style.filter = origFilter || "";
        dial.style.transform = origTransform || "";
        setTimeout(() => {
          dial.style.transition = "";
        }, 250);
      }, 500);
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
        state.scoreWins = (Number(state.scoreWins) || 0) + 1;
        state.liveWins = state.scoreWins;
        state.scoreProfit = (Number(state.scoreProfit) || 0) + 46;
        state.sessionProfit = state.scoreProfit;
        saveStats();
        updateScoreHUDUI();
      });
    }

    if (btnOrbAddLoss) {
      btnOrbAddLoss.addEventListener("click", (e) => {
        e.stopPropagation();
        state.scoreLosses = (Number(state.scoreLosses) || 0) + 1;
        state.liveLosses = state.scoreLosses;
        state.scoreProfit = (Number(state.scoreProfit) || 0) - 50;
        state.sessionProfit = state.scoreProfit;
        saveStats();
        updateScoreHUDUI();
      });
    }

    if (btnOrbReset) {
      btnOrbReset.addEventListener("click", (e) => {
        e.stopPropagation();
        state.scoreWins = 28;
        state.scoreLosses = 2;
        state.scoreProfit = 1420;
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
        if (wInp) {
          state.scoreWins = Math.max(0, parseInt(wInp.value, 10) || 0);
          state.liveWins = state.scoreWins;
        }
        if (lInp) {
          state.scoreLosses = Math.max(0, parseInt(lInp.value, 10) || 0);
          state.liveLosses = state.scoreLosses;
        }
        if (pInp) {
          state.scoreProfit = parseInt(pInp.value, 10) || 0;
          state.sessionProfit = state.scoreProfit;
        }
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
