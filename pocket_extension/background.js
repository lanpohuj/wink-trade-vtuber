/* ============================================================
   WINKY AI — BACKGROUND SERVICE WORKER (Manifest V3)
   Proxies API requests to local Winky Mac engine (http://127.0.0.1:8765)
   Bypasses webpage Mixed Content (https -> http) and CORS restrictions!
   ============================================================ */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "WINKY_API") {
    const url = `http://127.0.0.1:8765${msg.path || ""}`;
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
});
