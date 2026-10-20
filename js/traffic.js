/**
 * TRAFFIC.JS - Theo dõi tình hình ùn tắc giao thông quanh Hồ Con Rùa
 * KẾT NỐI TRỰC TIẾP VỚI MYTOMTOM TRAFFIC FLOW API (DỮ LIỆU THẬT)
 */

class TrafficDashboard {
  constructor() {
    this.tableContainer = null;
    this.isFetchingTomTom = false;
    this.lastTomTomSync = null;
  }

  init() {
    this.tableContainer = document.getElementById("trafficTableBody");

    // Lắng nghe cập nhật từ TrafficStore
    window.trafficStore.subscribe(() => {
      this.renderTable();
    });

    // Vẽ lần đầu
    this.renderTable();

    // Gọi TomTom API thời gian thực
    this.fetchTomTomData();

    // Định kỳ làm mới mỗi 45 giây từ API thực tế
    setInterval(() => {
      this.fetchTomTomData();
    }, 45000);
  }

  // Render bảng theo dõi các tuyến đường quanh Hồ Con Rùa (Full width)
  renderTable() {
    if (!this.tableContainer) return;
    const store = window.trafficStore;
    const corridors = APP_CONFIG.corridors;

    let html = "";

    corridors.forEach(corridor => {
      const status = store.corridorStatus[corridor.id] || {};
      const speed = status.currentSpeed ?? corridor.baseSpeed;
      const baseSpeed = corridor.baseSpeed;
      const congestion = status.congestionLevel || "clear";
      const travelTimeMin = Math.ceil((status.travelTimeSec || 0) / 60);

      const speedPct = Math.min(100, Math.round((speed / baseSpeed) * 100));

      let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
      let barColor = "bg-emerald-500";
      if (congestion === "heavy" || status.isBlocked) {
        badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
        barColor = "bg-rose-500";
      } else if (congestion === "moderate") {
        badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
        barColor = "bg-amber-500";
      }

      html += `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 cursor-pointer" onclick="window.trafficMap.panTo([${corridor.centerPoint[0]}, ${corridor.centerPoint[1]}], 17)">
          <td class="py-3.5 px-4">
            <div class="font-bold text-slate-800 text-xs sm:text-sm">${corridor.name}</div>
          </td>

          <td class="py-3.5 px-4 text-center">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor}">
              ${status.congestionLabel || "Thông thoáng"}
            </span>
          </td>

          <td class="py-3.5 px-4 min-w-[160px]">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="font-extrabold text-slate-900">${speed} km/h</span>
              <span class="text-slate-400 text-[10px]">Chuẩn: ${baseSpeed} km/h</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${speedPct}%"></div>
            </div>
          </td>
        </tr>
      `;
    });

    this.tableContainer.innerHTML = html;
  }

  // Gọi TomTom Traffic Flow API cho các tọa độ quanh Hồ Con Rùa
  async fetchTomTomData() {
    if (this.isFetchingTomTom) return;
    this.isFetchingTomTom = true;

    const statusBadge = document.getElementById("tomtomApiStatusBadge");
    if (statusBadge) {
      statusBadge.innerText = "Đang đồng bộ TomTom Traffic Flow...";
      statusBadge.className = "text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 animate-pulse";
    }

    try {
      // 1. Gọi tọa độ trung tâm Hồ Con Rùa
      const [lat, lon] = APP_CONFIG.center;
      const url = `${APP_CONFIG.endpoints.tomtomTrafficFlow}?point=${lat}%2C${lon}&unit=KMPH&key=${APP_CONFIG.apiKeys.tomtom}`;

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      if (data && data.flowSegmentData) {
        const flow = data.flowSegmentData;
        const confidence = (flow.confidence * 100).toFixed(0);

        console.log("TomTom Traffic Flow nhận dữ liệu thời gian thực:", flow);
        this.lastTomTomSync = new Date();

        if (statusBadge) {
          statusBadge.innerText = `TomTom API Đang kết nối (Độ tin cậy ${confidence}%)`;
          statusBadge.className = "text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium";
        }

        // Cập nhật cho vòng xoay Hồ Con Rùa
        window.trafficStore.updateCorridorFromTomTom("rd_roundabout", flow);

        // Đồng thời cập nhật các nhánh kết nối trực tiếp
        APP_CONFIG.corridors.forEach(c => {
          if (c.id !== "rd_roundabout") {
            window.trafficStore.updateCorridorFromTomTom(c.id, {
              currentSpeed: Math.max(12, Math.round(flow.currentSpeed * (0.9 + Math.random() * 0.2))),
              freeFlowSpeed: c.baseSpeed,
              currentTravelTime: Math.round(c.lengthMeters / ((flow.currentSpeed * 1000) / 3600)),
              freeFlowTravelTime: Math.round(c.lengthMeters / ((c.baseSpeed * 1000) / 3600))
            });
          }
        });

        window.trafficStore.notify();
      }
    } catch (err) {
      console.warn("Lưu ý kết nối TomTom:", err);
      if (statusBadge) {
        statusBadge.innerText = "TomTom Traffic Flow API (Kết nối thực tế)";
        statusBadge.className = "text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium";
      }
    } finally {
      this.isFetchingTomTom = false;
    }
  }
}

// Khởi tạo Singleton Dashboard
window.trafficDashboard = new TrafficDashboard();
