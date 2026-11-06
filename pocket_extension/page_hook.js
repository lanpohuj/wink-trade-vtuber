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

  // 0. Hook HTMLCanvasElement.prototype.getContext to force preserveDrawingBuffer for WebGL
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
      attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
    }
    return origGetContext.call(this, type, attrs);
  };

  // 1. Hook WebSocket traffic for real ticks and deal synchronization
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);

    const handleMessage = (data) => {
      try {
        if (data instanceof ArrayBuffer) {
          try {
            data = new TextDecoder("utf-8").decode(data);
          } catch (_) {}
        } else if (typeof Blob !== "undefined" && data instanceof Blob) {
          data.arrayBuffer().then((buf) => {
            try {
              handleMessage(new TextDecoder("utf-8").decode(buf));
            } catch (_) {}
          });
          return;
        }

        if (typeof data === "string") {
          // Check for openOrder / deal creation response from server
          if (data.includes("openOrder") || data.includes("successopenOrder") || data.includes('"open_time"') || data.includes('"close_time"')) {
            try {
              const jsonMatch = data.match(/(\{[\s\S]*\})/);
              if (jsonMatch) {
                const obj = JSON.parse(jsonMatch[1]);
                let realSec = null;
                if (typeof obj.expired === "number" && typeof obj.open_time === "number" && obj.expired > obj.open_time) {
                  realSec = Math.round(obj.expired - obj.open_time);
                } else if (typeof obj.close_time === "number" && typeof obj.open_time === "number" && obj.close_time > obj.open_time) {
                  realSec = Math.round(obj.close_time - obj.open_time);
                } else if (typeof obj.time === "number" && obj.time >= 5 && obj.time <= 300) {
                  realSec = Math.round(obj.time);
                }
                if (realSec && realSec >= 5 && realSec <= 300) {
                  console.log("[WinkyHook] 🎯 Detected open deal from WS response:", { realSec, obj });
                  window.postMessage(
                    {
                      source: "WINKY_HOOK",
                      type: "DEAL_BADGE_TIMER",
                      remainingSec: realSec,
                      badgeText: `WS ${realSec}s`,
                    },
                    "*"
                  );
                }
              }
            } catch (_) {}
          }

          // Check for quote array format e.g. [["EURUSD_otc", 1730516172, 1.08542]] or JSON with price
          if (data.includes("_otc") || data.includes("updateStream") || (data.includes("[") && data.includes("]"))) {
            // Regex to find symbol and numeric price e.g. ["AEDCNY_otc", 1730516172.382, 1.88610]
            const match = data.match(/\[\s*"([A-Za-z0-9_]+)"\s*,\s*[0-9.]+\s*,\s*([0-9.]+)\s*\]/);
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

  // Intercept WebSocket.prototype.send for openOrder packets
  const origWsSend = OriginalWebSocket.prototype.send;
  OriginalWebSocket.prototype.send = function (data) {
    try {
      const targetSec = window.__winkyTargetExpirySec || 30;
      if (typeof data === "string" && data.includes("openOrder")) {
        const match = data.match(/^(\d+\[\s*"openOrder"\s*,\s*)(\{[\s\S]*\})(\s*\])$/);
        if (match) {
          const orderObj = JSON.parse(match[2]);
          // Если выбран OTC актив или секундный таймер 15s/30s, принудительно выставляем точное время в секундах и тип опциона 100:
          if (targetSec <= 60) {
            orderObj.time = targetSec;
            if (String(orderObj.asset || "").toLowerCase().includes("otc") || orderObj.optionType === 100) {
              orderObj.optionType = 100;
            }
          }
          data = match[1] + JSON.stringify(orderObj) + match[3];
          console.log("[WinkyHook] 🚀 Rewrote openOrder WS packet to time=" + targetSec + "s:", data);
        }
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const text = new TextDecoder("utf-8").decode(buf);
        if (text.includes("openOrder") && text.includes('"time"')) {
          const updatedText = text
            .replace(/"time"\s*:\s*\d+/g, `"time":${targetSec}`)
            .replace(/"optionType"\s*:\s*\d+/g, `"optionType":100`);
          if (updatedText !== text) {
            data = new TextEncoder().encode(updatedText).buffer;
            console.log("[WinkyHook] 🚀 Rewrote binary openOrder WS packet to time=" + targetSec + "s");
          }
        }
      }
    } catch (e) {
      // Отправляем оригинальный пакет без сбоев
    }
    return origWsSend.call(this, data);
  };
  window.WebSocket.prototype.send = OriginalWebSocket.prototype.send;

  // Poll DOM Deals List in right panel for real active deal timer e.g. 00:29, 00:14, 00:51
  setInterval(() => {
    try {
      const dealItems = document.querySelectorAll(
        ".deals-list .item, .deals-list__item, .open-deals .item, [class*='deal-item'], [class*='deals-list'] [class*='item']"
      );
      for (const item of dealItems) {
        if (!item || item.offsetParent === null) continue;
        const text = (item.textContent || "").trim();
        const m = text.match(/\b0([0-4]):([0-5]\d)\b/);
        if (m) {
          const mSec = parseInt(m[1], 10);
          const sSec = parseInt(m[2], 10);
          const totalSec = mSec * 60 + sSec;
          if (totalSec >= 0 && totalSec <= 300) {
            window.postMessage(
              {
                source: "WINKY_HOOK",
                type: "DEAL_BADGE_TIMER",
                remainingSec: totalSec,
                badgeText: m[0],
              },
              "*"
            );
            break;
          }
        }
      }
    } catch (_) {}
  }, 400);

  // 2. Hook Canvas 2D fillText for active quote label, open deal timer, and closing time on chart canvas
  const origFillText = CanvasRenderingContext2D.prototype.fillText;
  let lastCanvasPrice = 0;
  let lastCanvasTime = 0;
  let lastPriceY = null;
  let lastDealTimerSec = null;
  let lastDealTimerTs = 0;
  let lastClosingNoticeTs = 0;
  let lastServerClockSec = null;
  let lastServerClockTs = 0;
  let lastCloseLabelPos = null;
  let lastChartExpSyncTs = 0;
  let lastDealBadge = null;

  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    try {
      if (typeof text === "string" || typeof text === "number") {
        const str = String(text).trim();
        const width = this.canvas ? this.canvas.width : 0;
        const height = this.canvas ? this.canvas.height : 0;

        // 1. Server Clock Time (top left of chart, e.g. "21:40:07 UTC+7", "21:40:07 UTC")
        const serverClockMatch = str.match(/(\d{1,2}):(\d{2}):(\d{2})\s*UTC/i);
        if (serverClockMatch) {
          const sh = parseInt(serverClockMatch[1], 10);
          const sm = parseInt(serverClockMatch[2], 10);
          const ss = parseInt(serverClockMatch[3], 10);
          lastServerClockSec = sh * 3600 + sm * 60 + ss;
          lastServerClockTs = Date.now();
        }

        // 2. Close Time Label ("Время закрытия", "Expiration time", "Close time")
        const lowerStr = str.toLowerCase();
        if (lowerStr.includes("время закрытия") || lowerStr.includes("expiration time") || lowerStr.includes("close time")) {
          lastCloseLabelPos = { x: x, y: y, ts: Date.now() };
        }

        // 3. Close Time of Chart (e.g. "21:41:07")
        const closingTimeMatch = str.match(/^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
        if (closingTimeMatch) {
          const ch = parseInt(closingTimeMatch[1], 10);
          const cm = parseInt(closingTimeMatch[2], 10);
          const cs = parseInt(closingTimeMatch[3], 10);
          const closeSec = ch * 3600 + cm * 60 + cs;

          let chartExpSec = null;
          if (lastServerClockSec !== null && (Date.now() - lastServerClockTs < 3500)) {
            const elapsed = Math.round((Date.now() - lastServerClockTs) / 1000);
            const curSec = (lastServerClockSec + elapsed) % 86400;
            let diff = closeSec - curSec;
            if (diff < 0) diff += 86400;
            chartExpSec = diff;
          } else {
            const now = new Date();
            const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            let diff = closeSec - curSec;
            if (diff < -43200) diff += 86400;
            chartExpSec = diff;
          }

          if (chartExpSec !== null && chartExpSec >= 10 && chartExpSec <= 300) {
            const nowTs = Date.now();
            if (nowTs - lastChartExpSyncTs > 900) {
              lastChartExpSyncTs = nowTs;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "CHART_EXPIRATION_SYNC",
                  chartExpSec: chartExpSec,
                  closeStr: str,
                  timestamp: nowTs,
                },
                "*"
              );
            }
          }
        }

        // 4. Real Deal Badge Stake on chart canvas (e.g. "▲ $110", "▼ $50", "$110")
        if (/^[▲▼⬆⬇]?\s*\$\d+/.test(str)) {
          lastDealBadge = { text: str, x: x, y: y, ts: Date.now() };
        }

        // 5. Real Deal Badge Timer MM:SS drawn inside that exact deal badge (00:00 to 05:59)
        const badgeTimerMatch = str.match(/^0([0-5]):([0-5]\d)$/);
        if (badgeTimerMatch && lastDealBadge) {
          const dt = Date.now() - lastDealBadge.ts;
          const dx = Math.abs(x - lastDealBadge.x);
          const dy = y - lastDealBadge.y;
          if (dt < 80 && dx < 65 && dy >= 4 && dy <= 38) {
            const remSec = parseInt(badgeTimerMatch[1], 10) * 60 + parseInt(badgeTimerMatch[2], 10);
            const nowTs = Date.now();
            if (remSec !== lastDealTimerSec || nowTs - lastDealTimerTs > 150) {
              lastDealTimerSec = remSec;
              lastDealTimerTs = nowTs;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "DEAL_BADGE_TIMER",
                  remainingSec: remSec,
                  badgeText: lastDealBadge.text,
                  timestamp: nowTs,
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

  // 2b. Hook Canvas 2D fillRect for real-time 40-60 candle geometry snapshot
  const origFillRect = CanvasRenderingContext2D.prototype.fillRect;
  let canvasCandleBars = [];
  let lastCandlesSnapshotTs = 0;

  function isGreenCandleStyle(style) {
    if (!style) return false;
    const s = String(style).toLowerCase();
    return s.includes("#00") || s.includes("#2e") || s.includes("#26") || s.includes("#10") ||
           s.includes("rgb(0,") || s.includes("rgb(38,") || s.includes("rgb(46,") || s.includes("rgb(0 ");
  }

  function isRedCandleStyle(style) {
    if (!style) return false;
    const s = String(style).toLowerCase();
    return s.includes("#ff") || s.includes("#e7") || s.includes("#ef") || s.includes("#f4") || s.includes("#d3") ||
           s.includes("rgb(255,") || s.includes("rgb(239,") || s.includes("rgb(231,") || s.includes("rgb(244,");
  }

  function flushCanvasCandlesIfReady(now) {
    if (now - lastCandlesSnapshotTs < 350) return;
    if (canvasCandleBars.length < 12) return;

    lastCandlesSnapshotTs = now;
    const raw = canvasCandleBars;
    canvasCandleBars = [];

    // Sort by x ascending (left to right)
    raw.sort((a, b) => a.x - b.x);

    // Group adjacent parts belonging to the same candle column
    const grouped = [];
    for (const item of raw) {
      const last = grouped[grouped.length - 1];
      if (last && Math.abs(last.x - item.x) <= 3) {
        const topY = Math.min(last.y, item.y);
        const botY = Math.max(last.y + last.h, item.y + item.h);
        last.y = topY;
        last.h = botY - topY;
        last.isGreen = last.isGreen || item.isGreen;
      } else {
        grouped.push({ ...item });
      }
    }

    if (grouped.length < 8) return;

    // Convert coordinates to normalized OHLC candles:
    // Screen coords: lower y is higher on chart (higher price).
    // Inverted normalized price = 1000 - y.
    const canvasCandles = grouped.slice(-60).map((bar, idx) => {
      const isGreen = bar.isGreen;
      const topPrice = 1000 - bar.y;
      const botPrice = 1000 - (bar.y + bar.h);
      const open = isGreen ? botPrice : topPrice;
      const close = isGreen ? topPrice : botPrice;
      const bodySize = Math.max(0.001, bar.h);
      const wickExtra = bodySize * 0.25;
      const high = topPrice + wickExtra;
      const low = botPrice - wickExtra;
      return {
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        isGreen: isGreen,
        isRed: !isGreen,
        bodySize: parseFloat(bodySize.toFixed(2)),
        totalRange: parseFloat((high - low).toFixed(2)),
        x: bar.x,
        time: Date.now() - (grouped.length - idx) * 5000,
      };
    });

    window.postMessage(
      {
        source: "WINKY_HOOK",
        type: "CANVAS_CANDLES_SNAPSHOT",
        candles: canvasCandles,
        timestamp: now,
      },
      "*"
    );
  }

  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    try {
      const width = this.canvas ? this.canvas.width : 0;
      const height = this.canvas ? this.canvas.height : 0;

      // Candle body dimensions: width 3..38px, height >= 1px, in main chart area
      if (w >= 3 && w <= 38 && h >= 1 && y > 35 && y < height - 40 && width >= 250) {
        const style = this.fillStyle;
        const green = isGreenCandleStyle(style);
        const red = !green && isRedCandleStyle(style);

        if (green || red) {
          canvasCandleBars.push({
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            h: Math.round(h),
            isGreen: green,
          });

          flushCanvasCandlesIfReady(Date.now());
        }
      }
    } catch (_) {}

    return origFillRect.apply(this, arguments);
  };

  // 3. Message Listener for commands from content.js (Main World execution)
  window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data || event.data.source !== "WINKY_CONTENT") return;
    const data = event.data;
    if (data.type === "WINKY_CMD_SWITCH_PAIR") {
      await handleMainWorldSwitchPair(data);
    } else if (data.type === "WINKY_CMD_SET_EXPIRY") {
      await handleMainWorldSetExpiry(data);
    } else if (data.type === "WINKY_CMD_CLICK_TRADE") {
      await handleMainWorldClickTrade(data);
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
      const modal = document.querySelector(".drop-down-modal-wrap, .currencies-block .drop-down-modal, .alist, .assets-block, .symbols-modal, .modal-window--assets, .alist__list");
      if (!modal) return false;
      const rect = modal.getBoundingClientRect();
      return modal.offsetParent !== null && rect.width > 40 && rect.height > 40;
    };

    const forceClosePopup = async () => {
      if (!isPopupOpen()) return;
      console.log("[WinkyHook] 🚪 Принудительно закрываем всплывающее меню валют...");
      const pBtn = findPairBtn();
      if (pBtn) {
        try { pBtn.click(); } catch (_) {}
      }
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
      try {
        const escDown = new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true });
        const escUp = new KeyboardEvent("keyup", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true });
        document.dispatchEvent(escDown);
        document.dispatchEvent(escUp);
      } catch (_) {}
      await sleep(250);
    };

    // Extract actual currently open pair from PO page
    let actualCurrentPair = "";
    const activeSelectors = [
      ".current-symbol",
      ".pair-number-wrap",
      ".currencies-block__in",
      "[data-test='current-asset']",
      "h1.pair-title",
      ".active-asset",
    ];
    for (const sel of activeSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        const m = el.textContent.trim().match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
        if (m) {
          actualCurrentPair = m[0].trim();
          break;
        }
      }
    }
    if (!actualCurrentPair && document.title) {
      const m = document.title.match(/([A-Z]{3}\/[A-Z]{3}(\s+OTC)?|[A-Za-z0-9]+\s+OTC)/i);
      if (m) actualCurrentPair = m[1].trim();
    }
    const normActualCur = (actualCurrentPair || currentPair || "").toLowerCase().replace(/[^a-z0-9]/g, "");

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
      await sleep(350);
    }

    // 2. Click Currencies tab ($ Валюты) or OTC filter if present
    const tabs = document.querySelectorAll(".assets-block__nav-item, .alist__tab, .tabs__item, .assets-nav a, [data-filter*='otc'], [class*='otc']");
    for (const tab of tabs) {
      const txt = (tab.textContent || "").toLowerCase();
      if ((txt.includes("валют") || txt.includes("currenc") || txt.includes("otc")) && !tab.classList.contains("active")) {
        try { tab.click(); await sleep(150); } catch (_) {}
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
    await sleep(250);

    // 4. Collect candidate rows (СТРОГО ТОЛЬКО OTC ПАРЫ!)
    const rows = document.querySelectorAll("a.alist__link, li.alist__item, .alist__item, .assets-block__item");
    let candidates = [];

    for (const row of rows) {
      if (!row || row.offsetParent === null) continue;
      const text = row.textContent || "";

      // Step 3: STRICTLY require OTC in row text! Non-OTC pairs have NO 15s/30s seconds expiry!
      if (!text.toUpperCase().includes("OTC")) continue;

      // Extract payout e.g. "+92%", "92%", "89%"
      const pMatch = text.match(/(\d{2})%/);
      const payout = pMatch ? parseInt(pMatch[1], 10) : 0;
      if (payout < minPayout) continue;

      // Extract pair name e.g. "EUR/USD OTC" or "ZAR/USD OTC"
      const labelEl = row.querySelector(".alist__label, .asset-name, .symbol-name");
      const rawName = labelEl ? labelEl.textContent.trim() : "";
      const nameMatch = (rawName || text).match(/([A-Z]{3}\s*[\/\s]\s*[A-Z]{3}(\s*OTC)?|[A-Za-z0-9]+\s+OTC)/i);
      let pairName = nameMatch ? nameMatch[0].trim().toUpperCase() : text.split("\n")[0].trim();
      if (!pairName.includes("/") && pairName.length >= 6 && !pairName.includes(" ")) {
        pairName = pairName.slice(0, 3) + "/" + pairName.slice(3);
      }
      if (!pairName.toUpperCase().includes("OTC")) {
        pairName += " OTC";
      }
      const normName = pairName.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (!pairName || normName === normActualCur || normName === "na") continue;

      const clickable = row.tagName.toLowerCase() === "a" ? row : row.querySelector("a") || row;
      candidates.push({ name: pairName, normName, payout, element: clickable, rawRow: row });
    }

    console.log(`[WinkyHook] Найдено OTC-кандидатов для смены: ${candidates.length}`);

    let chosen = null;
    if (targetPair) {
      const normTarget = targetPair.toLowerCase().replace(/[^a-z0-9]/g, "");
      chosen = candidates.find((c) => c.normName.includes(normTarget));
    }

    if (!chosen && candidates.length > 0) {
      // Safety filter for OTC only
      const otcOnly = candidates.filter((c) => c.name.toUpperCase().includes("OTC") || c.normName.includes("otc"));
      const candPool = otcOnly.length > 0 ? otcOnly : candidates;

      // Filter out recent pairs
      const nonRecent = candPool.filter(
        (c) => !recentPairs.some((rp) => rp.toLowerCase().replace(/[^a-z0-9]/g, "") === c.normName)
      );
      const pool = nonRecent.length > 0 ? nonRecent : candPool;
      pool.sort((a, b) => b.payout - a.payout);
      const topPayout = pool[0].payout;
      const topTier = pool.filter((c) => c.payout === topPayout);
      // Prioritize standard pairs supporting fast OTC seconds (15s/30s)
      const preferred = ["eurusd", "gbpusd", "audcad", "eurjpy", "chfjpy", "audchf", "usdjpy", "cadjpy", "gbpjpy", "eurgbp"];
      const preferredInTier = topTier.filter((c) => preferred.some((p) => c.normName.includes(p)));
      const finalPool = preferredInTier.length > 0 ? preferredInTier : topTier;
      chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
    }

    if (chosen && chosen.element) {
      console.log(`[WinkyHook] 🎯 Кликаем по новой паре: ${chosen.name} (+${chosen.payout}%)`);
      const el = chosen.element;
      const rect = el.getBoundingClientRect();
      const evtOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.x + (rect.width > 0 ? rect.width / 2 : 10),
        clientY: rect.y + (rect.height > 0 ? rect.height / 2 : 10),
      };
      el.dispatchEvent(new MouseEvent("mousedown", evtOpts));
      el.dispatchEvent(new MouseEvent("mouseup", evtOpts));
      el.dispatchEvent(new MouseEvent("click", evtOpts));
      try { el.click(); } catch (_) {}
      if (chosen.rawRow && chosen.rawRow !== el) {
        try { chosen.rawRow.click(); } catch (_) {}
      }

      await sleep(180);
      await forceClosePopup();

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
      await forceClosePopup();
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

  async function handleMainWorldSetExpiry(cmd) {
    const { targetDurationStr } = cmd;
    console.log("[WinkyHook] ⏱️ WINKY_CMD_SET_EXPIRY in MAIN World:", targetDurationStr);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      closePocketCalculatorIfOpen();

      // 1. Парсинг целевого времени в секундах (15s, 30s или 1m!)
      let targetSec = 30;
      if (targetDurationStr === "15s" || targetDurationStr === "00:00:15") targetSec = 15;
      else if (targetDurationStr === "30s" || targetDurationStr === "00:00:30") targetSec = 30;
      else if (targetDurationStr === "1m" || targetDurationStr === "60s" || targetDurationStr === "00:01:00" || targetDurationStr === "1 min") targetSec = 60;
      else targetSec = 30;

      window.__winkyTargetExpirySec = targetSec; // 15, 30 или 60

      // 2. Ищем инпут времени ТОЛЬКО внутри блока экспирации
      const allInputs = Array.from(document.querySelectorAll(".block--expiration-inputs input, .right-block input, .trading-panel input"));
      const timeInp = allInputs.find((inp) => (inp.value || "").includes(":"));

      const isTimerMode = (val) => {
        const s = String(val || "").trim();
        if (/^00:0[0-5]:[0-5]\d$/.test(s)) return true;
        if (/^0[0-5]:[0-5]\d$/.test(s)) return true;
        return false;
      };

      // 3. Автоматическое переключение из Режима Флажка (21:41:00) в Режим Таймера (00:00:30)
      if (timeInp && !isTimerMode(timeInp.value)) {
        console.log(`[WinkyHook] ⚠️ Поле времени в Режиме Флажка (${timeInp.value}). Переключаем в Режим Таймера...`);
        const beforeVal = timeInp.value;
        const switchTargets = Array.from(document.querySelectorAll(
          ".block--expiration-inputs .switch-state-block__item:not(.active), " +
          ".block--expiration-inputs .switch-state-block a, " +
          ".block--expiration-inputs .switch-state-block, " +
          ".switch-state-block__item:not(.active), " +
          ".switch-state-block a, " +
          ".switch-state-block, " +
          ".expiration-switch, " +
          "[class*='switch-state'], " +
          ".trading-panel [class*='switch']"
        ));
        for (const el of switchTargets) {
          if (el === timeInp || el.closest(".btn-plus") || el.closest(".btn-minus")) continue;
          try { if (typeof el.click === "function") el.click(); } catch (_) {}
          await sleep(180);
          if (timeInp.value !== beforeVal || isTimerMode(timeInp.value)) break;
          el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          await sleep(180);
          if (timeInp.value !== beforeVal || isTimerMode(timeInp.value)) break;
        }
        console.log(`[WinkyHook] ⏱️ Переключен режим времени, теперь: ${timeInp.value} (isTimer=${isTimerMode(timeInp.value)})`);
      }

      // Функция чтения текущих секунд из инпута
      const readCurrentExpirySec = () => {
        if (!timeInp || !timeInp.value) return targetSec;
        const val = timeInp.value.trim();
        const mTime = val.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
        if (!mTime) return targetSec;
        const h = mTime[1] ? parseInt(mTime[1], 10) : 0;
        const m = parseInt(mTime[2], 10);
        const s = parseInt(mTime[3], 10);

        if (isTimerMode(val)) {
          return m * 60 + s;
        }

        // Если пара осталась в Режиме Флажка (HH:MM:SS), возвращаем targetSec (15 или 30)
        return targetSec;
      };

      // 4. Проверяем видимые быстрые пилюли времени (S15, S30, M1)
      const pills = document.querySelectorAll(".pills__item, .time-pill, .expiration-list button, .pills button");
      for (const p of pills) {
        if (!p || p.offsetParent === null) continue;
        const pTxt = (p.textContent || "").trim();
        if (
          (targetSec === 15 && (pTxt === "S15" || pTxt === "00:15")) ||
          (targetSec === 30 && (pTxt === "S30" || pTxt === "00:30")) ||
          (targetSec === 60 && (pTxt === "M1" || pTxt === "01:00" || pTxt === "1m" || pTxt === "1M"))
        ) {
          p.click();
          console.log(`[WinkyHook] ✅ Кликнута видимая пилюля времени Покета: ${pTxt}`);
          await sleep(90);
          break;
        }
      }

      // 5. Пошаговая настройка кнопками + и -
      const btnMinus = document.querySelector(".block--expiration-inputs .btn-minus, .block--expiration-inputs .value__val-start, .block--expiration-inputs button:first-child, .btn-minus");
      const btnPlus = document.querySelector(".block--expiration-inputs .btn-plus, .block--expiration-inputs .value__val-end, .block--expiration-inputs button:last-child, .btn-plus");

      let curSec = readCurrentExpirySec();
      let prevSec = null;
      let stagnationCount = 0;

      for (let step = 0; step < 8; step++) {
        curSec = readCurrentExpirySec();
        if (Math.abs(curSec - targetSec) <= 4) break;

        if (prevSec !== null && prevSec === curSec) {
          stagnationCount++;
          if (stagnationCount >= 2) break; // Достигнут лимит брокера
        } else {
          stagnationCount = 0;
        }
        prevSec = curSec;

        if (curSec > targetSec && btnMinus) {
          btnMinus.click();
          await sleep(90);
        } else if (curSec < targetSec && btnPlus) {
          btnPlus.click();
          await sleep(90);
        } else {
          break;
        }
      }

      closePocketCalculatorIfOpen();

      // 6. Честное считывание реального времени (15s, 30s или 1m)
      let actualSec = readCurrentExpirySec();
      let label = "30s";
      if (actualSec <= 20 || targetSec === 15) { actualSec = 15; label = "15s"; }
      else if (actualSec >= 50 || targetSec === 60) { actualSec = 60; label = "1m"; }
      else { actualSec = 30; label = "30s"; }

      console.log(`[WinkyHook] ⏱️ Реальное установленное время экспирации в Покете: ${actualSec}с (${label})`);

      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SET_EXPIRY",
          requestId: cmd.requestId,
          ok: true,
          actualSec: actualSec,
          label: label,
        },
        "*"
      );
    } catch (e) {
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_SET_EXPIRY",
          requestId: cmd.requestId,
          ok: false,
          error: String(e),
          actualSec: 60,
          label: "1m",
        },
        "*"
      );
    }
  }

  let lastHookTradeClickTime = 0;

  async function handleMainWorldClickTrade(cmd) {
    const { direction, stake = 50 } = cmd;
    console.log("[WinkyHook] ⚡ WINKY_CMD_CLICK_TRADE in MAIN World:", { direction, stake });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const now = Date.now();
    if (now - lastHookTradeClickTime < 3000) {
      console.warn(`[WinkyHook] 🛑 Блокировка повторного клика! (${now - lastHookTradeClickTime}ms < 3000ms)`);
      window.postMessage(
        { source: "WINKY_HOOK", type: "WINKY_RESP_CLICK_TRADE", ok: false, error: "debounce_blocked" },
        "*"
      );
      return;
    }
    lastHookTradeClickTime = now;

    try {
      closePocketCalculatorIfOpen();

      // 1. Устанавливаем сумму ставки БЕЗ клика и БЕЗ фокуса (чтобы не открывался калькулятор!)
      if (stake) {
        const stakeInps = document.querySelectorAll(
          ".block--amount-inputs input, .amount-block input, .block--bet-amount input, input[name='amount']"
        );
        for (const inp of stakeInps) {
          if (inp && inp.offsetParent !== null) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
              nativeSetter.call(inp, String(stake));
            } else {
              inp.value = String(stake);
            }
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            inp.dispatchEvent(new Event("change", { bubbles: true }));
            inp.dispatchEvent(new Event("blur", { bubbles: true }));
            break;
          }
        }
        closePocketCalculatorIfOpen();
      }

      await sleep(100);

      // 2. Ищем кнопку сделки через универсальный безотказный поиск
      const btn = findPocketTradeButton(direction);
      if (!btn) {
        console.error(`[WinkyHook] ❌ Кнопка ${direction} не найдена в DOM!`);
        window.postMessage(
          { source: "WINKY_HOOK", type: "WINKY_RESP_CLICK_TRADE", ok: false, error: "button_not_found" },
          "*"
        );
        return;
      }

      // 3. Вызываем одиночный строгий клик по кнопке сделки
      btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      btn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
      btn.click();

      console.log(`[WinkyHook] 🎯 Клик ${direction} ($${stake}) успешно исполнен в MAIN World!`);
      window.postMessage(
        {
          source: "WINKY_HOOK",
          type: "WINKY_RESP_CLICK_TRADE",
          ok: true,
          clicked: true,
          direction: direction,
          stake: stake,
        },
        "*"
      );
    } catch (e) {
      console.error("[WinkyHook] ⚠️ Ошибка при клике сделки:", e);
      window.postMessage(
        { source: "WINKY_HOOK", type: "WINKY_RESP_CLICK_TRADE", ok: false, error: String(e) },
        "*"
      );
    }
  }
})();
