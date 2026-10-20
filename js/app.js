/**
 * APP.JS - Điều phối và tích hợp toàn bộ ứng dụng Trợ lý giao thông Hồ Con Rùa
 * CHẾ ĐỘ DUY NHẤT: KẾT NỐI API THỰC TẾ
 */

class AppController {
  constructor() {
    this.currentNav = "home";
  }

  init() {
    console.log("Khởi động TP.HCM Digital Twin - Trợ lý giao thông Hồ Con Rùa (Chế độ API Thực tế)...");

    // 1. Khởi tạo các module con
    window.trafficMap.init("trafficMap");
    if (window.routingMapManager) {
      window.routingMapManager.init("routingMap");
    }
    window.trafficDashboard.init();
    window.weatherManager.init();
    window.incidentReports.init();
    window.trafficAssistant.init();

    // 2. Thiết lập UI routing form
    this.setupRoutingUI();

    // 3. Thiết lập bộ lọc bản đồ
    this.setupMapFilters();

    // 4. Đồng hồ thời gian thực
    this.startRealtimeClock();

    // 5. Navigation cuộn trang và mobile tab bar
    this.setupNavigation();

    // 6. Thiết lập Modal QR Code Sa bàn
    this.setupQrModal();
  }

  // Thiết lập Form tìm tuyến đường thông minh (Tìm kiếm tương thích kiểu Google Maps - Phạm vi Quận 3)
  setupRoutingUI() {
    const startInput = document.getElementById("routeStartInput");
    const endInput = document.getElementById("routeEndInput");
    const startSug = document.getElementById("routeStartSuggestions");
    const endSug = document.getElementById("routeEndSuggestions");
    const swapBtn = document.getElementById("swapRoutePointsBtn");
    const calculateBtn = document.getElementById("calculateRouteBtn");

    if (!startInput || !endInput) return;

    const places = window.smartRouting.getDistrict3Places();

    // Điểm khởi đầu mặc định
    this.selectedRoutePoints = {
      start: { name: places[0].name, coords: places[0].coords },
      end: { name: places[5].name, coords: places[5].coords } // Nhà thờ Tân Định
    };

    startInput.value = this.selectedRoutePoints.start.name;
    endInput.value = this.selectedRoutePoints.end.name;

    let debounceTimerA = null;
    let debounceTimerB = null;

    // Hàm tìm kiếm và hiển thị gợi ý kiểu Google Maps
    const handleSearch = async (inputEl, sugBox, pointKey) => {
      const query = inputEl.value.trim();
      if (query.length === 0) {
        sugBox.innerHTML = "";
        sugBox.classList.add("hidden");
        return;
      }

      sugBox.innerHTML = `
        <div class="p-3 text-slate-400 text-center flex items-center justify-center gap-2">
          <div class="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Đang tìm địa điểm tại Quận 3...</span>
        </div>
      `;
      sugBox.classList.remove("hidden");

      const results = await window.smartRouting.searchPlaces(query);

      if (!results || results.length === 0) {
        sugBox.innerHTML = `
          <div class="p-3 text-slate-400 text-center">
            Không tìm thấy địa điểm nào phù hợp tại Quận 3
          </div>
        `;
      } else {
        sugBox.innerHTML = results.map(item => `
          <div class="suggestion-item p-2.5 hover:bg-cyan-50 dark:hover:bg-slate-700/80 cursor-pointer flex items-start gap-2.5 transition text-left" data-name="${item.name}" data-coords='${JSON.stringify(item.coords)}'>
            <span class="text-cyan-600 dark:text-cyan-400 mt-0.5 text-sm">📍</span>
            <div class="flex-grow min-w-0">
              <div class="font-bold text-slate-800 dark:text-slate-100 truncate">${item.name}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${item.address || 'Quận 3, TP.HCM'}</div>
            </div>
          </div>
        `).join("");

        sugBox.querySelectorAll(".suggestion-item").forEach(el => {
          el.addEventListener("click", () => {
            const name = el.getAttribute("data-name");
            const coords = JSON.parse(el.getAttribute("data-coords"));
            inputEl.value = name;
            this.selectedRoutePoints[pointKey] = { name, coords };
            sugBox.classList.add("hidden");
          });
        });
      }
      sugBox.classList.remove("hidden");
    };

    // Gắn sự kiện gõ tìm kiếm cho thanh A (debounce 250ms)
    startInput.addEventListener("input", () => {
      clearTimeout(debounceTimerA);
      debounceTimerA = setTimeout(() => handleSearch(startInput, startSug, "start"), 250);
    });

    // Gắn sự kiện gõ tìm kiếm cho thanh B (debounce 250ms)
    endInput.addEventListener("input", () => {
      clearTimeout(debounceTimerB);
      debounceTimerB = setTimeout(() => handleSearch(endInput, endSug, "end"), 250);
    });

    // Đóng popup gợi ý khi click ra ngoài
    document.addEventListener("click", (e) => {
      if (!startInput.contains(e.target) && !startSug.contains(e.target)) {
        startSug.classList.add("hidden");
      }
      if (!endInput.contains(e.target) && !endSug.contains(e.target)) {
        endSug.classList.add("hidden");
      }
    });

    // Nút đổi chiều A <-> B
    if (swapBtn) {
      swapBtn.addEventListener("click", () => {
        const temp = this.selectedRoutePoints.start;
        this.selectedRoutePoints.start = this.selectedRoutePoints.end;
        this.selectedRoutePoints.end = temp;

        startInput.value = this.selectedRoutePoints.start.name;
        endInput.value = this.selectedRoutePoints.end.name;
      });
    }

    if (calculateBtn) {
      calculateBtn.addEventListener("click", () => {
        this.executeRouteCalculation();
      });
    }

    // Chạy thử 1 lần ban đầu
    setTimeout(() => {
      this.executeRouteCalculation();
    }, 1200);
  }

  async executeRouteCalculation() {
    const vehicleRadio = document.querySelector('input[name="routeVehicle"]:checked');
    const prefSelect = document.getElementById("routePreferenceSelect");

    const startObj = this.selectedRoutePoints ? this.selectedRoutePoints.start : null;
    const endObj = this.selectedRoutePoints ? this.selectedRoutePoints.end : null;

    if (!startObj || !endObj) {
      alert("Vui lòng nhập điểm xuất phát (A) và điểm đến (B).");
      return;
    }

    const start = startObj.coords;
    const end = endObj.coords;

    if (start[0] === end[0] && start[1] === end[1]) {
      alert("Điểm xuất phát và điểm đến không được trùng nhau.");
      return;
    }

    const vehicle = vehicleRadio ? vehicleRadio.value : "motorbike";
    const preference = prefSelect ? prefSelect.value : "avoid_flood";

    await window.smartRouting.findOptimalRoute(start, end, vehicle, preference);
  }

  // Thiết lập bộ lọc trên bản đồ
  setupMapFilters() {
    const filterButtons = document.querySelectorAll(".map-filter-btn");
    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active-filter", "bg-cyan-600", "text-white"));
        filterButtons.forEach(b => b.classList.add("bg-white", "text-slate-700"));

        btn.classList.add("active-filter", "bg-cyan-600", "text-white");
        btn.classList.remove("bg-white", "text-slate-700");

        const filter = btn.getAttribute("data-filter");
        window.trafficMap.setFilter(filter);
      });
    });
  }

  // Đặt đích đến từ popup bản đồ
  setRouteDestination(lat, lon, name) {
    const endSelect = document.getElementById("routeEndSelect");
    if (!endSelect) return;
    
    document.getElementById("routingSection").scrollIntoView({ behavior: "smooth" });
    
    const landmarks = window.smartRouting.getPredefinedLocations();
    let bestIdx = 0;
    let minDist = 999999;
    landmarks.forEach((lm, idx) => {
      const d = window.trafficStore.getDistanceMeters([lat, lon], lm.coords);
      if (d < minDist) {
        minDist = d;
        bestIdx = idx;
      }
    });

    endSelect.value = bestIdx;
    this.executeRouteCalculation();
  }

  // Đồng hồ thời gian thực
  startRealtimeClock() {
    const clockEl = document.getElementById("headerRealtimeClock");
    const updateTime = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Xử lý Navigation cuộn trang
  setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href").replace("#", "");
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  // Thiết lập Modal QR Code
  setupQrModal() {
    const modal = document.getElementById("qrModal");
    const openBtn = document.getElementById("openQrModalBtn");
    const closeBtn = document.getElementById("closeQrModalBtn");

    if (!modal) return;

    if (openBtn) {
      openBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    });
  }
}

// Khởi tạo Singleton App
window.app = new AppController();

document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
