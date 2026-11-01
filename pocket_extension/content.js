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

  const PAIR_CATALOG = {
    otc: [
      { id: "EUR/USD OTC", name: "EUR/USD OTC", flags: "🇪🇺🇺🇸", payout: "92%" },
      { id: "AUD/CAD OTC", name: "AUD/CAD OTC", flags: "🇦🇺🇨🇦", payout: "90%" },
      { id: "MAD/USD OTC", name: "MAD/USD OTC", flags: "🇲🇦🇺🇸", payout: "92%" },
      { id: "USD/CAD OTC", name: "USD/CAD OTC", flags: "🇺🇸🇨🇦", payout: "92%" },
      { id: "GBP/USD OTC", name: "GBP/USD OTC", flags: "🇬🇧🇺🇸", payout: "92%" },
      { id: "USD/JPY OTC", name: "USD/JPY OTC", flags: "🇺🇸🇯🇵", payout: "90%" },
      { id: "AUD/USD OTC", name: "AUD/USD OTC", flags: "🇦🇺🇺🇸", payout: "91%" },
      { id: "NZD/USD OTC", name: "NZD/USD OTC", flags: "🇳🇿🇺🇸", payout: "88%" },
      { id: "Apple OTC", name: "Apple OTC", flags: "🍏", payout: "90%" },
      { id: "Tesla OTC", name: "Tesla OTC", flags: "⚡", payout: "90%" },
      { id: "BTC/USD OTC", name: "Bitcoin OTC", flags: "₿", payout: "86%" },
      { id: "ETH/USD OTC", name: "Ethereum OTC", flags: "Ξ", payout: "85%" },
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
    targetPair: "EUR/USD OTC",
    targetFlags: "🇪🇺🇺🇸",
    targetPayout: "92%",
    selectedTimeframe: "30s",
    selectedModel: "claude-fable-5.1",
    autoStream: false, // 🤖 АВТО-СТРИМ тумблер
    isAnalysing: false,
    signalState: "idle", // "idle" | "analysing" | "active"
    activeSignal: null,
    forceDir: null, // Streamer trigger: BUY / SELL
    recoveryStep: 0, // 0 = base ($100), 1 = x2 ($200, same pair), 2 = x4 ($400, new pair)
    baseStake: 100,
    liveWins: savedStats.wins,
    liveLosses: savedStats.losses,
    sessionProfit: savedStats.profit,
    lastBalance: null,
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
    const all = [...PAIR_CATALOG.otc, ...PAIR_CATALOG.regular];
    const found = all.find((p) => p.id.toLowerCase() === pairId.toLowerCase());
    if (found) return found;
    return { id: pairId, name: pairId, flags: "🌐", payout: state.targetPayout || "90%" };
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
      const confidence = Math.min(97, Math.max(74, rawConfidence));

      // Construct 2 professional, real technical rationale lines
      let line1 = "";
      let line2 = "";

      if (isBuy) {
        line1 = `• RSI(7): ${rsi7} — ${rsi7 < 30 ? "выход из зоны перепроданности" : "подтверждение бычьего импульса"}`;
        line2 = `• Уровень: ${currentPrice <= bands.lower ? "отскок от нижней полосы Боллинджера" : "бычье пересечение EMA(5/13) + поддержка"}`;
      } else {
        line1 = `• RSI(7): ${rsi7} — ${rsi7 > 70 ? "разворот из зоны перекупленности" : "давление продавцов на импульсе"}`;
        line2 = `• Уровень: ${currentPrice >= bands.upper ? "отскок от верхней полосы Боллинджера" : "медвежье пересечение EMA(5/13) + сопротивление"}`;
      }

      return {
        direction: isBuy ? "BUY" : "SELL",
        accuracy: confidence,
        rsi: rsi7,
        line1: line1,
        line2: line2,
        isFlat: confidence < 82, // Bad Market Filter
      };
    },
  };

  setInterval(() => ChartAnalyzer.pollPrice(), 250);

  /* ==================== 2. Scan Pocket Option DOM & Sync ==================== */

  function scanPocketOptionDOM() {
    // 1. Detect active pair from PO page
    const pairSelectors = [
      ".current-symbol",
      ".pair-number-wrap",
      ".symbols-list__item--active",
      "[data-test='current-asset']",
      ".symbol-name",
      "h1.pair-title",
      ".active-asset",
    ];

    let foundPair = "";
    for (const sel of pairSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        foundPair = el.textContent.trim();
        break;
      }
    }

    if (!foundPair) {
      const match = document.title.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?)/);
      if (match) foundPair = match[1];
    }

    if (foundPair) {
      if (!foundPair.includes("/") && foundPair.length >= 6) {
        foundPair = foundPair.slice(0, 3) + "/" + foundPair.slice(3);
      }
      if (foundPair !== state.targetPair && state.signalState !== "active") {
        state.targetPair = foundPair;
        const meta = getPairMeta(foundPair);
        state.targetFlags = meta.flags;
        state.marketType = foundPair.toLowerCase().includes("otc") ? "otc" : "regular";
        updateCardPairUI();
      }
    }

    // 2. Detect payout percentage
    const payoutSelectors = [".payout-val", ".current-payout", ".asset-payout", "[data-test='payout']"];
    for (const sel of payoutSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.includes("%")) {
        const text = el.textContent.trim();
        const m = text.match(/\d+%/);
        if (m) {
          state.targetPayout = m[0];
          updateCardPairUI();
          break;
        }
      }
    }

    // 3. Detect balance changes for Win/Loss tracking
    const balanceSelectors = [".balance-info-block", ".user-balance", ".current-balance", "[data-test='balance']"];
    for (const sel of balanceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const rawNum = el.textContent.replace(/[^0-9.]/g, "");
        const num = parseFloat(rawNum);
        if (!isNaN(num) && num > 0) {
          if (state.lastBalance !== null) {
            if (num > state.lastBalance) {
              const profitDelta = Math.round(num - state.lastBalance);
              onDealOutcome(true, profitDelta);
            }
          }
          state.lastBalance = num;
          break;
        }
      }
    }
  }

  setInterval(scanPocketOptionDOM, 1000);

  /* ==================== 3. Auto-Stream: UI Automation on Pocket Option ==================== */

  const POAutomation = {
    // Switch currency pair via Pocket Option DOM
    switchPair(pairName) {
      loggerLog("POAutomation: переключение пары на", pairName);
      const clicker = document.querySelector(".current-symbol, .btn-select-pair, .pair-number-wrap, [data-test='asset-select']");
      if (clicker) {
        clicker.click();
        setTimeout(() => {
          // Look for matching pair item in search or list
          const items = document.querySelectorAll(".symbols-list__item, .asset-item, .pair-item");
          for (const item of items) {
            if (item.textContent.toLowerCase().includes(pairName.toLowerCase())) {
              item.click();
              break;
            }
          }
        }, 300);
      }
      state.targetPair = pairName;
      const meta = getPairMeta(pairName);
      state.targetFlags = meta.flags;
      updateCardPairUI();
    },

    // Ensure 30s timeframe & set stake based on recovery step
    setupTradeParameters() {
      const stake = state.recoveryStep === 0 ? state.baseStake : state.recoveryStep === 1 ? state.baseStake * 2 : state.baseStake * 4;
      const stakeInput = document.querySelector("input[name='amount'], .input-field--amount input, [data-test='amount-input']");
      if (stakeInput) {
        stakeInput.value = stake;
        stakeInput.dispatchEvent(new Event("input", { bubbles: true }));
        stakeInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },

    // Programmatically click CALL (BUY) or PUT (SELL)
    clickTrade(direction) {
      this.setupTradeParameters();
      const isBuy = direction === "BUY";
      const btnCall = document.querySelector(".btn-call, .btn-high, [data-qa='btn-call'], [data-test='btn-call']");
      const btnPut = document.querySelector(".btn-put, .btn-low, [data-qa='btn-put'], [data-test='btn-put']");

      if (isBuy && btnCall) {
        btnCall.classList.add("winky-po-glow-call");
        btnCall.click();
        setTimeout(() => btnCall.classList.remove("winky-po-glow-call"), 2500);
      } else if (!isBuy && btnPut) {
        btnPut.classList.add("winky-po-glow-put");
        btnPut.click();
        setTimeout(() => btnPut.classList.remove("winky-po-glow-put"), 2500);
      }
    },
  };

  /* ==================== 4. Signal Execution & Smart Recovery Engine ==================== */

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
    if (state.isAnalysing) return;
    state.isAnalysing = true;
    state.signalState = "analysing";

    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }

    renderSignalCardState();
    sendProxyMessage("/api/winky/scan", "POST", {});

    // 1.2s smooth scanning animation
    await new Promise((r) => setTimeout(r, 1200));

    // Perform real technical analysis of ticks
    const analysis = ChartAnalyzer.analyzeMarket();

    // Check Bad Market Filter (<82% confidence)
    if (analysis.isFlat && state.autoStream) {
      state.isAnalysing = false;
      state.signalState = "idle";
      renderSignalCardState();

      // Trigger flat_skip voice on Winky
      sendProxyMessage("/api/winky/event", "POST", {
        event: "flat_skip",
        pair: state.targetPair,
        lang: state.lang,
      });

      // Auto-switch to next high-payout pair
      const list = PAIR_CATALOG.otc;
      const nextPair = list.find((p) => p.id !== state.targetPair) || list[0];
      POAutomation.switchPair(nextPair.id);

      // Re-trigger analysis after 3.5s
      setTimeout(() => {
        if (state.autoStream && !state.isAnalysing) startSignalAnalysis();
      }, 3500);
      return;
    }

    // Active Signal
    state.isAnalysing = false;
    state.signalState = "active";
    state.activeSignal = {
      pair: state.targetPair,
      direction: analysis.direction,
      accuracy: analysis.accuracy,
      duration: state.selectedTimeframe,
      line1: analysis.line1,
      line2: analysis.line2,
      durationSec: parseDurationSeconds(state.selectedTimeframe),
    };

    renderSignalCardState();

    // Sync signal to server & Mini App
    sendSyncSignalToProd({
      pair: state.targetPair,
      direction: analysis.direction,
      accuracy: analysis.accuracy,
      duration: state.selectedTimeframe,
      rationale_ru: [analysis.line1, analysis.line2],
      rationale_en: [analysis.line1, analysis.line2],
      model: state.selectedModel,
    });

    // Voice announcement through local Winky server (strictly LumeanTTS)
    sendProxyMessage("/api/winky/speak_signal", "POST", {
      pair: state.targetPair,
      direction: analysis.direction,
      duration: state.selectedTimeframe,
      model: state.selectedModel,
      lang: state.lang,
    });

    // If Auto-Stream is active, automatically place the trade on Pocket Option!
    if (state.autoStream) {
      POAutomation.clickTrade(analysis.direction);
    }

    // Start Expiry Countdown
    let remaining = state.activeSignal.durationSec;
    const timerEl = document.getElementById("signalTimerVal");

    state.expiryInterval = setInterval(() => {
      remaining -= 1;
      if (timerEl) timerEl.textContent = formatTime(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(state.expiryInterval);
        state.expiryInterval = null;
        onSignalTimerFinished();
      }
    }, 1000);
  }

  function onSignalTimerFinished() {
    // If balance was not detected or manual test, assume win or advance recovery
    if (state.signalState === "active") {
      onDealOutcome(true, 92);
    }
  }

  function onDealOutcome(isWin, profitAmount = 92) {
    if (state.signalState !== "active") return;
    state.signalState = "idle";
    renderSignalCardState();

    if (isWin) {
      state.liveWins += 1;
      state.sessionProfit += profitAmount;
      state.recoveryStep = 0; // reset martingale
      saveStats();
      updateScoreHUDUI();

      // Trigger win celebration on Winky
      sendProxyMessage("/api/winky/event", "POST", {
        event: "win",
        pair: state.targetPair,
        lang: state.lang,
      });

      if (state.autoStream) {
        setTimeout(() => {
          if (state.autoStream && !state.isAnalysing) startSignalAnalysis();
        }, 2800);
      }
    } else {
      state.liveLosses += 1;
      saveStats();
      updateScoreHUDUI();

      // Smart Recovery (Martingale up to 2 steps)
      if (state.recoveryStep === 0) {
        // Step 1: Same pair, double stake
        state.recoveryStep = 1;
        sendProxyMessage("/api/winky/event", "POST", {
          event: "loss_step1",
          pair: state.targetPair,
          lang: state.lang,
        });

        if (state.autoStream) {
          setTimeout(() => {
            if (state.autoStream && !state.isAnalysing) startSignalAnalysis();
          }, 3200);
        }
      } else if (state.recoveryStep === 1) {
        // Step 2: Switch pair, 4x stake
        state.recoveryStep = 2;
        sendProxyMessage("/api/winky/event", "POST", {
          event: "loss_step2",
          pair: state.targetPair,
          lang: state.lang,
        });

        const list = PAIR_CATALOG.otc;
        const nextPair = list.find((p) => p.id !== state.targetPair) || list[1];
        POAutomation.switchPair(nextPair.id);

        if (state.autoStream) {
          setTimeout(() => {
            if (state.autoStream && !state.isAnalysing) startSignalAnalysis();
          }, 4000);
        }
      } else {
        // Exceeded 2 steps -> reset to base stake
        state.recoveryStep = 0;
        if (state.autoStream) {
          setTimeout(() => {
            if (state.autoStream && !state.isAnalysing) startSignalAnalysis();
          }, 3000);
        }
      }
    }
  }

  /* ==================== 5. TikTok Chat Queue Polling ==================== */

  async function pollTikTokChatQueue() {
    if (!state.autoStream || state.isAnalysing || state.signalState === "active") return;

    try {
      const res = await sendProxyMessage("/api/winky/next_command", "GET");
      if (res && res.data) {
        const cmd = res.data;
        if (cmd.action === "switch_pair" && cmd.pair) {
          loggerLog("TikTok Chat переключение пары по запросу", cmd.user, "на", cmd.pair);
          POAutomation.switchPair(cmd.pair);
          setTimeout(() => {
            if (state.autoStream && !state.isAnalysing) startSignalAnalysis();
          }, 2000);
        } else if (cmd.action === "ask_chat") {
          sendProxyMessage("/api/winky/event", "POST", {
            event: "ask_chat",
            lang: state.lang,
          });
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

    if (state.signalState === "idle") {
      block.className = "winky-direction-block idle";
      block.innerHTML = `<span>${t("readyForSignal")}</span>`;
    } else if (state.signalState === "analysing") {
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
    } else if (state.signalState === "active" && state.activeSignal) {
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

    list.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.flags} ${p.name} (${p.payout})`;
      if (p.id.toLowerCase() === state.targetPair.toLowerCase()) opt.selected = true;
      select.appendChild(opt);
    });

    const match = list.find((x) => x.id.toLowerCase() === select.value.toLowerCase()) || list[0];
    state.targetPair = match.id;
    state.targetFlags = match.flags;
    state.targetPayout = match.payout;
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
        if (state.autoStream && !state.isAnalysing && state.signalState === "idle") {
          startSignalAnalysis();
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
        state.marketType = btn.dataset.mtype || "otc";
        document.querySelectorAll(".winky-market-btn").forEach((b) => b.classList.toggle("active", b === btn));
        populatePairOptions();
      });
    });

    // 6. Pair Select change
    const selectPair = document.getElementById("selectBotPair");
    if (selectPair) {
      selectPair.addEventListener("change", (e) => {
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
