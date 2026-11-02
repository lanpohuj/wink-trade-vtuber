/**
 * Winky AI — Page Context Hook (po.financial)
 * Intercepts live WebSocket ticks and Chart Canvas text renders directly in the main page world.
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

  // 2. Hook Canvas 2D fillText for active quote label on chart canvas
  const origFillText = CanvasRenderingContext2D.prototype.fillText;
  let lastCanvasPrice = 0;
  let lastCanvasTime = 0;

  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    try {
      if (typeof text === "string" || typeof text === "number") {
        const str = String(text).trim();
        // Check if string is a pure currency quote e.g. 1.88610, 0.13412, 103.45
        if (/^\d{1,6}\.\d{2,6}$/.test(str)) {
          const width = this.canvas ? this.canvas.width : 0;
          // Pocket Option price tag is drawn on the right edge of the chart (x > 70% width)
          if (x > width * 0.68) {
            const num = parseFloat(str);
            const now = performance.now();
            if (num > 0 && isFinite(num) && (num !== lastCanvasPrice || now - lastCanvasTime > 120)) {
              lastCanvasPrice = num;
              lastCanvasTime = now;
              window.postMessage(
                {
                  source: "WINKY_HOOK",
                  type: "TICK",
                  price: num,
                  source_type: "canvas",
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
})();
