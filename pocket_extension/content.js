/* ============================================================
   WINKY AI — Pocket Option Content Script
   DOM Asset Sync, Draggable HUDs, & Outcome Detector
   ============================================================ */

(function () {
  "use strict";

  // Base domain for WebApp terminal and counter (supports local testing or prod)
  const TERMINAL_ORIGIN =
    window.location.origin.includes("127.0.0.1") || window.location.origin.includes("localhost")
      ? window.location.origin
      : "https://winktrade-app.online";

  let lastDetectedPair = "";
  let terminalPanel = null;
  let counterPanel = null;

  /* ==================== 1. DOM Asset & Timeframe Detector ==================== */

  function detectPocketOptionAsset() {
    // Pocket Option asset selectors across various versions
    const selectors = [
      ".current-symbol",
      ".asset-name",
      ".symbol-name",
      ".pair-title",
      "[data-test='current-asset']",
      ".item__name",
      ".active-asset",
    ];

    let foundPair = "";
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        foundPair = el.textContent.trim();
        break;
      }
    }

    if (!foundPair) {
      // Check page title as fallback
      const title = document.title;
      const match = title.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?)/);
      if (match) foundPair = match[1];
    }

    if (foundPair && foundPair !== lastDetectedPair) {
      lastDetectedPair = foundPair;
      // Normalize pair name (e.g. EUR/USD OTC)
      if (!foundPair.includes("/") && foundPair.length >= 6) {
        foundPair = foundPair.slice(0, 3) + "/" + foundPair.slice(3);
      }

      // Sync via BroadcastChannel
      if (window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("winky_live_stats");
          bc.postMessage({
            type: "PAIR_SYNC",
            pair: foundPair,
            source: "pocket_option",
          });
          bc.close();
        } catch (_) {}
      }

      // Update localStorage
      try {
        const raw = localStorage.getItem("winky_live_stats");
        const data = raw ? JSON.parse(raw) : {};
        data.pair = foundPair;
        data.timestamp = Date.now();
        localStorage.setItem("winky_live_stats", JSON.stringify(data));
      } catch (_) {}
    }
  }

  setInterval(detectPocketOptionAsset, 500);

  /* ==================== 2. Draggable Floating HUDs ==================== */

  function makeDraggable(panel, handle) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    handle.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${Math.max(10, initialX + dx)}px`;
      panel.style.top = `${Math.max(10, initialY + dy)}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  function createFloatingTerminal() {
    if (terminalPanel) {
      terminalPanel.style.display = terminalPanel.style.display === "none" ? "flex" : "none";
      return;
    }

    const panel = document.createElement("div");
    panel.className = "winky-hud-panel";
    panel.style.width = "400px";
    panel.style.height = "640px";
    panel.style.top = "60px";
    panel.style.right = "20px";

    panel.innerHTML = `
      <div class="winky-hud-header" id="winkyTerminalHeader">
        <div class="winky-hud-title">
          <span class="winky-hud-dot"></span>
          WINKY AI — TERMINAL
        </div>
        <button type="button" class="winky-hud-btn-close" id="btnCloseWinkyTerminal">✕</button>
      </div>
      <iframe class="winky-hud-iframe" src="${TERMINAL_ORIGIN}/webapp/?streamer=1"></iframe>
    `;

    document.body.appendChild(panel);
    terminalPanel = panel;

    const header = panel.querySelector("#winkyTerminalHeader");
    makeDraggable(panel, header);

    panel.querySelector("#btnCloseWinkyTerminal").addEventListener("click", () => {
      panel.style.display = "none";
    });
  }

  function createFloatingCounter() {
    if (counterPanel) {
      counterPanel.style.display = counterPanel.style.display === "none" ? "flex" : "none";
      return;
    }

    const panel = document.createElement("div");
    panel.className = "winky-hud-panel";
    panel.style.width = "360px";
    panel.style.height = "210px";
    panel.style.top = "60px";
    panel.style.left = "20px";

    panel.innerHTML = `
      <div class="winky-hud-header" id="winkyCounterHeader">
        <div class="winky-hud-title">
          <span class="winky-hud-dot"></span>
          EDUCATIONAL LIVE — COUNTER
        </div>
        <button type="button" class="winky-hud-btn-close" id="btnCloseWinkyCounter">✕</button>
      </div>
      <iframe class="winky-hud-iframe" src="${TERMINAL_ORIGIN}/webapp/counter.html"></iframe>
    `;

    document.body.appendChild(panel);
    counterPanel = panel;

    const header = panel.querySelector("#winkyCounterHeader");
    makeDraggable(panel, header);

    panel.querySelector("#btnCloseWinkyCounter").addEventListener("click", () => {
      panel.style.display = "none";
    });
  }

  /* ==================== 3. Floating Trigger Button ==================== */

  function injectToggleButton() {
    const btn = document.createElement("button");
    btn.className = "winky-page-toggle-btn";
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      <span>WINKY HUD</span>
    `;

    btn.addEventListener("click", () => {
      createFloatingTerminal();
      createFloatingCounter();
    });

    document.body.appendChild(btn);
  }

  /* ==================== 4. Closed Trade Outcome Detector ==================== */

  let lastKnownClosedDealsCount = 0;

  function monitorClosedDeals() {
    // Look for closed deals items in the Pocket Option trade list
    const deals = document.querySelectorAll(".deals-list__item, .closed-deals-item, .history-item");
    if (!deals || deals.length === 0) return;

    if (lastKnownClosedDealsCount === 0) {
      lastKnownClosedDealsCount = deals.length;
      return;
    }

    if (deals.length > lastKnownClosedDealsCount) {
      // New deal concluded! Inspect newest deal
      const newest = deals[0];
      const text = newest.textContent || "";
      const isWin =
        newest.classList.contains("deal-win") ||
        newest.classList.contains("success") ||
        text.includes("+") ||
        text.includes("Win");

      if (window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("winky_live_stats");
          bc.postMessage({
            type: "DEAL_RESULT",
            outcome: isWin ? "WIN" : "LOSS",
            source: "pocket_option_detector",
          });
          bc.close();
        } catch (_) {}
      }

      lastKnownClosedDealsCount = deals.length;
    }
  }

  setInterval(monitorClosedDeals, 1000);

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectToggleButton);
  } else {
    injectToggleButton();
  }
})();
