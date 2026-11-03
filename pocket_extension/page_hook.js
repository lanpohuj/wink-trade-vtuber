/**
 * Winky AI — Page Context Hook (po.financial)
 * Intercepts live WebSocket ticks and Chart Canvas text renders directly in the main page world.
 * Executes pair switching and expiration synchronization with full Main World permissions.
 */
(function () {
  "use strict";

  // Prevent double injection
  if (window.__WINKY_PAGE_HOOK_LOADED__) return;
  window.__WINKY_PAGE_HOOK_LOADED__ = true;

  console.log("[WinkyHook] Инжектирован в контекст страницы po.financial");

  // 1. Hook WebSocket traffic for real ticks
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);

    const handleMessage = (data) => {
      try {
        if (typeof data === "string") {
          // Check for quote array format e.g. [["EURUSD_otc", 1730516172, 1.08542]] or JSON with price
          if (data.includes("_otc") || data.includes("updateStream") || (data.includes("[") && data.includes("]"))) {
            // Regex to find symbol and numeric price e.g. ["AEDCNY_otc", 1730516172, 1.88610]
            const match = data.match(/\[\s*"([A-Za-z0-9_]+)"\s*,\s*\d+\s*,\s*([0-9.]+)\s*\]/);
            if (match) {
              const rawSymbol = match[1];
              const price = parseFloat(match[2]);
              if (!isNaN(price) && price > 0) {
                window.postMessage(
                  {
                    source: "WINKY_HOOK",
                    type: "TICK",
                    price: price,
                    rawSymbol: rawSymbol,
                    source_type: "ws",
                    timestamp: Date.now(),
                  },
                  "*"
                );
              }
            }
          }
        }
      } catch (_) {}
    };

    ws.addEventListener("message", (event) => {
      handleMessage(event.data);
    });

    // Also wrap onmessage property setter
    let userHandler = null;
    Object.defineProperty(ws, "onmessage", {
      get() {
        return userHandler;
      },
      set(fn) {
        userHandler = fn;
        this.addEventListener("message", (e) => {
          if (typeof userHandler === "function") {
            try {
              userHandler.call(this, e);
            } catch (_) {}
          }
        });
      },
      configurable: true,
    });

    return ws;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  // 2. Hook Canvas 2D fillText for active quote label, open deal timer, and closing time on chart canvas
  const origFillText = CanvasRenderingContext2D.prototype.fillText;
  let lastCanvasPrice = 0;
  let lastCanvasTime = 0;
  let lastPriceY = null;
  let lastDealTimerSec = null;
  let lastDealTimerTs = 0;
  let lastClosingNoticeTs = 0;

  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    try {
      if (typeof text === "string" || typeof text === "number") {
        const str = String(text).trim();
        const width = this.canvas ? this.canvas.width : 0;
        const height = this.canvas ? this.canvas.height : 0;

        // A. Open Trade Countdown Timer on Chart Badge (e.g. "00:52", "00:44", "01:00")
        const timerMatch = str.match(/^([0-5]?\d):([0-5]\d)$/);
        if (timerMatch) {
          const mm = parseInt(timerMatch[1], 10);
          const ss = parseInt(timerMatch[2], 10);
          const totalSec = mm * 60 + ss;
          if (totalSec >= 1 && totalSec <= 300) {
            const now = performance.now();
            if (totalSec !== lastDealTimerSec || now - lastDealTimerTs > 350) {
              lastDealTimerSec = totalSec;
              lastDealTimerTs = now;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "OPEN_TRADE_TIMER",
                  remainingSec: totalSec,
                  formatted: str,
                  x: x,
                  y: y,
                  timestamp: Date.now(),
                },
                "*"
              );
            }
          }
        }

        // B. Closing Time of Chart (e.g. "16:22:48" or next to "Время закрытия")
        const closingTimeMatch = str.match(/^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
        if (closingTimeMatch) {
          const now = new Date();
          const ch = parseInt(closingTimeMatch[1], 10);
          const cm = parseInt(closingTimeMatch[2], 10);
          const cs = parseInt(closingTimeMatch[3], 10);
          const closeDate = new Date(now);
          closeDate.setHours(ch, cm, cs, 0);
          let deltaSec = Math.round((closeDate.getTime() - now.getTime()) / 1000);
          if (deltaSec < -43200) deltaSec += 86400; // handle midnight rollover
          if (deltaSec > 0 && deltaSec <= 1800) {
            const nowPerf = performance.now();
            if (nowPerf - lastClosingNoticeTs > 1000) {
              lastClosingNoticeTs = nowPerf;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "CHART_CLOSING_TIME",
                  closingSec: deltaSec,
                  closingStr: str,
                  timestamp: Date.now(),
                },
                "*"
              );
            }
          }
        }

        // C. Active Quote Label on Right Axis (e.g. 1.88610, 0.13412, 0.068200)
        if (/^\d{1,6}\.\d{2,6}$/.test(str)) {
          if (x > width * 0.65) {
            const num = parseFloat(str);
            const now = performance.now();
            const yRatio = height > 0 ? y / height : 0.5;
            if (
              num > 0 &&
              isFinite(num) &&
              (num !== lastCanvasPrice || Math.abs(y - (lastPriceY || 0)) > 2 || now - lastCanvasTime > 120)
            ) {
              lastCanvasPrice = num;
              lastPriceY = y;
              lastCanvasTime = now;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "TICK",
                  price: num,
                  y: y,
                  yRatio: yRatio,
                  source_type: "canvas",
                  timestamp: Date.now(),
                },
                "*"
              );
            }
          }
        }
      }
    } catch (_) {}

    return origFillText.apply(this, arguments);
  };

  // 3. Message Listener for commands from content.js (Main World execution)
  window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data || event.data.source !== "WINKY_CONTENT") return;
    const data = event.data;
    if (data.type === "WINKY_CMD_SWITCH_PAIR") {
      await handleMainWorldSwitchPair(data);
    } else if (data.type === "WINKY_CMD_SET_EXPIRY") {
      handleMainWorldSetExpiry(data);
    }
  });

  async function handleMainWorldSwitchPair(cmd) {
    const { targetPair, currentPair, recentPairs = [], minPayout = 80 } = cmd;
    console.log("[WinkyHook] 🔀 WINKY_CMD_SWITCH_PAIR in MAIN World:", { targetPair, currentPair, minPayout });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
      return (
        modal &&
        (modal.offsetParent !== null ||
          (window.getComputedStyle(modal).display !== "none" && window.getComputedStyle(modal).visibility !== "hidden"))
      );
    };

    const pairBtn = findPairBtn();
    if (!pairBtn) {
      window.postMessage(
        { source: "WINKY_HOOK", type: "WINKY_RESP_SWITCH_PAIR", ok: false, error: "Pair button not found" },
        "*"
      );
      return;
    }

    // 1. Open popup if not open
    if (!isPopupOpen()) {
      pairBtn.click();
      await sleep(250);
    }

    // 2. Click Currencies tab ($ Валюты) if present
    const tabs = document.querySelectorAll(".assets-block__nav-item, .alist__tab, .tabs__item, .assets-nav a");
    for (const tab of tabs) {
      const txt = (tab.textContent || "").toLowerCase();
      if ((txt.includes("валют") || txt.includes("currenc")) && !tab.classList.contains("active")) {
        tab.click();
        await sleep(150);
        break;
      }
    }

    // 3. Scroll to top to see high-paying OTC pairs (92%)
    const scrollContainers = document.querySelectorAll(
      ".alist__list, .assets-block__alist, .alist, .ps, ul.alist__list, .scrollbar-container"
    );
    for (const sc of scrollContainers) {
      try {
        sc.scrollTop = 0;
      } catch (_) {}
    }
    await sleep(220);

    // 4. Collect candidate rows
    const rows = document.querySelectorAll("a.alist__link, li.alist__item, .alist__item, .assets-block__item");
    const candidates = [];
    const normCur = (currentPair || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const row of rows) {
      if (!row || row.offsetParent === null) continue;
      const text = row.textContent || "";
      // Extract payout e.g. "+92%", "92%", "89%"
      const pMatch = text.match(/(\d{2})%/);
      const payout = pMatch ? parseInt(pMatch[1], 10) : 0;
      if (payout < minPayout) continue;

      // Extract pair name e.g. "EUR/USD OTC" or "ZAR/USD OTC"
      const nameMatch = text.match(/([A-Z]{3}\s*\/\s*[A-Z]{3}(\s*OTC)?)/i);
      const pairName = nameMatch ? nameMatch[0].trim().toUpperCase() : text.split("\n")[0].trim();
      const normName = pairName.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (!pairName || normName === normCur) continue;
      if (recentPairs.some((rp) => rp.toLowerCase().replace(/[^a-z0-9]/g, "") === normName)) continue;

      const clickable = row.tagName.toLowerCase() === "a" ? row : row.querySelector("a") || row;
      candidates.push({ name: pairName, payout, element: clickable });
    }

    console.log(`[WinkyHook] Найдено кандидатов для смены: ${candidates.length}`);

    let chosen = null;
    if (targetPair) {
      const normTarget = targetPair.toLowerCase().replace(/[^a-z0-9]/g, "");
      chosen = candidates.find((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(normTarget));
    }
    if (!chosen && candidates.length > 0) {
      candidates.sort((a, b) => b.payout - a.payout);
      const topPayout = candidates[0].payout;
      const topTier = candidates.filter((c) => c.payout === topPayout);
      chosen = topTier[Math.floor(Math.random() * topTier.length)];
    }

    if (chosen && chosen.element) {
      console.log(`[WinkyHook] 🎯 Кликаем по новой паре: ${chosen.name} (+${chosen.payout}%)`);
      chosen.element.click();
      await sleep(180);

      // Close popup if still open
      if (isPopupOpen()) {
        pairBtn.click();
      }

      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SWITCH_PAIR",
          ok: true,
          newPair: chosen.name,
          payout: chosen.payout,
        },
        "*"
      );
    } else {
      // Close popup anyway
      if (isPopupOpen()) {
        pairBtn.click();
      }
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SWITCH_PAIR",
          ok: false,
          error: "No matching pair found",
        },
        "*"
      );
    }
  }

  function handleMainWorldSetExpiry(cmd) {
    const { targetDurationStr } = cmd;
    console.log("[WinkyHook] ⏱️ WINKY_CMD_SET_EXPIRY in MAIN World:", targetDurationStr);
    try {
      const timeInputs = document.querySelectorAll(
        ".time-input, input[name='time'], .trading-panel input[type='text'], .time-select input"
      );
      let currentVal = "";
      for (const inp of timeInputs) {
        if (inp && inp.offsetParent !== null && (inp.value.includes(":") || /^\d+$/.test(inp.value))) {
          currentVal = inp.value;
          break;
        }
      }
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SET_EXPIRY",
          ok: true,
          currentVal: currentVal,
        },
        "*"
      );
    } catch (e) {
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SET_EXPIRY",
          ok: false,
          error: String(e),
        },
        "*"
      );
    }
  }
})();
