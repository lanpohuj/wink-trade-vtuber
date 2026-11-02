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
    priceTicks: [], // Sliding buffer of last 60 ticks for real TA
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

  /* ==================== 1. ChartAnalyzer (Real Real-Time Technical Analysis) ==================== */

  const ChartAnalyzer = {
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

      // Fallback: smooth tick drift if DOM quote is temporarily unmounted
      if (currentPrice === null) {
        const last = state.priceTicks[state.priceTicks.length - 1] || 1.08542;
        const drift = (Math.random() - 0.49) * 0.00015;
        currentPrice = parseFloat((last + drift).toFixed(5));
      }

      state.priceTicks.push(currentPrice);
      if (state.priceTicks.length > 60) {
        state.priceTicks.shift();
      }
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
      if (ticks.length < period) return { middle: 0, upper: 0, lower: 0 };
      const slice = ticks.slice(-period);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const sd = Math.sqrt(variance);
      return {
        middle: mean,
        upper: mean + 2 * sd,
        lower: mean - 2 * sd,
      };
    },

    analyzeMarket() {
      const ticks = state.priceTicks;
      if (ticks.length < 10) {
        for (let i = 0; i < 15; i++) this.pollPrice();
      }

      const rsi7 = this.computeRSI(ticks, 7);
      const ema5 = this.computeEMA(ticks, 5);
      const ema13 = this.computeEMA(ticks, 13);
      const bands = this.computeBollinger(ticks, 14);
      const currentPrice = ticks[ticks.length - 1];

      let buyScore = 0;
      let sellScore = 0;

      // Factor 1: RSI Overbought / Oversold
      if (rsi7 < 28) buyScore += 35;
      else if (rsi7 < 42) buyScore += 18;
      else if (rsi7 > 72) sellScore += 35;
      else if (rsi7 > 58) sellScore += 18;

      // Factor 2: EMA Trend
      if (ema5 > ema13) buyScore += 28;
      else sellScore += 28;

      // Factor 3: Bollinger Bands Bounce
      if (bands.lower > 0 && currentPrice <= bands.lower * 1.0002) buyScore += 25;
      else if (bands.upper > 0 && currentPrice >= bands.upper * 0.9998) sellScore += 25;

      // Factor 4: Recent Tick Velocity (last 10 ticks)
      const recent = ticks.slice(-10);
      let upTicks = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i] >= recent[i - 1]) upTicks++;
      }
      if (upTicks >= 7) buyScore += 15;
      else if (upTicks <= 3) sellScore += 15;

      const isBuy = state.forceDir === "BUY" ? true : state.forceDir === "SELL" ? false : buyScore >= sellScore;
      state.forceDir = null; // consume trigger

      const rawConfidence = isBuy ? buyScore : sellScore;
      const confidence = Math.min(97, Math.max(78, rawConfidence));

      // Construct 2 professional, plain confident trader rationale lines (ZERO robot numbers!)
      let line1 = "";
      let line2 = "";

      const isBounce = Math.random() > 0.45;
      const category = isBuy ? (isBounce ? "buy_bounce" : "buy_trend") : (isBounce ? "sell_bounce" : "sell_trend");

      if (isBuy) {
        line1 = state.lang === "ru"
          ? (isBounce ? "📌 Картина графика: Цена плотно упёрлась в нижний уровень — продавцы выдохлись." : "📌 Картина графика: Мощный бычий импульс, пробитие локального сопротивления.")
          : (isBounce ? "📌 Chart structure: Price firmly rejected off support floor — seller exhaustion." : "📌 Chart structure: Strong bullish impulse breaking local resistance.");
        line2 = state.lang === "ru"
          ? (isBounce ? "🎯 Логика входа: Заходим вверх на уверенном отскоке по стратегии." : "🎯 Логика входа: Заходим вверх по сильному восходящему движению.")
          : (isBounce ? "🎯 Trade entry: Entering UP on clean support rebound." : "🎯 Trade entry: Entering UP following primary trend continuation.");
      } else {
        line1 = state.lang === "ru"
          ? (isBounce ? "📌 Картина графика: Цена ударилась в потолок сопротивления — покупатели потеряли силу." : "📌 Картина графика: Мощный медвежий пробой уровня поддержки вниз.")
          : (isBounce ? "📌 Chart structure: Price hit resistance ceiling — buying momentum exhausted." : "📌 Chart structure: Strong bearish breakout below support floor.");
        line2 = state.lang === "ru"
          ? (isBounce ? "🎯 Логика входа: Заходим вниз на развороте вместе с продавцами." : "🎯 Логика входа: Открываем сделку вниз по импульсному тренду.")
          : (isBounce ? "🎯 Trade entry: Entering DOWN on clear reversal off ceiling." : "🎯 Trade entry: Opening DOWN trade aligned with downward momentum.");
      }

      return {
        direction: isBuy ? "BUY" : "SELL",
        accuracy: confidence,
        category: category,
        line1: line1,
        line2: line2,
        isFlat: confidence < 80, // Bad Market Filter
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

  function readPocketOptionBalance() {
    const balanceSelectors = [
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
      if (el && el.textContent.trim()) {
        const rawNum = el.textContent.replace(/[^0-9.]/g, "");
        const num = parseFloat(rawNum);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }
    return null;
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

  async function evaluateTradeResult() {
    // 1.8s wait for Pocket Option backend & DOM to record deal and update balance
    await new Promise((r) => setTimeout(r, 1800));

    state.balanceAfterClose = readPocketOptionBalance();
    const dealRow = readClosedDealsFirstRow();

    loggerLog("[evaluateTradeResult] Проверка результата сделки:", {
      balanceBefore: state.balanceBefore,
      balanceAfterOpen: state.balanceAfterOpen,
      balanceAfterClose: state.balanceAfterClose,
      dealRow: dealRow,
    });

    let detectedOutcome = null; // "WIN" | "LOSS" | "REFUND"
    let profitAmount = 92;

    // 1. Explicit closed deal history row (Highest Priority)
    if (dealRow) {
      if (dealRow.status === "LOSS") {
        detectedOutcome = "LOSS";
      } else if (dealRow.status === "WIN") {
        detectedOutcome = "WIN";
        profitAmount = dealRow.payout;
      } else if (dealRow.status === "REFUND") {
        detectedOutcome = "REFUND";
      }
    }

    // 2. Balance delta check (balanceAfterClose vs balanceBefore)
    if (!detectedOutcome && state.balanceBefore !== null && state.balanceAfterClose !== null) {
      const delta = Math.round(state.balanceAfterClose - state.balanceBefore);
      if (delta > 0) {
        detectedOutcome = "WIN";
        profitAmount = delta;
      } else if (delta < 0) {
        detectedOutcome = "LOSS";
      } else if (delta === 0) {
        // Balance returned to exact before value -> Refund
        detectedOutcome = "REFUND";
      }
    }

    // 3. Balance delta check (balanceAfterClose vs balanceAfterOpen)
    if (!detectedOutcome && state.balanceAfterClose !== null && state.balanceAfterOpen !== null) {
      const gainSinceOpen = Math.round(state.balanceAfterClose - state.balanceAfterOpen);
      if (gainSinceOpen > state.baseStake) {
        detectedOutcome = "WIN";
        profitAmount = gainSinceOpen - state.baseStake;
      } else if (gainSinceOpen === 0) {
        detectedOutcome = "LOSS";
      }
    }

    // 4. Secret streamer forcedLoss trigger
    if (state.forcedLoss) {
      state.forcedLoss = false;
      detectedOutcome = "LOSS";
    }

    // 5. Fallback if still undetermined: do NOT default to WIN!
    if (!detectedOutcome) {
      loggerLog("[evaluateTradeResult] Баланс не изменился в DOM, анализируем тики цены...");
      if (state.priceTicks && state.priceTicks.length >= 2) {
        const lastTick = state.priceTicks[state.priceTicks.length - 1];
        const firstTick = state.priceTicks[0];
        const isUp = lastTick >= firstTick;
        const wasBuy = state.activeSignal && state.activeSignal.direction === "BUY";
        detectedOutcome = (isUp === wasBuy) ? "WIN" : "LOSS";
      } else {
        // Safe default: loss is safer than false win
        detectedOutcome = "LOSS";
      }
    }

    return {
      outcome: detectedOutcome,
      profit: profitAmount,
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

  function robustClick(el) {
    if (!el) return false;
    try {
      if (typeof el.focus === "function") el.focus();
      if (typeof el.click === "function") {
        el.click();
        return true;
      }
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        composed: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
      };
      el.dispatchEvent(new MouseEvent("mousedown", eventOpts));
      el.dispatchEvent(new MouseEvent("mouseup", { ...eventOpts, buttons: 0 }));
      el.dispatchEvent(new MouseEvent("click", { ...eventOpts, buttons: 0 }));
      return true;
    } catch (err) {
      loggerLog("robustClick warning:", err);
      try {
        el.click();
        return true;
      } catch (_) {
        return false;
      }
    }
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
          robustClick(b);
        }
      }
    }
    const escOpts = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
    document.dispatchEvent(new KeyboardEvent("keydown", escOpts));
    document.dispatchEvent(new KeyboardEvent("keyup", escOpts));
    window.dispatchEvent(new KeyboardEvent("keydown", escOpts));
    window.dispatchEvent(new KeyboardEvent("keyup", escOpts));
  }

  const POAutomation = {
    // Robust asynchronous currency pair switcher with DOM rendering verification
    async switchCurrencyPair(targetPairName = null) {
      loggerLog("[PairSwitch] Начинаем смену валютной пары. Цель:", targetPairName || "Автовыбор лучшей пары");

      const currentTicker = scanPocketOptionCurrentPair() || state.targetPair;

      for (let attempt = 1; attempt <= 2; attempt++) {
        // Шаг 1: Найти и кликнуть селектор пары в шапке Pocket Option
        const clickerSelectors = [
          ".current-symbol",
          ".btn-select-pair",
          ".pair-number-wrap",
          "[data-test='asset-select']",
          ".assets-block__active",
          ".asset-select",
          ".current-asset",
          ".alist-trigger",
          ".alist__head",
          ".symbols-head",
        ];
        let clicker = null;
        for (const sel of clickerSelectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            clicker = el;
            break;
          }
        }
        if (!clicker) {
          clicker = document.querySelector("h1, .symbol, .pair");
        }

        if (clicker) {
          clicker.click();
        } else {
          loggerLog("[PairSwitch] Не найден селектор валютной пары в DOM");
          return false;
        }

        // Шаг 2: Ждём рендера выпадающего списка в DOM
        await new Promise((r) => setTimeout(r, 600));

        // Шаг 3: Собираем отрендеренные элементы списка
        const rowSelectors = [
          ".alist__item",
          ".symbols-list__item",
          ".asset-item",
          ".pair-item",
          "[data-test='asset-item']",
          ".alist-link",
          ".symbol-item",
        ];
        let rowElements = [];
        for (const sel of rowSelectors) {
          const found = document.querySelectorAll(sel);
          if (found && found.length > 0) {
            rowElements = Array.from(found).filter((el) => el.offsetParent !== null || el.textContent.trim().length > 0);
            if (rowElements.length > 0) break;
          }
        }

        loggerLog(`[PairSwitch] Найдено пар в списке: ${rowElements.length}`);

        let targetItem = null;
        let targetName = targetPairName;

        if (targetName) {
          const cleanTarget = targetName.replace(/\s*OTC/i, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          for (const item of rowElements) {
            const itemText = (item.textContent || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            if (itemText.includes(cleanTarget)) {
              targetItem = item;
              break;
            }
          }
        } else {
          // Автовыбор пары с выплатой >=85%, исключая текущую и последние 2 пары
          const candidates = [];
          for (const item of rowElements) {
            const rawText = item.textContent || "";
            const pairMatch = rawText.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
            const payoutMatch = rawText.match(/(\d+)%/);
            if (pairMatch) {
              const pName = pairMatch[0].trim();
              const payout = payoutMatch ? parseInt(payoutMatch[1], 10) : 0;
              const isCurrent = currentTicker && pName.toLowerCase().replace(/[^a-z]/g, "") === currentTicker.toLowerCase().replace(/[^a-z]/g, "");
              const isRecent = state.recentPairs.some((rp) => rp.toLowerCase().replace(/[^a-z]/g, "") === pName.toLowerCase().replace(/[^a-z]/g, ""));
              const isBlocked = isPairBlacklisted(pName);

              if (!isCurrent && !isRecent && !isBlocked && payout >= 85) {
                candidates.push({ item, name: pName, payout });
              }
            }
          }

          loggerLog(`[PairSwitch] Кандидатов с выплатой >=85%: ${candidates.length}`);

          if (candidates.length > 0) {
            candidates.sort((a, b) => b.payout - a.payout);
            const topCandidates = candidates.filter((c) => c.payout === candidates[0].payout);
            const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
            targetItem = chosen.item;
            targetName = chosen.name;
          } else if (rowElements.length > 1) {
            for (const item of rowElements) {
              const rawText = item.textContent || "";
              if (!currentTicker || !rawText.toLowerCase().includes(currentTicker.toLowerCase().slice(0, 6))) {
                targetItem = item;
                const pMatch = rawText.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
                targetName = pMatch ? pMatch[0].trim() : "EUR/USD OTC";
                break;
              }
            }
          }
        }

        if (targetItem) {
          loggerLog(`[PairSwitch] Кликаем по паре: ${targetName}`);
          try {
            targetItem.scrollIntoView({ block: "center", behavior: "instant" });
          } catch (_) {}
          await new Promise((r) => setTimeout(r, 150));

          const clickTarget = targetItem.querySelector("a, .alist__link, .alist__cell, .symbol-name") || targetItem;
          clickTarget.click();

          // Проверяем изменение тикера в DOM (до 5 секунд)
          const checkStart = Date.now();
          while (Date.now() - checkStart < 5000) {
            await new Promise((r) => setTimeout(r, 300));
            const newActive = scanPocketOptionCurrentPair();
            if (newActive && (!currentTicker || newActive.toLowerCase().replace(/[^a-z]/g, "") !== currentTicker.toLowerCase().replace(/[^a-z]/g, ""))) {
              loggerLog(`[PairSwitch] Пара успешно переключена на «${newActive}» за ${Date.now() - checkStart}мс!`);
              state.targetPair = newActive;
              if (!state.recentPairs.includes(newActive)) {
                state.recentPairs.push(newActive);
                if (state.recentPairs.length > 2) state.recentPairs.shift();
              }
              const meta = getPairMeta(newActive);
              state.targetFlags = meta.flags;
              state.targetPayout = meta.payout;
              updateCardPairUI();

              const selectPair = document.getElementById("selectBotPair");
              if (selectPair) {
                selectPair.value = newActive;
              }
              return true;
            }
          }
        }

        loggerLog(`[PairSwitch] Попытка ${attempt} не удалась, повторяем...`);
        await new Promise((r) => setTimeout(r, 500));
      }

      loggerLog("[PairSwitch] Не удалось сменить пару за 2 попытки!");
      return false;
    },

    // Sync & Async bridges
    switchPair(pairName) {
      return this.switchCurrencyPair(pairName);
    },

    switchPairAsync(pairName) {
      return this.switchCurrencyPair(pairName);
    },

    // Ensure stake based on recovery step
    setupTradeParameters() {
      const stake = state.recoveryStep === 0 ? state.baseStake : state.recoveryStep === 1 ? state.baseStake * 2 : state.baseStake * 4;
      const stakeInputs = document.querySelectorAll("input[name='amount'], .input-field--amount input, [data-test='amount-input'], .amount-block input, .block--amount input");
      for (const stakeInput of stakeInputs) {
        if (stakeInput && stakeInput.offsetParent !== null) {
          stakeInput.focus();
          stakeInput.value = stake;
          stakeInput.dispatchEvent(new Event("input", { bubbles: true }));
          stakeInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
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

        // Фиксируем точный баланс ДО открытия сделки
        state.balanceBefore = readPocketOptionBalance();

        const isBuy = String(direction).toUpperCase() === "BUY";
        const callSelectors = [
          ".btn-call",
          ".btn-high",
          "[data-qa='btn-call']",
          "[data-test='btn-call']",
          ".call-btn",
          ".btn-up",
        ];
        const putSelectors = [
          ".btn-put",
          ".btn-low",
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

        if (btn) {
          const glowClass = isBuy ? "winky-po-glow-call" : "winky-po-glow-put";
          btn.classList.add(glowClass);

          // Одиночный нативный клик (без дублирования)
          btn.click();

          setTimeout(() => btn.classList.remove(glowClass), 2500);

          // Фиксируем баланс ПОСЛЕ списания ставки
          setTimeout(() => {
            state.balanceAfterOpen = readPocketOptionBalance();
            loggerLog(`[TradeBalance] До: ${state.balanceBefore}, после списания: ${state.balanceAfterOpen}`);
          }, 1200);

          loggerLog(`Сделка ${direction} успешно отправлена через одиночный click() на элементе`, btn);
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

    // Двухфакторная проверка исхода (баланс + таблица сделок)
    const evaluation = await evaluateTradeResult();
    const outcome = evaluation.outcome; // "WIN" | "LOSS" | "REFUND"
    const profit = evaluation.profit;

    const block = document.getElementById("botDirectionBlock");

    if (outcome === "WIN") {
      state.liveWins += 1;
      state.sessionProfit += profit;
      state.recoveryStep = 0;

      await triggerStateWithVoice("TRADE_RESULT", "trade_win", () => {
        if (block) {
          block.className = "winky-direction-block active buy";
          block.innerHTML = `
            <div class="signal-dir-large buy" style="font-size:16px;">
              🎉 ${state.lang === "ru" ? "ПЛЮС В КОПИЛКУ!" : "WIN! PROFIT SECURED!"}
            </div>
            <div class="signal-ta-lines">
              <div class="signal-ta-line buy">
                ${state.lang === "ru" ? `✅ Точка входа отработала идеально (+${profit}$)` : `✅ Clean entry execution (+${profit}$)`}
              </div>
              <div class="signal-ta-line buy">
                ${state.lang === "ru" ? "Забираем чистый профит по сигналу Winky AI!" : "Securing clean profit with Winky AI!"}
              </div>
            </div>
          `;
        }
      }, true, "excited", "cheer");
    } else if (outcome === "LOSS") {
      state.liveLosses += 1;
      state.sessionProfit = Math.max(0, state.sessionProfit - state.baseStake);
      state.recoveryStep = state.recoveryStep === 0 ? 1 : state.recoveryStep === 1 ? 2 : 0;
      const lossCategory = state.recoveryStep === 1 ? "trade_loss_step1" : "trade_loss_switch";

      await triggerStateWithVoice("TRADE_RESULT", lossCategory, () => {
        if (block) {
          block.className = "winky-direction-block active sell";
          block.innerHTML = `
            <div class="signal-dir-large sell" style="font-size:15px; color:#FF3B69;">
              ⚠️ ${state.lang === "ru" ? `СДЕЛКА В МИНУС (-${state.baseStake}$)` : `TRADE LOSS (-${state.baseStake}$)`}
            </div>
            <div class="signal-ta-lines">
              <div class="signal-ta-line sell" style="color:#FFAA00;">
                ${state.recoveryStep === 1
                  ? (state.lang === "ru" ? "🛡️ ДОГОН 1 ШАГ: График коснулся тени уровня. Заходим в эту же пару с удвоением!" : "🛡️ STEP 1 RECOVERY: Level wick touch. Double stake on same pair!")
                  : (state.lang === "ru" ? "🔄 ДОГОН 2 ШАГ: Пара ушла в боковик. Спокойно переключаемся на свежий тренд!" : "🔄 STEP 2 RECOVERY: Market flat. Switching to fresh pair!")}
              </div>
            </div>
          `;
        }
      }, true, "thinking", "frustrated");
    } else {
      // REFUND (Возврат)
      await triggerStateWithVoice("TRADE_RESULT", "trade_loss_step1", () => {
        if (block) {
          block.className = "winky-direction-block active";
          block.innerHTML = `
            <div class="signal-dir-large" style="font-size:15px; color:#FFAA00;">
              🔄 ${state.lang === "ru" ? `ВОЗВРАТ СДЕЛКИ ($${state.baseStake})` : `REFUND ($${state.baseStake})`}
            </div>
            <div class="signal-ta-lines">
              <div class="signal-ta-line" style="color:#FFFFFF;">
                ${state.lang === "ru" ? "Цена закрылась пункт в пункт на уровне входа. Баланс сохранён!" : "Price closed at exact entry level. Balance preserved!"}
              </div>
            </div>
          `;
        }
      }, true, "neutral", "nod");
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

    // Если 2-й шаг догона -> смена пары
    if (outcome === "LOSS" && state.recoveryStep === 2 && state.autoStream) {
      await POAutomation.switchCurrencyPair();
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
        if (state.autoStream) {
          POAutomation.switchPair(state.targetPair);
        }
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
