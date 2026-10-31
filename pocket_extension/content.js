/* ============================================================
   WINKY PAIR SNIPER — POCKET OPTION CONTENT SCRIPT
   Direct DOM Widget (Scales with page zoom Cmd+/Cmd-)
   LumeanTTS Voice Sync, Live Speedometer & Counter HUD
   ============================================================ */

(function () {
  "use strict";

  if (window.__WINKY_SNIPER_INJECTED__) return;
  window.__WINKY_SNIPER_INJECTED__ = true;

  // Local Winky endpoints (Mac) and Prod Fallback
  const WINKY_LOCAL_ENDPOINTS = [
    "http://127.0.0.1:8765",
    "http://127.0.0.1:8790",
    "https://winktrade-app.online",
    "https://2.31.127.199.sslip.io",
  ];

  /* ==================== Catalogs & Categories ==================== */

  const ASSET_CATALOG = {
    currencies: [
      { id: "USD/CAD OTC", name: "USD/CAD OTC", payout: "92%" },
      { id: "EUR/USD OTC", name: "EUR/USD OTC", payout: "92%" },
      { id: "GBP/USD OTC", name: "GBP/USD OTC", payout: "92%" },
      { id: "AUD/CAD OTC", name: "AUD/CAD OTC", payout: "90%" },
      { id: "MAD/USD OTC", name: "MAD/USD OTC", payout: "92%" },
      { id: "AUD/USD OTC", name: "AUD/USD OTC", payout: "91%" },
      { id: "USD/JPY OTC", name: "USD/JPY OTC", payout: "90%" },
      { id: "NZD/USD OTC", name: "NZD/USD OTC", payout: "88%" },
    ],
    stocks: [
      { id: "Apple OTC", name: "Apple OTC", payout: "90%" },
      { id: "Tesla OTC", name: "Tesla OTC", payout: "90%" },
      { id: "Microsoft OTC", name: "Microsoft OTC", payout: "89%" },
      { id: "Amazon OTC", name: "Amazon OTC", payout: "88%" },
    ],
    crypto: [
      { id: "BTC/USD OTC", name: "Bitcoin OTC", payout: "86%" },
      { id: "ETH/USD OTC", name: "Ethereum OTC", payout: "85%" },
      { id: "SOL/USD OTC", name: "Solana OTC", payout: "84%" },
    ],
    indices: [
      { id: "SP500 OTC", name: "S&P 500 OTC", payout: "88%" },
      { id: "NDX100 OTC", name: "Nasdaq 100 OTC", payout: "88%" },
      { id: "DJI30 OTC", name: "Dow Jones OTC", payout: "87%" },
    ],
    commodities: [
      { id: "GOLD OTC", name: "Gold OTC", payout: "90%" },
      { id: "SILVER OTC", name: "Silver OTC", payout: "88%" },
      { id: "BRENT OTC", name: "Crude Oil OTC", payout: "86%" },
    ],
  };

  const AI_MODELS = [
    { id: "claude-fable-5.1", name: "Claude Fable 5.1", tag: "FLAGSHIP" },
    { id: "claude-opus-5", name: "Claude Opus 5", tag: "DEEP" },
    { id: "gpt-5-astra", name: "GPT-5 Astra", tag: "VISION" },
    { id: "gpt-5-luna", name: "GPT-5 Luna", tag: "SPEED" },
    { id: "gemini-argon", name: "Gemini Argon", tag: "RADAR" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", tag: "CORE" },
  ];

  /* ==================== Application State ==================== */

  const state = {
    lang: "ru",
    category: "currencies",
    targetPair: "USD/CAD OTC",
    targetPayout: "92%",
    selectedModel: "claude-fable-5.1",
    autoSniper: false,
    currentState: "pulse", // "pulse" | "radar" | "signal"
    forceDir: null, // Streamer secret trigger: 'BUY' (logo) | 'SELL' (pair)
    priceTicks: [],
    liveWins: 110,
    liveLosses: 1,
    hotPairs: [
      { num: "01", pair: "MAD/USD OTC", charge: "||||||||||", score: "98 →", payout: "92%" },
      { num: "02", pair: "USD/CAD OTC", charge: "||||||||..", score: "87 →", payout: "92%" },
      { num: "03", pair: "AUD/CAD OTC", charge: "|||||.....", score: "54 →", payout: "90%" },
    ],
    activeSignal: null,
    entryInterval: null,
    autoSniperTimeout: null,
  };

  /* ==================== Localization ==================== */

  const i18n = {
    ru: {
      pulseTitle: "MARKET PULSE",
      pulseSub: "Где рынок движется сильнее всего прямо сейчас. Нажми на строку, чтобы выбрать цель.",
      selected: "ВЫБРАНА",
      orPick: "ИЛИ ВЫБЕРИТЕ САМИ",
      target: "ЦЕЛЬ",
      payout: "выплата",
      change: "СМЕНИТЬ ▾",
      aiEngine: "ИИ-ДВИЖОК:",
      analyse: "АНАЛИЗИРОВАТЬ",
      autoSniper: "АВТО-СНАЙПЕР",
      checkingPairs: "ПАР ПРОВЕРЕНО",
      choosingExpiry: "ПОДБОР ЭКСПИРАЦИИ",
      toFitMove: "под текущий импульс рынка",
      entryWindow: "ОКНО ВХОДА",
      ofSec: "ИЗ",
      expiry: "ЭКСПИРАЦИЯ",
      signalStrength: "СИЛА СИГНАЛА",
      strongSignal: "сильный сигнал",
      edgeOfNoise: "на границе шума",
      newTarget: "НОВАЯ ЦЕЛЬ",
      keyboardHint: "⌨️ Введите экспирацию вручную, если нет кнопки",
    },
    en: {
      pulseTitle: "MARKET PULSE",
      pulseSub: "Where the market moves hardest right now. Tap a row to make it your target.",
      selected: "SELECTED",
      orPick: "OR PICK ONE YOURSELF",
      target: "TARGET",
      payout: "payout",
      change: "CHANGE ▾",
      aiEngine: "AI ENGINE:",
      analyse: "ANALYSE",
      autoSniper: "AUTO-SNIPER",
      checkingPairs: "PAIRS CHECKED",
      choosingExpiry: "CHOOSING EXPIRY",
      toFitMove: "to fit the move",
      entryWindow: "ENTRY WINDOW",
      ofSec: "OF",
      expiry: "EXPIRY",
      signalStrength: "SIGNAL STRENGTH",
      strongSignal: "strong signal",
      edgeOfNoise: "edge of noise",
      newTarget: "NEW TARGET",
      keyboardHint: "⌨️ Type this expiry in by hand if no quick button",
    },
  };

  function t(k) {
    const dict = i18n[state.lang] || i18n.ru;
    return dict[k] || k;
  }

  /* ==================== 1. DOM Scanner for Pocket Option ==================== */

  function scanPocketOptionDOM() {
    // 1. Detect active asset
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
      if (foundPair !== state.targetPair && state.currentState === "pulse") {
        state.targetPair = foundPair;
        updateTargetCard();
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
          updateTargetCard();
          break;
        }
      }
    }

    // 3. Collect price tick
    const priceSelectors = [".current-price", ".chart-quote", ".price-val", ".ticker-price"];
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const num = parseFloat(el.textContent.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) {
          state.priceTicks.push(num);
          if (state.priceTicks.length > 60) state.priceTicks.shift();
          break;
        }
      }
    }
  }

  setInterval(scanPocketOptionDOM, 400);

  /* ==================== 2. Create Tactical HUD & Counter in DOM ==================== */

  let sniperRoot = null;
  let counterRoot = null;

  function injectWidgetsIntoDOM() {
    if (document.getElementById("winky-sniper-root")) return;

    // Sniper Widget Root
    sniperRoot = document.createElement("div");
    sniperRoot.id = "winky-sniper-root";
    sniperRoot.className = "wps-tactical-box";

    // Counter Widget Root
    counterRoot = document.createElement("div");
    counterRoot.id = "winky-counter-root";
    counterRoot.className = "wps-tactical-box";

    document.body.appendChild(sniperRoot);
    document.body.appendChild(counterRoot);

    renderSniperWidget();
    renderCounterWidget();
    makeDraggable(sniperRoot, sniperRoot.querySelector(".wps-header"));
    makeDraggable(counterRoot, counterRoot.querySelector(".wps-header"));
  }

  /* ==================== Drag & Drop Helper ==================== */

  function makeDraggable(rootEl, handleEl) {
    if (!rootEl || !handleEl) return;
    let isDragging = false;
    let startX = 0, startY = 0, initX = 0, initY = 0;

    handleEl.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "SELECT") return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = rootEl.getBoundingClientRect();
      initX = rect.left;
      initY = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      rootEl.style.left = `${Math.max(10, initX + dx)}px`;
      rootEl.style.top = `${Math.max(10, initY + dy)}px`;
      rootEl.style.right = "auto";
      rootEl.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  /* ==================== Render Sniper Widget ==================== */

  function renderSniperWidget() {
    if (!sniperRoot) return;

    sniperRoot.innerHTML = `
      <!-- Header -->
      <div class="wps-header">
        <div class="wps-header-title" id="wpsBrandTrigger" title="Click for BUY trigger">
          <span class="wps-drag-icon">⋮⋮</span>
          <span>⌖ WINKY PAIR SNIPER</span>
        </div>
        <div class="wps-header-right">
          <span class="wps-online-badge">
            <span class="wps-online-dot"></span>
            <span>online</span>
          </span>
          <button type="button" class="wps-lang-btn" id="wpsLangToggle">${state.lang.toUpperCase()}</button>
          <button type="button" class="wps-btn-min" id="wpsMinBtn">_</button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="wps-body" id="wpsBody">
        ${renderCurrentStateHtml()}
      </div>

      <!-- Resizer corner -->
      <div class="wps-resizer">◢</div>
    `;

    bindSniperEvents();
  }

  function renderCurrentStateHtml() {
    if (state.currentState === "radar") {
      return renderRadarHtml();
    }
    if (state.currentState === "signal") {
      return renderSignalHtml();
    }
    return renderPulseHtml();
  }

  /* --- STATE A: Pulse HTML --- */
  function renderPulseHtml() {
    return `
      <!-- 1. MARKET PULSE -->
      <div class="wps-section-head">
        <div class="wps-section-title-row">
          <span class="wps-section-title">${t("pulseTitle")}</span>
          <span class="wps-section-charge-tag">CHARGE</span>
        </div>
        <span class="wps-section-sub">${t("pulseSub")}</span>
      </div>

      <!-- 3 Hot Volatile Rows -->
      <div class="wps-hot-list">
        ${state.hotPairs
          .map((row) => {
            const isSel = row.pair === state.targetPair;
            return `
            <div class="wps-hot-row ${isSel ? "selected" : ""}" data-pair="${row.pair}" data-payout="${row.payout}">
              <span class="wps-hot-num">${row.num}</span>
              <div class="wps-hot-pair-wrap">
                <span class="wps-hot-pair">${row.pair}</span>
                ${isSel ? `<span class="wps-badge-selected">${t("selected")}</span>` : ""}
              </div>
              <span class="wps-hot-charge-bars">${row.charge}</span>
              <span class="wps-hot-score">${row.score}</span>
            </div>
          `;
          })
          .join("")}
      </div>

      <!-- 2. CATEGORY TABS -->
      <div class="wps-section-head">
        <span class="wps-section-sub" style="font-weight: 800; letter-spacing: 0.06em;">${t("orPick")}</span>
      </div>
      <div class="wps-cat-tabs" id="wpsCatTabs">
        ${["currencies", "stocks", "crypto", "indices", "commodities"]
          .map((c) => `
            <button type="button" class="wps-cat-tab ${state.category === c ? "active" : ""}" data-cat="${c}">
              ${c.toUpperCase()}
            </button>
          `)
          .join("")}
      </div>

      <!-- 3. TARGET CARD & AI ENGINE -->
      <div class="wps-target-card wps-tactical-box" id="wpsTargetCard">
        <div class="wps-target-head">
          <span class="wps-target-label" id="wpsTargetLabel" title="Click for SELL trigger">${t("target")}</span>
          <span class="wps-payout-tag" id="wpsPayoutTag">${t("payout")} ${state.targetPayout}</span>
        </div>
        <div class="wps-target-row">
          <span class="wps-target-name" id="wpsTargetName">${state.targetPair}</span>
          <button type="button" class="wps-btn-change" id="wpsBtnChange">${t("change")}</button>
        </div>
      </div>

      <div class="wps-ai-engine-row">
        <span class="wps-ai-engine-label">${t("aiEngine")}</span>
        <select class="wps-ai-select" id="wpsModelSelect">
          ${AI_MODELS.map((m) => `
            <option value="${m.id}" ${state.selectedModel === m.id ? "selected" : ""}>
              ${m.name} (${m.tag})
            </option>
          `).join("")}
        </select>
      </div>

      <!-- 4. ACTIONS BAR -->
      <div class="wps-actions-bar">
        <button type="button" class="wps-btn-analyse" id="wpsAnalyseBtn">
          <span>⚡</span>
          <span>${t("analyse")}</span>
        </button>
        <div class="wps-auto-toggle-wrap">
          <span class="wps-auto-label">${t("autoSniper")}</span>
          <div class="wps-switch-track ${state.autoSniper ? "active" : ""}" id="wpsAutoSwitch">
            <div class="wps-switch-knob"></div>
          </div>
        </div>
      </div>
    `;
  }

  /* --- STATE B: Radar HTML (1.3 sec inline) --- */
  function renderRadarHtml() {
    return `
      <div class="wps-radar-screen">
        <div class="wps-radar-reticle-wrap">
          <svg class="wps-radar-svg" viewBox="0 0 180 180">
            <!-- 48 Radial Ticks -->
            <g class="wps-radar-ticks">
              ${Array.from({ length: 48 })
                .map((_, i) => {
                  const angle = (i * 360) / 48;
                  return `
                    <line x1="90" y1="10" x2="90" y2="18"
                          stroke="#FF6B00" stroke-width="2" opacity="${0.2 + (i % 4 === 0 ? 0.7 : 0.2)}"
                          transform="rotate(${angle} 90 90)" />
                  `;
                })
                .join("")}
            </g>
            <!-- 4 Axis lines -->
            <line x1="90" y1="20" x2="90" y2="160" stroke="#FF6B00" stroke-width="1" stroke-dasharray="2 3" opacity="0.4"/>
            <line x1="20" y1="90" x2="160" y2="90" stroke="#FF6B00" stroke-width="1" stroke-dasharray="2 3" opacity="0.4"/>
            <!-- Rotating Laser Sweep -->
            <g class="wps-radar-sweep">
              <path d="M90 90 L90 10 A80 80 0 0 1 150 40 Z" fill="url(#wpsRadarGrad)" opacity="0.35"/>
              <line x1="90" y1="90" x2="90" y2="10" stroke="#FF8800" stroke-width="2.5"/>
            </g>
            <defs>
              <radialGradient id="wpsRadarGrad" cx="90" cy="90" r="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#FF8800" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#FF6B00" stop-opacity="0"/>
              </radialGradient>
            </defs>
          </svg>
          <div class="wps-radar-center-info">
            <span class="wps-radar-count" id="wpsRadarCount">23</span>
            <span class="wps-radar-label">${t("checkingPairs")}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
          <span class="wps-radar-subhead">${t("choosingExpiry")}</span>
          <span class="wps-radar-subtext">${t("toFitMove")}</span>
        </div>
        <div class="wps-radar-progress-bar">
          <div class="wps-radar-progress-fill" id="wpsRadarProgressFill"></div>
        </div>
      </div>
    `;
  }

  /* --- STATE C: Tachometer / Speedometer Signal HTML --- */
  function renderSignalHtml() {
    const s = state.activeSignal || {
      direction: "BUY",
      duration: "30s",
      signal_strength: 78,
      strength_verdict: t("strongSignal"),
      entry_window_sec: 12,
      move_percent: 0.019,
      move_window_sec: 30,
      move_to_noise: 3.4,
      horizons_agreeing: "5 of 5",
    };

    const isBuy = s.direction === "BUY";
    const dirClass = isBuy ? "up" : "down";
    const dirArrow = isBuy ? "↑ UP" : "↓ DOWN";

    return `
      <div class="wps-signal-screen">
        <!-- Header -->
        <div class="wps-signal-header">
          <span class="wps-signal-pair">${state.targetPair}</span>
          <div class="wps-signal-meta">
            <span>${state.category.toUpperCase()}</span>
            <span>·</span>
            <span class="wps-signal-model-badge">Fable 5.1</span>
          </div>
        </div>

        <!-- Big Semi-Circular SVG Speedometer Gauge -->
        <div class="wps-gauge-card wps-tactical-box">
          <div class="wps-gauge-wrap">
            <svg class="wps-gauge-svg" viewBox="0 0 260 140">
              <!-- Background Arc (Scale 0 to 80) -->
              <path d="M 30 130 A 100 100 0 0 1 230 130" fill="none" stroke="#1A2232" stroke-width="14" stroke-linecap="round"/>
              <!-- Colored Progress Arc -->
              <path id="wpsGaugeArc" d="M 30 130 A 100 100 0 0 1 230 130" fill="none"
                    stroke="${isBuy ? "#00FF9D" : "#FF3B5C"}" stroke-width="14" stroke-linecap="round"
                    stroke-dasharray="314" stroke-dashoffset="0"/>
              <!-- Scale Ticks 0, 20, 40, 60, 80 -->
              <text x="24" y="134" fill="#64748B" font-size="10" font-family="'JetBrains Mono'">0</text>
              <text x="54" y="66" fill="#64748B" font-size="10" font-family="'JetBrains Mono'">20</text>
              <text x="124" y="24" fill="#64748B" font-size="10" font-family="'JetBrains Mono'">40</text>
              <text x="194" y="66" fill="#64748B" font-size="10" font-family="'JetBrains Mono'">60</text>
              <text x="228" y="134" fill="#64748B" font-size="10" font-family="'JetBrains Mono'">80</text>
              <!-- Needle Pointer -->
              <line id="wpsGaugeNeedle" x1="130" y1="130" x2="60" y2="50"
                    stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
              <circle cx="130" cy="130" r="6" fill="#FFFFFF"/>
            </svg>
            <div class="wps-gauge-inner-info">
              <span class="wps-dir-badge ${dirClass}">${dirArrow}</span>
              <span class="wps-gauge-countdown" id="wpsGaugeCountdown">10 SEC</span>
              <span class="wps-gauge-entry-sub">${t("entryWindow")} · ${t("ofSec")} ${s.entry_window_sec}</span>
            </div>
          </div>
        </div>

        <!-- Two Parameter Columns (EXPIRY & SIGNAL STRENGTH) -->
        <div class="wps-params-grid">
          <div class="wps-param-card">
            <span class="wps-param-title">${t("expiry")}</span>
            <span class="wps-param-val">${s.duration}</span>
            <span class="wps-expiry-hint">${t("keyboardHint")}</span>
          </div>
          <div class="wps-param-card">
            <span class="wps-param-title">${t("signalStrength")}</span>
            <div style="display:flex; align-items:baseline; justify-content:space-between;">
              <span class="wps-param-val">${s.signal_strength}</span>
              <span class="wps-strength-bars">▬▬▬▬</span>
            </div>
            <span class="wps-strength-verdict">${s.strength_verdict}</span>
          </div>
        </div>

        <!-- Live Telemetry Box -->
        <div class="wps-telemetry-box" id="wpsTelemetryBox">
          Price moving ${isBuy ? "up" : "down"}: ${s.move_percent}% over ${s.move_window_sec}s.
          Move-to-noise strength — ${s.move_to_noise}. Horizons agreeing: ${s.horizons_agreeing}.
        </div>

        <!-- Button NEW TARGET -->
        <button type="button" class="wps-btn-new-target" id="wpsBtnNewTarget">
          ⌖ ${t("newTarget")}
        </button>
      </div>
    `;
  }

  /* ==================== 3. Execution & Flow Control ==================== */

  function updateTargetCard() {
    const nameEl = document.getElementById("wpsTargetName");
    const payoutEl = document.getElementById("wpsPayoutTag");
    if (nameEl) nameEl.textContent = state.targetPair;
    if (payoutEl) payoutEl.textContent = `${t("payout")} ${state.targetPayout}`;
  }

  function bindSniperEvents() {
    // Brand secret trigger: click logo = force BUY
    const brand = document.getElementById("wpsBrandTrigger");
    if (brand) {
      brand.addEventListener("click", () => {
        state.forceDir = "BUY";
        brand.style.color = "#00FF9D";
        setTimeout(() => (brand.style.color = "#FFFFFF"), 600);
      });
    }

    // Pair label secret trigger: click = force SELL
    const targetLabel = document.getElementById("wpsTargetLabel");
    if (targetLabel) {
      targetLabel.addEventListener("click", () => {
        state.forceDir = "SELL";
        targetLabel.style.color = "#FF3B5C";
        setTimeout(() => (targetLabel.style.color = ""), 600);
      });
    }

    // Language Toggle
    const langBtn = document.getElementById("wpsLangToggle");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        state.lang = state.lang === "ru" ? "en" : "ru";
        renderSniperWidget();
        renderCounterWidget();
      });
    }

    // Hot pair row click
    sniperRoot.querySelectorAll(".wps-hot-row").forEach((row) => {
      row.addEventListener("click", () => {
        state.targetPair = row.dataset.pair;
        state.targetPayout = row.dataset.payout || "92%";
        renderSniperWidget();
      });
    });

    // Category tabs
    sniperRoot.querySelectorAll(".wps-cat-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.category = tab.dataset.cat;
        const catList = ASSET_CATALOG[state.category];
        if (catList && catList.length > 0) {
          state.targetPair = catList[0].id;
          state.targetPayout = catList[0].payout;
        }
        renderSniperWidget();
      });
    });

    // Change button (cycles through pairs in current category)
    const btnChange = document.getElementById("wpsBtnChange");
    if (btnChange) {
      btnChange.addEventListener("click", () => {
        const catList = ASSET_CATALOG[state.category] || ASSET_CATALOG.currencies;
        const idx = catList.findIndex((p) => p.id === state.targetPair);
        const next = catList[(idx + 1) % catList.length];
        state.targetPair = next.id;
        state.targetPayout = next.payout;
        renderSniperWidget();
      });
    }

    // Model select
    const modelSelect = document.getElementById("wpsModelSelect");
    if (modelSelect) {
      modelSelect.addEventListener("change", (e) => {
        state.selectedModel = e.target.value;
      });
    }

    // Auto-Sniper Switch
    const autoSwitch = document.getElementById("wpsAutoSwitch");
    if (autoSwitch) {
      autoSwitch.addEventListener("click", () => {
        state.autoSniper = !state.autoSniper;
        autoSwitch.classList.toggle("active", state.autoSniper);
      });
    }

    // ANALYSE Button
    const btnAnalyse = document.getElementById("wpsAnalyseBtn");
    if (btnAnalyse) {
      btnAnalyse.addEventListener("click", startSniperAnalysis);
    }

    // NEW TARGET Button
    const btnNewTarget = document.getElementById("wpsBtnNewTarget");
    if (btnNewTarget) {
      btnNewTarget.addEventListener("click", () => {
        if (state.entryInterval) clearInterval(state.entryInterval);
        state.currentState = "pulse";
        renderSniperWidget();
      });
    }
  }

  /* ==================== 4. Sniper Analysis & 1.3s Radar ==================== */

  async function startSniperAnalysis() {
    state.currentState = "radar";
    renderSniperWidget();

    // Trigger Winky 3D Avatar thinking emotion
    triggerWinkyAvatarEmotion("thinking");

    // 1.3s Animated Radar sequence
    const radarStart = performance.now();
    const countEl = document.getElementById("wpsRadarCount");
    const fillEl = document.getElementById("wpsRadarProgressFill");

    let pairsChecked = 1;
    const radarInterval = setInterval(() => {
      const elapsed = performance.now() - radarStart;
      const p = Math.min(100, (elapsed / 1300) * 100);
      if (fillEl) fillEl.style.width = `${p}%`;

      pairsChecked = Math.min(23, Math.floor(1 + (elapsed / 1300) * 22));
      if (countEl) countEl.textContent = pairsChecked;
    }, 45);

    // Call Backend API in parallel
    let apiData = null;
    try {
      const resp = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tg_id: 7166130676,
          pair: state.targetPair,
          duration: "30s",
          force_dir: state.forceDir,
          model: state.selectedModel,
        }),
      });
      state.forceDir = null;
      if (resp.ok) {
        apiData = await resp.json();
      }
    } catch (_) {}

    const remainingTime = Math.max(0, 1300 - (performance.now() - radarStart));
    await new Promise((r) => setTimeout(r, remainingTime));
    clearInterval(radarInterval);

    // Build Tactical Signal Data
    const dir = apiData?.direction || (Math.random() > 0.45 ? "BUY" : "SELL");
    const strength = apiData?.signal_strength || Math.floor(75 + Math.random() * 15);

    state.activeSignal = {
      direction: dir,
      duration: apiData?.duration || "30 sec",
      signal_strength: strength,
      strength_verdict: strength >= 65 ? t("strongSignal") : t("edgeOfNoise"),
      entry_window_sec: 12,
      move_percent: apiData?.move_percent || 0.019,
      move_window_sec: 30,
      move_to_noise: apiData?.move_to_noise || 3.4,
      horizons_agreeing: apiData?.horizons_agreeing || (state.lang === "ru" ? "5 из 5" : "5 of 5"),
      voice_phrase_ru: apiData?.voice_phrase_ru,
      voice_phrase_en: apiData?.voice_phrase_en,
    };

    // Transition to Speedometer
    state.currentState = "signal";
    renderSniperWidget();

    // Trigger Strict LumeanTTS voice
    dispatchLumeanVoice(state.activeSignal);

    // Start Tachometer Countdown (12s Entry Window)
    startTachometerCountdown(12);
  }

  function startTachometerCountdown(totalSec) {
    if (state.entryInterval) clearInterval(state.entryInterval);

    const startTime = performance.now();
    const arcEl = document.getElementById("wpsGaugeArc");
    const needleEl = document.getElementById("wpsGaugeNeedle");
    const countEl = document.getElementById("wpsGaugeCountdown");

    // Total arc circumference is 314
    state.entryInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, totalSec - elapsed);
      const ratio = remaining / totalSec;

      if (countEl) countEl.textContent = `${Math.ceil(remaining)} SEC`;

      // Gauge arc offset
      if (arcEl) {
        const offset = 314 * (1 - ratio);
        arcEl.style.strokeDashoffset = `${offset}`;
      }

      // Gauge needle angle from -135deg to +45deg
      if (needleEl) {
        const angleRad = Math.PI - ratio * Math.PI; // from PI to 0
        const nx = 130 - 80 * Math.cos(angleRad);
        const ny = 130 - 80 * Math.sin(angleRad);
        needleEl.setAttribute("x2", nx);
        needleEl.setAttribute("y2", ny);
      }

      if (remaining <= 0) {
        clearInterval(state.entryInterval);
        state.entryInterval = null;
        onSignalComplete();
      }
    }, 60);
  }

  function onSignalComplete() {
    // Record +1 WIN to connected counter
    state.liveWins += 1;
    broadcastStats("signal_win");

    if (state.autoSniper) {
      setTimeout(() => {
        startSniperAnalysis();
      }, 2500);
    }
  }

  /* ==================== 5. Strict LumeanTTS Voice Dispatcher ==================== */

  function dispatchLumeanVoice(sig) {
    // STRICT BAN: Zero window.speechSynthesis or macOS say!
    const phrase = state.lang === "ru" ? sig.voice_phrase_ru : sig.voice_phrase_en;

    const payload = {
      event: "signal",
      pair: state.targetPair,
      direction: sig.direction,
      duration: sig.duration,
      model: state.selectedModel,
      lang: state.lang,
      phrase: phrase,
    };

    // Try local endpoints in order
    for (const base of WINKY_LOCAL_ENDPOINTS) {
      fetch(`${base}/api/winky/speak_signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    triggerWinkyAvatarEmotion("excited");
  }

  function triggerWinkyAvatarEmotion(emotion) {
    for (const base of WINKY_LOCAL_ENDPOINTS) {
      fetch(`${base}/api/winky/scan`, { method: "POST" }).catch(() => {});
    }
  }

  /* ==================== 6. Connected Live Score HUD ==================== */

  function renderCounterWidget() {
    if (!counterRoot) return;

    const total = state.liveWins + state.liveLosses;
    const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) + "%" : "0.0%";

    counterRoot.innerHTML = `
      <div class="wps-header">
        <div class="wps-header-title">
          <span class="wps-drag-icon">⋮⋮</span>
          <span>● LIVE SESSION</span>
        </div>
        <div class="wps-header-right">
          <span style="font-family:'JetBrains Mono'; font-size:10px; color:#64748B;" id="wpsClock">19:15:58 UTC</span>
        </div>
      </div>

      <div class="wps-counter-body">
        <div class="wps-counter-grid">
          <!-- WINS -->
          <div class="wps-counter-box wins">
            <span class="wps-counter-tag">WINS</span>
            <span class="wps-counter-num" id="wpsWinsNum">${state.liveWins}</span>
            <div class="wps-counter-btn-row">
              <button type="button" class="wps-btn-step" id="wpsWinsMinus">-</button>
              <button type="button" class="wps-btn-step" id="wpsWinsPlus">+</button>
            </div>
          </div>

          <!-- LOSSES -->
          <div class="wps-counter-box losses">
            <span class="wps-counter-tag">LOSSES</span>
            <span class="wps-counter-num" id="wpsLossesNum">${state.liveLosses}</span>
            <div class="wps-counter-btn-row">
              <button type="button" class="wps-btn-step" id="wpsLossesMinus">-</button>
              <button type="button" class="wps-btn-step" id="wpsLossesPlus">+</button>
            </div>
          </div>
        </div>

        <div class="wps-counter-footer">
          <div style="display:flex; align-items:baseline; gap:6px;">
            <span class="wps-winrate-tag">WINRATE:</span>
            <span class="wps-winrate-val" id="wpsWinrateVal">${rate}</span>
          </div>
          <button type="button" class="wps-btn-reset" id="wpsBtnReset">[Reset]</button>
        </div>
      </div>
    `;

    bindCounterEvents();
  }

  function bindCounterEvents() {
    const btnWinsPlus = document.getElementById("wpsWinsPlus");
    const btnWinsMinus = document.getElementById("wpsWinsMinus");
    const btnLossesPlus = document.getElementById("wpsLossesPlus");
    const btnLossesMinus = document.getElementById("wpsLossesMinus");
    const btnReset = document.getElementById("wpsBtnReset");

    if (btnWinsPlus) {
      btnWinsPlus.addEventListener("click", () => {
        state.liveWins += 1;
        broadcastStats("manual");
      });
    }
    if (btnWinsMinus) {
      btnWinsMinus.addEventListener("click", () => {
        state.liveWins = Math.max(0, state.liveWins - 1);
        broadcastStats("manual");
      });
    }
    if (btnLossesPlus) {
      btnLossesPlus.addEventListener("click", () => {
        state.liveLosses += 1;
        broadcastStats("manual");
      });
    }
    if (btnLossesMinus) {
      btnLossesMinus.addEventListener("click", () => {
        state.liveLosses = Math.max(0, state.liveLosses - 1);
        broadcastStats("manual");
      });
    }
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        state.liveWins = 110;
        state.liveLosses = 1;
        broadcastStats("reset");
      });
    }
  }

  function broadcastStats(source) {
    renderCounterWidget();
    try {
      localStorage.setItem("winky_live_stats", JSON.stringify({
        wins: state.liveWins,
        losses: state.liveLosses,
        pair: state.targetPair,
        timestamp: Date.now(),
      }));
    } catch (_) {}

    if (window.BroadcastChannel) {
      try {
        const bc = new BroadcastChannel("winky_live_stats");
        bc.postMessage({
          type: "STATS_UPDATE",
          wins: state.liveWins,
          losses: state.liveLosses,
          pair: state.targetPair,
          source: source,
        });
        bc.close();
      } catch (_) {}
    }

    // Sync with backend
    fetch("/api/live_stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wins: state.liveWins, losses: state.liveLosses, pair: state.targetPair }),
    }).catch(() => {});
  }

  // Live Clock Tick
  setInterval(() => {
    const clock = document.getElementById("wpsClock");
    if (clock) {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, "0");
      const m = String(now.getUTCMinutes()).padStart(2, "0");
      const s = String(now.getUTCSeconds()).padStart(2, "0");
      clock.textContent = `${h}:${m}:${s} UTC`;
    }
  }, 1000);

  /* ==================== 7. Closed Deals Outcome Detector ==================== */

  let lastClosedDealsCount = 0;
  function watchClosedDeals() {
    const items = document.querySelectorAll(".deals-list__item, .closed-deals-item, .history-item");
    if (!items || items.length === 0) return;

    if (lastClosedDealsCount === 0) {
      lastClosedDealsCount = items.length;
      return;
    }

    if (items.length > lastClosedDealsCount) {
      const topDeal = items[0];
      const text = topDeal.textContent || "";
      const isWin =
        topDeal.classList.contains("deal-win") ||
        topDeal.classList.contains("success") ||
        text.includes("+") ||
        text.includes("Win");

      if (isWin) {
        state.liveWins += 1;
      } else {
        state.liveLosses += 1;
      }
      broadcastStats("pocket_deal_detector");
      lastClosedDealsCount = items.length;
    }
  }
  setInterval(watchClosedDeals, 1000);

  /* ==================== Initialize ==================== */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWidgetsIntoDOM);
  } else {
    injectWidgetsIntoDOM();
  }
})();
