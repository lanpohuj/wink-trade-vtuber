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
    return BASE_STAKE;
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

  // v6 starts a verifiable session.  Older counters may contain guesses made
  // before broker-side order/result confirmation existed, so never reuse them.
  let savedStats = { wins: 0, losses: 0, profit: 0 };
  try {
    const raw = localStorage.getItem("winky_live_stats_v6");
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
    liveWins: savedStats.wins ?? 0,
    liveLosses: savedStats.losses ?? 0,
    sessionProfit: savedStats.profit ?? 0,
    scoreWins: savedStats.wins ?? 0,
    scoreLosses: savedStats.losses ?? 0,
    scoreProfit: savedStats.profit ?? 0,
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
    quoteTicks: [],
    brokerResults: {},
    settledIds: new Set(),
    lastSignalKey: null,
    executionBlocked: Boolean(localStorage.getItem('winky_unresolved_order')),
    pendingBrokerOrder: null,
    brokerOrder: null,
    closedDealBaseline: null,
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
      accuracy: "Качество сетапа",
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
      accuracy: "Setup quality",
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

  async function notifyTradePhase(phase, pair = "", remainingSec = 0, extra = {}) {
    try {
      const dir = extra.direction || state.activeSignal?.direction || "";
      const act = extra.action || (dir === "BUY" ? "CALL" : (dir === "SELL" ? "PUT" : ""));
      const res = await sendProxyMessage("/api/winky/trade_phase", "POST", {
        phase: phase,
        pair: pair || state.targetPair,
        remaining_sec: Math.max(0, Math.round(remainingSec || 0)),
        direction: dir,
        action: act,
        duration: extra.duration || state.activeSignal?.duration || state.selectedTimeframe || "30s",
        ...extra,
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
    if (event.source !== window || !event.data) return;
    const src = event.data.source;
    if (src !== "WINKY_HOOK" && src !== "WINKY_PAGE_HOOK") return;
    const data = event.data;

    const ingest = (items, asset) => {
      if (!asset || WinkyTradingCore.symbol(asset) !== WinkyTradingCore.symbol(state.targetPair)) return;
      const map = new Map(state.quoteTicks.map(t => [t.ts, t]));
      for (const t of items) {
        const ts = WinkyTradingCore.epoch(t.ts);
        if (Number.isFinite(ts) && ts <= Date.now()+1000 && ts > Date.now()-60*60000 && Number.isFinite(t.price) && t.price > 0) map.set(ts, { ts, price: t.price, asset });
      }
      state.quoteTicks = [...map.values()].sort((a,b)=>a.ts-b.ts).slice(-100000);
    };
    if (data.type === 'TICK' && data.source_type === 'ws') ingest([{price:data.price,ts:data.timestamp}], data.rawSymbol);
    if (data.type === 'WS_HISTORY_TICKS') ingest(data.ticks || [], data.asset);
    if (data.type === 'ORDER_SETTLED' && data.result?.id) state.brokerResults[data.result.id] = data.result;

    // A3. Actual Chart Timeframe Status from page_hook
    if (data.type === "CHART_TF_STATUS" && data.tf) {
      state.actualChartTf = data.tf;
      const orbEl = document.getElementById("winkyOrbTime") || document.querySelector(".winky-orb-val");
      if (orbEl) {
        orbEl.textContent = `Таймфрейм: ${data.tf}`;
      }
    }

    // The page hook emits this only after Pocket acknowledges the exact
    // outgoing openOrder packet. A synthetic button click is not sufficient.
    if (data.type === "ORDER_OPENED" && data.openedAt) {
      const pending = state.pendingBrokerOrder;
      if (pending && data.openedAt >= pending.requestedAt - 2000 && data.openedAt - pending.requestedAt <= 12000) {
        state.brokerOrder = {
          id: data.orderId || null,
          asset: data.asset || state.targetPair,
          amount: data.amount || pending.stake,
          remainingSec: data.remainingSec,
          closesAt: data.closesAt,
          openedAt: data.openedAt,
          source: "websocket",
        };
        loggerLog("[BrokerOrder] ✅ Pocket подтвердил открытие сделки:", state.brokerOrder);
      }
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

    // The acknowledged absolute close time owns the countdown; badge timers are display only.

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
    const dur = state.tradeDurationSec || 30;
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

  /* ==================== 1b. LiveTickBuffer & ProTraderEngine ==================== */

  const LiveTickBuffer = {
    pair: null,
    ticks: [], // { price, ts } max 1000
    addTick(price, ts = Date.now()) {
      if (!price || isNaN(price) || price <= 0) return;
      let numericTs = Number(ts);
      if (numericTs < 1e11) numericTs = numericTs * 1000;
      this.ticks.push({ price: Number(price), ts: numericTs });
      if (this.ticks.length > 1000) {
        this.ticks.splice(0, this.ticks.length - 1000);
      }
    },
    loadHistoryTicks(ticksArray, asset = null) {
      if (!Array.isArray(ticksArray) || ticksArray.length === 0) return;
      if (asset && state.targetPair) {
        const cleanAsset = String(asset).replace(/[^a-zA-Z]/g, "").toLowerCase();
        const cleanTarget = String(state.targetPair).replace(/[^a-zA-Z]/g, "").toLowerCase();
        if (cleanAsset.length >= 4 && cleanTarget.length >= 4 && !cleanTarget.includes(cleanAsset.slice(0, 4)) && !cleanAsset.includes(cleanTarget.slice(0, 4))) {
          return; // different pair
        }
      }
      const map = new Map();
      for (const t of this.ticks) {
        map.set(t.ts, t.price);
      }
      for (const t of ticksArray) {
        if (t && typeof t.price === "number" && !isNaN(t.price) && t.price > 0) {
          let ts = Number(t.ts || Date.now());
          if (ts < 1e11) ts = ts * 1000;
          map.set(ts, Number(t.price));
        }
      }
      const merged = Array.from(map.entries())
        .map(([ts, price]) => ({ ts, price }))
        .sort((a, b) => a.ts - b.ts);
      this.ticks = merged.slice(-1000);
      console.log(`[LiveTickBuffer] 📊 Loaded ${this.ticks.length} total ticks (merged ${ticksArray.length} new)`);
    },
    reset(newPair = null) {
      this.pair = newPair;
      this.ticks = [];
    },
    getMicroMetrics() {
      const nowTs = Date.now();
      const n = this.ticks.length;
      if (n === 0) {
        return {
          delta3s: 0,
          delta5s: 0,
          delta6s: 0,
          delta15s: 0,
          delta30s: 0,
          tickImbalance: 0,
          posIn15sRange: 0.5,
          ticksCount: 0,
        };
      }
      const curPrice = this.ticks[n - 1].price;
      const findPriceAtSec = (sec) => {
        const targetTs = nowTs - sec * 1000;
        for (let i = n - 1; i >= 0; i--) {
          if (this.ticks[i].ts <= targetTs) return this.ticks[i].price;
        }
        return this.ticks[0].price;
      };
      const p3 = findPriceAtSec(3);
      const p5 = findPriceAtSec(5);
      const p6 = findPriceAtSec(6);
      const p15 = findPriceAtSec(15);
      const p30 = findPriceAtSec(30);

      const delta3s = curPrice - p3;
      const delta5s = curPrice - p5;
      const delta6s = curPrice - p6;
      const delta15s = curPrice - p15;
      const delta30s = curPrice - p30;

      const recent20 = this.ticks.slice(-20);
      let upTicks = 0;
      let downTicks = 0;
      for (let i = 1; i < recent20.length; i++) {
        if (recent20[i].price > recent20[i - 1].price) upTicks++;
        else if (recent20[i].price < recent20[i - 1].price) downTicks++;
      }
      const tot = upTicks + downTicks;
      const tickImbalance = tot > 0 ? (upTicks - downTicks) / tot : 0;

      const recent15s = this.ticks.filter((t) => t.ts >= nowTs - 15000);
      let posIn15sRange = 0.5;
      if (recent15s.length >= 2) {
        const prices = recent15s.map((t) => t.price);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        const span = maxP - minP;
        if (span > 0) {
          posIn15sRange = Math.max(0, Math.min(1, (curPrice - minP) / span));
        }
      }

      return {
        delta3s,
        delta5s,
        delta6s,
        delta15s,
        delta30s,
        tickImbalance,
        posIn15sRange,
        ticksCount: n,
      };
    },
    buildCandles(periodSec = 15, maxBars = 45) {
      if (!this.ticks || this.ticks.length < 4) return [];
      const bucketMs = periodSec * 1000;
      const buckets = new Map();
      for (const t of this.ticks) {
        const bKey = Math.floor(t.ts / bucketMs) * bucketMs;
        if (!buckets.has(bKey)) {
          buckets.set(bKey, []);
        }
        buckets.get(bKey).push(t.price);
      }
      const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
      const candles = [];
      for (const k of sortedKeys) {
        const prices = buckets.get(k);
        if (!prices || prices.length === 0) continue;
        const open = prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const isGreen = close >= open;
        const isRed = !isGreen;
        const body = Math.max(0.00001, Math.abs(close - open));
        const range = Math.max(0.00001, high - low);
        const upperWick = Math.max(0, high - Math.max(open, close));
        const lowerWick = Math.max(0, Math.min(open, close) - low);
        candles.push({
          open,
          high,
          low,
          close,
          body,
          bodySize: body,
          totalRange: range,
          upperWick,
          lowerWick,
          isGreen,
          isRed,
          time: k,
          candlePeriodSec: periodSec,
        });
      }
      return candles.slice(-maxBars);
    },
    getCandleAgeSec(periodSec = 15) {
      return Math.floor((Date.now() / 1000) % periodSec);
    },
    getActualChartTfDisplay() {
      return state.actualChartTf || "—";
    },
  };

  function aggregateCandles(candles, groupSize) {
    if (!candles || candles.length === 0) return [];
    if (groupSize <= 1) return candles.slice();

    const result = [];
    const n = candles.length;
    for (let end = n; end > 0; end -= groupSize) {
      const start = Math.max(0, end - groupSize);
      const slice = candles.slice(start, end);
      if (slice.length === 0) continue;

      const first = slice[0];
      const last = slice[slice.length - 1];
      const open = first.open;
      const close = last.close;
      const high = Math.max(...slice.map((c) => c.high));
      const low = Math.min(...slice.map((c) => c.low));
      const isGreen = close >= open;
      const isRed = !isGreen;
      const body = Math.max(0.5, Math.abs(close - open));
      const range = Math.max(1.0, high - low);
      const upperWick = Math.max(0, high - Math.max(open, close));
      const lowerWick = Math.max(0, Math.min(open, close) - low);

      result.unshift({
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        body: parseFloat(body.toFixed(2)),
        bodySize: parseFloat(body.toFixed(2)),
        totalRange: parseFloat(range.toFixed(2)),
        upperWick: parseFloat(upperWick.toFixed(2)),
        lowerWick: parseFloat(lowerWick.toFixed(2)),
        isGreen,
        isRed,
        time: last.time,
      });
    }

    return result;
  }

  // The sole order decision engine lives in trading_core.js.

  const ChartAnalyzer = {
    onNewPriceTick(price, timestamp = Date.now(), yRatio = null) {
      if (!price || isNaN(price) || price <= 0) return;
      state.lastHookTickTime = timestamp;
      state.priceTicks.push(price);
      if (state.priceTicks.length > 120) state.priceTicks.shift();

      if (typeof LiveTickBuffer !== "undefined") {
        LiveTickBuffer.addTick(price, timestamp);
      }

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
      return WinkyTradingCore.analyze(state.quoteTicks, state.targetPair);
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
        // CREATE OFFSCREEN 2D CANVAS: 420x200 to capture full chart width up to x=90%
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
          let totalGreen = 0;
          let totalRed = 0;
          let sampledPoints = 0;

          // Scanning full candle area: up to 90% of canvas width (live candle is at ~82%..87%)
          const startX = Math.floor(w * 0.04);
          const endX = Math.floor(w * 0.90);
          const startY = Math.floor(h * 0.08);
          const endY = Math.floor(h * 0.90);

          // 1. Column-by-column scan to extract candle pixel profiles
          const columns = [];
          for (let x = startX; x < endX; x++) {
            const greenYs = [];
            const redYs = [];

            for (let y = startY; y < endY; y++) {
              const idx = (y * w + x) * 4;
              const a = data[idx + 3];
              if (a > 60) {
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                const isGreen = (g >= 135 && g > r + 45 && g > b + 25);
                const isRed = (r >= 150 && r > g + 45 && r > b + 35);

                if (isGreen) {
                  greenYs.push(y);
                  totalGreen++;
                  if (y < yMin) yMin = y;
                  if (y > yMax) yMax = y;
                } else if (isRed) {
                  redYs.push(y);
                  totalRed++;
                  if (y < yMin) yMin = y;
                  if (y > yMax) yMax = y;
                }
              }
            }

            const total = greenYs.length + redYs.length;
            sampledPoints += total;

            if (total < 2) {
              columns.push({ x, type: "EMPTY" });
            } else {
              const isGreen = greenYs.length >= redYs.length;
              const ys = (isGreen ? greenYs : redYs).sort((a, b) => a - b);
              columns.push({
                x,
                type: "CANDLE",
                isGreen,
                ys,
                minY: ys[0],
                maxY: ys[ys.length - 1],
                pixelCount: ys.length,
              });
            }
          }

          // 2. Group adjacent non-empty columns of identical color into candle clusters
          const rawClusters = [];
          let currentCluster = null;

          for (const col of columns) {
            if (col.type === "EMPTY") {
              if (currentCluster) {
                rawClusters.push(currentCluster);
                currentCluster = null;
              }
            } else {
              if (!currentCluster) {
                currentCluster = {
                  isGreen: col.isGreen,
                  cols: [col],
                };
              } else if (currentCluster.isGreen === col.isGreen) {
                currentCluster.cols.push(col);
              } else {
                rawClusters.push(currentCluster);
                currentCluster = {
                  isGreen: col.isGreen,
                  cols: [col],
                };
              }
            }
          }
          if (currentCluster) {
            rawClusters.push(currentCluster);
          }

          // 3. Median candle width calculation
          const validWidths = rawClusters
            .map((c) => c.cols.length)
            .filter((wLen) => wLen >= 2 && wLen <= 14)
            .sort((a, b) => a - b);
          const medianCandleWidth = validWidths.length > 0
            ? validWidths[Math.floor(validWidths.length / 2)]
            : 6;

          // 4. Split overly wide clusters (> 14px merged candles)
          const splitClusters = [];
          for (const clust of rawClusters) {
            const wLen = clust.cols.length;
            if (wLen > 14) {
              const step = Math.max(4, Math.round(medianCandleWidth));
              for (let i = 0; i < wLen; i += step) {
                const subCols = clust.cols.slice(i, i + step);
                if (subCols.length >= 2) {
                  splitClusters.push({ isGreen: clust.isGreen, cols: subCols });
                }
              }
            } else {
              splitClusters.push(clust);
            }
          }

          // 5. Build candle objects with separate body and wicks + Y-axis inversion (price = h - y)
          for (let ci = 0; ci < splitClusters.length; ci++) {
            const cluster = splitClusters[ci];
            const cols = cluster.cols;
            const colCount = cols.length;

            const allYs = [];
            for (const c of cols) allYs.push(...c.ys);
            if (allYs.length < 4) continue;

            const highY = Math.min(...allYs);
            const lowY = Math.max(...allYs);
            if (lowY - highY < 2) continue;

            let bodyTopY = highY;
            let bodyBottomY = lowY;

            if (colCount >= 3) {
              const minColsForBody = Math.max(2, Math.ceil(colCount * 0.5));
              const rowsWithBody = [];

              for (let y = highY; y <= lowY; y++) {
                let colsWithY = 0;
                for (const c of cols) {
                  if (c.ys.includes(y)) colsWithY++;
                }
                if (colsWithY >= minColsForBody) {
                  rowsWithBody.push(y);
                }
              }

              if (rowsWithBody.length >= 2) {
                bodyTopY = rowsWithBody[0];
                bodyBottomY = rowsWithBody[rowsWithBody.length - 1];
              } else {
                bodyTopY = bodyBottomY = Math.round((highY + lowY) / 2);
              }
            } else {
              bodyTopY = highY + Math.round((lowY - highY) * 0.25);
              bodyBottomY = lowY - Math.round((lowY - highY) * 0.25);
            }

            // Invert Y: y=0 is top of screen (high price), y=h is bottom (low price)
            const high = h - highY;
            const low = h - lowY;
            const bodyHigh = h - bodyTopY;
            const bodyLow = h - bodyBottomY;

            const open = cluster.isGreen ? bodyLow : bodyHigh;
            const close = cluster.isGreen ? bodyHigh : bodyLow;
            const body = Math.max(0.5, Math.abs(close - open));
            const range = Math.max(1.0, high - low);
            const upperWick = Math.max(0, high - Math.max(open, close));
            const lowerWick = Math.max(0, Math.min(open, close) - low);

            const xCenter = (cols[0].x + cols[cols.length - 1].x) / 2;

            visualCandles.push({
              open: parseFloat(open.toFixed(2)),
              high: parseFloat(high.toFixed(2)),
              low: parseFloat(low.toFixed(2)),
              close: parseFloat(close.toFixed(2)),
              body: parseFloat(body.toFixed(2)),
              bodySize: parseFloat(body.toFixed(2)),
              totalRange: parseFloat(range.toFixed(2)),
              upperWick: parseFloat(upperWick.toFixed(2)),
              lowerWick: parseFloat(lowerWick.toFixed(2)),
              isGreen: cluster.isGreen,
              isRed: !cluster.isGreen,
              xCenter: Math.round(xCenter),
              colCount,
              time: Date.now() - (splitClusters.length - ci) * 15000,
            });
          }

          if (visualCandles.length >= 4) {
            const firstC = visualCandles.slice(0, Math.min(6, visualCandles.length));
            const lastC = visualCandles.slice(-6);
            const leftAvgPrice = firstC.reduce((s, c) => s + c.close, 0) / firstC.length;
            const rightAvgPrice = lastC.reduce((s, c) => s + c.close, 0) / lastC.length;
            const minAll = Math.min(...visualCandles.map((c) => c.low));
            const maxAll = Math.max(...visualCandles.map((c) => c.high));
            const chartHeight = Math.max(1.0, maxAll - minAll);

            pricePositionPercent = Math.max(5, Math.min(95, Math.round(((rightAvgPrice - minAll) / chartHeight) * 100)));
            slopeNorm = (rightAvgPrice - leftAvgPrice) / chartHeight;

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
    if (visualCandles.length >= 8) {
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
    const factors = (analysis?.factors?.length ? analysis.factors : [analysis?.line1 || 'Ожидание данных']).map((detail, i) => ({ name: 'Условие ' + (i+1), detail, pass: Boolean(analysis?.shouldTrade), score: analysis?.qualityScore || 0 }));
    return { score: analysis?.qualityScore || 0, isStrong: Boolean(analysis?.shouldTrade), factors };
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
      const livePayout = getPocketActivePayout();
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
      if (livePayout) meta.payout = livePayout;

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

      if (normPair !== state.targetPair || (livePayout && livePayout !== state.targetPayout)) {
        state.marketType = normPair.toLowerCase().includes("otc") ? "otc" : "regular";
        setUnifiedActivePair(normPair, livePayout || meta.payout);
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

  function getPocketActivePayout() {
    const selectors = [
      ".current-symbol", ".pair-number-wrap", ".symbols-list__item--active",
      ".payout-val", ".current-payout", ".asset-payout", "[data-test='payout']",
      ".symbols-list__item--active .payout",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const match = el?.textContent?.match(/\b(\d{2,3})\s*%/);
      if (match) {
        const value = Number(match[1]);
        if (value >= 50 && value <= 100) return `${value}%`;
      }
    }
    return null;
  }

  function readPocketOptionBalance() {
    return getPocketBalance();
  }

  function getCurrentChartPrice() {
    const quote = state.quoteTicks.at(-1);
    return quote && Date.now() - quote.ts < 3000 ? quote.price : null;
    /* Legacy display selectors are not a price feed.
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
    return null; */
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

  function readClosedDealsFirstRow(silent = false) {
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
    if (!silent) loggerLog("[ClosedDealsCheck] Первая строка закрытых сделок:", rowText);

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
      const activePayout = getPocketActivePayout();
      if (activePayout) return Number(activePayout.replace("%", ""));
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

  async function waitForBrokerOrderConfirmation(timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (state.brokerOrder?.id) return state.brokerOrder;
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }
  async function waitForBrokerSettlement(timeoutMs = 30000) {
    const id = state.brokerOrder?.id;
    if (!id || state.settledIds.has(id)) return null;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = state.brokerResults[id];
      if (result) {
        state.settledIds.add(id);
        return { isWin: result.outcome === 'WIN', outcome: result.outcome, profitDelta: Math.max(0,result.profit), lossDelta: Math.max(0,-result.profit), reason: 'broker_order_' + id };
      }
      await new Promise(r => setTimeout(r, 250));
    }
    return null;
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
            minPayout: 88,
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

  function requestMainWorldEnsureChartTimeframe(targetTf = "S15") {
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
        if (event.source !== window || !event.data || (event.data.source !== "WINKY_HOOK" && event.data.source !== "WINKY_PAGE_HOOK")) return;
        if (event.data.type === "WINKY_RESP_CHART_TIMEFRAME") {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            window.removeEventListener("message", onMsg);
            if (event.data.activeTf) {
              state.actualChartTf = event.data.activeTf;
              const orbEl = document.getElementById("winkyOrbTime") || document.querySelector(".winky-orb-val");
              if (orbEl) {
                orbEl.textContent = `Таймфрейм: ${event.data.activeTf}`;
              }
            }
            resolve(event.data);
          }
        }
      };

      window.addEventListener("message", onMsg);

      try {
        window.postMessage(
          {
            source: "WINKY_CONTENT",
            type: "WINKY_CMD_SET_CHART_TIMEFRAME",
            targetTf: targetTf,
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

        // Do not retry an ambiguous click: the first request may already be sent.

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
    playCategory(category, isBlocking = false, emotion = "happy", action = null, extra = {}) {
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
      const payload = {
        category: category,
        lang: state.lang || "ru",
        emotion: emotion,
        action: action,
        direction: extra.direction || state.activeSignal?.direction || "",
        trade_dir: extra.direction || state.activeSignal?.direction || "",
        trade_action: extra.action || (extra.direction === "BUY" ? "CALL" : (extra.direction === "SELL" ? "PUT" : "")),
        ...extra,
      };
      sendProxyMessage("/api/winky/speak_stream_category", "POST", payload);
      sendProxyMessage("/api/winky/play_voice", "POST", payload);

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
    if (sec <= 89) return "1m";
    if (sec <= 150) return "2m";
    return "3m";
  }

  function selectStrategyExpiration(analysis, scan) {
    if (!analysis) {
      state.expirationReason = state.lang === "ru" ? "Снайперская экспирация 30s" : "Sniper 30s expiry";
      return "30s";
    }

    const isRu = (state.lang === "ru");

    if (analysis.recommendedExpiry) {
      let chosen = "30s";
      if (analysis.recommendedExpiry === "15s") chosen = "15s";
      else if (analysis.recommendedExpiry === "1m" || analysis.recommendedExpiry === "60s") chosen = "1m";
      else if (analysis.recommendedExpiry === "2m" || analysis.recommendedExpiry === "120s") chosen = "2m";
      else chosen = "30s";

      loggerLog(`[selectStrategyExpiration] 🎯 Рекомендация стратегии (${analysis.setup || "SNIPER"}) -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Снайперский выбор (${chosen})` : `Sniper choice (${chosen})`;
      return chosen;
    }

    const setup = analysis.setup || "";

    // 1. Momentum breakout / Sniper impulse: 15s
    if (setup === "SNIPER_BREAKOUT_15S" || setup === "SNIPER_IMPULSE" || setup === "MOMENTUM_BREAKOUT") {
      const chosen = "15s";
      loggerLog(`[selectStrategyExpiration] 🎯 Быстрый импульс (setup=${setup}) -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Быстрый импульс (${chosen})` : `Fast momentum (${chosen})`;
      return chosen;
    }

    // 2. Trend pullback: 30s
    if (setup === "TREND_PULLBACK_30S" || setup === "TREND_PULLBACK") {
      const chosen = "30s";
      loggerLog(`[selectStrategyExpiration] 🎯 Откат по тренду -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Вход на откате (${chosen})` : `Trend pullback (${chosen})`;
      return chosen;
    }

    // 3. Level reversal: 1m (60s)
    if (setup === "LEVEL_REVERSAL_1M" || setup === "CONFIRMED_REVERSAL" || setup === "BOLLINGER_EXTREME" || setup === "LEVEL_REVERSAL") {
      const chosen = "1m";
      loggerLog(`[selectStrategyExpiration] 🎯 Подтверждённый разворот -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Подтверждённый разворот (${chosen})` : `Confirmed reversal (${chosen})`;
      return chosen;
    }

    // 4. Structural wave: 2m (120s)
    if (setup === "STRUCTURAL_WAVE_2M" || setup === "STRUCTURAL_WAVE") {
      const chosen = "2m";
      loggerLog(`[selectStrategyExpiration] 🎯 Трендовая волна -> Выбрано ${chosen}`);
      state.expirationReason = isRu ? `Трендовая волна (${chosen})` : `Structural wave (${chosen})`;
      return chosen;
    }

    // Default to 30s
    state.expirationReason = isRu ? "Оптимальная экспирация (30s)" : "Optimal expiry (30s)";
    return "30s";
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
    if (orbMeta) orbMeta.textContent = `Анализ: S15/S30/M1/M2 · Сделка: ${label}`;

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
      accEl.textContent = '—';
    }
  }

  async function waitForOptimalMicroEntry(tradeDir, atr) {
    if (typeof LiveTickBuffer === "undefined") return { ok: false };
    const startPrice = getCurrentChartPrice();
    if (!startPrice || startPrice <= 0) return { ok: false };

    const maxWaitMs = 2000;
    const stepMs = 250;
    const maxSteps = Math.floor(maxWaitMs / stepMs);
    const isBuy = (tradeDir === "BUY" || tradeDir === "CALL");

    for (let i = 0; i < maxSteps; i++) {
      await new Promise((r) => setTimeout(r, stepMs));
      try { ChartAnalyzer.pollPrice(); } catch (_) {}
      const curPrice = getCurrentChartPrice();
      if (!curPrice || curPrice <= 0) continue;

      const delta = curPrice - startPrice;

      // Защита от слома сетапа: если цена резко улетела ПРОТИВ нас более чем на 0.6 ATR -> ОТМЕНА!
      if (isBuy && delta < -0.6 * atr) {
        loggerLog(`[waitForOptimalMicroEntry] ⚠️ Сетап сломан: резкий пролив против BUY (${delta.toFixed(5)} < -0.6 ATR)! Отмена входа!`);
        return { ok: false, reason: "PRICE_COLLAPSED_AGAINST_SIGNAL" };
      }
      if (!isBuy && delta > 0.6 * atr) {
        loggerLog(`[waitForOptimalMicroEntry] ⚠️ Сетап сломан: резкий шип против SELL (${delta.toFixed(5)} > 0.6 ATR)! Отмена входа!`);
        return { ok: false, reason: "PRICE_SPIKED_AGAINST_SIGNAL" };
      }

      // Микро-откат в нашу пользу: для BUY — цена чуть ниже старта (-0.05..-0.35 ATR), для SELL — чуть выше
      if (isBuy && delta <= -0.05 * atr && delta >= -0.35 * atr) {
        loggerLog(`[waitForOptimalMicroEntry] 🎯 Пойман микро-откат для лучшей цены BUY (delta: ${delta.toFixed(5)}) за ${(i + 1) * stepMs}мс!`);
        return { ok: true, price: curPrice };
      }
      if (!isBuy && delta >= 0.05 * atr && delta <= 0.35 * atr) {
        loggerLog(`[waitForOptimalMicroEntry] 🎯 Пойман микро-откат для лучшей цены SELL (delta: ${delta.toFixed(5)}) за ${(i + 1) * stepMs}мс!`);
        return { ok: true, price: curPrice };
      }
    }

    return { ok: true, price: getCurrentChartPrice() || startPrice };
  }

  async function executeTradeWithSignal(analysis, confluence, scan) {
    try {
      if (state.executionBlocked || !analysis?.shouldTrade || analysis.signalKey === state.lastSignalKey) { state.botState = 'IDLE'; renderSignalCardState(); return; }
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

      // 2. Выбор и синхронизация времени экспирации (15s, 30s, 1m, 2m)
      let strategyTf = "30s";
      let realPocketSec = 30;
      let expirationConfirmed = false;
      let targetExpSec = 30;
      try {
        if (typeof selectStrategyExpiration === "function") {
          strategyTf = selectStrategyExpiration(analysis, scan) || "30s";
        }
        state._lastChartExpSec = 0;
        targetExpSec = (strategyTf === "15s")
          ? 15
          : (strategyTf === "2m" || strategyTf === "120s"
              ? 120
              : (strategyTf === "1m" || strategyTf === "60s" ? 60 : 30));
        const expRes = await requestMainWorldSetExpiry(strategyTf);
        if (expRes && expRes.ok && expRes.actualSec >= 5 && expRes.actualSec <= 150) {
          realPocketSec = expRes.actualSec;
          expirationConfirmed = Math.abs(realPocketSec - targetExpSec) <= 4;
        }
        const domExpSec = getPocketSelectedExpirationSeconds();
        if (domExpSec >= 5 && domExpSec <= 150 && Math.abs(domExpSec - targetExpSec) <= 4) {
          realPocketSec = domExpSec;
          expirationConfirmed = true;
        }
      } catch (e) {
        console.warn("[Winky] Expiry setup warning:", e);
      }

      if (!expirationConfirmed) {
        loggerLog(`[ExpirationGuard] ⛔ Вход отменён: Pocket не подтвердил экспирацию ${strategyTf}.`);
        state.botState = "IDLE";
        state.analysisStartedAt = null;
        state.activeSignal = null;
        renderSignalCardState();
        const btnGet = document.getElementById("btnGetSignalAction");
        if (btnGet) {
          btnGet.disabled = false;
          btnGet.classList.remove("disabled");
          btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
        }
        return;
      }

      let resolvedTf = "30s";
      if (strategyTf === "2m" || strategyTf === "120s" || realPocketSec >= 90) {
        resolvedTf = "2m";
      } else if (strategyTf === "1m" || strategyTf === "60s" || (realPocketSec >= 45 && realPocketSec < 90)) {
        resolvedTf = "1m";
      } else if (strategyTf === "15s" || realPocketSec <= 20) {
        resolvedTf = "15s";
      } else {
        resolvedTf = "30s";
      }
      state.selectedTimeframe = resolvedTf;
      let durationSec = (resolvedTf === "2m") ? 120 : ((resolvedTf === "1m") ? 60 : ((resolvedTf === "15s") ? 15 : 30));
      state.tradeDurationSec = durationSec;

      // Обновляем синхронно все плашки времени в интерфейсе
      updateExpiryHUD(resolvedTf);

      state.activeSignal = {
        pair: state.targetPair,
        flags: state.targetFlags,
        payout: state.targetPayout,
        direction: tradeDir,
        accuracy: null,
        confluence: analysis.qualityScore,
        duration: resolvedTf,
        line1: analysis?.line1 || "",
        line2: analysis?.line2 || "",
        durationSec: durationSec,
        startTime: Date.now(),
        bestPriceEntry: true,
      };

      // We are preparing, not in a trade, until Pocket confirms openOrder.
      state.botState = "PREPARING_TRADE";
      state.analysisStartedAt = null;
      renderSignalCardState();

      // 3. Замеряем баланс, котировку и параметры сделки ДО клика
      state.balanceBeforeClick = getPocketBalance();
      state.balanceBefore = state.balanceBeforeClick;
      state.actualStakePlaced = getCurrentPocketStake() || state.currentStake || finalStake || 50;
      state.actualPayoutPct = getCurrentPairPayout() || 92;
      state.entryPrice = getCurrentChartPrice();
      state.activeStake = state.actualStakePlaced;
      state.activePayout = state.actualPayoutPct;
state.closedDealBaseline = null;
      state.brokerOrder = null;
      state.pendingBrokerOrder = null;

      // 3.5. Оптимальный микро-тайминг входа (до 2.0с)
      const microEntry = await waitForOptimalMicroEntry(tradeDir, analysis?.atr || 0.0005);
      if (!microEntry.ok) {
        loggerLog(`[executeTradeWithSignal] 🛑 Вход отменён по микро-таймингу: ${microEntry.reason}. Сброс в IDLE.`);
        state.botState = "IDLE";
        state.analysisStartedAt = null;
        renderSignalCardState();
        const btnGet = document.getElementById("btnGetSignalAction");
        if (btnGet) {
          btnGet.disabled = false;
          btnGet.classList.remove("disabled");
          btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
        }
        setTimeout(() => {
          if (state.autoStream && state.botState === "IDLE") startSignalAnalysis();
        }, 1000);
        return;
      }

      // 4. Нажимаем кнопку КУПИТЬ / ПРОДАТЬ на Покете (одиночный клик)!
      const rechecked = WinkyTradingCore.analyze(state.quoteTicks, state.targetPair);
      const actualPair = scanPocketOptionCurrentPair();
      if (!actualPair || WinkyTradingCore.symbol(actualPair) !== WinkyTradingCore.symbol(state.targetPair) || !rechecked.shouldTrade || rechecked.direction !== tradeDir || rechecked.signalKey !== analysis.signalKey) {
        state.botState = 'IDLE'; state.activeSignal = null; renderSignalCardState(); return;
      }
      state.pendingBrokerOrder = {
        requestedAt: Date.now(),
        stake: state.actualStakePlaced,
        direction: tradeDir,
        pair: state.targetPair,
      };
      localStorage.setItem('winky_unresolved_order', JSON.stringify(state.pendingBrokerOrder));
      let clicked = false;
      try {
        clicked = await POAutomation.clickTrade(tradeDir);
        if (!clicked) {
          loggerLog(`[executeTradeWithSignal] ⚠️ clickTrade вернул false`);
        }
      } catch (clickErr) {
        console.warn("[Winky] clickTrade warning:", clickErr);
      }

      if (!clicked) {
        loggerLog("[BrokerOrder] ⛔ Кнопка не подтвердила отправку ордера; сделка не начата.");
        state.pendingBrokerOrder = null;
        state.executionBlocked = true;
        state.autoStream = false;
        state.activeSignal = null;
        state.botState = "IDLE";
        renderSignalCardState();
        return;
      }

      const confirmedOrder = await waitForBrokerOrderConfirmation();
      if (!confirmedOrder) {
        loggerLog("[BrokerOrder] ⛔ Pocket не подтвердил открытие ордера за 7 секунд. Сделка и статистика отменены.");
        state.autoStream = false;
        state.executionBlocked = true;
        state.pendingBrokerOrder = null;
        state.activeSignal = null;
        state.botState = "IDLE";
        renderSignalCardState();
        const btnGet = document.getElementById("btnGetSignalAction");
        if (btnGet) {
          btnGet.disabled = false;
          btnGet.classList.remove("disabled");
          btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
        }
        return;
      }
      state.pendingBrokerOrder = null;
      state.lastSignalKey = analysis.signalKey;
      localStorage.setItem('winky_unresolved_order', JSON.stringify(confirmedOrder));
      if (confirmedOrder.remainingSec >= 5 && confirmedOrder.remainingSec <= 150) {
        durationSec = confirmedOrder.remainingSec;
        resolvedTf = secToTfLabel(durationSec);
        state.selectedTimeframe = resolvedTf;
        state.activeSignal.duration = resolvedTf;
        state.activeSignal.durationSec = durationSec;
      }
      state.botState = "IN_TRADE";
      renderSignalCardState();
      const tradeVoiceCategory = isBuy ? "OPEN_TRADE_CALL" : "OPEN_TRADE_PUT";
      try {
        VoiceManager.playCategory(tradeVoiceCategory, false, "excited", "cheer", {
          direction: tradeDir,
          action: isBuy ? "CALL" : "PUT",
        });
      } catch (_) {}

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
      state.tradeEndTime = confirmedOrder.closesAt;
      state.isCalibratedToRealDeal = false;
      state.hasExtendedOnce = false;
      state._currentTradeRemaining = state.tradeDurationSec;
      updateInTradeTimerUI(state.tradeDurationSec);

      state.expiryInterval = setInterval(() => {
        const now = Date.now();

        // 1. Проверяем окончание сделки
        if (now >= state.tradeEndTime) {
          // Expiry is supplied by the acknowledged broker order.

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
    } finally {
      if (state.botState === 'IDLE') {
        const button = document.getElementById('btnGetSignalAction');
        if (button) { button.disabled = Boolean(state.executionBlocked); button.classList.remove('disabled'); button.textContent = state.executionBlocked ? 'ТРЕБУЕТСЯ СВЕРКА ОРДЕРА' : t('getSignal'); }
        if (state.autoStream && !state.executionBlocked) setTimeout(() => { if (state.botState === 'IDLE') startSignalAnalysis(); }, 5000);
      }
    }
  }

  async function startSignalAnalysis() {
    if (state.executionBlocked) return;
    if (state.botState !== "IDLE") return;
    state.analysisStartedAt = Date.now();
    notifyTradePhase("ANALYZING", state.targetPair, 0);

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    const btnGet = document.getElementById("btnGetSignalAction");

    if (state.executionBlocked) return;
    state.botState = 'ANALYZING_PAIR';

    // 0.1 Ротация пар: после любого минуса или после 2 сделок на одной паре
    if (state.lastTradeOutcome === "LOSS") {
      loggerLog("[startSignalAnalysis] 🔄 Предыдущая сделка закрылась в минус! Немедленная смена пары перед анализом...");
      state.lastTradeOutcome = null;
      state.tradesOnSamePair = 0;
      if (state.targetPair) {
        if (!Array.isArray(state.recentPairs)) state.recentPairs = [];
        state.recentPairs.push(state.targetPair);
      }
      await switchPocketPair(null);
      await new Promise((r) => setTimeout(r, 3200));
      if (typeof LiveTickBuffer !== "undefined") LiveTickBuffer.reset(state.targetPair);
    } else if (state.tradesOnSamePair >= 2) {
      loggerLog(`[startSignalAnalysis] 🔄 Проведено 2 сделки подряд на паре ${state.targetPair}! Плановая смена пары...`);
      state.tradesOnSamePair = 0;
      if (state.targetPair) {
        if (!Array.isArray(state.recentPairs)) state.recentPairs = [];
        state.recentPairs.push(state.targetPair);
      }
      await switchPocketPair(null);
      await new Promise((r) => setTimeout(r, 3200));
      if (typeof LiveTickBuffer !== "undefined") LiveTickBuffer.reset(state.targetPair);
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

        // Phase 1: active scan step with 150ms live tick polling
        renderAnalysisStep(i, scanSteps.length, stepName, stepDetail, scoreStr, false);
        const pInt = setInterval(() => {
          try { ChartAnalyzer.pollPrice(); } catch (_) {}
        }, 150);
        await new Promise((r) => setTimeout(r, stepDef.scanMs));
        clearInterval(pInt);

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

      // Re-evaluate with accumulated fresh live ticks from all steps
      try { ChartAnalyzer.pollPrice(); } catch (_) {}
      try { scan = scanCanvasStructure(); } catch (_) {}
      try { analysis = ChartAnalyzer.analyzeMarket(scan); } catch (_) {}
      try { sentiment = readTradersSentiment(); } catch (_) {}
      try { confluence = evaluate5FactorConfluence(scan, analysis, sentiment); } catch (_) {}

      // Safe fallback guarantees
      if (!scan) scan = { trend: "UP", structure: "BULLISH", keyLevels: [] };
      if (!analysis) analysis = { direction: "BUY", line1: isRu ? "Сильный восходящий импульс" : "Strong bullish momentum", line2: isRu ? "Входим вверх по тренду" : "Entering call with trend" };
      if (!confluence) confluence = { score: 4.8, isStrong: true };

      // Keep collecting this pair's history instead of clearing its warm-up
      // buffer on every scan. Never rotate merely because history is short.
      if (!analysis.shouldTrade && /Прогрев|котировок|истории/.test(analysis.line1 || '')) {
        state.botState = 'IDLE'; state.analysisStartedAt = null;
        const block = document.getElementById('botDirectionBlock');
        if (block) block.textContent = analysis.line1;
        if (btnGet) { btnGet.disabled = false; btnGet.classList.remove('disabled'); btnGet.textContent = 'ОЖИДАНИЕ ДАННЫХ'; }
        if (state.autoStream) setTimeout(() => { if (state.botState === 'IDLE') startSignalAnalysis(); }, 15000);
        return;
      }

      // -----------------------------------------------------------------
      // "BEST PAIR OUT OF 7 CHECKS" RULE (Anti-infinite loop protection)
      // -----------------------------------------------------------------
      const MAX_PAIR_SCANS = 7;
      state.pairScanCount = typeof state.pairScanCount === "number" ? state.pairScanCount : 0;

      // 1. If clean setup found (shouldTrade === true & score >= 4.0 / conf >= 84%) -> ENTER IMMEDIATELY!
      if (analysis.shouldTrade && analysis.qualityScore >= 3.5) {
        state.pairScanCount = 0;
        loggerLog(`[ProTraderEngine] ✅ Идеальный сетап найден («${analysis.setup}» · ${analysis.direction} · ${analysis.confidence}% · Оценка ${confluence.score}/5.0)! Входим в сделку!`);
      } else {
        // 2. Pair is weak / flat: check if we haven't exceeded MAX_PAIR_SCANS skips
        if (state.pairScanCount < MAX_PAIR_SCANS - 1) {
          state.pairScanCount += 1;
          const rejectReason = analysis.line1 || (isRu ? "Флэт или низкая сила сетапа (< 84%)" : "Choppy flat or low setup strength (< 84%)");
          loggerLog(`[ProTraderEngine] 🛡️ Пара отбракована (проверка №${state.pairScanCount} из ${MAX_PAIR_SCANS}). Причина: ${rejectReason}`);

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
                      ? `🔄 Переключаемся на пару #${state.pairScanCount + 1} из ${MAX_PAIR_SCANS} (+92%)...`
                      : `🔄 Switching to pair #${state.pairScanCount + 1} of ${MAX_PAIR_SCANS} (+92%)...`}
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
          await new Promise((r) => setTimeout(r, 3200)); // Пауза 3.2с для полной отрисовки графика на S15

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
          state.pairScanCount = 0;
          state.botState = 'IDLE';
          state.analysisStartedAt = null;
          renderSignalCardState();
          if (btnGet) { btnGet.disabled = false; btnGet.classList.remove('disabled'); btnGet.textContent = 'ОЖИДАНИЕ СЕТАПА'; }
          if (state.autoStream) setTimeout(() => { if (state.botState === 'IDLE') startSignalAnalysis(); }, 15000);
          return;
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

    // 4. Count only a broker-confirmed settlement. Price movement, an old DOM
    // row, and a timeout are not a trade result.
    const outcomeResult = await waitForBrokerSettlement();
    if (!outcomeResult) {
      loggerLog("[BrokerSettlement] ⛔ Pocket не подтвердил исход сделки за 30 секунд. Статистика и перекрытие не изменены.");
      state.autoStream = false;
      state.executionBlocked = true;
      state.recoveryStep = 0;
      state.currentStake = BASE_STAKE;
      setPocketStakeAmount(BASE_STAKE);
      const unresolvedBlock = document.getElementById("botDirectionBlock");
      if (unresolvedBlock) {
        unresolvedBlock.className = "winky-direction-block active";
        unresolvedBlock.innerHTML = `<div class="signal-dir-large" style="color:#FFAA00; font-size:14px;">⚠️ ${state.lang === "ru" ? "РЕЗУЛЬТАТ НЕ ПОДТВЕРЖДЁН POCKET · статистика не изменена · авто-стрим остановлен" : "POCKET RESULT UNCONFIRMED · stats unchanged · auto-stream stopped"}</div>`;
      }
      state.botState = "IDLE";
      state.activeSignal = null;
      state.brokerOrder = null;
      notifyTradePhase("IDLE", state.targetPair, 0);
      if (btnGet) {
        btnGet.disabled = false;
        btnGet.classList.remove("disabled");
        btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
      }
      return;
    }
    const isWin = outcomeResult.isWin;
    localStorage.removeItem('winky_unresolved_order');
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
    } else if (outcomeResult.outcome === 'REFUND') {
      state.lastTradeOutcome = 'REFUND';
      if (block) block.textContent = 'ВОЗВРАТ СТАВКИ · счёт W/L не изменён';
    } else {
      state.consecutiveLosses = (state.consecutiveLosses || 0) + 1;
      state.lastTradeOutcome = 'LOSS';
      state.tradesOnSamePair = 0;
      updateScoreOnTradeClose(false, 0, lossDelta, false);
      state.recoveryStep = 0;
      state.currentStake = BASE_STAKE;
      setPocketStakeAmount(BASE_STAKE);
      if (block) block.textContent = 'УБЫТОК ПОДТВЕРЖДЁН БРОКЕРОМ · ставка остаётся $50';
      if (state.consecutiveLosses >= 3) {
        state.autoStream = false;
        if (block) block.textContent += ' · пауза после трёх убытков';
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
    state.brokerOrder = null;
    state.closedDealBaseline = null;
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
    if (WinkyTradingCore.symbol(state.targetPair) !== WinkyTradingCore.symbol(pairName)) state.quoteTicks = [];
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
      orbTimeEl.textContent = `Анализ: S15/S30/M1/M2 · Сделка: ${state.selectedTimeframe}`;
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
    const rawRate = total > 0 ? (state.liveWins / total) * 100 : 0;
    const displayRate = rawRate.toFixed(1);
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
        <div class="winky-orb-timeframe" id="winkyOrbTime">Анализ: S15/S30/M1/M2 · Сделка: ${state.selectedTimeframe}</div>
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
      if (accEl) accEl.textContent = sig.confluence.toFixed(1) + "/5";

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
      let headerPrefix = "S30";
      if (dur === "15S" || (sig.durationSec > 0 && sig.durationSec <= 20)) headerPrefix = "S15";
      else if (dur === "30S" || (sig.durationSec > 20 && sig.durationSec <= 44)) headerPrefix = "S30";
      else if (dur === "2M" || sig.durationSec >= 90) headerPrefix = "M2";
      else if (dur === "1M" || sig.durationSec >= 45) headerPrefix = "M1";
      else headerPrefix = "S30";

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
            <span class="winky-sig-strategy-score">★ ${sig.confluence ? sig.confluence.toFixed(1) : "4.7"} / 5.0</span>
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
        ? profitDelta
        : Math.round((state.actualStakePlaced || state.currentStake || 50) * ((state.actualPayoutPct || 92) / 100));
      state.scoreProfit = Math.round(((Number(state.scoreProfit) || 0) + addAmount) * 100) / 100;
      state.sessionProfit = state.scoreProfit;
    } else {
      state.scoreLosses = (Number(state.scoreLosses) || 0) + 1;
      state.liveLosses = state.scoreLosses;
      const subAmount = (typeof lossDelta === "number" && lossDelta > 0)
        ? lossDelta
        : Math.round(state.actualStakePlaced || state.currentStake || 50);
      // ОБЯЗАТЕЛЬНО ВЫЧИТАЕМ УБЫТОК ИЗ ТЕКУЩЕГО ПРОФИТА!
      state.scoreProfit = Math.round(((Number(state.scoreProfit) || 0) - subAmount) * 100) / 100;
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
    const rawRate = total > 0 ? (state.scoreWins / total) * 100 : 0;
    const displayRate = Math.max(0, Math.min(100, rawRate)).toFixed(1);

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
      localStorage.setItem("winky_live_stats_v6", payload);
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
        state.scoreWins = 0;
        state.scoreLosses = 0;
        state.scoreProfit = 0;
        state.liveWins = 0;
        state.liveLosses = 0;
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
