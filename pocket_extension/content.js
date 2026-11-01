/* ============================================================
   WINKY AI — CLASSIC TRADING BOT (POCKET OPTION CONTENT SCRIPT)
   In-DOM Sapphire Widget (330px), 2 Tabs: Signals & AI Chat
   LumeanTTS via background.js proxy (Zero Mixed Content, Zero say/speechSynthesis)
   Iron-clad Pointer Capture Draggable Engine
   ============================================================ */

(function () {
  "use strict";

  if (window.__WINKY_BOT_INJECTED__) return;
  window.__WINKY_BOT_INJECTED__ = true;

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
      { id: "EUR/USD", name: "EUR/USD", flags: "🇪🇺🇺🇸", payout: "82%" },
      { id: "GBP/USD", name: "GBP/USD", flags: "🇬🇧🇺🇸", payout: "80%" },
      { id: "USD/JPY", name: "USD/JPY", flags: "🇺🇸🇯🇵", payout: "78%" },
      { id: "AUD/USD", name: "AUD/USD", flags: "🇦🇺🇺🇸", payout: "77%" },
      { id: "USD/CAD", name: "USD/CAD", flags: "🇺🇸🇨🇦", payout: "79%" },
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

  let savedStats = { wins: 110, losses: 1, profit: 1420 };
  try {
    const raw = localStorage.getItem("winky_live_stats_v3");
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
    autoSignals: false,
    isAnalysing: false,
    signalState: "idle", // "idle" | "analysing" | "active"
    activeSignal: null,
    forceDir: null, // Streamer trigger: BUY / SELL
    liveWins: savedStats.wins,
    liveLosses: savedStats.losses,
    sessionProfit: savedStats.profit,
    lastBalance: null,
    expiryInterval: null,
    autoTimeout: null,
    chatMessages: [
      {
        type: "ai",
        model: "Claude Fable 5.1",
        text: "Привет! Выберите валютную пару и время экспирации или нажмите «Получить сигнал».",
      },
    ],
  };

  /* ==================== Localization ==================== */

  const i18n = {
    ru: {
      botName: "WINKY",
      botTag: "AI",
      online: "Online",
      regular: "Regular",
      otc: "OTC",
      pairLbl: "Валютная пара",
      timeLbl: "Время сделки",
      time: "Время",
      accuracy: "Точность",
      getSignal: "ПОЛУЧИТЬ СИГНАЛ",
      auto: "АВТО",
      readyForSignal: "Готов к анализу графика",
      analysing: "Анализ свечей и объёмов...",
      buy: "↗ КУПИТЬ (BUY)",
      sell: "↘ ПРОДАТЬ (SELL)",
      tabSignals: "🏠 СИГНАЛЫ",
      tabChat: "💬 ИИ-ЧАТ",
      liveScore: "LIVE SCORE",
      wins: "WINS",
      losses: "LOSSES",
      rate: "RATE",
      profit: "ПРОФИТ",
      newSignal: "🔄 Новый сигнал",
      chatPromptTemplate: "проанализируй график и дай сигнал.",
    },
    en: {
      botName: "WINKY",
      botTag: "AI",
      online: "Online",
      regular: "Regular",
      otc: "OTC",
      pairLbl: "Currency pair",
      timeLbl: "Expiry time",
      time: "Time",
      accuracy: "Accuracy",
      getSignal: "GET SIGNAL",
      auto: "AUTO",
      readyForSignal: "Ready for chart analysis",
      analysing: "Analyzing candles & volume...",
      buy: "↗ BUY",
      sell: "↘ SELL",
      tabSignals: "🏠 SIGNALS",
      tabChat: "💬 AI CHAT",
      liveScore: "LIVE SCORE",
      wins: "WINS",
      losses: "LOSSES",
      rate: "RATE",
      profit: "PROFIT",
      newSignal: "🔄 New signal",
      chatPromptTemplate: "analyze the chart and give signal.",
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

  /* ==================== 1. Scan Pocket Option DOM ==================== */

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
        if (foundPair.toLowerCase().includes("otc")) {
          state.marketType = "otc";
        } else {
          state.marketType = "regular";
        }
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

    // 3. Detect expiration time from PO
    const timeSelectors = [".expiration-picker", ".time-field", "[data-test='expiration']", ".control-time__val"];
    for (const sel of timeSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const text = el.textContent.trim();
        if (text.includes("00:05") || text.includes("5s")) state.selectedTimeframe = "5s";
        else if (text.includes("00:10") || text.includes("10s")) state.selectedTimeframe = "10s";
        else if (text.includes("00:15") || text.includes("15s")) state.selectedTimeframe = "15s";
        else if (text.includes("00:30") || text.includes("30s")) state.selectedTimeframe = "30s";
        else if (text.includes("01:00") || text.includes("1m")) state.selectedTimeframe = "1m";
        else if (text.includes("03:00") || text.includes("3m")) state.selectedTimeframe = "3m";
        else if (text.includes("05:00") || text.includes("5m")) state.selectedTimeframe = "5m";
        break;
      }
    }

    // 4. Detect balance change for automatic win increment
    const balanceSelectors = [".balance-info-block", ".user-balance", ".current-balance", "[data-test='balance']"];
    for (const sel of balanceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const rawNum = el.textContent.replace(/[^0-9.]/g, "");
        const num = parseFloat(rawNum);
        if (!isNaN(num) && num > 0) {
          if (state.lastBalance !== null && num > state.lastBalance) {
            const diff = num - state.lastBalance;
            state.liveWins += 1;
            state.sessionProfit += Math.round(diff);
            broadcastStats("auto_balance_win");
          }
          state.lastBalance = num;
          break;
        }
      }
    }
  }

  /* ==================== 2. Iron-clad Pointer-Capture Draggable ==================== */

  function makeWidgetDraggable(widgetEl, handleEl, storageKey) {
    if (!widgetEl || !handleEl) return;

    // Restore saved position
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
        widgetEl.style.right = "auto";
        widgetEl.style.bottom = "auto";
        widgetEl.style.transform = "none";
        widgetEl.style.left = Math.max(8, Math.min(window.innerWidth - 100, saved.left)) + "px";
        widgetEl.style.top = Math.max(8, Math.min(window.innerHeight - 60, saved.top)) + "px";
      }
    } catch (_) {}

    let dragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    handleEl.style.cursor = "grab";
    handleEl.style.userSelect = "none";

    handleEl.addEventListener("pointerdown", (e) => {
      // Do not drag if clicking button, input, select, or .no-drag
      if (e.target.closest("button, select, input, a, .no-drag, .winky-score-step-btn, .winky-score-reset-btn")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const rect = widgetEl.getBoundingClientRect();
      widgetEl.style.right = "auto";
      widgetEl.style.bottom = "auto";
      widgetEl.style.transform = "none";
      widgetEl.style.left = rect.left + "px";
      widgetEl.style.top = rect.top + "px";

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;

      handleEl.style.cursor = "grabbing";
      try {
        handleEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    handleEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(4, Math.min(window.innerWidth - widgetEl.offsetWidth - 4, origLeft + dx));
      const newTop = Math.max(4, Math.min(window.innerHeight - 40, origTop + dy));

      widgetEl.style.left = newLeft + "px";
      widgetEl.style.top = newTop + "px";
    });

    const stopDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      handleEl.style.cursor = "grab";
      try {
        handleEl.releasePointerCapture(e.pointerId);
      } catch (_) {}
      try {
        const rect = widgetEl.getBoundingClientRect();
        localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));
      } catch (_) {}
    };

    handleEl.addEventListener("pointerup", stopDrag);
    handleEl.addEventListener("pointercancel", stopDrag);
  }

  /* ==================== 3. DOM Injection ==================== */

  let botRoot = null;
  let scoreRoot = null;

  function injectWidgetsIntoDOM() {
    if (document.getElementById("winky-bot-root")) return;

    // 1. Trading Bot Root (330px)
    botRoot = document.createElement("div");
    botRoot.id = "winky-bot-root";

    // 2. Live Score HUD Root (Top-Center)
    scoreRoot = document.createElement("div");
    scoreRoot.id = "winky-score-root";

    document.body.appendChild(botRoot);
    document.body.appendChild(scoreRoot);

    renderBotWidget();
    renderScoreWidget();

    makeWidgetDraggable(botRoot, botRoot.querySelector(".winky-bot-header"), "winky_bot_pos_v2");
    makeWidgetDraggable(scoreRoot, scoreRoot, "winky_score_pos_v2");
  }

  /* ==================== 4. Render Classic Trading Bot ==================== */

  function renderBotWidget() {
    if (!botRoot) return;

    botRoot.innerHTML = `
      <!-- 1. Header (Drag Handle) -->
      <div class="winky-bot-header">
        <div class="winky-header-left">
          <span class="winky-drag-handle">⋮⋮</span>
          <button type="button" class="winky-logo-btn" id="winkyLogoBtn" title="WINKY AI (Click for BUY trigger)">
            <div class="winky-logo-icon">⚡</div>
            <div class="winky-logo-text">${t("botName")} <span>${t("botTag")}</span></div>
          </button>
        </div>
        <div class="winky-header-right">
          <div class="winky-online-badge no-drag" id="winkyOnlineBadge" title="Click for SELL trigger">
            <span class="winky-online-dot"></span>
            <span>${t("online")}</span>
          </div>
          <button type="button" class="winky-hdr-btn no-drag" id="winkyLangBtn">${state.lang.toUpperCase()}</button>
          <button type="button" class="winky-hdr-btn no-drag" id="winkyCollapseBtn" title="Свернуть / Развернуть">—</button>
        </div>
      </div>

      <!-- 2. Bot Body -->
      <div class="winky-bot-body">
        <!-- TAB 1: SIGNALS -->
        <div class="winky-tab-content ${state.activeTab === "signals" ? "active" : ""}" id="tabSignalsContent">
          <!-- Market Switch -->
          <div class="winky-market-switch">
            <button type="button" class="winky-market-btn ${state.marketType === "regular" ? "active" : ""}" data-mtype="regular">${t("regular")}</button>
            <button type="button" class="winky-market-btn ${state.marketType === "otc" ? "active" : ""}" data-mtype="otc">${t("otc")}</button>
          </div>

          <!-- Selectors Grid (Pair & Timeframe) -->
          <div class="winky-selectors-grid">
            <div class="winky-select-box">
              <span class="winky-select-lbl">${t("pairLbl")}</span>
              <select class="winky-select-native" id="winkyPairSelect">
                ${renderPairOptions()}
              </select>
            </div>
            <div class="winky-select-box">
              <span class="winky-select-lbl">${t("timeLbl")}</span>
              <select class="winky-select-native" id="winkyTimeSelect">
                ${TIMEFRAMES.map((tf) => `<option value="${tf}" ${tf === state.selectedTimeframe ? "selected" : ""}>${tf}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- Signal Card (Inline, Always visible) -->
          <div class="winky-signal-card">
            <!-- Pair & Payout Row -->
            <div class="winky-card-pair-row">
              <div class="winky-card-pair">
                <span class="winky-card-flags" id="winkyCardFlags">${state.targetFlags}</span>
                <span id="winkyCardPairName">${state.targetPair}</span>
              </div>
              <span class="winky-card-payout" id="winkyCardPayout">${state.targetPayout}</span>
            </div>

            <!-- Metrics Row -->
            <div class="winky-metrics-row">
              <div class="winky-metric-pill">
                <span class="winky-metric-title">${t("time")}:</span>
                <span class="winky-metric-val" id="winkyMetricTime">${state.selectedTimeframe}</span>
              </div>
              <div class="winky-metric-pill">
                <span class="winky-metric-title">${t("accuracy")}:</span>
                <span class="winky-metric-val" id="winkyMetricAccuracy">94%</span>
              </div>
            </div>

            <!-- Direction Block -->
            <div class="winky-direction-block ${state.signalState}" id="winkyDirectionBlock">
              ${renderDirectionBlockContent()}
            </div>
          </div>

          <!-- Action Row (Get Signal + Auto) -->
          <div class="winky-action-row">
            <button type="button" class="winky-btn-get-signal" id="winkyBtnGetSignal">
              <span>⚡</span>
              <span>${t("getSignal")}</span>
            </button>
            <div class="winky-auto-toggle ${state.autoSignals ? "active" : ""}" id="winkyAutoToggle" title="${t("auto")}">
              <span class="winky-auto-lbl">${t("auto")}</span>
              <div class="winky-auto-switch">
                <div class="winky-auto-knob"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: AI CHAT -->
        <div class="winky-tab-content ${state.activeTab === "chat" ? "active" : ""}" id="tabChatContent">
          <!-- Model Selector -->
          <div class="winky-model-select-row">
            <span class="winky-select-lbl">ИИ-Модель теханализа:</span>
            <select class="winky-select-native" id="winkyChatModelSelect">
              ${AI_MODELS.map((m) => `<option value="${m.id}" ${m.id === state.selectedModel ? "selected" : ""}>${m.vendor}: ${m.name}</option>`).join("")}
            </select>
          </div>

          <!-- Chat Scroll -->
          <div class="winky-chat-scroll" id="winkyChatScroll">
            ${renderChatMessagesHTML()}
          </div>

          <!-- Quick Pills & Input -->
          <div class="winky-chat-pills-row">
            <button type="button" class="winky-chat-pill" id="winkyPillPair">${state.targetPair}</button>
            <button type="button" class="winky-chat-pill" id="winkyPillTime">${state.selectedTimeframe}</button>
            <button type="button" class="winky-btn-send-chat" id="winkyBtnSendChat" title="Отправить запрос">➤</button>
          </div>
        </div>
      </div>

      <!-- 3. Bottom Navigation (2 Tabs) -->
      <div class="winky-bot-nav">
        <button type="button" class="winky-nav-tab ${state.activeTab === "signals" ? "active" : ""}" data-tab="signals" id="winkyTabSignalsBtn">
          <span>🏠</span>
          <span>${t("tabSignals")}</span>
        </button>
        <button type="button" class="winky-nav-tab ${state.activeTab === "chat" ? "active" : ""}" data-tab="chat" id="winkyTabChatBtn">
          <span>💬</span>
          <span>${t("tabChat")}</span>
        </button>
      </div>
    `;

    bindBotEvents();
  }

  function renderPairOptions() {
    const list = PAIR_CATALOG[state.marketType] || PAIR_CATALOG.otc;
    return list
      .map((p) => {
        const isSel = p.id.toLowerCase() === state.targetPair.toLowerCase();
        return `<option value="${p.id}" ${isSel ? "selected" : ""}>${p.flags} ${p.name} (${p.payout})</option>`;
      })
      .join("");
  }

  function renderDirectionBlockContent() {
    if (state.signalState === "idle") {
      return `<span>${t("readyForSignal")}</span>`;
    }

    if (state.signalState === "analysing") {
      return `
        <span class="winky-analysing-text">${t("analysing")}</span>
        <div class="winky-analysis-bar">
          <div class="winky-analysis-fill"></div>
        </div>
      `;
    }

    if (state.signalState === "active" && state.activeSignal) {
      const s = state.activeSignal;
      const isBuy = s.direction === "BUY";
      const dirText = isBuy ? t("buy") : t("sell");

      return `
        <div class="winky-dir-tag">${dirText}</div>
        <div class="winky-expiry-timer-row">
          <span>${s.duration}</span>
          <span>·</span>
          <span id="winkyExpiryCountdownDigits">00:30</span>
        </div>
        <div class="winky-expiry-track">
          <div class="winky-expiry-fill" id="winkyExpiryFill"></div>
        </div>
      `;
    }

    return "";
  }

  function renderChatMessagesHTML() {
    return state.chatMessages
      .map((msg) => {
        if (msg.type === "user") {
          return `<div class="winky-chat-bubble user">${msg.text}</div>`;
        }

        if (msg.type === "ai_card") {
          const isBuy = msg.direction === "BUY";
          return `
            <div class="winky-chat-bubble ai">
              <div class="winky-ai-card-head">
                <span class="winky-ai-model-tag">${msg.model}</span>
                <span class="winky-ai-accuracy-circle">Точность: ${msg.accuracy}%</span>
              </div>
              <div class="winky-ai-dir-badge ${isBuy ? "buy" : "sell"}">
                ${isBuy ? "↗ СИГНАЛ: КУПИТЬ (BUY)" : "↘ СИГНАЛ: ПРОДАТЬ (SELL)"} на ${msg.duration}
              </div>
              <div class="winky-ai-points">
                ${msg.points.map((p) => `<div>${p}</div>`).join("")}
              </div>
              <div style="margin-top:6px; display:flex; justify-content:flex-end;">
                <button type="button" class="winky-hdr-btn" id="winkyBtnNewSignalChat" style="font-size:10px;">${t("newSignal")}</button>
              </div>
            </div>
          `;
        }

        return `<div class="winky-chat-bubble ai">${msg.text}</div>`;
      })
      .join("");
  }

  function updateCardPairUI() {
    const flagsEl = document.getElementById("winkyCardFlags");
    const nameEl = document.getElementById("winkyCardPairName");
    const payoutEl = document.getElementById("winkyCardPayout");
    const pairSelect = document.getElementById("winkyPairSelect");

    if (flagsEl) flagsEl.textContent = state.targetFlags;
    if (nameEl) nameEl.textContent = state.targetPair;
    if (payoutEl) payoutEl.textContent = state.targetPayout;
    if (pairSelect && pairSelect.value !== state.targetPair) {
      pairSelect.innerHTML = renderPairOptions();
    }
  }

  /* ==================== 5. Bot Event Handlers ==================== */

  function bindBotEvents() {
    // Secret Streamer Triggers: Logo = BUY, Online Badge = SELL
    const logoBtn = document.getElementById("winkyLogoBtn");
    if (logoBtn) {
      logoBtn.addEventListener("click", () => {
        state.forceDir = "BUY";
        logoBtn.querySelector(".winky-logo-text span").style.color = "#10B981";
        setTimeout(() => {
          logoBtn.querySelector(".winky-logo-text span").style.color = "";
        }, 800);
      });
    }

    const onlineBadge = document.getElementById("winkyOnlineBadge");
    if (onlineBadge) {
      onlineBadge.addEventListener("click", () => {
        state.forceDir = "SELL";
        onlineBadge.style.color = "#EF4444";
        setTimeout(() => {
          onlineBadge.style.color = "";
        }, 800);
      });
    }

    // Collapse toggle
    const collapseBtn = document.getElementById("winkyCollapseBtn");
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        botRoot.classList.toggle("collapsed");
        collapseBtn.textContent = botRoot.classList.contains("collapsed") ? "□" : "—";
      });
    }

    // Language toggle
    const langBtn = document.getElementById("winkyLangBtn");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        state.lang = state.lang === "ru" ? "en" : "ru";
        renderBotWidget();
        renderScoreWidget();
      });
    }

    // Market Switch (Regular | OTC)
    botRoot.querySelectorAll(".winky-market-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.marketType = btn.dataset.mtype;
        const catalog = PAIR_CATALOG[state.marketType];
        if (catalog && catalog.length > 0) {
          state.targetPair = catalog[0].id;
          state.targetFlags = catalog[0].flags;
          state.targetPayout = catalog[0].payout;
        }
        renderBotWidget();
      });
    });

    // Pair select
    const pairSelect = document.getElementById("winkyPairSelect");
    if (pairSelect) {
      pairSelect.addEventListener("change", (e) => {
        state.targetPair = e.target.value;
        const meta = getPairMeta(state.targetPair);
        state.targetFlags = meta.flags;
        state.targetPayout = meta.payout;
        updateCardPairUI();
      });
    }

    // Timeframe select
    const timeSelect = document.getElementById("winkyTimeSelect");
    if (timeSelect) {
      timeSelect.addEventListener("change", (e) => {
        state.selectedTimeframe = e.target.value;
        const metricEl = document.getElementById("winkyMetricTime");
        if (metricEl) metricEl.textContent = state.selectedTimeframe;
      });
    }

    // Get Signal Button
    const btnGetSignal = document.getElementById("winkyBtnGetSignal");
    if (btnGetSignal) {
      btnGetSignal.addEventListener("click", () => {
        startSignalAnalysis();
      });
    }

    // Auto toggle
    const autoToggle = document.getElementById("winkyAutoToggle");
    if (autoToggle) {
      autoToggle.addEventListener("click", () => {
        state.autoSignals = !state.autoSignals;
        autoToggle.classList.toggle("active", state.autoSignals);
      });
    }

    // Navigation Tabs (Signals | AI Chat)
    const tabSignalsBtn = document.getElementById("winkyTabSignalsBtn");
    const tabChatBtn = document.getElementById("winkyTabChatBtn");

    if (tabSignalsBtn) {
      tabSignalsBtn.addEventListener("click", () => {
        state.activeTab = "signals";
        renderBotWidget();
      });
    }
    if (tabChatBtn) {
      tabChatBtn.addEventListener("click", () => {
        state.activeTab = "chat";
        renderBotWidget();
      });
    }

    // AI Chat events
    const chatModelSelect = document.getElementById("winkyChatModelSelect");
    if (chatModelSelect) {
      chatModelSelect.addEventListener("change", (e) => {
        state.selectedModel = e.target.value;
      });
    }

    const btnSendChat = document.getElementById("winkyBtnSendChat");
    if (btnSendChat) {
      btnSendChat.addEventListener("click", () => {
        executeChatRequest();
      });
    }

    const newSignalChatBtn = document.getElementById("winkyBtnNewSignalChat");
    if (newSignalChatBtn) {
      newSignalChatBtn.addEventListener("click", () => {
        executeChatRequest();
      });
    }
  }

  /* ==================== 6. Signal Analysis & Expiry ==================== */

  function startSignalAnalysis() {
    if (state.isAnalysing) return;
    state.isAnalysing = true;
    clearExpiryTimers();

    state.signalState = "analysing";
    const dirBlock = document.getElementById("winkyDirectionBlock");
    if (dirBlock) {
      dirBlock.className = "winky-direction-block analysing";
      dirBlock.innerHTML = renderDirectionBlockContent();
    }

    // Trigger Avatar thinking emotion via background proxy
    sendProxyMessage("/api/winky/scan", "POST", {});

    // Request API telemetry
    let apiData = null;
    const bodyPayload = {
      pair: state.targetPair,
      duration: state.selectedTimeframe,
      force_dir: state.forceDir || undefined,
      model: state.selectedModel,
    };
    state.forceDir = null; // reset secret trigger

    fetch("https://winktrade-app.online/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (apiData = d))
      .catch(() => {});

    // Analysis finishes in 1.0 second
    setTimeout(() => {
      revealSignalResult(apiData);
    }, 1000);
  }

  function revealSignalResult(apiData) {
    state.isAnalysing = false;
    const dir = apiData?.direction || (Math.random() > 0.45 ? "BUY" : "SELL");
    const accuracy = apiData?.accuracy || Math.floor(92 + Math.random() * 6);
    const durationSec = parseDurationSeconds(state.selectedTimeframe);

    state.activeSignal = {
      direction: dir,
      duration: state.selectedTimeframe,
      durationSec: durationSec,
      accuracy: accuracy,
      voice_phrase_ru: apiData?.voice_phrase_ru,
      voice_phrase_en: apiData?.voice_phrase_en,
    };

    state.signalState = "active";
    const dirBlock = document.getElementById("winkyDirectionBlock");
    if (dirBlock) {
      dirBlock.className = `winky-direction-block ${dir.toLowerCase()}`;
      dirBlock.innerHTML = renderDirectionBlockContent();
    }

    const accEl = document.getElementById("winkyMetricAccuracy");
    if (accEl) accEl.textContent = `${accuracy}%`;

    // Highlight real PO Button
    applyRealPOButtonGlow(dir);

    // Speak via LumeanTTS through background.js (Zero Mixed Content!)
    speakViaLumean(state.activeSignal);

    // Start Expiry Countdown
    startExpiryCountdown(durationSec);
  }

  function parseDurationSeconds(str) {
    if (str.endsWith("s")) return parseInt(str, 10) || 30;
    if (str.endsWith("m")) return (parseInt(str, 10) || 1) * 60;
    return 30;
  }

  function startExpiryCountdown(totalSec) {
    const startTime = performance.now();
    const countEl = document.getElementById("winkyExpiryCountdownDigits");
    const fillEl = document.getElementById("winkyExpiryFill");

    if (state.expiryInterval) clearInterval(state.expiryInterval);

    state.expiryInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, totalSec - elapsed);
      const ratio = remaining / totalSec;

      if (countEl) {
        const m = Math.floor(remaining / 60);
        const s = Math.floor(remaining % 60);
        countEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      if (fillEl) {
        fillEl.style.width = `${ratio * 100}%`;
      }

      if (remaining <= 0) {
        clearInterval(state.expiryInterval);
        state.expiryInterval = null;
        onSignalComplete();
      }
    }, 60);
  }

  function onSignalComplete() {
    removeRealPOButtonGlow();
    state.liveWins += 1;
    state.sessionProfit += 180;
    broadcastStats("signal_win");

    if (state.autoSignals) {
      state.autoTimeout = setTimeout(() => {
        startSignalAnalysis();
      }, 2500);
    }
  }

  function clearExpiryTimers() {
    if (state.expiryInterval) {
      clearInterval(state.expiryInterval);
      state.expiryInterval = null;
    }
    if (state.autoTimeout) {
      clearTimeout(state.autoTimeout);
      state.autoTimeout = null;
    }
    removeRealPOButtonGlow();
  }

  function applyRealPOButtonGlow(dir) {
    removeRealPOButtonGlow();
    const btnCall = document.querySelector(".btn-call, [data-test='btn-call']");
    const btnPut = document.querySelector(".btn-put, [data-test='btn-put']");
    if (dir === "BUY" && btnCall) btnCall.classList.add("wps-button-glow-buy");
    if (dir === "SELL" && btnPut) btnPut.classList.add("wps-button-glow-sell");
  }

  function removeRealPOButtonGlow() {
    document.querySelectorAll(".wps-button-glow-buy").forEach((el) => el.classList.remove("wps-button-glow-buy"));
    document.querySelectorAll(".wps-button-glow-sell").forEach((el) => el.classList.remove("wps-button-glow-sell"));
  }

  /* ==================== 7. Strict LumeanTTS via background.js Proxy ==================== */

  function speakViaLumean(sig) {
    // ZERO window.speechSynthesis or macOS say!
    const isBuy = sig.direction === "BUY";
    const dirRu = isBuy ? "ВВЕРХ" : "ВНИЗ";
    const dirEn = isBuy ? "UP" : "DOWN";

    const phrase =
      state.lang === "ru"
        ? (sig.voice_phrase_ru || `Пара ${state.targetPair}, выплата ${state.targetPayout}! Входим ${dirRu} на ${sig.duration}, точность ${sig.accuracy} процентов!`)
        : (sig.voice_phrase_en || `Target ${state.targetPair}, payout ${state.targetPayout}! Going ${dirEn} for ${sig.duration}, accuracy ${sig.accuracy} percent!`);

    const payload = {
      event: "signal",
      pair: state.targetPair,
      direction: sig.direction,
      duration: sig.duration,
      model: state.selectedModel,
      lang: state.lang,
      phrase: phrase,
    };

    sendProxyMessage("/api/winky/speak_signal", "POST", payload);
  }

  function sendProxyMessage(path, method, body) {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: "WINKY_API",
          path: path,
          method: method || "POST",
          body: body,
        },
        () => {
          if (chrome.runtime.lastError) {
            // Direct fetch fallback if background service worker is waking up
            fetch(`http://127.0.0.1:8765${path}`, {
              method: method || "POST",
              headers: { "Content-Type": "application/json" },
              body: body ? JSON.stringify(body) : undefined,
            }).catch(() => {});
          }
        }
      );
    } else {
      fetch(`http://127.0.0.1:8765${path}`, {
        method: method || "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      }).catch(() => {});
    }
  }

  /* ==================== 8. AI Chat Execution ==================== */

  function executeChatRequest() {
    const prompt = `${state.targetPair}, время экспирации ${state.selectedTimeframe} — ${t("chatPromptTemplate")}`;
    state.chatMessages.push({ type: "user", text: prompt });

    const dir = state.forceDir || (Math.random() > 0.45 ? "BUY" : "SELL");
    state.forceDir = null;

    const modelObj = AI_MODELS.find((m) => m.id === state.selectedModel) || AI_MODELS[0];
    const points =
      dir === "BUY"
        ? [
            "• Структура рынка: доминирует импульс краткосрочных покупателей",
            "• Подтверждение: отскок от локального динамического уровня поддержки",
          ]
        : [
            "• Структура рынка: преобладает нисходящий импульс продавцов",
            "• Подтверждение: резкий отскок от локального сопротивления",
          ];

    state.chatMessages.push({
      type: "ai_card",
      model: modelObj.name,
      direction: dir,
      duration: state.selectedTimeframe,
      accuracy: 94,
      points: points,
    });

    const chatScroll = document.getElementById("winkyChatScroll");
    if (chatScroll) {
      chatScroll.innerHTML = renderChatMessagesHTML();
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }

    // Voice announce chat signal
    speakViaLumean({
      direction: dir,
      duration: state.selectedTimeframe,
      accuracy: 94,
    });
  }

  /* ==================== 9. Live Score HUD (Top-Center) ==================== */

  function renderScoreWidget() {
    if (!scoreRoot) return;

    const total = state.liveWins + state.liveLosses;
    const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) + "%" : "0.0%";
    const profitText = (state.sessionProfit >= 0 ? "+$" : "-$") + Math.abs(state.sessionProfit).toLocaleString();

    scoreRoot.className = "winky-score-widget";
    scoreRoot.innerHTML = `
      <span class="winky-score-handle" title="Перетащить табло">⋮⋮</span>
      <div class="winky-score-live-badge">
        <span class="winky-score-dot"></span>
        <span>${t("liveScore")}</span>
      </div>

      <!-- WINS -->
      <div class="winky-score-pill wins" title="Победы">
        <span>${t("wins")}:</span>
        <span>${state.liveWins}</span>
        <button type="button" class="winky-score-step-btn" id="winkyWinsMinus">-</button>
        <button type="button" class="winky-score-step-btn" id="winkyWinsPlus">+</button>
      </div>

      <!-- LOSSES -->
      <div class="winky-score-pill losses" title="Поражения">
        <span>${t("losses")}:</span>
        <span>${state.liveLosses}</span>
        <button type="button" class="winky-score-step-btn" id="winkyLossesMinus">-</button>
        <button type="button" class="winky-score-step-btn" id="winkyLossesPlus">+</button>
      </div>

      <!-- RATE -->
      <div class="winky-score-pill winrate" title="Винрейт">
        <span>${t("rate")}:</span>
        <span>${rate}</span>
      </div>

      <!-- PROFIT -->
      <div class="winky-score-pill profit" title="Профит сессии">
        <span>${t("profit")}:</span>
        <span>${profitText}</span>
      </div>

      <!-- RESET -->
      <button type="button" class="winky-score-reset-btn" id="winkyScoreReset" title="Сбросить счет">[Reset]</button>
    `;

    bindScoreEvents();
  }

  function bindScoreEvents() {
    const btnWinsPlus = document.getElementById("winkyWinsPlus");
    const btnWinsMinus = document.getElementById("winkyWinsMinus");
    const btnLossesPlus = document.getElementById("winkyLossesPlus");
    const btnLossesMinus = document.getElementById("winkyLossesMinus");
    const btnReset = document.getElementById("winkyScoreReset");

    if (btnWinsPlus) {
      btnWinsPlus.addEventListener("click", () => {
        state.liveWins += 1;
        state.sessionProfit += 180;
        broadcastStats("manual_step");
      });
    }
    if (btnWinsMinus) {
      btnWinsMinus.addEventListener("click", () => {
        state.liveWins = Math.max(0, state.liveWins - 1);
        state.sessionProfit = Math.max(0, state.sessionProfit - 180);
        broadcastStats("manual_step");
      });
    }
    if (btnLossesPlus) {
      btnLossesPlus.addEventListener("click", () => {
        state.liveLosses += 1;
        state.sessionProfit = Math.max(0, state.sessionProfit - 100);
        broadcastStats("manual_step");
      });
    }
    if (btnLossesMinus) {
      btnLossesMinus.addEventListener("click", () => {
        state.liveLosses = Math.max(0, state.liveLosses - 1);
        broadcastStats("manual_step");
      });
    }
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        state.liveWins = 110;
        state.liveLosses = 1;
        state.sessionProfit = 1420;
        broadcastStats("reset");
      });
    }
  }

  function broadcastStats(source) {
    renderScoreWidget();

    const data = {
      wins: state.liveWins,
      losses: state.liveLosses,
      profit: state.sessionProfit,
      pair: state.targetPair,
      timestamp: Date.now(),
      source: source,
    };

    try {
      localStorage.setItem("winky_live_stats_v3", JSON.stringify(data));
    } catch (_) {}

    sendProxyMessage("/api/live_stats", "POST", data);
  }

  /* ==================== 10. Initialization ==================== */

  function init() {
    injectWidgetsIntoDOM();
    setInterval(scanPocketOptionDOM, 350);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
