/* ============================================================
   WINKY AI — BACKGROUND SERVICE WORKER (Manifest V3)
   Proxies API requests to local Winky Mac engine (http://127.0.0.1:8765)
   and Production API (https://winktrade-app.online).
   Bypasses webpage Mixed Content (https -> http) and CORS restrictions!
   ============================================================ */

"use strict";

// Periodic keep-alive ping to local Winky server
function pingLocalWinky() {
  fetch("http://127.0.0.1:8765/api/winky/ping", { method: "POST" }).catch(() => {});
}

setInterval(pingLocalWinky, 5000);
pingLocalWinky();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  // 1. Local Winky API Proxy
  if (msg.type === "WINKY_API") {
    const port = msg.port || 8765;
    const url = `http://127.0.0.1:${port}${msg.path || ""}`;
    const method = msg.method || "POST";
    const headers = { "Content-Type": "application/json" };
    const options = {
      method: method,
      headers: headers,
    };

    if (msg.body && method !== "GET" && method !== "HEAD") {
      options.body = JSON.stringify(msg.body);
    }

    fetch(url, options)
      .then(async (res) => {
        let data = null;
        try {
          data = await res.json();
        } catch (_) {
          data = { ok: res.ok, status: res.status };
        }
        sendResponse({ ok: res.ok, status: res.status, data: data });
      })
      .catch((err) => {
        // Fallback to secondary port 8790 if 8765 is busy
        fetch(`http://127.0.0.1:8790${msg.path || ""}`, options)
          .then(async (res) => {
            let data = null;
            try {
              data = await res.json();
            } catch (_) {
              data = { ok: res.ok };
            }
            sendResponse({ ok: res.ok, status: res.status, data: data });
          })
          .catch((err2) => {
            sendResponse({ ok: false, error: String(err2 || err) });
          });
      });

    return true; // Keep message channel open for async response
  }

  // 2. Production API Proxy (e.g. Signal Sync to https://winktrade-app.online)
  if (msg.type === "PROD_API") {
    const url = `https://winktrade-app.online${msg.path || ""}`;
    const method = msg.method || "POST";
    const headers = { "Content-Type": "application/json" };
    const options = {
      method: method,
      headers: headers,
    };

    if (msg.body && method !== "GET" && method !== "HEAD") {
      options.body = JSON.stringify(msg.body);
    }

    fetch(url, options)
      .then(async (res) => {
        let data = null;
        try {
          data = await res.json();
        } catch (_) {
          data = { ok: res.ok };
        }
        sendResponse({ ok: res.ok, status: res.status, data: data });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });

    return true;
  }
});
