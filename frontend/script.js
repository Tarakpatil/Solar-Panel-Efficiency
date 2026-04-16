// ── API ─────────────────────────────────────────────
const API_LATEST = "/api/latest";

document.addEventListener("DOMContentLoaded", () => {

  const isDashboard = document.getElementById("tempChart") !== null;

  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#8A8585";
  }

  if (isDashboard) initDashboard();

  // ML Page
  if (document.getElementById("confidencePct")) {
    fetchMLData();
    setInterval(fetchMLData, 3000);
  }
});

/* =========================
   DASHBOARD
========================= */
function initDashboard() {

  const tempCtx = document.getElementById("tempChart").getContext("2d");

  const tempChart = new Chart(tempCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderWidth: 2,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  async function fetchDashboard() {
    try {
      const res = await fetch(API_LATEST);
      const data = await res.json();

      if (!data) return;

      // Temperature
      if (data.temperature !== null) {
        document.getElementById("tempValue").innerHTML =
          `${data.temperature.toFixed(1)} °C`;
      }

      // Voltage
      if (data.voltage !== null) {
        document.getElementById("voltageVal").textContent =
          `${data.voltage.toFixed(2)} V`;
      }

      // Current
      if (data.current !== null) {
        document.getElementById("currentVal").textContent =
          data.current.toFixed(3);
      }

      // Light
      if (data.light !== null) {
        document.getElementById("signalStrength").textContent =
          `${data.light} lux`;
      }

      // ✅ Prediction (NEW)
      if (data.prediction !== null && data.prediction !== undefined) {
        document.getElementById("predictionVal").textContent =
          data.prediction.toFixed(2) + " %";
      }

      // Chart
      tempChart.data.labels.push(new Date().toLocaleTimeString());
      tempChart.data.datasets[0].data.push(data.temperature ?? 0);

      if (tempChart.data.labels.length > 10) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
      }

      tempChart.update();

    } catch (err) {
      console.error("Dashboard Error:", err);
    }
  }

  fetchDashboard();
  setInterval(fetchDashboard, 2000);
}

/* =========================
   ML PAGE
========================= */
async function fetchMLData() {
  try {
    const res = await fetch("/api/latest");
    const data = await res.json();

    if (!data) return;

    if (data.prediction !== null) {
      document.getElementById("confidencePct").textContent =
        data.prediction.toFixed(0) + "%";
    }

    // Update metrics
    if (data.temperature !== null) {
      document.getElementById("tempML").textContent =
        data.temperature.toFixed(1) + " °C";
    }

    if (data.voltage !== null) {
      document.getElementById("voltML").textContent =
        data.voltage.toFixed(2) + " V";
    }

    if (data.current !== null) {
      document.getElementById("currML").textContent =
        data.current.toFixed(2) + " A";
    }

  } catch (err) {
    console.error("ML Error:", err);
  }
}