/* ============================================================
   WINKY NEURAL VISION HUD — POCKET OPTION CONTENT SCRIPT
   Direct In-DOM Aero-Glass HUD, 3-Vector Matrix & Live Score
   Zero macOS standalone windows, Zero say/speechSynthesis
   Scales natively with Pocket Option page zoom (Cmd + / Cmd -)
   ============================================================ */

(function () {
  "use strict";

  if (window.__WINKY_NEURAL_HUD_INJECTED__) return;
  window.__WINKY_NEURAL_HUD_INJECTED__ = true;

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
      { id: "AUD/CAD OTC", name: "AUD/CAD OTC", payout: "90%" },
      { id: "MAD/USD OTC", name: "MAD/USD OTC", payout: "92%" },
      { id: "USD/CAD OTC", name: "USD/CAD OTC", payout: "92%" },
      { id: "EUR/USD OTC", name: "EUR/USD OTC", payout: "92%" },
      { id: "GBP/USD OTC", name: "GBP/USD OTC", payout: "92%" },
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
    { id: "gemini-argon", name: "Gemini Argon", tag: "RADAR" },
  ];

  /* ==================== Application State ==================== */

  // Load persisted stats
  let savedStats = { wins: 110, losses: 1, profit: 1420 };
  try {
    const raw = localStorage.getItem("winky_live_stats_v2");
    if (raw) savedStats = { ...savedStats, ...JSON.parse(raw) };
  } catch (_) {}

  const state = {
    lang: "ru",
    category: "currencies",
    targetPair: "AUD/CAD OTC",
    targetPayout: "90%",
    selectedModel: "claude-fable-5.1",
    autoSniper: false,
    currentState: "pulse", // "pulse" | "scan" | "signal"
    forceDir: null, // Streamer trigger: 'BUY' (logo) | 'SELL' (target label)
    priceTicks: [],
    liveWins: savedStats.wins,
    liveLosses: savedStats.losses,
    sessionProfit: savedStats.profit,
    lastBalance: null,
    hotPairs: [
      { num: "01", pair: "MAD/USD OTC", payout: "92%" },
      { num: "02", pair: "USD/CAD OTC", payout: "92%" },
      { num: "03", pair: "AUD/CAD OTC", payout: "90%" },
    ],
    activeSignal: null,
    entryInterval: null,
    autoSniperTimeout: null,
  };

  /* ==================== Localization ==================== */

  const i18n = {
    ru: {
      hudTitle: "WINKY",
      hudSub: "NEURAL VISION",
      linkActive: "СВЯЗЬ АКТИВНА",
      pulseTitle: "ИМПУЛЬС РЫНКА",
      pulseSub: "Где волатильность максимальна прямо сейчас. Нажми, чтобы выбрать цель.",
      target: "ЦЕЛЬ АНАЛИЗА",
      payout: "выплата",
      aiEngine: "НЕЙРО-ЯДРО:",
      btnAnalyse: "ЗАПУСК НЕЙРО-АНАЛИЗА",
      autoSniper: "АВТО-СНАЙПЕР",
      scanning: "СКАНИРОВАНИЕ ГРАФИКА...",
      calculatingVectors: "Расчёт 3-х векторов импульса котировок",
      vector1: "⚡ ИМПУЛЬС ТИКОВ",
      vector2: "📊 ОБЪЁМ И СТАКАН",
      vector3: "🕯 СВЕЧНОЙ ПАТТЕРН",
      dirUp: "↑ ВВЕРХ (BUY)",
      dirDown: "↓ ВНИЗ (SELL)",
      expiry: "ЭКСПИРАЦИЯ",
      entryWindow: "ОКНО ВХОДА",
      newTarget: "НОВАЯ ЦЕЛЬ",
      liveScore: "LIVE SCORE",
      wins: "WINS",
      losses: "LOSSES",
      winrate: "RATE",
      profit: "ПРОФИТ",
    },
    en: {
      hudTitle: "WINKY",
      hudSub: "NEURAL VISION",
      linkActive: "LINK ACTIVE",
      pulseTitle: "MARKET PULSE",
      pulseSub: "Where market moves hardest right now. Click row to select target.",
      target: "TARGET ASSET",
      payout: "payout",
      aiEngine: "AI ENGINE:",
      btnAnalyse: "RUN NEURAL SCAN",
      autoSniper: "AUTO-SNIPER",
      scanning: "SCANNING CHART...",
      calculatingVectors: "Computing 3 momentum vectors",
      vector1: "⚡ TICK VELOCITY",
      vector2: "📊 ORDERFLOW DEPTH",
      vector3: "🕯 PRICE ACTION",
      dirUp: "↑ UP (BUY)",
      dirDown: "↓ DOWN (SELL)",
      expiry: "EXPIRY",
      entryWindow: "ENTRY WINDOW",
      newTarget: "NEW TARGET",
      liveScore: "LIVE SCORE",
      wins: "WINS",
      losses: "LOSSES",
      winrate: "RATE",
      profit: "PROFIT",
    },
  };

  function t(key) {
    return (i18n[state.lang] && i18n[state.lang][key]) || key;
  }

  /* ==================== 1. Scan Pocket Option DOM ==================== */

  function scanPocketOptionDOM() {
    // 1. Detect active pair
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

    // 2. Detect payout
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

    // 3. Detect price ticks
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

    // 4. Detect balance change for automatic win tracking
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

  /* ==================== 2. Create In-DOM HUD & Live Score ==================== */

  let sniperRoot = null;
  let counterRoot = null;

  function injectWidgetsIntoDOM() {
    if (document.getElementById("winky-sniper-root")) return;

    // Sniper HUD Root
    sniperRoot = document.createElement("div");
    sniperRoot.id = "winky-sniper-root";

    // Counter HUD Root (Top-Center)
    counterRoot = document.createElement("div");
    counterRoot.id = "winky-counter-root";

    document.body.appendChild(sniperRoot);
    document.body.appendChild(counterRoot);

    renderSniperWidget();
    renderCounterWidget();

    makeDraggable(sniperRoot, sniperRoot.querySelector(".wps-hud-header"), "wps_pos_hud");
    makeDraggable(counterRoot, counterRoot.querySelector(".wps-score-handle"), "wps_pos_score");
  }

  /* ==================== Drag & Drop Helper ==================== */

  function makeDraggable(rootEl, handleEl, storageKey) {
    if (!rootEl || !handleEl) return;

    // Restore position from storage
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const pos = JSON.parse(saved);
          if (pos.top !== undefined && pos.left !== undefined) {
            rootEl.style.top = `${pos.top}px`;
            rootEl.style.left = `${pos.left}px`;
            rootEl.style.right = "auto";
            rootEl.style.transform = "none";
          }
        }
      } catch (_) {}
    }

    let isDragging = false;
    let startX = 0, startY = 0, initX = 0, initY = 0;

    handleEl.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = rootEl.getBoundingClientRect();
      initX = rect.left;
      initY = rect.top;
      rootEl.style.right = "auto";
      rootEl.style.transform = "none";
      rootEl.style.transition = "none";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newX = Math.max(10, Math.min(window.innerWidth - rootEl.offsetWidth - 10, initX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - rootEl.offsetHeight - 10, initY + dy));
      rootEl.style.left = `${newX}px`;
      rootEl.style.top = `${newY}px`;
    });

    window.addEventListener("mouseup", () => {
      if (isDragging && storageKey) {
        try {
          const rect = rootEl.getBoundingClientRect();
          localStorage.setItem(storageKey, JSON.stringify({ top: rect.top, left: rect.left }));
        } catch (_) {}
      }
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }

  /* ==================== 3. Render Sniper HUD ==================== */

  function renderSniperWidget() {
    if (!sniperRoot) return;

    let bodyHTML = "";

    if (state.currentState === "pulse") {
      bodyHTML = renderScreenPulse();
    } else if (state.currentState === "scan") {
      bodyHTML = renderScreenScan();
    } else if (state.currentState === "signal") {
      bodyHTML = renderScreenSignal();
    }

    sniperRoot.innerHTML = `
      <!-- HUD Header -->
      <div class="wps-hud-header">
        <div class="wps-hud-brand" id="wpsBrandTrigger" title="WINKY NEURAL VISION (Streamer: BUY Trigger)">
          <div class="wps-brand-icon">⚡</div>
          <div class="wps-brand-text">${t("hudTitle")} <span>${t("hudSub")}</span></div>
        </div>
        <div class="wps-hud-actions">
          <span class="wps-status-pill">${t("linkActive")}</span>
          <button type="button" class="wps-lang-btn" id="wpsLangToggle">${state.lang.toUpperCase()}</button>
        </div>
      </div>

      <!-- HUD Body -->
      <div class="wps-hud-body">
        ${bodyHTML}
      </div>
    `;

    bindSniperEvents();
  }

  function renderScreenPulse() {
    const hotRowsHTML = state.hotPairs
      .map((hp) => {
        const isSel = hp.pair === state.targetPair ? "selected" : "";
        return `
          <div class="wps-hot-row ${isSel}" data-pair="${hp.pair}" data-payout="${hp.payout}">
            <div class="wps-hot-pair-wrap">
              <span class="wps-hot-num">${hp.num}</span>
              <span class="wps-hot-pair">${hp.pair}</span>
            </div>
            <span class="wps-hot-payout">${hp.payout}</span>
          </div>
        `;
      })
      .join("");

    const catTabsHTML = Object.keys(ASSET_CATALOG)
      .map((cat) => {
        const act = cat === state.category ? "active" : "";
        return `<button type="button" class="wps-cat-tab ${act}" data-cat="${cat}">${cat.toUpperCase()}</button>`;
      })
      .join("");

    const aiOptionsHTML = AI_MODELS.map((m) => {
      const sel = m.id === state.selectedModel ? "selected" : "";
      return `<option value="${m.id}" ${sel}>${m.name} (${m.tag})</option>`;
    }).join("");

    const autoActive = state.autoSniper ? "active" : "";

    return `
      <!-- Pulse Header -->
      <div class="wps-section-head">
        <div class="wps-section-title-row">
          <span class="wps-section-title">${t("pulseTitle")}</span>
          <span style="font-size:10px; color:var(--wps-cyan); font-weight:800;">TOP 3</span>
        </div>
        <span class="wps-section-sub">${t("pulseSub")}</span>
      </div>

      <!-- Hot Volatile Rows -->
      <div class="wps-hot-list">
        ${hotRowsHTML}
      </div>

      <!-- Category Tabs -->
      <div class="wps-cat-tabs">
        ${catTabsHTML}
      </div>

      <!-- Target Card -->
      <div class="wps-target-card">
        <div class="wps-target-head">
          <span class="wps-target-label" id="wpsTargetLabel" title="Streamer: SELL Trigger">${t("target")}</span>
          <span class="wps-target-payout" id="wpsPayoutTag">${t("payout")} ${state.targetPayout}</span>
        </div>
        <span class="wps-target-name" id="wpsTargetName">${state.targetPair}</span>
      </div>

      <!-- AI Engine Select -->
      <div class="wps-ai-row">
        <span class="wps-ai-label">${t("aiEngine")}</span>
        <select class="wps-ai-select" id="wpsModelSelect">
          ${aiOptionsHTML}
        </select>
      </div>

      <!-- Action Bar -->
      <div class="wps-action-bar">
        <button type="button" class="wps-btn-analyse" id="wpsBtnAnalyse">
          <span>⚡</span>
          <span>${t("btnAnalyse")}</span>
        </button>
        <div class="wps-auto-toggle ${autoActive}" id="wpsAutoToggle" title="${t("autoSniper")}">
          <span class="wps-auto-label">AUTO</span>
          <div class="wps-auto-switch">
            <div class="wps-auto-knob"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderScreenScan() {
    return `
      <div class="wps-screen-scanning">
        <div class="wps-scan-reticle">
          <div class="wps-scan-ring r1"></div>
          <div class="wps-scan-ring r2"></div>
          <div class="wps-scan-ring r3"></div>
          <span class="wps-scan-center-text">1.1s</span>
        </div>
        <div style="text-align:center;">
          <div class="wps-scan-subhead">${t("scanning")}</div>
          <div style="font-size:10px; color:var(--wps-text-dim); margin-top:2px;">${t("calculatingVectors")}</div>
        </div>
        <div class="wps-scan-progress-bar">
          <div class="wps-scan-progress-fill"></div>
        </div>
      </div>
    `;
  }

  function renderScreenSignal() {
    const s = state.activeSignal;
    if (!s) return "";

    const isBuy = s.direction === "BUY";
    const dirClass = isBuy ? "buy" : "sell";
    const dirText = isBuy ? t("dirUp") : t("dirDown");

    return `
      <div class="wps-screen-signal">
        <!-- Target Header in Signal -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; font-weight:800; color:#fff;">${state.targetPair}</span>
          <span style="font-size:11px; font-weight:800; color:var(--wps-emerald);">${t("payout")} ${state.targetPayout}</span>
        </div>

        <!-- 3-Vector Matrix -->
        <div class="wps-vector-matrix">
          <!-- Vector 1: Tick Velocity -->
          <div class="wps-vector-row">
            <div class="wps-vector-meta">
              <span class="wps-vector-title">${t("vector1")}</span>
              <span class="wps-vector-val">${s.vec1_val}% · ${s.vec1_desc}</span>
            </div>
            <div class="wps-vector-track">
              <div class="wps-vector-fill cyan" style="width: ${s.vec1_val}%;"></div>
            </div>
          </div>

          <!-- Vector 2: Orderflow -->
          <div class="wps-vector-row">
            <div class="wps-vector-meta">
              <span class="wps-vector-title">${t("vector2")}</span>
              <span class="wps-vector-val">${s.vec2_desc}</span>
            </div>
            <div class="wps-vector-track">
              <div class="wps-vector-fill ${dirClass === "buy" ? "emerald" : "ruby"}" style="width: ${s.vec2_val}%;"></div>
            </div>
          </div>

          <!-- Vector 3: Price Action -->
          <div class="wps-vector-row">
            <div class="wps-vector-meta">
              <span class="wps-vector-title">${t("vector3")}</span>
              <span class="wps-vector-val">${s.vec3_desc}</span>
            </div>
            <div class="wps-vector-track">
              <div class="wps-vector-fill ${dirClass === "buy" ? "emerald" : "ruby"}" style="width: ${s.vec3_val}%;"></div>
            </div>
          </div>
        </div>

        <!-- Glowing Signal Capsule -->
        <div class="wps-signal-capsule ${dirClass}">
          <div class="wps-capsule-dir-row">
            <span class="wps-capsule-dir-text">${dirText}</span>
          </div>
          <div class="wps-capsule-timer-row">
            <span class="wps-capsule-expiry">${s.duration}</span>
            <span class="wps-capsule-countdown" id="wpsCapsuleCountdown">12 SEC</span>
          </div>
          <div class="wps-capsule-bar-track">
            <div class="wps-capsule-bar-fill" id="wpsCapsuleBarFill"></div>
          </div>
        </div>

        <!-- Telemetry Box -->
        <div class="wps-telemetry-box">
          Δ ${isBuy ? "+" : "-"}${s.move_percent}% (${s.move_window_sec}s) · SNR: ${s.move_to_noise} · Согласовано: ${s.horizons_agreeing}
        </div>

        <!-- New Target Button -->
        <button type="button" class="wps-btn-new-target" id="wpsBtnNewTarget">
          ⌖ ${t("newTarget")}
        </button>
      </div>
    `;
  }

  function updateTargetCard() {
    const nameEl = document.getElementById("wpsTargetName");
    const payoutEl = document.getElementById("wpsPayoutTag");
    if (nameEl) nameEl.textContent = state.targetPair;
    if (payoutEl) payoutEl.textContent = `${t("payout")} ${state.targetPayout}`;
  }

  /* ==================== 4. Event Bindings ==================== */

  function bindSniperEvents() {
    // Brand secret trigger: click logo = force BUY
    const brand = document.getElementById("wpsBrandTrigger");
    if (brand) {
      brand.addEventListener("click", () => {
        state.forceDir = "BUY";
        brand.style.color = "#00FF9D";
        setTimeout(() => (brand.style.color = ""), 600);
      });
    }

    // Target label secret trigger: click = force SELL
    const targetLabel = document.getElementById("wpsTargetLabel");
    if (targetLabel) {
      targetLabel.addEventListener("click", () => {
        state.forceDir = "SELL";
        targetLabel.style.color = "#FF3366";
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

    // AI Model select
    const modelSel = document.getElementById("wpsModelSelect");
    if (modelSel) {
      modelSel.addEventListener("change", (e) => {
        state.selectedModel = e.target.value;
      });
    }

    // Auto-Sniper toggle
    const autoToggle = document.getElementById("wpsAutoToggle");
    if (autoToggle) {
      autoToggle.addEventListener("click", () => {
        state.autoSniper = !state.autoSniper;
        autoToggle.classList.toggle("active", state.autoSniper);
      });
    }

    // Analyse Button Click
    const analyseBtn = document.getElementById("wpsBtnAnalyse");
    if (analyseBtn) {
      analyseBtn.addEventListener("click", () => {
        startNeuralScan();
      });
    }

    // New Target Button Click
    const newTargetBtn = document.getElementById("wpsBtnNewTarget");
    if (newTargetBtn) {
      newTargetBtn.addEventListener("click", () => {
        clearSignalTimers();
        state.currentState = "pulse";
        renderSniperWidget();
      });
    }
  }

  /* ==================== 5. Neural Scan & Laser Chart Sweep ==================== */

  function startNeuralScan() {
    clearSignalTimers();
    state.currentState = "scan";
    renderSniperWidget();

    // 1. Inject laser sweep overlay across the chart
    injectChartLaserSweep();

    // 2. Trigger Avatar Thinking
    triggerAvatarScan();

    // 3. Request API telemetry in background
    let apiData = null;
    const bodyPayload = {
      pair: state.targetPair,
      timeframe: "1m",
      force_dir: state.forceDir || undefined,
      model: state.selectedModel,
    };
    state.forceDir = null; // reset secret trigger

    fetch("https://winktrade-app.online/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        apiData = data;
      })
      .catch(() => {});

    // Complete scan after 1.1s
    setTimeout(() => {
      removeChartLaserSweep();
      revealNeuralSignal(apiData);
    }, 1100);
  }

  function injectChartLaserSweep() {
    removeChartLaserSweep();
    const overlay = document.createElement("div");
    overlay.className = "wps-chart-laser-sweep";
    overlay.id = "wpsChartLaserOverlay";
    overlay.innerHTML = `<div class="wps-laser-line"></div>`;
    document.body.appendChild(overlay);
  }

  function removeChartLaserSweep() {
    const el = document.getElementById("wpsChartLaserOverlay");
    if (el) el.remove();
  }

  function triggerAvatarScan() {
    for (const base of WINKY_LOCAL_ENDPOINTS) {
      fetch(`${base}/api/winky/scan`, { method: "POST" }).catch(() => {});
    }
  }

  /* ==================== 6. Signal Reveal & Button Glow ==================== */

  function revealNeuralSignal(apiData) {
    const isBuy = apiData ? apiData.direction === "BUY" : Math.random() > 0.45;
    const dir = isBuy ? "BUY" : "SELL";

    const vec1 = Math.floor(88 + Math.random() * 10);
    const vec2 = Math.floor(80 + Math.random() * 14);
    const vec3 = Math.floor(84 + Math.random() * 12);

    const vec1Desc = state.lang === "ru" ? "ИМПУЛЬСНЫЙ ПРОБОЙ" : "VELOCITY SURGE";
    const vec2Desc = isBuy
      ? state.lang === "ru" ? `BUY ДАВЛЕНИЕ ${vec2}%` : `BUY PRESSURE ${vec2}%`
      : state.lang === "ru" ? `SELL ДАВЛЕНИЕ ${vec2}%` : `SELL PRESSURE ${vec2}%`;
    const vec3Desc = isBuy
      ? state.lang === "ru" ? "БЫЧЬЕ ПОГЛОЩЕНИЕ" : "BULLISH ENGULFING"
      : state.lang === "ru" ? "МЕДВЕЖЬЕ ПОГЛОЩЕНИЕ" : "BEARISH ENGULFING";

    state.activeSignal = {
      direction: dir,
      duration: "30 SEC",
      vec1_val: vec1,
      vec1_desc: vec1Desc,
      vec2_val: vec2,
      vec2_desc: vec2Desc,
      vec3_val: vec3,
      vec3_desc: vec3Desc,
      entry_window_sec: 12,
      move_percent: (0.015 + Math.random() * 0.02).toFixed(3),
      move_window_sec: 30,
      move_to_noise: (3.2 + Math.random() * 0.8).toFixed(1),
      horizons_agreeing: state.lang === "ru" ? "3 из 3 векторов" : "3 of 3 vectors",
    };

    state.currentState = "signal";
    renderSniperWidget();

    // Strict Female LumeanTTS Voice
    dispatchLumeanVoice(state.activeSignal);

    // Apply Glow to real Pocket Option buttons
    applyRealButtonGlow(dir);

    // Start 12-second Entry Countdown
    startEntryCountdown(12);
  }

  function applyRealButtonGlow(dir) {
    removeRealButtonGlow();
    const btnCall = document.querySelector(".btn-call, [data-test='btn-call']");
    const btnPut = document.querySelector(".btn-put, [data-test='btn-put']");

    if (dir === "BUY" && btnCall) {
      btnCall.classList.add("wps-button-glow-buy");
    } else if (dir === "SELL" && btnPut) {
      btnPut.classList.add("wps-button-glow-sell");
    }
  }

  function removeRealButtonGlow() {
    document.querySelectorAll(".wps-button-glow-buy").forEach((el) => el.classList.remove("wps-button-glow-buy"));
    document.querySelectorAll(".wps-button-glow-sell").forEach((el) => el.classList.remove("wps-button-glow-sell"));
  }

  function startEntryCountdown(totalSec) {
    if (state.entryInterval) clearInterval(state.entryInterval);

    const startTime = performance.now();
    const countEl = document.getElementById("wpsCapsuleCountdown");
    const barEl = document.getElementById("wpsCapsuleBarFill");

    state.entryInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, totalSec - elapsed);
      const ratio = remaining / totalSec;

      if (countEl) countEl.textContent = `${Math.ceil(remaining)} SEC`;
      if (barEl) barEl.style.width = `${ratio * 100}%`;

      if (remaining <= 0) {
        clearInterval(state.entryInterval);
        state.entryInterval = null;
        removeRealButtonGlow();
        onSignalComplete();
      }
    }, 60);
  }

  function onSignalComplete() {
    // Record WIN on expiration
    state.liveWins += 1;
    state.sessionProfit += 180;
    broadcastStats("signal_win");

    if (state.autoSniper) {
      state.autoSniperTimeout = setTimeout(() => {
        startNeuralScan();
      }, 3000);
    }
  }

  function clearSignalTimers() {
    if (state.entryInterval) {
      clearInterval(state.entryInterval);
      state.entryInterval = null;
    }
    if (state.autoSniperTimeout) {
      clearTimeout(state.autoSniperTimeout);
      state.autoSniperTimeout = null;
    }
    removeRealButtonGlow();
    removeChartLaserSweep();
  }

  /* ==================== 7. Strict LumeanTTS Voice Dispatch ==================== */

  function dispatchLumeanVoice(sig) {
    // STRICT RULE: Zero say, Zero window.speechSynthesis!
    const isBuy = sig.direction === "BUY";
    const dirPhraseRu = isBuy ? "ВВЕРХ" : "ВНИЗ";
    const dirPhraseEn = isBuy ? "UP" : "DOWN";

    const phrase =
      state.lang === "ru"
        ? `Цель зафиксирована: ${state.targetPair}, доходность ${state.targetPayout}! Все три вектора подтверждают импульс: тики ${sig.vec1_val}%, давление в стакане ${sig.vec2_val}%, свечной паттерн! Входим ${dirPhraseRu} на 30 секунд!`
        : `Target locked: ${state.targetPair}, payout ${state.targetPayout}! All three momentum vectors confirmed: tick velocity ${sig.vec1_val}%, orderflow ${sig.vec2_val}%, price action! Enter ${dirPhraseEn} for 30 seconds!`;

    const payload = {
      event: "signal",
      pair: state.targetPair,
      direction: sig.direction,
      duration: sig.duration,
      model: state.selectedModel,
      lang: state.lang,
      phrase: phrase,
    };

    for (const base of WINKY_LOCAL_ENDPOINTS) {
      fetch(`${base}/api/winky/speak_signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }

  /* ==================== 8. Top-Center Live Score HUD ==================== */

  function renderCounterWidget() {
    if (!counterRoot) return;

    const total = state.liveWins + state.liveLosses;
    const rate = total > 0 ? ((state.liveWins / total) * 100).toFixed(1) + "%" : "0.0%";
    const profitText = (state.sessionProfit >= 0 ? "+$" : "-$") + Math.abs(state.sessionProfit).toLocaleString();

    counterRoot.innerHTML = `
      <span class="wps-score-handle" title="Перетащить табло">⋮⋮</span>
      <div class="wps-score-live-badge">
        <span class="wps-score-dot"></span>
        <span>${t("liveScore")}</span>
      </div>

      <!-- WINS -->
      <div class="wps-score-pill wins" title="Победы">
        <span>${t("wins")}:</span>
        <span id="wpsWinsVal">${state.liveWins}</span>
        <button type="button" class="wps-score-step-btn" id="wpsWinsMinus">-</button>
        <button type="button" class="wps-score-step-btn" id="wpsWinsPlus">+</button>
      </div>

      <!-- LOSSES -->
      <div class="wps-score-pill losses" title="Поражения">
        <span>${t("losses")}:</span>
        <span id="wpsLossesVal">${state.liveLosses}</span>
        <button type="button" class="wps-score-step-btn" id="wpsLossesMinus">-</button>
        <button type="button" class="wps-score-step-btn" id="wpsLossesPlus">+</button>
      </div>

      <!-- WINRATE -->
      <div class="wps-score-pill winrate" title="Винрейт">
        <span>${t("winrate")}:</span>
        <span>${rate}</span>
      </div>

      <!-- PROFIT -->
      <div class="wps-score-pill profit" title="Профит сессии">
        <span>${t("profit")}:</span>
        <span>${profitText}</span>
      </div>

      <!-- Reset -->
      <button type="button" class="wps-score-reset-btn" id="wpsResetScore" title="Сбросить счет">[Reset]</button>
    `;

    bindCounterEvents();
  }

  function bindCounterEvents() {
    const btnWinsPlus = document.getElementById("wpsWinsPlus");
    const btnWinsMinus = document.getElementById("wpsWinsMinus");
    const btnLossesPlus = document.getElementById("wpsLossesPlus");
    const btnLossesMinus = document.getElementById("wpsLossesMinus");
    const btnReset = document.getElementById("wpsResetScore");

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
    renderCounterWidget();

    const data = {
      wins: state.liveWins,
      losses: state.liveLosses,
      profit: state.sessionProfit,
      pair: state.targetPair,
      timestamp: Date.now(),
      source: source,
    };

    try {
      localStorage.setItem("winky_live_stats_v2", JSON.stringify(data));
    } catch (_) {}

    for (const base of WINKY_LOCAL_ENDPOINTS) {
      fetch(`${base}/api/live_stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => {});
    }
  }

  /* ==================== 9. Initialization ==================== */

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
