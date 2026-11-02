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

  function injectPageHook() {
    try {
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("page_hook.js");
      s.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(s);
      console.log("[Winky] page_hook.js injected successfully");
    } catch (err) {
      console.warn("[Winky] Failed to inject page_hook.js:", err);
    }
  }

  injectPageHook();

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

  /* ==================== Application State ==================== */

  let savedStats = { wins: 110, losses: 1, profit: 2332 };
  try {
    const raw = localStorage.getItem("winky_live_stats_v4");
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
    lastPairSwitchAttemptAt: 0,
    currentPrefetchIntent: null,
    isAnalysing: false,
    signalState: "idle", // "idle" | "analysing" | "active"
    activeSignal: null,
    forceDir: null, // Streamer trigger: BUY / SELL
    forcedLoss: false,
    recoveryStep: 0, // 0 = base ($100), 1 = x2 ($200, same pair), 2 = x4 ($400, new pair)
    baseStake: 100,
    currentStake: 100,
    balanceBeforeClick: null,
    balanceDuringTrade: null,
    entryPrice: null,
    exitPrice: null,
    liveWins: savedStats.wins,
    liveLosses: savedStats.losses,
    sessionProfit: savedStats.profit,
    lastBalance: null,
    balanceBefore: null,
    balanceAfterOpen: null,
    balanceAfterClose: null,
    isExecutingTrade: false,
    recentPairs: [],
    expiryInterval: null,
    autoStreamTimer: null,
    priceTicks: [], // Sliding buffer of ticks for real TA
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
      buy: "↗ КУПИТЬ (ВВЕРХ)",
      sell: "↘ ПРОДАТЬ (ВНИЗ)",
      tabSignals: "🏠 СИГНАЛЫ",
      tabChat: "💬 ИИ-ЧАТ",
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
      buy: "↗ BUY (CALL)",
      sell: "↘ SELL (PUT)",
      tabSignals: "🏠 SIGNALS",
      tabChat: "💬 AI CHAT",
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

  /* ==================== 1. Live Hook Listener & Sentiment ==================== */

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "WINKY_HOOK") return;
    if ((event.data.type === "TICK" || event.data.type === "PRICE_TICK") && typeof event.data.price === "number") {
      ChartAnalyzer.onNewPriceTick(event.data.price, event.data.timestamp || Date.now());
    }
  });

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
      const bars = document.querySelectorAll(".sentiment-bar, .sentiment-slider, .chart-sentiment");
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
      const sContainer = document.querySelector("[class*='sentiment'], [class*='traders-mood']");
      if (sContainer) {
        const matches = sContainer.textContent.match(/(\d{1,3})%/g);
        if (matches && matches.length >= 2) {
          const v1 = parseInt(matches[0], 10);
          const v2 = parseInt(matches[1], 10);
          if (v1 + v2 === 100 || (v1 >= 0 && v2 >= 0)) {
            return { bullish: v1, bearish: v2 };
          }
        }
      }
    } catch (_) {}
    return { bullish, bearish };
  }

  /* ==================== 2. ChartAnalyzer (Smart Trend & Breakout Engine) ==================== */

  const ChartAnalyzer = {
    onNewPriceTick(price, timestamp = Date.now()) {
      if (!price || isNaN(price) || price <= 0) return;
      state.lastHookTickTime = timestamp;
      state.priceTicks.push(price);
      if (state.priceTicks.length > 120) state.priceTicks.shift();

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

      const rsi7 = this.computeRSI(ticks, 7);
      const ema5 = this.computeEMA(ticks, 5);
      const ema13 = this.computeEMA(ticks, 13);
      const bands = this.computeBollinger(ticks, 14);
      const currentPrice = ticks[ticks.length - 1];
      const sentiment = readTradersSentiment();

      const n = state.candles.length;
      const c1 = n >= 1 ? state.candles[n - 1] : null;
      const c2 = n >= 2 ? state.candles[n - 2] : null;
      const c3 = n >= 3 ? state.candles[n - 3] : null;

      // Candle structure checks
      const last3Red = c1 && c2 && c3 && c1.isRed && c2.isRed && c3.isRed;
      const last3Green = c1 && c2 && c3 && c1.isGreen && c2.isGreen && c3.isGreen;
      const lowerLows = c1 && c2 && c3 && (c1.close < c2.close && c2.close < c3.close);
      const higherHighs = c1 && c2 && c3 && (c1.close > c2.close && c2.close > c3.close);

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
            ? (fBuy ? "📌 Картина графика: Мощный подтверждённый бычий импульс." : "📌 Картина графика: Стремительный медвежий импульс.")
            : (fBuy ? "📌 Chart structure: Confirmed bullish momentum." : "📌 Chart structure: Confirmed bearish momentum."),
          line2: state.lang === "ru"
            ? (fBuy ? "🎯 Логика входа: Входим вверх по силе движения покупателей." : "🎯 Логика входа: Входим вниз вслед за давлением продавцов.")
            : (fBuy ? "🎯 Trade entry: Entering UP following buyer strength." : "🎯 Trade entry: Entering DOWN aligned with seller pressure."),
        };
      }

      // -------------------------------------------------------------
      // RULE 4: SMART RECOVERY FLIP (Умный переворот при перекрытии)
      // -------------------------------------------------------------
      if (!decision && state.recoveryStep > 0 && state.lastTrade && !state.lastTrade.isWin && state.lastTrade.pair === state.targetPair) {
        // Предыдущая сделка на этой же паре была в МИНУС
        if (state.lastTrade.direction === "BUY") {
          // Мы входили ВВЕРХ, а цена продавила вниз (водопад)
          // Если тренд всё ещё медвежий (EMA5 < EMA13 или свеча красная) -> ПЕРЕВОРОТ ВНИЗ!
          if (ema5 <= ema13 || (c1 && c1.isRed)) {
            decision = {
              direction: "SELL",
              category: "sell_trend",
              confidence: 93,
              line1: state.lang === "ru"
                ? "📌 Анализ просадки: Уровень поддержки пробит вниз — нисходящий тренд продолжается."
                : "📌 Drawdown analysis: Support level broken downwards — bearish trend continues.",
              line2: state.lang === "ru"
                ? "🎯 Умное перекрытие: Не ловим нож против рынка — переворачиваемся вниз (x2)!"
                : "🎯 Smart recovery: Do not catch falling knives — flipping DOWN with x2 stake!",
            };
          }
        } else if (state.lastTrade.direction === "SELL") {
          // Мы входили ВНИЗ, а цена выстрелила вверх
          if (ema5 >= ema13 || (c1 && c1.isGreen)) {
            decision = {
              direction: "BUY",
              category: "buy_trend",
              confidence: 93,
              line1: state.lang === "ru"
                ? "📌 Анализ просадки: Уровень сопротивления пробит импульсом покупателей вверх."
                : "📌 Drawdown analysis: Resistance level broken upwards by buyer impulse.",
              line2: state.lang === "ru"
                ? "🎯 Умное перекрытие: Не шортим против ракеты — переворачиваемся вверх (x2)!"
                : "🎯 Smart recovery: Do not short the rocket — flipping UP with x2 stake!",
            };
          }
        }
      }

      // -------------------------------------------------------------
      // RULE 3: SENTIMENT BAR VETO (Вето толпы на Покете)
      // -------------------------------------------------------------
      if (!decision) {
        if (sentiment.bearish >= 72) {
          // 72%+ медведей (например 84% красного давления) -> СТРОГО ПРОДАЖА
          decision = {
            direction: "SELL",
            category: "sell_trend",
            confidence: 92,
            line1: state.lang === "ru"
              ? `📌 Настроение рынка: Подавляющее давление медведей (${sentiment.bearish}% на продажу).`
              : `📌 Market sentiment: Heavy bearish dominance (${sentiment.bearish}% sellers).`,
            line2: state.lang === "ru"
              ? "🎯 Логика входа: Входим вниз строго по направлению доминирующего объёма."
              : "🎯 Trade entry: Entering DOWN aligned with dominant order flow volume.",
          };
        } else if (sentiment.bullish >= 72) {
          // 72%+ быков -> СТРОГО ПОКУПКА
          decision = {
            direction: "BUY",
            category: "buy_trend",
            confidence: 92,
            line1: state.lang === "ru"
              ? `📌 Настроение рынка: Доминирующее давление быков (${sentiment.bullish}% на покупку).`
              : `📌 Market sentiment: Dominant bullish pressure (${sentiment.bullish}% buyers).`,
            line2: state.lang === "ru"
              ? "🎯 Логика входа: Входим вверх по преобладающему напору покупателей."
              : "🎯 Trade entry: Entering UP following dominant buyer pressure.",
          };
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
              ? "📌 Картина графика: Пробой уровня поддержки вниз, сильное безоткатное движение."
              : "📌 Chart structure: Support floor breakdown with strong unidirectional momentum.",
            line2: state.lang === "ru"
              ? "🎯 Логика входа: Входим вниз по тренду пробоя — не ловим падающий нож!"
              : "🎯 Trade entry: Entering DOWN on trend breakout — never catch a falling knife!",
          };
        }
        // Ракета вверх: 3 зелёные свечи подряд с обновлением максимумов
        else if ((last3Green && higherHighs) || (ema5 > ema13 && rsi7 > 62 && c1 && c1.isGreen)) {
          decision = {
            direction: "BUY",
            category: "buy_trend",
            confidence: 91,
            line1: state.lang === "ru"
              ? "📌 Картина графика: Мощный пробой сопротивления вверх, покупатели доминируют."
              : "📌 Chart structure: Strong resistance breakout upward, buyers dominating.",
            line2: state.lang === "ru"
              ? "🎯 Логика входа: Входим вверх по восходящему импульсу вслед за крупными покупками."
              : "🎯 Trade entry: Entering UP following primary breakout momentum.",
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
                ? "📌 Картина графика: Подтверждённый отскок от зоны поддержки, первая зелёная свеча."
                : "📌 Chart structure: Confirmed bounce off support floor with first bullish candle.",
              line2: state.lang === "ru"
                ? "🎯 Логика входа: Заходим вверх на развороте после истощения волны продаж."
                : "🎯 Trade entry: Entering UP on confirmed reversal after seller exhaustion.",
            };
          } else {
            // Свеча всё ещё красная — цена продолжает падать!
            // Никаких покупок! Идём вниз по продолжению тренда
            decision = {
              direction: "SELL",
              category: "sell_trend",
              confidence: 86,
              line1: state.lang === "ru"
                ? "📌 Картина графика: Низкий RSI, но свечи продолжают падать — отскока нет."
                : "📌 Chart structure: Low RSI, but candles continue dropping — no bounce confirmation.",
              line2: state.lang === "ru"
                ? "🎯 Логика входа: Работаем по продолжению нисходящего движения вниз."
                : "🎯 Trade entry: Following bearish continuation downward.",
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
                ? "📌 Картина графика: Подтверждённый отбой от уровня сопротивления, красная свеча."
                : "📌 Chart structure: Confirmed rejection from resistance ceiling with bearish candle.",
              line2: state.lang === "ru"
                ? "🎯 Логика входа: Заходим вниз на развороте после фиксации прибыли покупателями."
                : "🎯 Trade entry: Entering DOWN on reversal after buyer profit taking.",
            };
          } else {
            decision = {
              direction: "BUY",
              category: "buy_trend",
              confidence: 86,
              line1: state.lang === "ru"
                ? "📌 Картина графика: Высокий RSI, но бычий импульс продолжается без остановки."
                : "📌 Chart structure: High RSI, but bullish momentum continues without halt.",
              line2: state.lang === "ru"
                ? "🎯 Логика входа: Входим вверх по силе восходящего тренда."
                : "🎯 Trade entry: Entering UP following strong bullish trend continuation.",
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

  /* ==================== 2. Scan Pocket Option DOM & Sync ==================== */

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
        state.targetPair = normPair;
        state.targetFlags = meta.flags;
        state.targetPayout = meta.payout;
        state.marketType = normPair.toLowerCase().includes("otc") ? "otc" : "regular";
        updateCardPairUI();
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
            state.targetPayout = p;
            updateCardPairUI();
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
    return state.baseStake || 100;
  }

  function setPocketStakeAmount(amount) {
    const stakeVal = Math.round(amount);
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
    const stake = state.currentStake || (state.baseStake * (state.recoveryStep === 0 ? 1 : state.recoveryStep === 1 ? 2 : 4)) || 100;
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

  async function switchPocketPair(targetPairName = null) {
    loggerLog("[switchPocketPair] Запрос на смену пары. Цель:", targetPairName || "АВТО-ВЫБОР лучшей пары");

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
    }

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
      } else if (availableRows.length > 0) {
        // Страховочный вариант: любая строка, кроме текущей
        const nonBefore = availableRows.filter((r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, "") !== normBefore);
        if (nonBefore.length > 0) {
          chosenRow = nonBefore[0];
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
      state.targetPair = newName;
      state.targetPayout = chosenRow.payout + "%";
      const meta = getPairMeta(newName);
      state.targetFlags = meta.flags;

      if (!state.recentPairs.includes(newName)) {
        state.recentPairs.push(newName);
        if (state.recentPairs.length > 3) state.recentPairs.shift();
      }

      updateCardPairUI();
      const select = document.getElementById("selectBotPair");
      if (select) {
        select.value = newName;
      }

      loggerLog(`[switchPocketPair] ✅ Пара успешно переключена на: «${newName}»! Недавние: [${state.recentPairs.join(", ")}]`);
      return true;
    }

    loggerLog("[switchPocketPair] ⚠️ Не удалось выбрать строку для клика!");
    closeAnyOpenModals();
    return false;
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
      const multiplier = state.recoveryStep === 0 ? 1 : state.recoveryStep === 1 ? 2 : 4;
      const stake = state.baseStake * multiplier;
      setPocketStakeAmount(stake);
    },

    // Programmatically click CALL (BUY) or PUT (SELL) with atomic single execution lock
    clickTrade(direction) {
      if (state.isExecutingTrade) {
        loggerLog("[TradeLock] Повторный вход заблокирован! Сделка уже исполняется.");
        return false;
      }
      state.isExecutingTrade = true;

      try {
        closeAnyOpenModals();
        this.setupTradeParameters();

        // 1. Фиксируем точный баланс ДО открытия сделки, цену входа и сумму сделки
        state.balanceBeforeClick = getPocketBalance();
        state.balanceBefore = state.balanceBeforeClick;
        state.entryPrice = getCurrentChartPrice();
        state.currentStake = getPocketStakeAmount() || (state.baseStake * (state.recoveryStep === 0 ? 1 : state.recoveryStep === 1 ? 2 : 4));

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
        let btn = null;
        for (const sel of selList) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            btn = el;
            break;
          }
        }

        // Резервный поиск по тексту на правой панели
        if (!btn) {
          const allButtons = document.querySelectorAll(".trade-actions button, .right-block button, .actions-block button, button");
          for (const b of allButtons) {
            if (b.offsetParent === null) continue;
            const txt = (b.textContent || "").trim().toUpperCase();
            if (isBuy && (txt.includes("КУПИТЬ") || txt.includes("BUY") || txt.includes("HIGHER") || txt === "ВВЕРХ")) {
              btn = b;
              break;
            } else if (!isBuy && (txt.includes("ПРОДАТЬ") || txt.includes("SELL") || txt.includes("LOWER") || txt === "ВНИЗ")) {
              btn = b;
              break;
            }
          }
        }

        if (btn) {
          const glowClass = isBuy ? "winky-po-glow-call" : "winky-po-glow-put";
          btn.classList.add(glowClass);

          // Глубокая эмуляция клика для React-интерфейса Покета
          simulatePocketClick(btn);

          setTimeout(() => btn.classList.remove(glowClass), 2500);

          // 2. Через 2.0 секунды фиксируем баланс ПОСЛЕ списания ставки
          setTimeout(() => {
            state.balanceDuringTrade = getPocketBalance();
            state.balanceAfterOpen = state.balanceDuringTrade;
            loggerLog(`[TradeBalance] До клика: ${state.balanceBeforeClick}, во время сделки (списание): ${state.balanceDuringTrade}`);
          }, 2000);

          loggerLog(`Сделка ${direction} ($${state.currentStake}) успешно отправлена через simulatePocketClick() на элементе`, btn);
          return true;
        } else {
          loggerLog(`Кнопка сделки ${direction} не найдена в DOM!`);
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

  async function startSignalAnalysis() {
    if (state.botState !== "IDLE") return;

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    const btnGet = document.getElementById("btnGetSignalAction");

    // 1. Состояние: АНАЛИЗ ГРАФИКА (0ms UI)
    triggerStateWithVoice("ANALYZING_PAIR", null, () => {
      if (btnGet) {
        btnGet.disabled = true;
        btnGet.classList.add("disabled");
        btnGet.innerHTML = `<span>⚡</span><span>${state.lang === "ru" ? "АНАЛИЗ ГРАФИКА..." : "ANALYZING CHART..."}</span>`;
      }
    }, false);

    // 1.2с анимация сканирования тиков
    await new Promise((r) => setTimeout(r, 1200));

    // Технический анализ тиков
    const analysis = ChartAnalyzer.analyzeMarket();

    // 2. Проверка слабого рынка / боковика (Anti-Loop Cooldown 40с)
    if (analysis.isFlat && state.autoStream) {
      const now = Date.now();
      const lastSwitch = state.lastPairSwitchAttemptAt || 0;
      if (now - lastSwitch > 40000) {
        state.lastPairSwitchAttemptAt = now;

        // Блокирующий шаг: озвучиваем плановую смену пары
        await triggerStateWithVoice("SWITCHING_PAIR", "switch_pair", () => {
          renderSignalCardState();
        }, true, "thinking", "tilt_head");

        // Переключаем пару в Pocket Option DOM
        await POAutomation.switchCurrencyPair();

        state.botState = "IDLE";
        renderSignalCardState();

        if (btnGet) {
          btnGet.disabled = false;
          btnGet.classList.remove("disabled");
          btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
        }

        setTimeout(() => {
          if (state.autoStream && state.botState === "IDLE") startSignalAnalysis();
        }, 1500);
        return;
      } else {
        analysis.isFlat = false;
        analysis.accuracy = Math.max(82, analysis.accuracy);
      }
    }

    // 3. Состояние: ВХОД В СДЕЛКУ (Мгновенная озвучка за 0.05с синхронно с кликом)
    const durationSec = parseDurationSeconds(state.selectedTimeframe);
    state.activeSignal = {
      pair: state.targetPair,
      flags: state.targetFlags,
      payout: state.targetPayout,
      direction: analysis.direction,
      accuracy: analysis.accuracy,
      duration: state.selectedTimeframe,
      line1: analysis.line1,
      line2: analysis.line2,
      durationSec: durationSec,
      startTime: Date.now(),
    };

    const isBuy = String(analysis.direction).toUpperCase() === "BUY";
    const tradeVoiceCategory = analysis.category || (isBuy ? "buy_trend" : "sell_trend");

    // Запускаем озвучку категории и открываем сделку на Pocket Option
    triggerStateWithVoice("IN_TRADE", tradeVoiceCategory, () => {
      renderSignalCardState();
    }, false, "excited", "cheer");

    if (state.autoStream) {
      POAutomation.clickTrade(analysis.direction);
    } else {
      state.balanceBeforeClick = getPocketBalance();
      state.balanceBefore = state.balanceBeforeClick;
      state.entryPrice = getCurrentChartPrice();
      state.currentStake = getPocketStakeAmount() || (state.baseStake * (state.recoveryStep === 0 ? 1 : state.recoveryStep === 1 ? 2 : 4));
      setTimeout(() => {
        state.balanceDuringTrade = getPocketBalance();
        state.balanceAfterOpen = state.balanceDuringTrade;
        loggerLog(`[TradeBalance Manual] До клика: ${state.balanceBeforeClick}, во время сделки: ${state.balanceDuringTrade}`);
      }, 2000);
    }

    // Синхронизация сигнала с прод-сервером и Telegram Mini App
    sendSyncSignalToProd({
      pair: state.targetPair,
      direction: analysis.direction,
      accuracy: analysis.accuracy,
      duration: state.selectedTimeframe,
      rationale_ru: [analysis.line1, analysis.line2],
      rationale_en: [analysis.line1, analysis.line2],
      model: state.selectedModel,
    });

    // 4. Обратный отсчет таймера экспирации (30s)
    let remaining = durationSec;
    const updateTradeButtonLabel = (sec) => {
      if (btnGet) {
        btnGet.disabled = true;
        btnGet.classList.add("disabled");
        btnGet.innerHTML = `<span>⏳</span><span>${state.lang === "ru" ? `СДЕЛКА В РАБОТЕ (осталось ${sec} сек...)` : `TRADE ACTIVE (${sec}s left...)`}</span>`;
      }
    };
    updateTradeButtonLabel(remaining);

    state.expiryInterval = setInterval(() => {
      remaining -= 1;
      const timerEl = document.getElementById("signalTimerVal");
      if (timerEl) timerEl.textContent = formatTime(Math.max(0, remaining));
      updateTradeButtonLabel(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(state.expiryInterval);
        state.expiryInterval = null;
        onSignalTimerFinished();
      }
    }, 1000);
  }

  async function onSignalTimerFinished() {
    if (state.botState !== "IN_TRADE") return;
    state.botState = "TRADE_RESULT";

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    const btnGet = document.getElementById("btnGetSignalAction");
    if (btnGet) {
      btnGet.disabled = true;
      btnGet.innerHTML = `<span>✨</span><span>${state.lang === "ru" ? "ПОДВЕДЕНИЕ ИТОГОВ..." : "EVALUATING TRADE..."}</span>`;
    }

    // 1. Ждём 1.2 секунды, чтобы сервер Pocket Option успел закрыть сделку и начислить выплату на баланс
    await new Promise((r) => setTimeout(r, 1200));

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
      state.liveWins += 1;
      state.sessionProfit += profitDelta;
      state.recoveryStep = 0;
      setPocketStakeAmount(state.baseStake);

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
                  ${state.lang === "ru" ? "✅ Идеальная отработка перекрытия по мани-менеджменту!" : "✅ Flawless recovery execution according to strategy!"}
                </div>
                <div class="signal-ta-line buy">
                  ${state.lang === "ru" ? "Забрали чистый профит и вернули базовую ставку!" : "Clean profit locked, resetting stake to base!"}
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
      state.liveLosses += 1;
      state.sessionProfit = Math.max(0, state.sessionProfit - lossDelta);

      // Логика шагов перекрытия (Мартингейл):
      // Если был 0 -> становится 1 (Шаг 1: удвоение $200, остаёмся на паре)
      // Если был 1 -> становится 2 (Шаг 2: учетверение $400, смена пары)
      // Если был 2 -> сброс в 0 (защита депозита)
      if (state.recoveryStep === 0) {
        state.recoveryStep = 1;
        setPocketStakeAmount(state.baseStake * 2);

        await triggerStateWithVoice("TRADE_RESULT", "trade_loss_step1", () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#FFAA00;">
                ⚡ ${state.lang === "ru" ? "РАБОЧИЙ МИНУС · ИДЁМ В ПЕРЕКРЫТИЕ (x2)" : "RECOVERY STEP 1 · DOUBLE STAKE (x2)"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#FFAA00;">
                  ${state.lang === "ru"
                    ? "📌 Чуть зацепило на закрытии — ничего страшного! Удваиваем сумму и спокойно перекрываемся на этой паре."
                    : "📌 Wick touched at the close — no worries! Doubling stake and recovering calmly on this pair."}
                </div>
              </div>
            `;
          }
        }, true, "wink", "tilt_head");
      } else if (state.recoveryStep === 1) {
        state.recoveryStep = 2;
        setPocketStakeAmount(state.baseStake * 4);

        await triggerStateWithVoice("TRADE_RESULT", "trade_loss_switch", () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#00D9F5;">
                🔄 ${state.lang === "ru" ? "СМЕНА ПАРЫ ДЛЯ ПЕРЕКРЫТИЯ" : "SWITCHING PAIR FOR RECOVERY"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#00D9F5;">
                  ${state.lang === "ru"
                    ? "📌 Эта пара начала капризничать — переключаемся на чистый график и спокойно перекрываем минус там!"
                    : "📌 Choppy action on this pair — switching to a cleaner chart to recover smoothly!"}
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
        setPocketStakeAmount(state.baseStake);

        await triggerStateWithVoice("TRADE_RESULT", "trade_loss_switch", () => {
          if (block) {
            block.className = "winky-direction-block active";
            block.innerHTML = `
              <div class="signal-dir-large" style="font-size:15px; color:#FF3B69;">
                🛡️ ${state.lang === "ru" ? "ЗАЩИТА ДЕПОЗИТА · СБРОС СТАВКИ" : "DEPOSIT PROTECTION · RESET STAKE"}
              </div>
              <div class="signal-ta-lines">
                <div class="signal-ta-line" style="color:#FFAA00;">
                  ${state.lang === "ru"
                    ? "📌 Дошли до лимита перекрытий. Возвращаем базовую ставку для безопасной торговли."
                    : "📌 Recovery limit reached. Resetting to base stake for risk control."}
                </div>
              </div>
            `;
          }
        }, true, "thinking", "nod");
      }
    }

    saveStats();
    updateScoreHUDUI();

    // Пауза между сделками
    state.botState = "COOLDOWN";
    renderSignalCardState();
    if (btnGet) {
      btnGet.disabled = true;
      btnGet.innerHTML = `<span>⏳</span><span>${state.lang === "ru" ? "ПАУЗА МЕЖДУ СДЕЛКАМИ..." : "COOLDOWN..."}</span>`;
    }
    await new Promise((r) => setTimeout(r, 3500));

    // Возврат в IDLE
    state.botState = "IDLE";
    state.activeSignal = null;
    renderSignalCardState();

    if (btnGet) {
      btnGet.disabled = false;
      btnGet.classList.remove("disabled");
      btnGet.innerHTML = `<span>⚡</span><span>${t("getSignal")}</span>`;
    }

    // Если активен авто-стрим, запускаем следующий сигнал через 1.5с
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

            <!-- Direction & TA Block -->
            <div class="winky-direction-block idle" id="botDirectionBlock">
              <span>${t("readyForSignal")}</span>
            </div>
          </div>

          <!-- Action Row -->
          <div class="winky-action-row">
            <button type="button" class="winky-btn-get-signal" id="btnGetSignalAction">
              <span>⚡</span>
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

  function buildLiveScoreHTML() {
    const total = state.liveWins + state.liveLosses;
    const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) : "99.2";
    return `
      <div class="winky-score-track">
        <div class="score-title-badge">
          <span class="dot"></span>
          <span>${t("liveScore")}</span>
        </div>

        <div class="score-pill wins" id="scorePillWins" title="Клик: +1 Победа">
          <span class="lbl">${t("wins")}:</span>
          <span class="val" id="hudWinsVal">${state.liveWins}</span>
          <button type="button" class="score-step-btn" id="btnScoreAddWin">+</button>
        </div>

        <div class="score-pill losses" id="scorePillLosses" title="Клик: +1 Поражение">
          <span class="lbl">${t("losses")}:</span>
          <span class="val" id="hudLossesVal">${state.liveLosses}</span>
          <button type="button" class="score-step-btn" id="btnScoreAddLoss">+</button>
        </div>

        <div class="score-pill rate">
          <span class="lbl">${t("rate")}:</span>
          <span class="val" id="hudRateVal">${rate}%</span>
        </div>

        <div class="score-pill profit">
          <span class="lbl">${t("profit")}:</span>
          <span class="val" id="hudProfitVal">+$${state.sessionProfit}</span>
        </div>

        <button type="button" class="btn-score-reset" id="btnScoreReset" title="Сбросить табло">[Reset]</button>
      </div>
    `;
  }

  function renderSignalCardState() {
    const block = document.getElementById("botDirectionBlock");
    const accEl = document.getElementById("metricAccuracyVal");
    if (!block) return;

    if (state.botState === "IDLE") {
      block.className = "winky-direction-block idle";
      block.innerHTML = `<span>${t("readyForSignal")}</span>`;
    } else if (state.botState === "SWITCHING_PAIR") {
      block.className = "winky-direction-block analysing";
      block.innerHTML = `
        <div class="analysis-scan-title">
          <span>🔄</span>
          <span>${state.lang === "ru" ? "СМЕНА ВАЛЮТНОЙ ПАРЫ..." : "SWITCHING PAIR..."}</span>
        </div>
      `;
    } else if (state.botState === "ANALYZING_PAIR" || state.botState === "ANALYZING") {
      block.className = "winky-direction-block analysing";
      block.innerHTML = `
        <div class="analysis-scan-title">
          <span>⚡</span>
          <span>${t("analysing")}</span>
        </div>
        <div class="analysis-progress-bar">
          <div class="analysis-progress-fill"></div>
        </div>
      `;
    } else if (state.botState === "PREPARING_TRADE") {
      block.className = "winky-direction-block analysing";
      block.innerHTML = `
        <div class="analysis-scan-title">
          <span>🎙️</span>
          <span>${state.lang === "ru" ? "ПОДГОТОВКА ТОЧКИ ВХОДА..." : "PREPARING ENTRY..."}</span>
        </div>
        <div class="analysis-progress-bar">
          <div class="analysis-progress-fill"></div>
        </div>
      `;
    } else if (state.botState === "COOLDOWN") {
      block.className = "winky-direction-block idle";
      block.innerHTML = `<span>${state.lang === "ru" ? "ПАУЗА МЕЖДУ СДЕЛКАМИ..." : "POST-TRADE COOLDOWN..."}</span>`;
    } else if (state.botState === "IN_TRADE" && state.activeSignal) {
      const sig = state.activeSignal;
      const isBuy = sig.direction === "BUY";
      if (accEl) accEl.textContent = `${sig.accuracy}%`;

      block.className = `winky-direction-block active ${isBuy ? "buy" : "sell"}`;
      block.innerHTML = `
        <div class="signal-dir-large ${isBuy ? "buy" : "sell"}">
          ${isBuy ? t("buy") : t("sell")}
        </div>
        <div class="signal-ta-lines">
          <div class="signal-ta-line ${isBuy ? "buy" : "sell"}">${sig.line1}</div>
          <div class="signal-ta-line ${isBuy ? "buy" : "sell"}">${sig.line2}</div>
        </div>
        <div class="signal-sub-row">
          <span class="signal-badge-live">LIVE</span>
          <span class="signal-timer" id="signalTimerVal">${formatTime(sig.durationSec)}</span>
          <span class="signal-acc-badge">${sig.accuracy}% WINRATE</span>
        </div>
      `;
    }
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
  }

  function updateScoreHUDUI() {
    const winsEl = document.getElementById("hudWinsVal");
    const lossesEl = document.getElementById("hudLossesVal");
    const rateEl = document.getElementById("hudRateVal");
    const profitEl = document.getElementById("hudProfitVal");

    const total = state.liveWins + state.liveLosses;
    const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) : "99.2";

    if (winsEl) winsEl.textContent = state.liveWins;
    if (lossesEl) lossesEl.textContent = state.liveLosses;
    if (rateEl) rateEl.textContent = `${rate}%`;
    if (profitEl) profitEl.textContent = `+$${state.sessionProfit}`;

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
        "winky_live_stats_v4",
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
        state.targetPair = e.target.value;
        const meta = getPairMeta(state.targetPair);
        state.targetFlags = meta.flags;
        state.targetPayout = meta.payout;
        updateCardPairUI();
        POAutomation.switchPair(state.targetPair);
      });
    }

    // 7. Timeframe Select change
    const selectTf = document.getElementById("selectBotTimeframe");
    if (selectTf) {
      selectTf.addEventListener("change", (e) => {
        if (state.botState !== "IDLE") return;
        state.selectedTimeframe = e.target.value;
        updateCardPairUI();
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

    // 11. Live Score HUD buttons
    const btnAddWin = document.getElementById("btnScoreAddWin");
    const btnAddLoss = document.getElementById("btnScoreAddLoss");
    const btnReset = document.getElementById("btnScoreReset");

    if (btnAddWin) {
      btnAddWin.addEventListener("click", (e) => {
        e.stopPropagation();
        state.liveWins += 1;
        state.sessionProfit += 92;
        saveStats();
        updateScoreHUDUI();
      });
    }
    if (btnAddLoss) {
      btnAddLoss.addEventListener("click", (e) => {
        e.stopPropagation();
        state.liveLosses += 1;
        saveStats();
        updateScoreHUDUI();
      });
    }
    if (btnReset) {
      btnReset.addEventListener("click", (e) => {
        e.stopPropagation();
        state.liveWins = 110;
        state.liveLosses = 1;
        state.sessionProfit = 2332;
        saveStats();
        updateScoreHUDUI();
        sendProxyMessage("/api/live_stats", "POST", { reset: true });
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

    // 2. Mount Live Score HUD
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

    // 4. Enable Bulletproof Pointer Events Drag & Drop
    const botHeader = document.getElementById("winkyBotHeader");
    makeWidgetDraggable(botRoot, botHeader, "winky_bot_pos_v4");
    makeWidgetDraggable(scoreRoot, scoreRoot, "winky_score_pos_v4");

    window.__WINKY_STATE__ = state;
    window.__WINKY_CHART_ANALYZER__ = ChartAnalyzer;

    loggerLog("Winky Neko-Cyber Trading Bot успешно внедрён в DOM po.financial!");
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
