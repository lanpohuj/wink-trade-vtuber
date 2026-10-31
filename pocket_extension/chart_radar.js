/* ============================================================
   WINKY AI — Pocket Option Chart Radar Overlay Controller
   ============================================================ */

(function () {
  let radarOverlay = null;

  function createRadarOverlay() {
    if (radarOverlay) return radarOverlay;

    const overlay = document.createElement("div");
    overlay.className = "winky-radar-overlay";
    overlay.style.display = "none";
    overlay.innerHTML = `
      <div class="winky-radar-box">
        <div class="winky-radar-laser"></div>
        <div class="winky-radar-reticle"></div>
        <div class="winky-radar-crosshair-h"></div>
        <div class="winky-radar-crosshair-v"></div>
        <div class="winky-radar-label" id="winkyRadarLabel">WINKY AI RADAR: SCANNING</div>
      </div>
    `;

    document.body.appendChild(overlay);
    radarOverlay = overlay;
    return overlay;
  }

  function positionRadarOverChart() {
    const overlay = createRadarOverlay();
    // Search common chart container selectors on Pocket Option
    const chart =
      document.querySelector(".chart-container") ||
      document.querySelector("#chart-container") ||
      document.querySelector(".trading-chart") ||
      document.querySelector("canvas.chart") ||
      document.querySelector("canvas");

    if (chart) {
      const rect = chart.getBoundingClientRect();
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    } else {
      overlay.style.top = "100px";
      overlay.style.left = "200px";
      overlay.style.width = "calc(100vw - 400px)";
      overlay.style.height = "calc(100vh - 200px)";
    }
  }

  window.WinkyChartRadar = {
    show: function (label = "SCANNING...") {
      createRadarOverlay();
      positionRadarOverChart();
      const lbl = document.getElementById("winkyRadarLabel");
      if (lbl) lbl.textContent = `WINKY AI RADAR: ${label}`;
      radarOverlay.style.display = "flex";
    },
    hide: function () {
      if (radarOverlay) {
        radarOverlay.style.display = "none";
      }
    },
  };

  window.addEventListener("resize", () => {
    if (radarOverlay && radarOverlay.style.display !== "none") {
      positionRadarOverChart();
    }
  });
})();
