// ── API (Flask backend) ────────────────────────────────────────
const API_LATEST = "/api/latest";

document.addEventListener("DOMContentLoaded", () => {

  // ── Sidebar Toggle (mobile) ──
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("active");
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      sidebarOverlay.classList.remove("active");
    });
  }

  // ── Detect page ──
  const isDashboard = document.getElementById("tempChart") !== null;

  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#8A8585";
  }

  if (isDashboard) initDashboard();
});

/* ════════════════════════════════════════════════════════════════
   DASHBOARD
   ════════════════════════════════════════════════════════════════ */

function initDashboard() {

  const tempCtx = document.getElementById("tempChart").getContext("2d");

  const tempChart = new Chart(tempCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: "#2F5755",
        borderWidth: 2.5,
        fill: false,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { display: false }, x: { display: false } }
    }
  });

  async function fetchDashboard() {
    try {
      const res = await fetch(API_LATEST);
      const data = await res.json();

      if (!data) return;

      // ── Temperature ──
      if (data.temperature !== null) {
        document.getElementById("tempValue").innerHTML =
          `${data.temperature.toFixed(1)} °C`;
        updateTempStatus(data.temperature);
      }

      // ── Voltage ──
      if (data.voltage !== null) {
        document.getElementById("voltageVal").textContent =
          `${data.voltage.toFixed(2)} V`;
        updateVoltageStatus(data.voltage);
      }

      // ── Current ──
      if (data.current !== null) {
        document.getElementById("currentVal").textContent =
          data.current.toFixed(3);
        updateCurrentAlert(data.current);
      }

      // ── Light ──
      if (data.light !== null) {
        document.getElementById("signalStrength").textContent =
          `${data.light} lux`;
      }

      // ── Chart Update ──
      tempChart.data.labels.push(currentTimeLabel());
      tempChart.data.datasets[0].data.push(data.temperature ?? 0);

      if (tempChart.data.labels.length > 10) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
      }

      tempChart.update();

      showConnectionStatus(true);

    } catch (err) {
      console.error("[ERR]", err);
      showConnectionStatus(false);
    }
  }

  fetchDashboard();
  setInterval(fetchDashboard, 2000);
}

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */

function updateTempStatus(temp) {
  const badge = document.getElementById("tempStatus");
  if (temp > 30) {
    badge.innerHTML = "Critical";
  } else if (temp > 27) {
    badge.innerHTML = "High";
  } else {
    badge.innerHTML = "Normal";
  }
}

function updateVoltageStatus(volt) {
  const el = document.getElementById("voltageStatus");
  if (volt < 210 || volt > 240) {
    el.textContent = "Out of Range";
  } else {
    el.textContent = "Safe Range";
  }
}

function updateCurrentAlert(current) {
  const alert = document.getElementById("currentAlert");
  if (current > 6.5) {
    alert.innerHTML = "⚠ High Current";
  } else {
    alert.innerHTML = "Normal";
  }
}

function showConnectionStatus(connected) {
  const el = document.getElementById("nodesActive");
  if (!el) return;
  el.textContent = connected ? "Online" : "Offline";
}

function currentTimeLabel() {
  const now = new Date();
  return now.getHours().toString().padStart(2, "0") + ":" +
         now.getMinutes().toString().padStart(2, "0");
}