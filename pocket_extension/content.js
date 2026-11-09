/* ============================================================
   WINKY AI — NEKO-CYBER TRADING BOT (POCKET OPTION CONTENT SCRIPT)
   In-DOM Obsidian-Emerald Widget (330px), 2 Tabs: Signals & AI Chat
   Autonomous Stream Engine: Real Technical Analysis, Auto-Deals,
   Smart Recovery (up to 2 steps), TikTok Chat Queue, Pointer Events Drag & Drop.
   Strictly Zero speechSynthesis / say!
   ============================================================ */

(function () {
  "use strict";

  const CONTENT_VERSION="2.3.2", DATA_REVISION='history-r6';
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
    lastTradeOutcome: null, // "WIN" | "LOSS" | "REFUND" | "UNKNOWN"
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
    tradeSequence: 0,
    tradeContext: null,
    searchRunning: false,
    searchGeneration: 0,
    pairCandidates: [],
    dataContexts: new Map(),
    marketFrames: new Map(),
    pairVisits: new Map(),
    decisionJournal: [],
    lastRealQuote: null,
    visualReadyAfter: 0,
    hookRequestSequence: 0,
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

  async function notifyTradePhase(phase, pair = "", remainingSec = 0, extra = {}) {
    try {
      const dir = extra.direction || state.activeSignal?.direction || "";
      const act = extra.action || (dir === "BUY" ? "CALL" : (dir === "SELL" ? "PUT" : ""));
      const res = await sendProxyMessage("/api/winky/trade_phase", "POST", {
        session_id: voiceSessionId,
        trade_seq: state.tradeContext?.seq || state.tradeSequence,
        lang: state.lang || "ru",
        created_at: Date.now(),
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
    const trade = state.tradeContext;
    if(data.type==='WINKY_RESP_MARKET_STATUS') {state.hookStatus={...data,receivedAt:Date.now()};publishDiagnostics(true);}
    if(data.type==='WINKY_RESP_REQUEST_HISTORY') state.historyRequestStatus={...data,receivedAt:Date.now()};
    if (data.type === 'MARKET_CONTEXT' && data.asset) {
      state.dataContexts.set(normalizePocketPair(data.asset), data);
      if (normalizePocketPair(data.asset) === normalizePocketPair(state.targetPair)) {
        state.analysisCache = null;
        state.visualReadyAfter = Date.now() + 150;
      }
    }
    if (data.type === 'BROKER_DEAL_OPEN' && matchesTradeEvidence(data, trade)) {
      trade.brokerId = data.orderId || trade.brokerId;
      trade.openConfirmed = true;
      journalDecision('broker_opened');
      announceObservedOpening(trade);
      if (Number.isFinite(data.closesAt) && data.closesAt > trade.startedAt) {
        trade.closesAt = data.closesAt;
        if (state.botState === 'IN_TRADE') state.tradeEndTime = data.closesAt;
      }
    }
    if (data.type === 'BROKER_DEAL_RESULT' && trade && trade.brokerId && String(data.orderId) === String(trade.brokerId) && Number.isFinite(data.net)) {
      trade.brokerResult = { id: data.orderId, net: data.net };
    }

    // A. Live Price Tick with Y-ratio
    if ((data.type === "TICK" || data.type === "PRICE_TICK") && typeof data.price === "number") {
      if (data.rawSymbol && normalizePocketPair(data.rawSymbol) !== normalizePocketPair(state.targetPair)) return;
      if (data.rawSymbol && !acceptMarketEvidence(data, data.rawSymbol)) return;
      ChartAnalyzer.onNewPriceTick(data.price, data.timestamp || Date.now(), data.yRatio, data);
    }

    // A2. WebSocket Server History Ticks (up to 1000 points)
    if (data.type === "WS_HISTORY_TICKS" && Array.isArray(data.ticks) && data.ticks.length > 0) {
      if (typeof LiveTickBuffer !== "undefined") {
        if (acceptMarketEvidence(data, data.asset, true)) LiveTickBuffer.loadHistoryTicks(data.ticks, data.asset);
      }
    }
    if (data.type === 'WS_CANDLES_HISTORY' && acceptMarketEvidence(data, data.asset, true)) {
      rememberMarketFrame(data.periodSec, data.candles, 'broker', data.receivedAt, data.asset);
    }

    // A3. Actual Chart Timeframe Status from page_hook
    if (data.type === "CHART_TF_STATUS" && data.tf) {
      state.actualChartTf = data.tf;
      const orbEl = document.getElementById("winkyOrbTime") || document.querySelector(".winky-orb-val");
      if (orbEl) {
        orbEl.textContent = `Таймфрейм: ${data.tf}`;
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

    // E. Real Open Deal Badge Timer on Chart Canvas (e.g. ▲ $110 00:59)
    if (data.type === "DEAL_BADGE_TIMER" && typeof data.remainingSec === "number") {
      if (!matchesTradeEvidence(data, trade)) return;
      trade.openConfirmed = true;
      announceObservedOpening(trade);
      trade.lastBadgeAt = Date.now();
      trade.remainingSec = data.remainingSec;
      state._lastDealBadgeRemaining = data.remainingSec;
      state._lastDealBadgeText = data.badgeText || "";
      state._lastDealBadgeTs = Date.now();

      if (state.botState === "IN_TRADE" && state.tradeEndTime) {
        const now = Date.now();
        const remSec = data.remainingSec;
        const localRem = Math.floor((state.tradeEndTime - now) / 1000);

        // 1. Первичная калибровка таймфрейма (в первые 10 секунд после клика)
        if (!state.isCalibratedToRealDeal && (now - state.tradeStartTime < 10000) && remSec >= 0) {
          if (remSec >= 0) {
            state.isCalibratedToRealDeal = true;
            const calibratedTf = secToTfLabel(remSec);

            state.selectedTimeframe = calibratedTf;
            updateExpiryHUD(calibratedTf);
            if (state.activeSignal) {
              state.activeSignal.duration = calibratedTf;
              state.activeSignal.durationSec = remSec;
            }
            state.tradeEndTime = now + (remSec * 1000) + 150;
            state.tradeDurationSec = remSec;
            updateInTradeTimerUI(remSec);
            loggerLog(`[TradeSync] ⏱️ Мгновенная калибровка сделки под ${calibratedTf} с Pocket Option: ${remSec}с!`);
          }
        } else if (remSec >= 0) {
          // 2. Постоянная точная подстройка под реальный таймер сделки на графике / в списке сделок:
          if (remSec < localRem || (now - state.tradeStartTime < 10000 && remSec > localRem + 3)) {
            state.tradeEndTime = now + (remSec * 1000) + 150;
            if (remSec > (state.tradeDurationSec || 30)) {
              state.tradeDurationSec = remSec;
              const calibratedTf = secToTfLabel(remSec);
              state.selectedTimeframe = calibratedTf;
              updateExpiryHUD(calibratedTf);
              if (state.activeSignal) {
                state.activeSignal.duration = calibratedTf;
                state.activeSignal.durationSec = remSec;
              }
            }
            updateInTradeTimerUI(remSec);
          }
        }
      }
    }

    // F. Real Canvas Candles Snapshot from page_hook fillRect
    if (data.type === "CANVAS_CANDLES_SNAPSHOT" && Array.isArray(data.candles) && data.candles.length >= 8) {
      if (!acceptMarketEvidence(data, data.pair)) return;
      state.candles = data.candles;
      state.candles = state.candles.map(c => ({...c,source:'pixels',pair:state.targetPair,candlePeriodSec:data.periodSec || chartPeriodSeconds()}));
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

    announceObservedOpening(state.tradeContext);
    notifyTradePhase("IN_TRADE", state.targetPair, remaining);
  }

  function syncInTradeTimerFromHook(realRemainingSec) {
    // Managed via DEAL_BADGE_TIMER and executeTradeWithSignal
  }

  function readTradersSentiment() {
    let bullish = 50;
    let bearish = 50;
    try {
      // Captured Pocket market-watch panel: green start = BUY, red end = SELL.
      // Both labels must belong to one visible panel and form a real percentage.
      for(const panel of document.querySelectorAll('.market-watch-panel__content.pb')) {
        if(panel.offsetParent===null)continue;
        const call=panel.querySelector('.pb__number-start')?.textContent?.trim().match(/^(\d{1,3})\s*%$/);
        const put=panel.querySelector('.pb__number-end')?.textContent?.trim().match(/^(\d{1,3})\s*%$/);
        if(call && put) {
          const bullish=Number(call[1]),bearish=Number(put[1]);
          if(bullish<=100 && bearish<=100 && Math.abs(bullish+bearish-100)<=2)return {bullish,bearish,observed:true};
        }
      }
      // 1. Check known selectors
      const callEl = document.querySelector(".sentiment-call, .sentiment__call, .chart-sentiment-bull, .trading-panel .sentiment-up");
      const putEl = document.querySelector(".sentiment-put, .sentiment__put, .chart-sentiment-bear, .trading-panel .sentiment-down");
      if (callEl && putEl) {
        const cVal = parseInt(callEl.textContent.replace(/[^0-9]/g, ""), 10);
        const pVal = parseInt(putEl.textContent.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(cVal) && !isNaN(pVal) && cVal + pVal > 0) {
          return { bullish: cVal, bearish: pVal, observed: cVal>=0 && pVal>=0 && cVal<=100 && pVal<=100 && Math.abs(cVal+pVal-100)<=2 };
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
            return { bullish: gNum, bearish: rNum, observed: gNum>=0 && rNum>=0 && gNum<=100 && rNum<=100 && Math.abs(gNum+rNum-100)<=2 };
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
          if (v1<=100 && v2<=100 && Math.abs(v1+v2-100)<=2) {
            return { bullish: v1, bearish: v2, observed: true };
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
              return { bullish: 100 - p, bearish: p, observed: false };
            }
          }
        }
      }
    } catch (_) {}
    return { bullish, bearish, observed: false };
  }

  /* ==================== 1b. LiveTickBuffer & ProTraderEngine ==================== */

  const LiveTickBuffer = {
    pair: null,
    archives: new Map(),
    ticks: [], // { price, ts } max 5000 per cached pair
    addTick(price, ts = Date.now()) {
      if (!price || isNaN(price) || price <= 0) return;
      let numericTs = Number(ts);
      if (numericTs < 1e11) numericTs = numericTs * 1000;
      this.ticks.push({ price: Number(price), ts: numericTs });
      if (this.ticks.length > 5000) {
        this.ticks.splice(0, this.ticks.length - 5000);
      }
    },
    loadHistoryTicks(ticksArray, asset = null) {
      if (!Array.isArray(ticksArray) || ticksArray.length === 0) return;
      const target=normalizePocketPair(state.targetPair),key=normalizePocketPair(asset || state.targetPair);
      const foreign=key!==target;
      if(!foreign && normalizePocketPair(this.pair)!==target) this.reset(state.targetPair);
      const map = new Map();
      for (const t of (foreign?this.archives.get(key) || []:this.ticks)) {
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
      if(foreign) {
        this.archives.set(key,merged.slice(-5000));
        if(this.archives.size>12)this.archives.delete(this.archives.keys().next().value);
        return;
      }
      this.ticks = merged.slice(-5000);
      console.log(`[LiveTickBuffer] 📊 Loaded ${this.ticks.length} total ticks (merged ${ticksArray.length} new)`);
    },
    reset(newPair = null) {
      if (this.pair) this.archives.set(normalizePocketPair(this.pair), this.ticks);
      if (this.archives.size > 12) this.archives.delete(this.archives.keys().next().value);
      this.pair = newPair;
      this.ticks = this.archives.get(normalizePocketPair(newPair)) || [];
    },
    getMicroMetrics() {
      const nowTs = marketNow();
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

      const recent5s=this.ticks.filter(t=>t.ts>=nowTs-5000 && t.ts<=nowTs);
      const microFresh=recent5s.length>=3 && nowTs-recent5s.at(-1).ts<=1500;
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
        samples5s:recent5s.length,
        observedWindowSec:microFresh?(recent5s.at(-1).ts-recent5s[0].ts)/1000:0,
      };
    },
    buildCandles(periodSec = 15, maxBars = 45) {
      if (!this.ticks?.length) return [];
      const bucketMs = periodSec * 1000;
      const buckets = new Map();
      for (const t of this.ticks) {
        const bKey = Math.floor(t.ts / bucketMs) * bucketMs;
        if (!buckets.has(bKey)) {
          buckets.set(bKey, []);
        }
        buckets.get(bKey).push(t);
      }
      const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
      const candles = [];
      for (const k of sortedKeys) {
        const samples = buckets.get(k);
        if (!samples || samples.length === 0) continue;
        const prices=samples.map(t=>t.price);
        const open = prices[0];
        const close = prices[prices.length - 1];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const isGreen = close > open;
        const isRed = close < open;
      const body = Math.abs(close - open);
        const range = high - low;
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
          source: 'ticks',
          pair: this.pair || state.targetPair,
          complete: k + bucketMs <= marketNow(),
          forming: k + bucketMs > marketNow(),
          incomplete: k + bucketMs <= marketNow() && (prices.length < 2 || (k===sortedKeys[0] && samples[0].ts>k+2000) ||
            samples.some((t,i)=>i>0 && t.ts-samples[i-1].ts>Math.max(5000,bucketMs/3))),
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


  function chartPeriodSeconds(tf = state.actualChartTf) {
    const value = String(tf || '').trim().toUpperCase();
    const match = value.match(/^(S|M|H)(\d+)$/) || value.match(/^(\d+)(S|M|H)$/)?.slice(0,1).concat(value.slice(-1), value.slice(0,-1));
    if (!match) return null;
    return Number(match[2]) * ({S:1,M:60,H:3600}[match[1]] || 0) || null;
  }

  function marketNow() {
    const q=state.brokerClock && normalizePocketPair(state.brokerClock.pair)===normalizePocketPair(state.targetPair)?state.brokerClock:state.lastRealQuote;
    return q ? q.timestamp + Math.max(0,Date.now()-q.receivedAt) : Date.now();
  }

  function acceptMarketEvidence(data, pair, history=false) {
    if (!pair || (!history && normalizePocketPair(pair)!==normalizePocketPair(state.targetPair))) return false;
    const context=state.dataContexts.get(normalizePocketPair(pair));
    return !context || data.generation == null || data.generation===context.generation;
  }

  function candleGeometry(c) {
    const open=Number(c.open),close=Number(c.close),high=Number(c.high),low=Number(c.low);
    const body=Math.abs(close-open);
    return {...c,open,close,high,low,body,bodySize:body,totalRange:high-low,
      upperWick:Math.max(0,high-Math.max(open,close)),lowerWick:Math.max(0,Math.min(open,close)-low),isGreen:close>open,isRed:close<open};
  }

  function rememberMarketFrame(period, candles, source, receivedAt=Date.now(), pair=state.targetPair) {
    if (![15,30,60,120].includes(period) || !Array.isArray(candles)) return;
    const bars=candles.filter(c=>[c.open,c.close,c.high,c.low,c.time].every(Number.isFinite) && c.high>=Math.max(c.open,c.close) && c.low<=Math.min(c.open,c.close))
      .map(c=>candleGeometry({...c,candlePeriodSec:period,source,pair,
        complete:c.time+period*1000<=marketNow(),incomplete:Boolean(c.incomplete)})).sort((a,b)=>a.time-b.time);
    if (!bars.length) return;
    const key=normalizePocketPair(pair)+'|'+period+'|'+source;
    const previous=state.marketFrames.get(key);
    const merged=source==='pixels' ? bars : Array.from(new Map([...(previous?.bars || []),...bars].map(c=>[c.time,c])).values()).sort((a,b)=>a.time-b.time);
    state.marketFrames.set(key,{bars:merged.slice(-200),receivedAt,period,source,pair});
    if(state.marketFrames.size>100) state.marketFrames.delete(state.marketFrames.keys().next().value);
  }

  const ENTRY_CLOSED_MIN=20, CONTEXT_CLOSED_MIN=21;
  const closedCount=bars=>(bars || []).filter(c=>c.complete && !c.incomplete).length;
  const frameMinimum=period=>period===15?ENTRY_CLOSED_MIN:CONTEXT_CLOSED_MIN;

  function cleanMarketFrame(bars,period,pair=state.targetPair) {
    const now=marketNow(),key=normalizePocketPair(pair),step=period*1000;
    const sorted=Array.from(new Map((bars || []).filter(c=>normalizePocketPair(c.pair)===key &&
      c.candlePeriodSec===period && [c.time,c.open,c.high,c.low,c.close].every(Number.isFinite) && c.time<=now &&
      c.high>=Math.max(c.open,c.close) && c.low<=Math.min(c.open,c.close)).map(c=>[c.time,candleGeometry({...c,pair:key,complete:c.time+step<=now})])).values()).sort((a,b)=>a.time-b.time);
    let start=0;
    for(let i=0;i<sorted.length;i++) {
      if(sorted[i].complete && sorted[i].incomplete)start=i+1;
      if(i>0 && (sorted[i].time-sorted[i-1].time!==step || (sorted[i].source==='pixels')!==(sorted[i-1].source==='pixels')))start=i;
    }
    return sorted.slice(start).slice(-200);
  }

  function frameIsReady(bars,period,min=frameMinimum(period)) {
    const last=bars?.at(-1);
    return Boolean(last && closedCount(bars)>=min && marketNow()-(last.time+period*1000)<period*1500);
  }

  function marketFrames(scan=null) {
    const frames={};
    const signature=scan?.visualCandles?.map(c=>[c.open,c.close,c.high,c.low,c.xCenter].join(',')).join(';');
    if(scan?.visualCandles?.length && signature!==state.visualBaseline && Date.now()>=state.visualReadyAfter && chartPeriodSeconds()) {
      rememberMarketFrame(chartPeriodSeconds(),scan.visualCandles,'pixels');
    }
    const pair=normalizePocketPair(state.targetPair);
    for(const period of [15,30,60,120]) {
      const ticks=LiveTickBuffer.buildCandles(period,200);
      const saved=Array.from(state.marketFrames.values()).filter(f=>normalizePocketPair(f.pair)===pair && f.period===period &&
        (f.source!=='pixels' || Date.now()-f.receivedAt<30000));
      const broker=saved.find(f=>f.source==='broker');
      const merged=new Map((broker?.bars || []).map(c=>[c.time,c]));
      for(const bar of ticks) {
        const original=merged.get(bar.time);
        if(!original)merged.set(bar.time,bar);
        else if(!bar.complete)merged.set(bar.time,candleGeometry({...original,close:bar.close,high:Math.max(original.high,bar.high),
          low:Math.min(original.low,bar.low),complete:false,incomplete:false}));
      }
      // Validate contiguous tails BEFORE preferring a source. A broken quote
      // series must not erase a healthy, confirmed visual fallback.
      const numeric=cleanMarketFrame(Array.from(merged.values()),period);
      const visual=cleanMarketFrame(saved.find(f=>f.source==='pixels')?.bars,period);
      // Native OHLC and tick-built bars share Pocket quote units. Normalize
      // that feed identity before aggregation, just as analyze() does; keep
      // the original adapter and pixel data separate. Otherwise an odd native
      // history boundary drops a whole M2 bucket and erases its older context.
      const children=(frames[period/2] || []).map(c=>({...c,origin:c.origin || c.source,source:c.source==='pixels'?'pixels':'quotes'}));
      const derived=period>15?cleanMarketFrame(aggregateCandles(children,2),period):[];
      const choices=[numeric,derived,visual].filter(b=>b.length);
      const ready=choices.filter(b=>frameIsReady(b,period));
      frames[period]=ready.filter(b=>b.at(-1).source!=='pixels').sort((a,b)=>closedCount(b)-closedCount(a))[0] || ready.find(b=>b===visual) || ready[0] ||
        choices.sort((a,b)=>closedCount(b)-closedCount(a))[0] || [];
    }
    return frames;
  }

  function aggregateCandles(candles, groupSize) {
    if (!candles?.length) return [];
    if (groupSize <= 1) return candles.slice();
    const groups=new Map(),result=[],timestamped=candles.every(c=>Number.isFinite(c.time));
    candles.forEach((c,i)=>{const key=timestamped?Math.floor(c.time/(c.candlePeriodSec*groupSize*1000)):Math.floor(i/groupSize);
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);});
    for(const slice of groups.values()) {
      const first=slice[0],last=slice.at(-1),period=first.candlePeriodSec*groupSize;
      if(slice.some((c,i)=>c.pair!==first.pair || c.source!==first.source || c.candlePeriodSec!==first.candlePeriodSec ||
        (timestamped && i>0 && c.time-slice[i-1].time!==first.candlePeriodSec*1000))) continue;
      const bucket=timestamped?Math.floor(first.time/(period*1000))*period*1000:first.time;
      const forming=timestamped && bucket<=marketNow() && bucket+period*1000>marketNow();
      // A partial CURRENT bucket is forming; a missing closed child is corrupt history.
      if(slice.length!==groupSize && !forming) continue;
      if(timestamped && first.time!==bucket) continue;
      result.push(candleGeometry({...first,open:first.open,close:last.close,high:Math.max(...slice.map(c=>c.high)),low:Math.min(...slice.map(c=>c.low)),
        time:bucket,candlePeriodSec:period,estimatedTime:slice.some(c=>c.estimatedTime===true),forming,
        complete:!forming && slice.length===groupSize && slice.every(c=>c.complete===true),
        incomplete:slice.some(c=>c.incomplete===true)}));
    }
    return result;
  }

  function marketDataSummary(frames=marketFrames()) {
    return [15,30,60,120].map(period=>{const bars=frames[period] || [],last=bars.at(-1);
      return {period,count:bars.length,closed:bars.filter(c=>c.complete && !c.incomplete).length,source:last?.source || null,
        forming:Boolean(last && !last.complete),ageMs:last?Math.max(0,marketNow()-last.time-period*1000):null};});
  }

  function requestMarketRecovery(pair,period) {
    const key=normalizePocketPair(pair)+'|'+period;
    state.historyRecoveryAt=state.historyRecoveryAt || new Map();
    if(Date.now()-(state.historyRecoveryAt.get(key) || 0)<3000) return;
    state.historyRecoveryAt.set(key,Date.now());
    window.postMessage({source:'WINKY_CONTENT',type:'WINKY_CMD_GET_MARKET_STATUS',requestId:++state.hookRequestSequence},'*');
    window.postMessage({source:'WINKY_CONTENT',type:'WINKY_CMD_REQUEST_HISTORY',pair,periodSec:period,count:200,requestId:++state.hookRequestSequence},'*');
  }

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
      return Math.max(Number.EPSILON, slice.reduce((a, b) => a + b, 0) / slice.length);
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
      const span = Math.max(Number.EPSILON, upper - lower);
      const rawPctB = (curPrice - lower) / span;
      const pctB = Math.max(0.0, Math.min(1.0, rawPctB));
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
        const range = Math.max(Number.EPSILON, highestHigh - lowestLow);
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

    // 7. Smart Horizon Multi-Timeframe Analysis Engine (15s, 30s, 1m, 2m)
    frameContext(candles) {
      const closed=(candles || []).filter(c=>c.complete===true && !c.incomplete);
      if(closed.length<CONTEXT_CLOSED_MIN) return null;
      const closes=closed.map(c=>c.close), last=closes.at(-1);
      const ema9=this.computeEMA(closes,9).at(-1), ema21series=this.computeEMA(closes,21), ema21=ema21series.at(-1);
      const ema50Ready=closes.length>=50, ema50=ema50Ready?this.computeEMA(closes,50).at(-1):null;
      const slope=ema21-ema21series[Math.max(0,ema21series.length-6)], atr=this.computeATR(closed,14);
      const direction=ema9>ema21 && slope>0?'BUY':ema9<ema21 && slope<0?'SELL':null;
      const strong=Boolean(direction && ema50Ready && (direction==='BUY'?ema21>ema50:ema21<ema50) && Math.abs(ema9-ema21)>.25*atr);
      return {direction,strong,ema50Ready,atr,last,closedCount:closed.length};
    },

    analyze(candles, currentPrice, scan = null) {
      const frames=scan?.timeframes || {[candles?.[0]?.candlePeriodSec]:candles || []};
      const requirements=[{period:15,expiry:'15s',context:60},{period:15,expiry:'30s',context:60,extra:30},
        {period:30,expiry:'1m',context:60},{period:60,expiry:'1m',context:120},{period:60,expiry:'2m',context:120}];
      const candidates=[],rejected=[],observations=[];
      for(const spec of requirements) {
        const bars=frames[spec.period] || [], contextBars=frames[spec.context] || [],context=this.frameContext(contextBars);
        const periods=Array.from(new Set([spec.period,spec.context,...(spec.extra?[spec.extra]:[])]));
        const reject=(reason,detail=null)=>rejected.push({expiry:spec.expiry,period:spec.period,reason,detail});
        if(!context || closedCount(bars)<ENTRY_CLOSED_MIN ||
          (spec.extra && !this.frameContext(frames[spec.extra]))) {reject('NOT_ENOUGH_CANDLES',periods);continue;}
        if(periods.some(p=>(frames[p] || []).some(c=>normalizePocketPair(c.pair)!==normalizePocketPair(state.targetPair)))) {
          reject('INCOMPATIBLE_CANDLES');continue;
        }
        const latest=bars.at(-1),lastContext=contextBars.filter(c=>c.complete && !c.incomplete).at(-1);
        if(!latest || latest.complete || latest.incomplete || latest.time>marketNow() ||
          marketNow()>=latest.time+spec.period*1000 || !lastContext || marketNow()-(lastContext.time+spec.context*1000)>spec.context*1500) {
          reject('STALE_CANDLES');continue;
        }
        const own=bars.map(c=>({...c,origin:c.source,source:c.source==='pixels'?'pixels':'quotes'}));
        const frame=this.analyzeFrame(own,latest.close,scan,{expiry:spec.expiry,context});
        if(!frame.shouldTrade) {
          const observation={...frame,timeframesUsed:periods,entryPeriodSec:spec.period,contextDirection:context.direction,
            dataSources:periods.map(period=>({period,source:frames[period]?.at(-1)?.source,closed:closedCount(frames[period])}))};
          observation.confluence=evaluate5FactorConfluence(scan,observation,readTradersSentiment());
          observations.push(observation);reject(frame.vetoReason,frame.rejected);continue;
        }
        for(const raw of frame.scenarios || [frame]) {
          const result={...raw};
          const entryContext=this.frameContext(bars),extra=spec.extra?this.frameContext(frames[spec.extra]):null;
          if([context,entryContext,extra].some(c=>c?.strong && c.direction!==result.direction)) {reject('OPPOSING_HIGHER_TREND');continue;}
          result.timeframesUsed=periods;
          result.dataSources=periods.map(period=>({period,source:frames[period]?.at(-1)?.source,closed:(frames[period] || []).filter(c=>c.complete && !c.incomplete).length}));
          result.contextDirection=context.direction;result.contextStrong=context.strong;result.ema50Ready=context.ema50Ready;
          result.entrySource=latest.source;result.entryPeriodSec=spec.period;
          result.scenarioKey=[normalizePocketPair(state.targetPair),spec.period,spec.expiry,result.family || result.setup,result.direction,result.triggerAt ?? latest.time].join('|');
          result.explanationRu=(result.explanationRu || '')+' · '+periods.map(p=>p<60?'S'+p:'M'+p/60).join(' + ');
          result.confluence=evaluate5FactorConfluence(scan,result,readTradersSentiment());
          result.confidence=Math.round(result.confluence.score/5*100);
          candidates.push(result);
        }
      }
      const seconds=a=>({'15s':15,'30s':30,'1m':60,'2m':120}[a.recommendedExpiry]);
      const ranked=list=>list.slice().sort((a,b)=>b.confluence.score-a.confluence.score || seconds(a)-seconds(b));
      const choose=threshold=>{
        const eligible=candidates.filter(c=>c.confluence.score>=threshold);
        return ranked(eligible.filter(c=>seconds(c)<=30))[0] || ranked(eligible.filter(c=>seconds(c)>=60))[0];
      };
      const pinned=scan?.preferredScenarioKey;
      const best=pinned?candidates.find(c=>c.scenarioKey===pinned && c.confluence.score>=(scan.entryThreshold || 4)):
        choose(scan?.entryThreshold || 4) || choose(3.5);
      if(best) return {...best,dataStatus:'ENTRY_CONFIRMED',scenarios:ranked(candidates),rejected};
      const dataReasons=['NOT_ENOUGH_CANDLES','STALE_CANDLES','INCOMPATIBLE_CANDLES'];
      const noData=rejected.length===requirements.length && rejected.every(r=>dataReasons.includes(r.reason));
      const hard=!noData && !candidates.length && rejected.some(r=>['HIGH_RISK_MARKET','OPPOSING_HIGHER_TREND'].includes(r.reason));
      const reason=pinned?'SCENARIO_INVALIDATED':hard?'HIGH_RISK_MARKET':noData?(rejected.find(r=>r.reason!=='NOT_ENOUGH_CANDLES')?.reason || 'NOT_ENOUGH_CANDLES'):'LOW_CONFLUENCE_WAIT';
      const summary=marketDataSummary(frames);
      const detail=noData?summary.map(f=>(f.period<60?'S'+f.period:'M'+f.period/60)+': '+f.closed+' закрытых').join(', '):
        hard?'Старший тренд или уровень запрещает вход':'Сетап формируется: '+(rejected.find(r=>r.detail?.length)?.detail?.[0]?.reason || 'нет подтверждённого триггера');
      const display=ranked(candidates.concat(observations))[0] || {};
      return {...display,valid:!noData,shouldTrade:false,direction:null,confidence:0,dataStatus:noData?'NO_DATA':hard?'TRADE_BLOCKED':'SETUP_FORMING',
        vetoReason:reason,hardVeto:hard,rejected,scenarios:ranked(candidates),dataSummary:summary,explanationRu:detail,explanationEn:noData?'Waiting for confirmed candle history':'Waiting for a confirmed setup'};
    },

    // The existing indicator engine evaluates all four price-action families
    // independently for the requested horizon. A missing short trigger cannot veto a long setup.
    analyzeFrame(candles, currentPrice, scan = null, options = {}) {
      const reject=reason=>({valid:false,shouldTrade:false,vetoReason:reason,confidence:0});
      if(!candles?.length) return reject('NOT_ENOUGH_CANDLES');
      const period=candles[0].candlePeriodSec,source=candles[0].source;
      if(![15,30,60,120].includes(period) || candles.some(c=>c.candlePeriodSec!==period || c.source!==source || c.pair!==candles[0].pair ||
        ![c.open,c.close,c.high,c.low,c.time].every(Number.isFinite) || c.time>marketNow())) return reject('INCOMPATIBLE_CANDLES');
      const closed=candles.filter(c=>c.complete && !c.incomplete),c0=candleGeometry(candles.at(-1));
      if(closed.length<ENTRY_CLOSED_MIN) return reject('NOT_ENOUGH_CANDLES');
      if(c0.complete || c0.incomplete) return reject('STALE_CANDLES');
      const prev=candleGeometry(closed.at(-1)),closes=closed.map(c=>c.close),price=c0.close,atr=this.computeATR(closed,14);
      const ema9=this.computeEMA(closes,9).at(-1),ema21s=this.computeEMA(closes,21),ema21=ema21s.at(-1),emaSlope=ema21-ema21s.at(-6);
      const ema50Ready=closed.length>=50,ema50=ema50Ready?this.computeEMA(closes,50).at(-1):null;
      const localDir=ema9>ema21 && emaSlope>0?'BUY':ema9<ema21 && emaSlope<0?'SELL':null;
      const strong=ema50Ready && localDir && (localDir==='BUY'?ema21>ema50:ema21<ema50) && Math.abs(ema9-ema21)>.25*atr;
      const trendRegime=strong?(localDir==='BUY'?'STRONG_UPTREND':'STRONG_DOWNTREND'):Math.abs(ema9-ema21)<.25*atr?'FLAT':localDir?(localDir==='BUY'?'UPTREND':'DOWNTREND'):'FLAT';
      const bb=this.computeBollinger(closes,20,2),rsi=this.computeWilderRSI(closes,14).current;
      const stoch=this.computeStochastic(closed,14,3,3),micro=LiveTickBuffer.getMicroMetrics();
      const rangeBars=closed.slice(-20),upper=Math.max(...rangeBars.map(c=>c.high)),lower=Math.min(...rangeBars.map(c=>c.low));
      // Swing levels use only confirmed neighbours. No level from a future candle.
      const levels={highs:[],lows:[]};
      for(let i=2;i<closed.length-2;i++) {
        if(closed[i].high>=Math.max(closed[i-1].high,closed[i-2].high,closed[i+1].high,closed[i+2].high))levels.highs.push(closed[i].high);
        if(closed[i].low<=Math.min(closed[i-1].low,closed[i-2].low,closed[i+1].low,closed[i+2].low))levels.lows.push(closed[i].low);
      }
      let streak=1;
      for(let i=closed.length-1;i>=0;i--) {if((closed[i].close>closed[i].open)!==c0.isGreen)break;streak++;}
      const results=[],rejected=[],expiries=options.expiry?[options.expiry]:['15s','30s','1m','2m'];
      const families=['TREND_PULLBACK','BREAKOUT_RETEST','RANGE_REJECTION','LOCAL_REVERSAL'];
      for(const expiry of expiries) for(const direction of ['BUY','SELL']) for(const family of families) {
        const buy=direction==='BUY',sign=buy?1:-1,sec={'15s':15,'30s':30,'1m':60,'2m':120}[expiry];
        const refuse=reason=>rejected.push({family,direction,expiry,reason});
        if((buy && !c0.isGreen) || (!buy && !c0.isRed)) {refuse('LIVE_CANDLE_OPPOSES');continue;}
        if(c0.body<(sec===15?.2:.25)*atr) {refuse('TRIGGER_FORMING');continue;}
        let level=null,confirmed=false,patternDetail='';
        if(family==='TREND_PULLBACK') {
          const recent=closed.slice(-3),opposite=recent.filter(c=>buy?c.close<c.open:c.close>c.open);
          const touches=opposite.some(c=>buy?c.low<=Math.max(ema9,ema21)+.35*atr:c.high>=Math.min(ema9,ema21)-.35*atr);
          confirmed=localDir===direction && opposite.length>0 && touches && sign*(price-prev.close)>0 && sign*(price-c0.open)>0;
          level=buy?Math.min(...recent.map(c=>c.low)):Math.max(...recent.map(c=>c.high));
          patternDetail=state.lang==='ru'?'Откат к EMA завершён, текущая свеча возобновляет движение':'EMA pullback completed; live candle resumes the trend';
        } else if(family==='BREAKOUT_RETEST') {
          // At least one CLOSED retest after the breakout; the broken level is
          // now support/resistance of this scenario, not its opposing wall.
          for(let i=Math.max(20,closed.length-4);i<closed.length-1;i++) {
            const before=closed.slice(Math.max(0,i-20),i),b=closed[i];
            const boundary=buy?Math.max(...before.map(c=>c.high)):Math.min(...before.map(c=>c.low));
            if(sign*(b.close-boundary)<.05*atr || sign*(b.open-boundary)>.25*atr)continue;
            const retests=closed.slice(i+1);
            const held=retests.every(c=>sign*(c.close-boundary)>=-.1*atr);
            const touched=retests.some(c=>buy?c.low<=boundary+.25*atr:c.high>=boundary-.25*atr);
            if(held && touched && sign*(price-boundary)>0 && sign*(price-prev.close)>0) {confirmed=true;level=boundary;break;}
          }
          patternDetail=state.lang==='ru'?'Пробой закрыт, ретест удержал новую сторону уровня':'Closed breakout and retest held the new side of the level';
        } else if(family==='RANGE_REJECTION') {
          const rangeMode=Math.abs(ema9-ema21)<.35*atr && Math.abs(emaSlope)<.4*atr && upper-lower>=2*atr;
          const boundary=buy?lower:upper,wick=buy?prev.lowerWick:prev.upperWick;
          const touched=buy?prev.low<=boundary+.25*atr:prev.high>=boundary-.25*atr;
          confirmed=rangeMode && touched && wick>=Math.max(.2*atr,.5*prev.body) && sign*(price-prev.close)>0 && (buy?rsi<=50:rsi>=50);
          level=boundary;patternDetail=state.lang==='ru'?'Боковой диапазон: отторжение границы и движение внутрь':'Range boundary rejection confirmed; moving back inside';
        } else {
          const prior=closed.slice(-16,-1),boundary=buy?Math.min(...prior.map(c=>c.low)):Math.max(...prior.map(c=>c.high));
          const falseBreak=buy?prev.low<boundary && prev.close>boundary:prev.high>boundary && prev.close<boundary;
          const rejection=(buy?prev.lowerWick:prev.upperWick)>=Math.max(.25*atr,.8*prev.body);
          const atLevel=buy?prev.low<=boundary+.2*atr:prev.high>=boundary-.2*atr;
          const changedStructure=buy?price>prev.high:price<prev.low;
          confirmed=(falseBreak || (rejection && atLevel)) && changedStructure && (buy?(rsi<50 || bb.pctB<.35):(rsi>50 || bb.pctB>.65));
          level=boundary;patternDetail=state.lang==='ru'?'Отторжение уровня и слом локальной структуры подтверждены':'Level rejection and local structure change confirmed';
        }
        if(!confirmed) {refuse('SETUP_FORMING');continue;}
        if((options.context?.strong && options.context.direction!==direction) || (strong && localDir!==direction)) {refuse('OPPOSING_HIGHER_TREND');continue;}
        if(c0.body>.85*atr || (prev.body>1.1*atr && (buy?prev.isGreen:prev.isRed))) {refuse('CLIMAX_IMPULSE');continue;}
        if(['TREND_PULLBACK','BREAKOUT_RETEST'].includes(family) && streak>=3) {refuse('EXHAUSTED_IMPULSE');continue;}
        // Short expiries require a measured 3–5 second impulse in quote units.
        // Pixel ATR is never compared with quote deltas.
        if(sec<=30 && (source==='pixels' || !micro.observedWindowSec || micro.observedWindowSec<3 || micro.samples5s<3 ||
          sign*micro.delta3s<=0 || sign*micro.delta5s<=0)) {refuse('SHORT_TRIGGER_UNCONFIRMED');continue;}
        if(sec===15 && (c0.body>.65*atr || (family==='LOCAL_REVERSAL' && c0.body<.25*atr))) {refuse('HORIZON_TOO_SHORT');continue;}
        const targets=(buy?levels.highs:levels.lows).filter(v=>sign*(v-price)>Number.EPSILON &&
          !(family==='BREAKOUT_RETEST' && Math.abs(v-level)<=.1*atr));
        if(family==='RANGE_REJECTION')targets.push(buy?upper:lower);
        const opposing=targets.length?(buy?Math.min(...targets):Math.max(...targets)):null;
        const room=opposing===null?null:sign*(opposing-price)/atr;
        if(room!==null && room<.45) {refuse('INTO_WALL');continue;}
        const sr={support:buy?level:opposing,resistance:buy?opposing:level,distToRes:buy?room:null,distToSup:buy?null:room,
          heldLevel:level,levelHeld:true,roomKnown:room!==null};
        const longFormation=['LOCAL_REVERSAL','RANGE_REJECTION'].includes(family);
        const horizonFit=sec>=period*(longFormation?2:1)?1:.8;
        const setup=family;const isRu=state.lang==='ru';
        results.push({valid:true,shouldTrade:true,direction,confidence:0,setup,family,recommendedExpiry:expiry,
          atr,rsi,pctB:bb.pctB,stoch,trendRegime,sr,ema50Ready,horizonFit,triggerAt:prev.time,volatilityRatio:c0.body/atr,
          factors:[patternDetail,'Подтверждение по закрытым свечам',room===null?'Следующий встречный уровень не определён':`До встречного уровня: ${room.toFixed(2)} ATR`],
          line1:patternDetail,line2:isRu?`Вход ${buy?'ВВЕРХ':'ВНИЗ'} (${expiry}): ${family}`:`Enter ${buy?'UP':'DOWN'} (${expiry}): ${family}`,
          explanationRu:patternDetail,explanationEn:family});
      }
      if(results.length) return {...results[0],scenarios:results,rejected};
      const hard=rejected.some(r=>['OPPOSING_HIGHER_TREND','INTO_WALL','CLIMAX_IMPULSE','EXHAUSTED_IMPULSE'].includes(r.reason));
      const displayDirection=localDir || options.context?.direction || (price<bb.middle?'BUY':price>bb.middle?'SELL':null);
      const above=levels.highs.filter(v=>v>price),below=levels.lows.filter(v=>v<price);
      const res=above.length?Math.min(...above):null,sup=below.length?Math.max(...below):null;
      return {valid:true,shouldTrade:false,direction:null,displayDirection,confidence:0,atr,rsi,pctB:bb.pctB,trendRegime,
        sr:{resistance:res,support:sup,distToRes:res===null?null:(res-price)/atr,distToSup:sup===null?null:(price-sup)/atr},
        hardVeto:hard,vetoReason:hard?'HIGH_RISK_MARKET':'LOW_CONFLUENCE_WAIT',rejected,explanationRu:'Сетап ещё не подтверждён'};
    },

  };

  /* ==================== 2. ChartAnalyzer (Smart Trend & Breakout Engine) ==================== */

  const ChartAnalyzer = {
    onNewPriceTick(price, timestamp = Date.now(), yRatio = null, metadata = {}) {
      if (!price || isNaN(price) || price <= 0) return;
      if(metadata.source_type==='ws' && state.lastRealQuote?.pair===state.targetPair && timestamp<state.lastRealQuote.timestamp) return;
      state.lastHookTickTime = metadata.receivedAt || Date.now();
      state.priceTicks.push(price);
      if (state.priceTicks.length > 120) state.priceTicks.shift();

      if (metadata.source_type === 'ws' && metadata.rawSymbol && normalizePocketPair(metadata.rawSymbol) === normalizePocketPair(state.targetPair)) {
        if(normalizePocketPair(LiveTickBuffer.pair)!==normalizePocketPair(state.targetPair)) LiveTickBuffer.reset(state.targetPair);
        LiveTickBuffer.addTick(price, timestamp);
        state.lastRealQuote={price,timestamp,receivedAt:metadata.receivedAt || Date.now(),pair:state.targetPair,source:'ws'};
        state.brokerClock={timestamp,receivedAt:metadata.receivedAt || Date.now(),pair:state.targetPair};
      }

      if(metadata.source_type==='canvas' && metadata.rawSymbol && normalizePocketPair(metadata.rawSymbol)===normalizePocketPair(state.targetPair) && !(state.lastRealQuote?.source==='ws' && quoteIsFresh())) state.lastRealQuote={price,timestamp,receivedAt:metadata.receivedAt || Date.now(),pair:state.targetPair};

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
            source: 'ticks', pair: state.targetPair, candlePeriodSec: 5,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            time: c.startTime,
            isGreen: c.close > c.open,
            isRed: c.close < c.open,
            bodySize: Math.abs(c.close - c.open),
            totalRange: Math.max(Number.EPSILON, c.high - c.low),
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

    analyzeMarket(scan = null, selection = {}) {
      const ticks = state.priceTicks;

      // If we have visual candles from canvas scan, adopt them
      if (scan && scan.visualCandles && scan.visualCandles.length >= 8) {
        state.candles = scan.visualCandles.slice();
      }

      // Use timestamped ticks or the existing visible candle scanner below.

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
          isStreamerOverride: true,
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


      const frames=marketFrames(scan);
      const activeCandles=frames[15]?.length?frames[15]:frames[60] || [];
      const pro = ProTraderEngine.analyze(activeCandles, activeCandles.at(-1)?.close, {...scan,timeframes:frames,...selection});

      const isUp = pro.direction === "BUY";

      let category = isUp ? "buy_trend" : "sell_trend";
      if (["LOCAL_REVERSAL","RANGE_REJECTION"].includes(pro.family) || pro.setup === "CONFIRMED_REVERSAL" || pro.setup === "LEVEL_REVERSAL_1M" || pro.setup === "LEVEL_REVERSAL" || pro.setup === "BOLLINGER_REVERSAL") {
        category = isUp ? "buy_bounce" : "sell_bounce";
      } else if (pro.setup === "TREND_PULLBACK" || pro.setup === "TREND_PULLBACK_30S") {
        category = isUp ? "buy_pullback" : "sell_pullback";
      } else if (pro.setup === "SNIPER_IMPULSE" || pro.setup === "SNIPER_BREAKOUT_15S" || pro.setup === "MOMENTUM_BREAKOUT") {
        category = isUp ? "buy_trend" : "sell_trend";
      } else if (pro.setup === "STRUCTURAL_WAVE_2M" || pro.setup === "STRUCTURAL_WAVE") {
        category = isUp ? "buy_trend" : "sell_trend";
      }

      let line1 = pro.line1 || "";
      let line2 = pro.line2 || "";
      if (!line1) {
        if (pro.shouldTrade) {
          line1 = isRu ? `📌 Движение по тренду: свечная динамика с высоким объёмом.` : `📌 Trend momentum: clean candle flow with high volume.`;
          line2 = isRu ? `🎯 Вход ${isUp ? "ВВЕРХ" : "ВНИЗ"}: снайперская сделка по направлению цены.` : `🎯 Trade ${isUp ? "CALL" : "PUT"}: sniper entry along price flow.`;
        } else {
          line1 = isRu ? `⚠️ Фильтр рынка: ${pro.explanationRu || "Низкая уверенность"}` : `⚠️ Market shield: ${pro.explanationEn || "Low confidence"}`;
          line2 = marketReason(pro);
        }
      }

      return {
        ...pro,
        direction: pro.direction,
        accuracy: pro.dataStatus==='NO_DATA'?null:pro.confidence,
        confidence: pro.confidence,
        category: category,
        setup: pro.setup,
        recommendedExpiry: pro.recommendedExpiry || "30s",
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
              time: chartPeriodSeconds() ? Math.floor(marketNow()/(chartPeriodSeconds()*1000))*chartPeriodSeconds()*1000 - (splitClusters.length-1-ci)*chartPeriodSeconds()*1000 : NaN,
              estimatedTime: true,
              complete: ci < splitClusters.length-1,
              source: 'pixels', pair: state.targetPair, candlePeriodSec: chartPeriodSeconds(),
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
    const isRu = (state.lang === "ru");
    const isBuy = String(analysis?.direction || analysis?.displayDirection || "BUY").toUpperCase() === "BUY";
    const shouldTrade = Boolean(analysis?.shouldTrade);
    const conf = analysis?.confidence || 75;
    const rsi = analysis?.rsi ?? 50;
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
    } else if (analysis?.trendRegime==='UPTREND' || analysis?.trendRegime==='DOWNTREND') {
      f1Pass=(analysis.trendRegime==='UPTREND')===isBuy;
      f1Score=f1Pass ? .8 : 0;
      f1Detail=isRu?'EMA 9/21: направление тренда (EMA50 ещё не готова)':'EMA 9/21 trend (EMA50 unavailable)';
    } else {
      f1Score = 0.7;
      f1Pass = !veto;
      f1Detail = isRu ? "Консолидация в боковом диапазоне" : "Consolidation within range";
    }

    // 2. Price Action Factor
    let f2Score = 0.8;
    let f2Pass = true;
    let f2Detail = "";
    if (analysis?.family && ["TREND_PULLBACK","BREAKOUT_RETEST","RANGE_REJECTION","LOCAL_REVERSAL"].includes(analysis.family)) {
      f2Score=analysis.horizonFit ?? 1;f2Detail=analysis.line1;
    } else if (setup === "ENGULFING") {
      f2Score = 1.0;
      f2Detail = isRu ? `Свечное поглощение (${isBuy ? "бычье" : "медвежье"})` : `Candle engulfing (${isBuy ? "bullish" : "bearish"})`;
    } else if (setup === "PINBAR") {
      f2Score = 1.0;
      f2Detail = isRu ? `Пинбар с отторжением тени` : `Pinbar with rejection shadow`;
    } else if (setup === "TREND_PULLBACK" || setup === "TREND_PULLBACK_30S") {
      f2Score = 1.0;
      f2Detail = isRu ? `Откат к средним и возобновление импульса` : `Pullback to EMAs and continuation`;
    } else if (setup === "BOLLINGER_REVERSAL" || setup === "LEVEL_REVERSAL_1M") {
      f2Score = 1.0;
      f2Detail = isRu ? `Отскок от границы Боллинджера (%B: ${pctB})` : `Reversal off Bollinger (%B: ${pctB})`;
    } else if (["MOMENTUM_BREAKOUT","SNIPER_BREAKOUT_15S","STRUCTURAL_WAVE_2M"].includes(setup)) {
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
      f3Score = Number.isFinite(dist) ? (dist>=1 ? 1 : dist>=.45 ? .5 : 0) : 0;
      f3Pass=Number.isFinite(dist) && dist>=.45;
      f3Detail = Number.isFinite(dist) ? (isRu ? `Запас хода до уровня: ${dist.toFixed(2)} ATR` : `Room to key level: ${dist.toFixed(2)} ATR`) : (isRu ? "Уровни не определены" : "Levels unavailable");
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

    // No data is not positive confirmation. Display, ranking and execution
    // use this same sum; confidence no longer manufactures a 4.2..5.0 score.
    if(!analysis?.trendRegime) {f1Score=0;f1Pass=false;f1Detail=isRu?'Тренд не подтверждён':'Trend unavailable';}
    if(!analysis?.setup) {f2Score=0;f2Pass=false;}
    if(!analysis?.sr) {f3Score=0;f3Pass=false;f3Detail=isRu?'Уровни не определены':'Levels unavailable';}
    if(!Number.isFinite(analysis?.rsi) || !Number.isFinite(analysis?.pctB)) {f4Score=0;f4Pass=false;f4Detail=isRu?'Осцилляторы не готовы':'Oscillators unavailable';}
    if(!sentiment?.observed) {f5Score=0;f5Pass=false;f5Detail=isRu?'Шкала Pocket недоступна':'Pocket sentiment unavailable';}
    // Holding a retested/rejected level is observed evidence even when no
    // opposite swing exists. It earns partial credit, never invented free room.
    if(analysis?.sr?.levelHeld && !analysis.sr.roomKnown && !Number.isFinite(isBuy?analysis.sr.distToRes:analysis.sr.distToSup)) {
      f3Score=.5;f3Pass=true;f3Detail=isRu?'Реакция на уровень подтверждена; встречный уровень не определён':'Held level confirmed; opposite level unknown';
    }
    const totalScore=Math.round((f1Score+f2Score+f3Score+f4Score+f5Score)*100)/100;

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
    // Pocket animates the header through intermediate balances after payout.
    // Its current-account copy is explicitly no-animation and updates at once.
    const settled=document.querySelector('.balance-item--current .no-animation');
    const settledValue=settled && parsePocketMoney(settled.textContent);
    if(Number.isFinite(settledValue) && settledValue>=0)return settledValue;
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
        const val = parsePocketMoney(el.textContent);
        if (val !== null && val >= 0) {
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


  function normalizePocketPair(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function parsePocketMoney(value) {
    const text = String(value || '').trim();
    if (!text || /%|\d:\d/.test(text)) return null;
    let number = text.replace(/[^\d.,+-]/g, '');
    if (!/[0-9]/.test(number)) return null;
    if (number.includes(',') && number.includes('.')) {
      number = number.lastIndexOf(',') > number.lastIndexOf('.') ? number.replace(/\./g, '').replace(',', '.') : number.replace(/,/g, '');
    } else if (/,[0-9]{1,2}$/.test(number)) number = number.replace(',', '.');
    else number = number.replace(/,/g, '');
    const result = Number(number);
    return Number.isFinite(result) ? result : null;
  }

  function pocketDealRows() {
    return Array.from(document.querySelectorAll("[data-test='closed-deal-item'], .closed-deals__item, .closed-deals .item, .trading-history__item, .history-deal-item, .trading-history tbody tr, .closed-deals tbody tr, .deals-list__item, .deal-item, .notification, .deal-finish, .toast"));
  }

  function dealRowFingerprint(row) {
    return row.getAttribute('data-id') || row.getAttribute('data-deal-id') || row.textContent.replace(/\s+/g, ' ').trim();
  }

  function readClosedDealsFirstRow(trade = state.tradeContext) {
    if (!trade) return null;
    for (const row of pocketDealRows()) {
      if (row.offsetParent === null) continue;
      const text = row.textContent.trim();
      const fingerprint = dealRowFingerprint(row);
      const id = row.getAttribute('data-id') || row.getAttribute('data-deal-id');
      if (trade.historyBefore.has(fingerprint)) continue;
      const exactId = id && trade.brokerId && String(id) === String(trade.brokerId);
      if (!exactId && !normalizePocketPair(text).includes(normalizePocketPair(trade.pair))) continue;
      const activeContainer = row.closest('.open-deals, [data-test="open-deals"]');
      if (activeContainer || row.querySelector('.deal-timer, .countdown, [data-test="deal-timer"]')) continue;
      const stakeField = row.querySelector('[data-test="deal-amount"], .deal-amount, .amount, .bet');
      const stake = stakeField ? parsePocketMoney(stakeField.textContent) : null;
      const moneyTokens = Array.from(text.matchAll(/(?:[$€₽]\s*[+-]?\s*\d[\d.,]*|[+-]?\d[\d.,]*\s*[$€₽])/g), m => parsePocketMoney(m[0]));
      if (!exactId && (stake !== null ? Math.abs(stake - trade.stake) > 0.01 : !moneyTokens.some(v => Math.abs(v - trade.stake) < 0.01))) continue;
      const profitField = row.querySelector('[data-test="deal-profit"], .deal-profit, .profit');
      const payoutField = row.querySelector('[data-test="deal-payout"], .deal-payout, .payout');
      const profit = profitField ? parsePocketMoney(profitField.textContent) : null;
      const payout = payoutField ? parsePocketMoney(payoutField.textContent) : null;
      let net = profit;
      if (net === null && payout !== null) net = payout - trade.stake;
      if (net === null) {
        const label = text.match(/(?:Общая прибыль|Total profit)\s*:?\s*([$€₽]?\s*[+-]?\s*\d[\d.,]*\s*[$€₽]?)/i);
        if (label) net = parsePocketMoney(label[1]);
      }
      if (net === null && /возврат|refund/i.test(text)) net = 0;
      // Unstructured text needs an explicit signed currency amount, never +92% or 00:00.
      if (net === null) {
        const signed = text.match(/[+-]\s*(?:[$€₽]\s*\d[\d.,]*|\d[\d.,]*\s*[$€₽])/);
        if (signed) net = parsePocketMoney(signed[0]);
      }
      if (net === null) continue;
      return { status: net > 0 ? 'WIN' : net < 0 ? 'LOSS' : 'REFUND', net, payout, text, fingerprint };
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


  function tradeOutcome(status, net = 0, reason = '') {
    return { outcome: status, isWin: status === 'WIN' ? true : status === 'LOSS' ? false : null,
      profitDelta: Math.max(0, net), lossDelta: Math.max(0, -net), reason };
  }

  function evaluateTradeOutcome(trade = state.tradeContext) {
    if (!trade || trade.resultApplied) return tradeOutcome('PENDING', 0, 'no_current_trade');
    if (state.forcedLoss) { state.forcedLoss = false; return tradeOutcome('LOSS', -trade.stake, 'forced_loss'); }
    if (trade.brokerResult && trade.brokerId && String(trade.brokerResult.id) === String(trade.brokerId)) {
      return tradeOutcome(trade.brokerResult.net > 0 ? 'WIN' : trade.brokerResult.net < 0 ? 'LOSS' : 'REFUND', trade.brokerResult.net, 'broker_closed_order');
    }
    const row = readClosedDealsFirstRow(trade);
    if (row) return tradeOutcome(row.status, row.net, 'matched_closed_deal');
    const active = hasActiveOpenDealsOnPocket(trade);
    if (active.isOpen) return tradeOutcome('PENDING', 0, 'deal_still_open');
    // Restore the pre-c03648e balance path even when Pocket's optional WS
    // acknowledgement was not recognized. Always read the balance afresh.
    const after = getPocketBalance();
    state.balanceAfterClose = after;
    const before = trade.balanceBefore;
    if (Number.isFinite(before) && Number.isFinite(after) && Date.now() >= state.tradeEndTime) {
      const net = Math.round((after - before) * 100) / 100;
      if (net > 0) return tradeOutcome('WIN', net, 'credited_balance');
      // A debit at 00:00 may still be awaiting payout. Use the legacy loss
      // fallback only after the bounded settlement window, for the exact stake
      // of an observed opening; unrelated balance changes remain UNKNOWN.
      if (trade.balanceFallbackReady && (trade.openConfirmed || trade.debitObserved)) {
        if (Math.abs(net + trade.stake) < 0.02) return tradeOutcome('LOSS', net, 'settled_balance_debit');
        if (net === 0 && trade.debitObserved) return tradeOutcome('REFUND', 0, 'returned_balance');
      }
    }
    return tradeOutcome('PENDING', 0, 'awaiting_broker_settlement');
  }

  async function evaluateTradeResult() {
    const res = evaluateTradeOutcome();
    return { outcome: res.outcome, profit: res.profitDelta, loss: res.lossDelta };
  }

  function matchesTradeEvidence(data, trade = state.tradeContext) {
    if (!trade || Date.now() < trade.startedAt) return false;
    if (data.requestId && data.requestId !== trade.seq) return false;
    if (data.orderId && trade.brokerId) return String(data.orderId) === String(trade.brokerId);
    if (data.pair && normalizePocketPair(data.pair) !== normalizePocketPair(trade.pair)) return false;
    if (data.stake != null && Math.abs(Number(data.stake) - trade.stake) > 0.01) return false;
    const badge = String(data.badgeText || '').match(/\$\s*(\d+(?:[.,]\d+)?)/);
    return Boolean(data.requestId || (data.pair && data.stake != null) || (badge && Math.abs(Number(badge[1].replace(',', '.')) - trade.stake) < 0.01));
  }

  function resetTradePreparation(trade) {
    if (state.tradeContext !== trade) return;
    state.tradeContext = null;
    state.activeSignal = null;
    state.botState = 'IDLE';
    state.analysisStartedAt = null;
    renderSignalCardState();
    const button = document.getElementById('btnGetSignalAction');
    if (button) { button.disabled = false; button.classList.remove('disabled'); button.textContent = t('getSignal'); }
    if (state.autoStream) setTimeout(() => { if (state.autoStream && state.botState === 'IDLE') startSignalAnalysis(); }, 1000);
  }

  function scanPocketOptionCurrentPair() {
    const pairSelectors = [
      ".currencies-block__in",
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
      state.visualBaseline=scanCanvasStructure().visualCandles.map(c=>[c.open,c.close,c.high,c.low,c.xCenter].join(',')).join(';');
      const requestId=++state.hookRequestSequence;
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
          if(event.data.requestId != null && event.data.requestId!==requestId) return;
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
            requestId,
            excludePairs: state.searchSeen || [],
            currentPair: actualCurrentPair,
            recentPairs: state.recentPairs.concat(state.searchSeen || []),
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
      if(chartPeriodSeconds(targetTf)!==chartPeriodSeconds()) {
        state.visualBaseline=scanCanvasStructure().visualCandles.map(c=>[c.open,c.close,c.high,c.low,c.xCenter].join(',')).join(';');
        state.visualReadyAfter=Date.now()+150;
      }
      const requestId=++state.hookRequestSequence;
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
          if(event.data.requestId != null && event.data.requestId!==requestId) return;
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
            requestId,
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

  function requestMainWorldClickTrade(direction, stake = 50, requestId = state.tradeContext?.seq) {
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
        if (event.data.type === "WINKY_RESP_CLICK_TRADE" && (!event.data.requestId || event.data.requestId === requestId)) {
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
            requestId,
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
      if (state.lastTradeExecuteTs && (now - state.lastTradeExecuteTs < 3000)) {
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
        if (state.tradeContext) state.tradeContext.balanceBefore = state.balanceBeforeClick;
        state.currentStake = expectedStake;
        state.consecutiveSkips = 0;

        let success = false;
        let response = null;
        try {
          const mainWorldRes = await requestMainWorldClickTrade(direction, expectedStake);
          response = mainWorldRes;
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
        if (!success && response && response.clicked === false && response.error === "button_not_found") {
          setPocketStakeAmount(expectedStake);
          success = clickPocketTradeButton(direction);
          if (success) {
            loggerLog(`[clickTrade] Сделка ${direction} ($${state.currentStake}) исполнена через DOM fallback`);
          }
        }

        if (success) {
          // Через 2.0 секунды фиксируем баланс ПОСЛЕ списания ставки
          const currentTrade = state.tradeContext;
          setTimeout(() => {
            if (state.tradeContext !== currentTrade) return;
            state.balanceDuringTrade = getPocketBalance();
            state.balanceAfterOpen = state.balanceDuringTrade;
            if (currentTrade) {
              currentTrade.balanceAfterOpen = state.balanceDuringTrade;
              currentTrade.debitObserved = Number.isFinite(currentTrade.balanceBefore) && Number.isFinite(state.balanceDuringTrade) &&
                Math.abs(currentTrade.balanceBefore - state.balanceDuringTrade - currentTrade.stake) < 0.02;
            }
            loggerLog(`[TradeBalance] До клика: ${state.balanceBeforeClick}, во время сделки (списание): ${state.balanceDuringTrade}`);
          }, 2000);

          loggerLog(`[clickTrade] Сделка ${direction} ($${state.currentStake}) успешно исполнена одиночным кликом`);
          return true;
        } else {
          loggerLog(`[clickTrade] Не удалось исполнить сделку ${direction}`);
          return response?.clicked === false ? false : null;
        }
      } catch (err) {
        loggerLog("[clickTrade] Ошибка в процессе клика сделки:", err);
        return null;
      }
    },
  };

  /* ==================== 4. Instant 0.05s Voice Engine (STREAM_VOICE_BANK) ==================== */

  const voiceSessionId = "voice-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  let voiceEventSequence = 0;
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
        event_id: /^(trade_(win|loss|refund)|OPEN_TRADE_)/i.test(category)
          ? voiceSessionId + ":" + (state.tradeContext?.seq || state.tradeSequence) + ":" + (/^OPEN_/i.test(category) ? "open" : "result")
          : voiceSessionId + ":" + (++voiceEventSequence),
        session_id: voiceSessionId,
        trade_seq: state.tradeContext?.seq || state.tradeSequence,
        pair: state.targetPair,
        expiry: state.activeSignal?.duration || state.selectedTimeframe,
        setup: state.analysisCache?.analysis?.family || state.analysisCache?.analysis?.setup || "",
        score: state.activeSignal?.confluence ?? null,
        phase: state.botState,
        created_at: Date.now(),
        lang: state.lang || "ru",
        emotion: emotion,
        action: action,
        direction: extra.direction || state.activeSignal?.direction || "",
        trade_dir: extra.direction || state.activeSignal?.direction || "",
        trade_action: extra.action || (extra.direction === "BUY" ? "CALL" : (extra.direction === "SELL" ? "PUT" : "")),
        ...extra,
      };
      sendProxyMessage("/api/winky/speak_stream_category", "POST", payload);
      // Compatibility endpoints share one queue; send each event once.

      // Speech owns its queue; animation and trading never wait for audio.
      return Promise.resolve(true);
    },
  };

  function announceObservedOpening(trade) {
    if (!trade || !trade.openConfirmed || trade.voiceAnnounced || state.botState !== 'IN_TRADE' || trade.resultApplied) return;
    trade.voiceAnnounced = true;
    const remaining = Math.max(0, Math.round(((state.tradeEndTime || Date.now()) - Date.now()) / 1000));
    notifyTradePhase('IN_TRADE', trade.pair, remaining).then(() => {
      if (state.tradeContext !== trade || trade.resultApplied || state.botState !== 'IN_TRADE') return;
      VoiceManager.playCategory(trade.direction === 'BUY' ? 'OPEN_TRADE_CALL' : 'OPEN_TRADE_PUT', false, 'excited', 'cheer', {
        direction: trade.direction, open_observed: true,
        action: trade.direction === 'BUY' ? 'CALL' : 'PUT',
      });
    });
  }

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
    if (orbMeta) orbMeta.textContent = `Таймф: ${state.actualChartTf || "—"}  Время: ${label}`;

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


  function hasActiveOpenDealsOnPocket(trade = state.tradeContext) {
    if (!trade) return { isOpen: false, remainingSec: 0, source: 'none' };
    if (trade.lastBadgeAt && Date.now() - trade.lastBadgeAt < 1200 && trade.remainingSec > 0) {
      return { isOpen: true, remainingSec: trade.remainingSec, source: 'matched_badge' };
    }
    const rows = document.querySelectorAll('.open-deals .item, [data-test="open-deals"] .item, .deals-list__item');
    for (const row of rows) {
      if (row.offsetParent === null || !normalizePocketPair(row.textContent).includes(normalizePocketPair(trade.pair))) continue;
      if (row.closest('.closed-deals, [data-test="closed-deals"], .trading-history, [data-status="closed"]')) continue;
      const timer = row.querySelector('.deal-timer, .countdown, [data-test="deal-timer"]');
      const amount = row.querySelector('.deal-amount, .amount, .bet, [data-test="deal-amount"]');
      if (!timer || !amount || parsePocketMoney(amount.textContent) === null || Math.abs(parsePocketMoney(amount.textContent) - trade.stake) > 0.01) continue;
      const m = timer.textContent.trim().match(/^(\d{1,2}):([0-5]\d)$/);
      if (m && Number(m[1]) * 60 + Number(m[2]) > 0) return { isOpen: true, remainingSec: Number(m[1]) * 60 + Number(m[2]), source: 'matched_dom' };
    }
    return { isOpen: false, remainingSec: 0, source: 'none' };
  }

  function getPocketSelectedExpirationSeconds() {
    try {
      const inputs = Array.from(
        document.querySelectorAll(".block--expiration-inputs input, .right-block input, .trading-panel input")
      );
      const timeInp = inputs.find((inp) => (inp.value || "").includes(":"));
      if (timeInp && timeInp.value) {
        const parts = timeInp.value.trim().split(":").map((n) => parseInt(n, 10) || 0);
        if (parts.length === 3 && parts[0] === 0 && parts[1] <= 5) return parts[1] * 60 + parts[2];
        if (parts.length === 2 && parts[0] <= 5) return parts[0] * 60 + parts[1];
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

  function renderAnalysisStep(stepIndex, totalSteps, stepTitle, stepDesc, scoreStr, isConfirmed = false, phase = null) {
    const block=document.getElementById('botDirectionBlock');
    if(!block) return;
    const ru=state.lang==='ru', key=state.targetPair+'|'+stepIndex;
    if(!block.querySelector('[data-analysis-card]')) {
      block.className='winky-direction-block winky-signal-display analysing';
      block.innerHTML=`<div class="winky-scan-top"><div class="winky-scan-title">🧠 <span data-analysis-heading></span></div><div class="winky-scan-score-badge" data-analysis-score></div></div>
        <div class="winky-scan-segments">${[0,1,2,3].map(()=>'<div class="winky-scan-seg"></div>').join('')}</div>
        <div class="winky-analysis-meta" data-analysis-meta></div><div class="winky-flip-stage"><div class="winky-flip-card" data-analysis-card>
        <div class="winky-flip-header"><span class="winky-flip-step-name" data-analysis-title></span><span class="winky-flip-status" data-analysis-status></span></div>
        <div class="winky-flip-desc" data-analysis-detail></div></div></div>`;
    }
    const put=(selector,text)=>{const el=block.querySelector(selector);if(el && el.textContent!==text)el.textContent=text;};
    const status=phase || (isConfirmed?'confirmed':'checking');
    const statusText={checking:ru?'Проверяем':'Checking',confirmed:ru?'Подтверждено':'Confirmed',rejected:ru?'Не подтверждено':'Not confirmed',loading:ru?'Загрузка':'Loading'};
    put('[data-analysis-heading]',ru?'АНАЛИЗ ГРАФИКА':'CHART ANALYSIS');
    const known=scoreStr!==null && scoreStr!==undefined && scoreStr!=='' && Number.isFinite(Number(scoreStr));
    put('[data-analysis-score]',known?'★ '+Number(scoreStr).toFixed(1)+' / 5':'— / 5');
    const periods=state.analysisCache?.analysis?.timeframesUsed || [];
    put('[data-analysis-meta]',`${ru?'Пара':'Pair'} ${Math.min(5,state.searchPairIndex || 1)}/5 · ${state.actualChartTf || '—'} · ${periods.map(p=>p<60?'S'+p:'M'+p/60).join(' + ')}`);
    put('[data-analysis-title]',stepTitle);
    put('[data-analysis-detail]',stepDesc);
    put('[data-analysis-status]',statusText[status] || statusText.checking);
    const statusEl=block.querySelector('[data-analysis-status]');if(statusEl)statusEl.className='winky-flip-status '+status;
    const segments=block.querySelectorAll('.winky-scan-seg');
    segments.forEach((el,i)=>{el.className='winky-scan-seg '+(i<stepIndex || (i===stepIndex && isConfirmed)?'done':i===stepIndex?'active':'');});
    const card=block.querySelector('[data-analysis-card]');
    if(state.analysisRenderKey!==key && card) {card.classList.remove('winky-stage-transition');void card.offsetWidth;card.classList.add('winky-stage-transition');}
    state.analysisRenderKey=key;
    const acc=document.getElementById('metricAccuracyVal');
    if(acc) {acc.textContent=known?Math.round(Number(scoreStr)/5*100)+'%':'—';acc.title=ru?'Совпадение условий стратегии':'Strategy conditions matched';}
  }

  function journalDecision(event, sample=null, detail='') {
    state.decisionJournal.push({event,at:Date.now(),pair:state.targetPair,score:sample?.confluence?.score ?? null,
      tradeSeq:state.tradeContext?.seq || null,stake:state.tradeContext?.stake ?? null,
      direction:sample?.analysis?.direction || null,setup:sample?.analysis?.setup || null,expiry:sample?.analysis?.recommendedExpiry || null,
      periods:sample?.analysis?.timeframesUsed || [],sources:sample?.analysis?.dataSources || [],veto:sample?.analysis?.vetoReason || null,status:sample?.analysis?.dataStatus || null,
      rejections:sample?.analysis?.rejected || [],frames:sample?.analysis?.dataSummary || marketDataSummary(),detail});
    if(state.decisionJournal.length>100) state.decisionJournal.shift();
    publishDiagnostics(true);
  }

  function quoteIsFresh() {
    const q=state.lastRealQuote;
    return Boolean(q && normalizePocketPair(q.pair)===normalizePocketPair(state.targetPair) && Date.now()-q.receivedAt<3500);
  }

  window.winkyDiagnostics = () => JSON.parse(JSON.stringify({version:CONTENT_VERSION,revision:DATA_REVISION,pair:state.targetPair,hook:state.hookStatus || null,historyRequest:state.historyRequestStatus || null,frames:marketDataSummary(),
    brokerClock:state.brokerClock || null,brokerNow:marketNow(),quoteSource:state.lastRealQuote?.source || null,chartTf:state.actualChartTf || null,quoteFresh:quoteIsFresh(),searchRunning:state.searchRunning,
    decisions:state.decisionJournal}));

  function publishDiagnostics(force=false) {
    if(!document.documentElement || !document.createElement || !document.getElementById)return;
    if(!force && Date.now()-(state.lastDiagnosticsAt || 0)<500)return;
    state.lastDiagnosticsAt=Date.now();
    let el=document.getElementById('winky-diagnostics');
    if(!el) {el=document.createElement('script');el.id='winky-diagnostics';el.type='application/json';document.documentElement.appendChild(el);}
    const snapshot=window.winkyDiagnostics();
    snapshot.botState=state.botState;snapshot.status=state.analysisCache?.analysis?.dataStatus || null;
    snapshot.lastAnalysis=state.analysisCache?{direction:state.analysisCache.analysis.direction,expiry:state.analysisCache.analysis.recommendedExpiry,
      scenario:state.analysisCache.analysis.scenarioKey || null,score:state.analysisCache.confluence?.score,rejections:state.analysisCache.analysis.rejected}:null;
    el.textContent=JSON.stringify(snapshot);
  }
  setInterval(()=>publishDiagnostics(),1000);

  function marketReason(analysis) {
    const ru=state.lang==='ru';
    const reasons={HIGH_RISK_MARKET:ru?'Тренд или уровень запрещает вход':'Trend or level blocks entry',OPPOSING_HIGHER_TREND:ru?'Старший тренд направлен против входа':'Opposing higher timeframe',
      NOT_ENOUGH_CANDLES:ru?'Не хватает подтверждённых свечей':'Insufficient confirmed candles',STALE_CANDLES:ru?'Обновляем устаревшие свечи':'Refreshing stale candles',
      INCOMPATIBLE_CANDLES:ru?'Ожидаем данные выбранной пары':'Waiting for selected pair data',LOW_CONFLUENCE_WAIT:ru?'Сетап не подтверждён':'Setup not confirmed'};
    if(analysis?.dataStatus==='NO_DATA' && analysis.explanationRu) return ru?analysis.explanationRu:analysis.explanationEn;
    return reasons[analysis?.vetoReason] || analysis?.line1 || (ru?'Ожидаем точку входа':'Waiting for entry');
  }

  async function waitForOptimalMicroEntry(tradeDir, atr) {
    if (typeof LiveTickBuffer === "undefined") return { ok: true, price: getCurrentChartPrice() };
    const startPrice = getCurrentChartPrice();
    if (!startPrice || startPrice <= 0) return { ok: true, price: startPrice };

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
      try {
        if (typeof selectStrategyExpiration === "function") {
          strategyTf = selectStrategyExpiration(analysis, scan) || "30s";
        }
        state._lastChartExpSec = 0;
        const targetExpSec = (strategyTf === "15s")
          ? 15
          : (strategyTf === "2m" || strategyTf === "120s"
              ? 120
              : (strategyTf === "1m" || strategyTf === "60s" ? 60 : 30));
        const expRes = await requestMainWorldSetExpiry(strategyTf);
      if (expRes && expRes.ok && expRes.confirmed && expRes.observedSec >= 5 && expRes.observedSec <= 150) {
          realPocketSec = expRes.observedSec;
        } else {
          realPocketSec = targetExpSec;
        }
        const domExpSec = getPocketSelectedExpirationSeconds();
        if (domExpSec >= 5 && domExpSec <= 150) {
          realPocketSec = domExpSec;
        }
      } catch (e) {
        console.warn("[Winky] Expiry setup warning:", e);
        realPocketSec = (strategyTf === "15s")
          ? 15
          : (strategyTf === "2m" || strategyTf === "120s"
              ? 120
              : (strategyTf === "1m" || strategyTf === "60s" ? 60 : 30));
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
        accuracy: Math.round((confluence?.score || 0)/5*100),
        confluence: confluence?.score || 4.7,
        duration: resolvedTf,
        line1: analysis?.line1 || "",
        line2: analysis?.line2 || "",
        durationSec: durationSec,
        startTime: Date.now(),
        bestPriceEntry: true,
      };

      state.botState = "PREPARING_TRADE";
      state.analysisStartedAt = null;
      renderSignalCardState();

      // Opening voice is played after sending/observing the actual trade.

      // 3. Замеряем баланс, котировку и параметры сделки ДО клика
      state.balanceBeforeClick = getPocketBalance();
      state.balanceBefore = state.balanceBeforeClick;
      state.actualStakePlaced = getCurrentPocketStake() || state.currentStake || finalStake || 50;
      state.actualPayoutPct = getCurrentPairPayout() || 92;
      state.entryPrice = getCurrentChartPrice();
      state.activeStake = state.actualStakePlaced;
      state.activePayout = state.actualPayoutPct;

      // 3.5. Оптимальный микро-тайминг входа (до 2.0с)
      const microEntry = analysis?.entrySource==='pixels' ? {ok:true,price:getCurrentChartPrice()} : await waitForOptimalMicroEntry(tradeDir, analysis?.atr || 0.0005);
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


      if (state.searchRunning) {
        if (analysis.searchGeneration !== undefined && analysis.searchGeneration !== state.searchGeneration) { resetTradePreparation(null); return; }
        const fresh=await freshPairAnalysis({preferredScenarioKey:analysis.scenarioKey,entryThreshold:analysis.entryThreshold || 4});
        const sameScenario=!analysis.scenarioKey || fresh.analysis.scenarioKey===analysis.scenarioKey;
        const currentPair=scanPocketOptionCurrentPair();
        if (analysis.searchGeneration!==state.searchGeneration || normalizePocketPair(currentPair)!==normalizePocketPair(state.targetPair) || (!analysis.isStreamerOverride && (!sameScenario || !canEnterAnalysis(fresh.analysis,fresh.confluence,analysis.entryThreshold || 4) || fresh.analysis.direction!==tradeDir || selectStrategyExpiration(fresh.analysis,fresh.scan)!==resolvedTf))) {
          resetTradePreparation(null); return;
        }
      }
      // One context owns the click, callback measurements, timer and outcome.
      const trade = state.tradeContext = {
        seq: ++state.tradeSequence, pair: state.targetPair, direction: tradeDir,
        stake: state.actualStakePlaced, startedAt: Date.now(), balanceBefore: getPocketBalance(),
        historyBefore: new Set(pocketDealRows().map(dealRowFingerprint)), brokerId: null,
        resultApplied: false, openConfirmed: false, lastBadgeAt: 0, remainingSec: null,
      };
      state.balanceBeforeClick = trade.balanceBefore;
      state.balanceDuringTrade = state.balanceAfterOpen = state.balanceAfterClose = null;
      const clicked = await POAutomation.clickTrade(tradeDir);
      if (state.tradeContext !== trade) return;
      if (clicked === false && !trade.openConfirmed) { resetTradePreparation(trade); return; }
      trade.clickUncertain = clicked === null;
      journalDecision(trade.clickUncertain?'opening_uncertain':'order_sent',{analysis,confluence},state.selectedTimeframe);
      // A timed-out bridge might already have clicked. Do not send a second order.
      if (trade.clickUncertain) {
        for (let attempt = 0; attempt < 10 && !trade.openConfirmed; attempt++) {
          const balance = getPocketBalance();
          const active = hasActiveOpenDealsOnPocket(trade);
          if (active.isOpen || (trade.balanceBefore !== null && balance !== null && Math.abs(trade.balanceBefore - balance - trade.stake) < 0.02)) trade.openConfirmed = true;
          if (!trade.openConfirmed) await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      state.botState = 'IN_TRADE';
      renderSignalCardState();
      announceObservedOpening(trade);

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
      state.tradeStartTime = trade.startedAt;
      state.tradeEndTime = trade.closesAt || trade.startedAt + state.tradeDurationSec * 1000;
      state.isCalibratedToRealDeal = false;
      state.hasExtendedOnce = false;
      state._currentTradeRemaining = state.tradeDurationSec;
      updateInTradeTimerUI(state.tradeDurationSec);

      state.expiryInterval = setInterval(() => {
        if (state.tradeContext !== trade) return;
        const now = Date.now();

        // 1. Проверяем окончание сделки
        if (now >= state.tradeEndTime) {

          const active = hasActiveOpenDealsOnPocket(trade);
          if (active.isOpen) {
            state.tradeEndTime = now + active.remainingSec * 1000;
            updateInTradeTimerUI(active.remainingSec);
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
      if (state.tradeContext) {
        state.botState='IN_TRADE';
        state.tradeEndTime=state.tradeContext.closesAt || state.tradeContext.startedAt + state.tradeDurationSec*1000;
        onSignalTimerFinished();
        return;
      }
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

  function rankPairCandidate(candidate) {
    const a=candidate.analysis || {};
    const observed=[Boolean(a.trendRegime),Boolean(a.setup),Boolean(a.sr),Number.isFinite(a.rsi),Boolean(candidate.sentiment?.observed)];
    return Math.round((candidate.confluence?.factors || []).reduce((sum,f,i)=>sum+(observed[i] && Number.isFinite(f.score)?Math.max(0,Math.min(1,f.score)):0),0)*100)/100;
  }

  function sortedPairCandidates(candidates) {
    return candidates.slice().sort((a,b)=>rankPairCandidate(b)-rankPairCandidate(a) || b.payout-a.payout || b.observedAt-a.observedAt);
  }

  function bestPairCandidate(candidates) { return sortedPairCandidates(candidates)[0] || null; }

  function canEnterAnalysis(analysis, confluence, threshold=4, requireFreshQuote=true) {
    return Boolean(analysis?.shouldTrade && !analysis.hardVeto && !['HIGH_RISK_MARKET','OPPOSING_HIGHER_TREND','INCOMPATIBLE_CANDLES','NOT_ENOUGH_CANDLES','STALE_CANDLES'].includes(analysis.vetoReason) &&
      ['BUY','SELL'].includes(analysis.direction) && Number.isFinite(confluence?.score) && confluence.score>=threshold && (!requireFreshQuote || quoteIsFresh()));
  }

  function samplePairAnalysis(force=false,selection={}) {
    const cached=state.analysisCache;
    if(!force && cached && cached.pair===state.targetPair && Date.now()-cached.observedAt<250) return cached;
    if(!force && state.lastAnalysisCalculatedAt && Date.now()-state.lastAnalysisCalculatedAt<250) {
      return {pair:state.targetPair,analysis:{shouldTrade:false,dataStatus:'NO_DATA',vetoReason:'ANALYSIS_THROTTLED',explanationRu:'Обновляем данные выбранной пары'},confluence:{score:0,factors:[]},observedAt:Date.now(),payout:parseFloat(state.targetPayout)||0};
    }
    state.lastAnalysisCalculatedAt=Date.now();
    ChartAnalyzer.pollPrice();
    const scan=scanCanvasStructure();
    const analysis=ChartAnalyzer.analyzeMarket(scan,selection);
    const sentiment=readTradersSentiment();
    const confluence=analysis.confluence || evaluate5FactorConfluence(scan,analysis,sentiment);
    return state.analysisCache={pair:state.targetPair,analysis,scan,sentiment,confluence,
      payout:parseFloat(state.targetPayout)||0,observedAt:Date.now()};
  }

  async function freshPairAnalysis(selection={}) {
    const delay=state.lastAnalysisCalculatedAt ? 250-(Date.now()-state.lastAnalysisCalculatedAt) : 0;
    if(delay>0) await new Promise(resolve=>setTimeout(resolve,delay));
    return samplePairAnalysis(true,selection);
  }

  async function waitPocketPairReady(pair, period=chartPeriodSeconds()) {
    const deadline=Math.min(Date.now()+3200,state.pairDataDeadline || Infinity);
    requestMarketRecovery(pair,period || 60);
    while(Date.now()<deadline) {
      const current=scanPocketOptionCurrentPair();
      const frames=marketFrames(scanCanvasStructure());
      if(normalizePocketPair(current)===normalizePocketPair(pair) && quoteIsFresh() &&
        (period===null ? [15,30,60].some(p=>ProTraderEngine.frameContext(frames[p])) :
          frameIsReady(frames[period],period))) return true;
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    return false;
  }

  async function showPairInterval(pair, tf) {
    if(state.pairDataDeadline && Date.now()>=state.pairDataDeadline) return false;
    const response=await requestMainWorldEnsureChartTimeframe(tf);
    if(response?.activeTf) state.actualChartTf=response.activeTf;
    if(!response?.ok) journalDecision('timeframe_unconfirmed',null,tf+': '+(response?.error || 'not_observed'));
    state.analysisCache=null;
    return waitPocketPairReady(pair,chartPeriodSeconds(tf));
  }

  async function startSignalAnalysis() {
    if(state.botState!=='IDLE' || state.searchRunning || state.tradeContext) return;
    state.searchRunning=true;
    const generation=++state.searchGeneration;
    state.botState='ANALYZING_PAIR';state.analysisStartedAt=Date.now();
    state.searchSeen=[];state.pairCandidates=[];
    requestMarketRecovery(state.targetPair,60);
    const button=document.getElementById('btnGetSignalAction'),ru=state.lang==='ru';
    const steps=ru?['01 · ТРЕНД M1','02 · СТРУКТУРА','03 · УРОВНИ S15','04 · ТОЧКА ВХОДА']:['01 · M1 TREND','02 · STRUCTURE','03 · S15 LEVELS','04 · ENTRY'];
    let chosen=null;
    const alive=()=>generation===state.searchGeneration && !state.tradeContext;
    const render=(step,sample,status)=>{
      const factor=step<3 && sample?.analysis?.dataStatus!=='NO_DATA'?sample?.confluence?.factors?.[step]:null;
      if(status==='checking' && factor) status=factor.pass?'confirmed':'rejected';
      renderAnalysisStep(step,4,steps[step],factor?.detail || marketReason(sample?.analysis),sample && sample.analysis.dataStatus!=='NO_DATA'?String(sample.confluence?.score ?? 0):null,status==='confirmed',status);
    };
    try {
      if(button) {button.disabled=true;button.classList.add('disabled');button.textContent=ru?'АНАЛИЗ ПАР · 1/5':'SCANNING PAIRS · 1/5';}
      notifyTradePhase('ANALYZING',state.targetPair,0);
      if(state.tradesOnSamePair>=2) {state.tradesOnSamePair=0;await switchPocketPair(null);}
      for(let attempt=0;attempt<10 && state.pairCandidates.length<5 && alive();attempt++) {
        const pair=state.targetPair,key=normalizePocketPair(pair);
        if(state.searchSeen.includes(key)) break;
        state.searchSeen.push(key);state.searchPairIndex=state.pairCandidates.length+1;
        if(button) button.textContent=(ru?'АНАЛИЗ ПАР · ':'SCANNING PAIRS · ')+state.searchPairIndex+'/5';
        let sample=null,ready=false,anyReady=false;
        state.pairDataDeadline=Date.now()+3200;
        state.botState='ANALYZING_PAIR';
        for(let step=0;step<4 && alive();step++) {
          state.analysisStartedAt=Date.now();
          if(step===0 || step===2) {
            render(step,sample,'loading');
            // Numeric M1/M2 are independent of the visible S15 selector.
            // Already confirmed long data are analysed before requesting another interval.
            const available=marketFrames(scanCanvasStructure());
            sample=samplePairAnalysis();
            if(canEnterAnalysis(sample.analysis,sample.confluence,4)) {chosen=sample;anyReady=true;break;}
            const needShort=step===2 && !['1m','2m'].includes(sample.analysis.recommendedExpiry);
            ready=step===0 || needShort ? await showPairInterval(pair,step===0?'M1':'S15') :
              Boolean(ProTraderEngine.frameContext(available[60]));
            anyReady=anyReady || ready;
            if(!alive()) break;
            // A missing S15 does not disable a valid M1/M2 scenario. The
            // engine independently rejects scenarios with missing data.
            if(!ready && step===0) journalDecision('interval_data_timeout',sample,'M1');
          }
          const until=Date.now()+650;
          do {
            sample=samplePairAnalysis();
            anyReady=anyReady || sample.analysis.valid===true || sample.analysis.shouldTrade===true;
            render(step,sample,sample.analysis.dataStatus==='NO_DATA'?'loading':sample.analysis.shouldTrade?'confirmed':'checking');
            if(canEnterAnalysis(sample.analysis,sample.confluence,4)) {chosen=sample;break;}
            if(Date.now()>=until || !alive()) break;
            await new Promise(resolve=>setTimeout(resolve,Math.min(250,until-Date.now())));
          } while(alive());
          if(chosen) break;
        }
        if(!alive()) break;
        if(sample && anyReady && sample.analysis.dataStatus!=='NO_DATA') {state.pairCandidates.push(sample);state.pairVisits.set(key,Date.now());journalDecision(chosen?'early_entry':'pair_checked',sample);}
        if(chosen || state.pairCandidates.length>=5) break;
        render(3,sample,'rejected');
        VoiceManager.playCategory('flat_skip',false,'thinking');
        state.botState='SWITCHING_PAIR';
        if(!await switchPocketPair(null) || normalizePocketPair(state.targetPair)===key) break;
      }
      const ranked=chosen?[chosen]:sortedPairCandidates(state.pairCandidates).filter(c=>canEnterAnalysis(c.analysis,c.confluence,3.5,false));
      for(const candidate of ranked) {
        if(!alive()) break;
        const pair=candidate.pair;
        if(normalizePocketPair(pair)!==normalizePocketPair(state.targetPair) && !await switchPocketPair(pair)) {journalDecision('return_failed',candidate);continue;}
        state.botState='ANALYZING_PAIR';
        state.pairDataDeadline=Date.now()+3200;
        const frames=marketFrames();
        if(!ProTraderEngine.frameContext(frames[60])) await showPairInterval(pair,'M1');
        if((candidate.analysis.entryPeriodSec || 15)<60) await showPairInterval(pair,'S15');
        if(!alive()) break;
        const threshold=chosen?4:3.5;
        const fresh=await freshPairAnalysis({preferredScenarioKey:candidate.analysis.scenarioKey,entryThreshold:threshold});
        if((candidate.analysis.scenarioKey && fresh.analysis.scenarioKey!==candidate.analysis.scenarioKey) || !canEnterAnalysis(fresh.analysis,fresh.confluence,threshold)) {journalDecision('entry_cancelled',fresh,'signal_changed_on_return');continue;}
        fresh.analysis.searchGeneration=generation;fresh.analysis.entryThreshold=threshold;
        journalDecision('entry_confirmed',fresh);
        render(3,fresh,'confirmed');
        await executeTradeWithSignal(fresh.analysis,fresh.confluence,fresh.scan);
        if(state.tradeContext) break;
        journalDecision('entry_cancelled',fresh,'pre_click_recheck');
      }
    } catch(error) {loggerLog('[LivePairSearch]',error);journalDecision('search_error',null,String(error));}
    finally {
      state.searchRunning=false;state.analysisStartedAt=null;state.pairDataDeadline=null;
      if(!state.tradeContext && !['IN_TRADE','TRADE_RESULT','COOLDOWN'].includes(state.botState)) {
        state.botState='IDLE';
        if(button) {button.disabled=false;button.classList.remove('disabled');button.textContent=state.autoStream?(ru?'НОВЫЙ КРУГ ПОИСКА…':'NEXT SCAN…'):t('getSignal');}
        if(state.autoStream) setTimeout(()=>{if(state.autoStream && state.botState==='IDLE')startSignalAnalysis();},1000);
      }
    }
  }

  async function onSignalTimerFinished() {
    if (state.botState !== "IN_TRADE" || !state.tradeContext || state.tradeContext.resultApplied) return;
    const trade = state.tradeContext;
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


    // Restore the bounded finish -> RESULT -> score/voice -> IDLE sequence
    // from e377527. The infinite PENDING loop introduced in c03648e prevented
    // every downstream action when optional broker/DOM evidence was missing.
    let outcomeResult = evaluateTradeOutcome(trade);
    const settlementStartedAt = Date.now();
    const resumeActiveTrade = () => {
      const active = hasActiveOpenDealsOnPocket(trade);
      if (!active.isOpen) return false;
      state.botState = 'IN_TRADE';
      state.tradeEndTime = Date.now() + active.remainingSec * 1000;
      state.expiryInterval = setInterval(() => {
        if (state.tradeContext !== trade || state.botState !== 'IN_TRADE') return;
        const remaining = Math.max(0, Math.floor((state.tradeEndTime - Date.now()) / 1000));
        updateInTradeTimerUI(remaining);
        if (Date.now() >= state.tradeEndTime) onSignalTimerFinished();
      }, 200);
      updateInTradeTimerUI(active.remainingSec);
      return true;
    };
    while (state.tradeContext === trade && outcomeResult.outcome === 'PENDING' && Date.now() - settlementStartedAt < 10000) {
      if (resumeActiveTrade()) return;
      if (btnGet) btnGet.textContent = state.lang === 'ru' ? 'СВЕРКА РЕЗУЛЬТАТА POCKET…' : 'CHECKING POCKET RESULT…';
      await new Promise(resolve => setTimeout(resolve, Math.min(300, 10000 - (Date.now() - settlementStartedAt))));
      if (state.tradeContext !== trade) return;
      outcomeResult = evaluateTradeOutcome(trade);
    }
    if (state.tradeContext !== trade || trade.resultApplied) return;
    // A late real badge can correct an early local expiry. Return to the
    // active countdown instead of classifying or opening another order.
    if (outcomeResult.outcome === 'PENDING' && resumeActiveTrade()) return;

    // Audio finishes independently; settlement evidence is refreshed below.
    trade.balanceFallbackReady = Date.now() - settlementStartedAt >= 10000;
    outcomeResult = evaluateTradeOutcome(trade);
    if (outcomeResult.outcome === 'PENDING' && resumeActiveTrade()) return;
    if (outcomeResult.outcome === 'PENDING') outcomeResult = tradeOutcome('UNKNOWN', 0, 'settlement_evidence_unavailable');
    if (state.tradeContext !== trade || trade.resultApplied) return;
    trade.resultApplied = true;
    journalDecision('trade_result',null,outcomeResult.outcome+': '+outcomeResult.reason);
    notifyTradePhase('RESULT', trade.pair, 0);
    const isWin = outcomeResult.isWin;
    const profitDelta = outcomeResult.profitDelta;
    const lossDelta = outcomeResult.lossDelta;

    loggerLog(`[onSignalTimerFinished] Итог: ${outcomeResult.outcome} (причина: ${outcomeResult.reason}, profitDelta: ${profitDelta}, lossDelta: ${lossDelta})`);

    state.lastTrade = {
      pair: trade.pair,
      direction: state.activeSignal ? state.activeSignal.direction : "BUY",
      entryPrice: state.entryPrice,
      exitPrice: state.exitPrice,
      isWin: isWin,
      outcome: outcomeResult.outcome,
      reason: outcomeResult.reason,
      closedAt: Date.now(),
    };

    // 4. Подсвечиваем медальон WINK TRADE
    if (isWin !== null) triggerOrbGlow(isWin);

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
      VoiceManager.playCategory('trade_refund', false, 'happy');
      if (block) block.textContent = state.lang === 'ru' ? 'ВОЗВРАТ СТАВКИ · шаг перекрытия сохранён' : 'REFUND · recovery step unchanged';
    } else if (outcomeResult.outcome === 'UNKNOWN') {
      state.lastTradeOutcome = 'UNKNOWN';
      if (block) block.textContent = state.lang === 'ru' ? 'РЕЗУЛЬТАТ НЕ ПОЛУЧЕН · статистика и шаг перекрытия сохранены' : 'RESULT UNAVAILABLE · score and recovery step unchanged';
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
        if (state.targetPair) {
          if (!Array.isArray(state.recentPairs)) state.recentPairs = [];
          state.recentPairs.push(state.targetPair);
        }
        await switchPocketPair(null);
        await new Promise((r) => setTimeout(r, 3200));
        if (typeof LiveTickBuffer !== "undefined") LiveTickBuffer.reset(state.targetPair);
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
        if (state.targetPair) {
          if (!Array.isArray(state.recentPairs)) state.recentPairs = [];
          state.recentPairs.push(state.targetPair);
        }
        await switchPocketPair(null);
        await new Promise((r) => setTimeout(r, 3200));
        if (typeof LiveTickBuffer !== "undefined") LiveTickBuffer.reset(state.targetPair);
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

        if (state.targetPair) {
          if (!Array.isArray(state.recentPairs)) state.recentPairs = [];
          state.recentPairs.push(state.targetPair);
        }
        await switchPocketPair(null);
        await new Promise((r) => setTimeout(r, 3200));
        if (typeof LiveTickBuffer !== "undefined") LiveTickBuffer.reset(state.targetPair);
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
    state.tradeContext = null;
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
      if (state.searchRunning || state.tradeContext) return;
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
    if (normalizePocketPair(pairName) !== normalizePocketPair(state.targetPair)) {
      LiveTickBuffer.reset(pairName);
      state.candles = []; state.priceTicks = []; state.priceHistory = [];
      state.lastCanvasCandlesSnapshotTs = 0;
      state.lastRealQuote = null;
      state.analysisCache = null;
      state.visualReadyAfter = Date.now()+150;
    }
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
      orbTimeEl.textContent = `Таймф: ${state.actualChartTf || "—"}  Время: ${state.selectedTimeframe}`;
    }

    // 3. Селектор пары в боте
    const selectPair = document.getElementById("selectBotPair");
    if (selectPair && selectPair.value !== state.targetPair) {
      if(!Array.from(selectPair.options || []).some(option=>option.value===state.targetPair)) {
        const option=document.createElement('option');option.value=state.targetPair;option.textContent=`${state.targetFlags} ${state.targetPair} (${state.targetPayout})`;selectPair.appendChild(option);
      }
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
        <div class="winky-orb-timeframe" id="winkyOrbTime">Таймф: ${state.actualChartTf || "—"}  Время: ${state.selectedTimeframe}</div>
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
    if(state.searchRunning && ["IDLE","SWITCHING_PAIR"].includes(state.botState)) return;

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
        if (!state.autoStream && state.searchRunning && !state.tradeContext) state.searchGeneration++;
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
