/**
 * WEATHER.JS - Quan sát lượng mưa và nguy cơ ngập khu vực Hồ Con Rùa
 * KẾT NỐI TRỰC TIẾP API THỜI TIẾT THỰC TẾ (OPEN-METEO REALTIME)
 */

class WeatherFloodManager {
  constructor() {
    this.rainChart = null;
    this.tableContainer = null;
    this.isFetching = false;
  }

  init() {
    this.tableContainer = document.getElementById("floodPointsTableBody");
    this.initChart();

    // Lắng nghe store cập nhật
    window.trafficStore.subscribe(() => {
      this.renderFloodTable();
    });

    this.renderFloodTable();
    this.fetchRealWeatherData();

    // Đồng bộ lại mỗi 2 phút
    setInterval(() => {
      this.fetchRealWeatherData();
    }, 120000);
  }

  // Khởi tạo biểu đồ lượng mưa thời gian thực bằng Chart.js
  initChart() {
    const ctx = document.getElementById("rainForecastChart");
    if (!ctx) return;

    const currentHour = new Date().getHours();
    const labels = [];
    const recordedData = [];
    const forecastData = [];

    for (let i = -6; i <= 6; i++) {
      let h = (currentHour + i + 24) % 24;
      labels.push(`${h}:00`);
      if (i <= 0) {
        recordedData.push(i === 0 ? window.trafficStore.weatherData.currentRainMm : 0);
        forecastData.push(null);
      } else {
        recordedData.push(null);
        forecastData.push(0);
      }
    }
    forecastData[6] = recordedData[6];

    this.rainChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Mưa thực tế ghi nhận (mm/h)",
            data: recordedData,
            borderColor: "#0284c7",
            backgroundColor: "rgba(2, 132, 199, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#0284c7"
          },
          {
            label: "Dự báo từ trạm khí tượng (mm/h)",
            data: forecastData,
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#06b6d4"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw ?? 0} mm/h`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 30,
            title: {
              display: true,
              text: "Lượng mưa (mm/h)",
              font: { size: 10 }
            },
            grid: { color: "#f1f5f9" }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  // Render bảng chi tiết các điểm giám sát ngập
  renderFloodTable() {
    if (!this.tableContainer) return;
    const store = window.trafficStore;
    const points = APP_CONFIG.floodMonitoringPoints;

    let html = "";

    points.forEach(pt => {
      const status = store.floodStatus[pt.id] || {};
      const waterCm = status.waterLevelCm || 0;
      const risk = status.riskLevel || "low";

      let riskBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
      let riskLabel = "Thấp (An toàn)";

      if (risk === "high") {
        riskBadge = "bg-rose-100 text-rose-800 border-rose-300";
        riskLabel = "Nguy cơ cao";
      } else if (risk === "medium") {
        riskBadge = "bg-amber-100 text-amber-800 border-amber-200";
        riskLabel = "Cần chú ý";
      }

      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 cursor-pointer" onclick="window.trafficMap.panTo([${pt.coords[0]}, ${pt.coords[1]}], 18)">
          <td class="py-3 px-3">
            <div class="font-semibold text-slate-800 text-xs sm:text-sm">${pt.name}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              Cao độ địa hình: ${pt.elevationMeter}m • Thoát nước: ${pt.drainageCapacity}
            </div>
          </td>

          <td class="py-3 px-3 text-center">
            <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${riskBadge}">
              ${riskLabel}
            </span>
          </td>

          <td class="py-3 px-3 text-center font-bold text-xs sm:text-sm ${waterCm > 15 ? 'text-rose-600' : 'text-slate-700'}">
            ${waterCm > 0 ? `${waterCm} cm` : 'Khô ráo'}
          </td>

          <td class="py-3 px-3">
            <div class="text-xs font-medium ${status.isVerified ? 'text-emerald-700' : 'text-slate-700'}">
              ${status.statusText || 'Chưa có dấu hiệu ngập'}
            </div>
            <div class="text-[10px] text-slate-400">
              Tích hợp trạm quan trắc thực địa
            </div>
          </td>
        </tr>
      `;
    });

    this.tableContainer.innerHTML = html;
  }

  // Gọi API thời tiết thực tế từ Open-Meteo
  async fetchRealWeatherData() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const [lat, lon] = APP_CONFIG.center;
      const url = `${APP_CONFIG.endpoints.openMeteo}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain&hourly=precipitation,rain&timezone=Asia%2FBangkok&forecast_days=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      if (data && data.current) {
        console.log("Thời tiết thực tế Hồ Con Rùa (Open-Meteo):", data.current);

        const temp = Math.round(data.current.temperature_2m);
        const hum = Math.round(data.current.relative_humidity_2m);
        const rainMm = data.current.rain || data.current.precipitation || 0;

        const tempEl = document.getElementById("weatherTempValue");
        const humEl = document.getElementById("weatherHumidityValue");
        const rainEl = document.getElementById("currentRainValue");

        if (tempEl) tempEl.innerText = `${temp}°C`;
        if (humEl) humEl.innerText = `${hum}%`;
        if (rainEl) rainEl.innerText = `${rainMm} mm/h`;

        // Cập nhật store
        window.trafficStore.updateWeatherFromOpenMeteo(data.current);

        // Cập nhật biểu đồ nếu có dữ liệu theo giờ
        if (this.rainChart && data.hourly && data.hourly.rain) {
          const currentHour = new Date().getHours();
          const hourlyRain = data.hourly.rain;
          
          for (let i = 0; i <= 6; i++) {
            const hIdx = (currentHour + i) % 24;
            if (this.rainChart.data.datasets[1].data[6 + i] !== undefined) {
              this.rainChart.data.datasets[1].data[6 + i] = hourlyRain[hIdx] || 0;
            }
          }
          this.rainChart.data.datasets[0].data[6] = rainMm;
          this.rainChart.update();
        }
      }
    } catch (err) {
      console.warn("Lưu ý kết nối Open-Meteo:", err);
    } finally {
      this.isFetching = false;
    }
  }
}

// Khởi tạo Singleton Weather
window.weatherManager = new WeatherFloodManager();
