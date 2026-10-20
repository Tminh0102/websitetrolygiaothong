/**
 * MAP.JS - Quản lý bản đồ tương tác Hồ Con Rùa Digital Twin
 * Tích hợp Vietmap API / Leaflet, hỗ trợ bộ lọc, lớp lưu lượng, điểm ngập,
 * và tương tác chọn tọa độ.
 */

class TrafficMapManager {
  constructor() {
    this.map = null;
    this.layers = {
      baseVietmap: null,
      baseCarto: null,
      baseOsm: null,
      corridorsGroup: null,
      floodPointsGroup: null,
      incidentsGroup: null,
      routeGroup: null,
      tempMarkerGroup: null
    };

    this.activeFilter = "congestion"; // congestion, flood, accident, blocked
    this.currentPopup = null;
    this.onMapClickCallback = null;
  }

  init(containerId = "trafficMap") {
    const el = document.getElementById(containerId);
    if (!el) {
      console.error(`Không tìm thấy phần tử map container #${containerId}`);
      return;
    }

    // Khởi tạo Leaflet Map
    this.map = L.map(containerId, {
      center: APP_CONFIG.center,
      zoom: APP_CONFIG.defaultZoom,
      minZoom: APP_CONFIG.minZoom,
      maxZoom: APP_CONFIG.maxZoom,
      zoomControl: false // Sẽ thêm ở vị trí tùy chỉnh góc dưới để tối ưu mobile
    });

    // Tùy chỉnh vị trí Zoom Control
    L.control.zoom({ position: "bottomright" }).addTo(this.map);

    // 1. Tạo Tile Layer Vietmap với API Key được cung cấp
    const vietmapUrl = `https://maps.vietmap.vn/tm/{z}/{x}/{y}@2x.png?apikey=${APP_CONFIG.apiKeys.vietmap}`;
    this.layers.baseVietmap = L.tileLayer(vietmapUrl, {
      attribution: '© <a href="https://vietmap.vn" target="_blank">Vietmap</a> | Trợ lý giao thông',
      maxZoom: 19
    });

    // Mặc định add Vietmap Tile
    this.layers.baseVietmap.addTo(this.map);

    // Tạo các nhóm Layer
    this.layers.corridorsGroup = L.layerGroup().addTo(this.map);
    this.layers.floodPointsGroup = L.layerGroup().addTo(this.map);
    this.layers.incidentsGroup = L.layerGroup().addTo(this.map);
    this.layers.routeGroup = L.layerGroup().addTo(this.map);
    this.layers.tempMarkerGroup = L.layerGroup().addTo(this.map);

    // Vẽ hồ nước trung tâm Hồ Con Rùa trang trí trực quan
    this.renderCenterMonument();

    // Sự kiện click bản đồ (dùng để chọn điểm đi / đến hoặc báo cáo sự cố)
    this.map.on("click", (e) => {
      if (this.onMapClickCallback) {
        this.onMapClickCallback(e.latlng);
      }
    });

    // Lắng nghe sự kiện thay đổi dữ liệu từ TrafficStore
    window.trafficStore.subscribe(() => {
      this.refreshMapLayers();
    });

    // Vẽ lần đầu
    this.refreshMapLayers();
  }

  // Vẽ biểu tượng tháp và lòng hồ Con Rùa đặc trưng
  renderCenterMonument() {
    // Vòng tròn tượng trưng lòng hồ nước
    L.circle(APP_CONFIG.center, {
      radius: 42,
      color: "#0284c7",
      fillColor: "#38bdf8",
      fillOpacity: 0.35,
      weight: 2,
      dashArray: "4, 4"
    }).addTo(this.map).bindTooltip("Hồ Con Rùa (Công trường Quốc Tế)", { direction: "top", permanent: false });

    // Marker biểu tượng chính giữa
    const monumentIcon = L.divIcon({
      className: "hcr-monument-icon",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 bg-cyan-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ring-4 ring-cyan-400/30">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker(APP_CONFIG.center, { icon: monumentIcon }).addTo(this.map)
      .bindPopup(`
        <div class="p-2 text-slate-800 text-sm">
          <h4 class="font-bold text-cyan-800 border-b pb-1 mb-1">Vòng xoay Hồ Con Rùa</h4>
          <p class="text-xs text-slate-600">Trọng tâm mạng lưới giao thông kết nối Quận 1 & Quận 3.</p>
        </div>
      `);
  }

  // Làm mới toàn bộ các lớp dữ liệu trên bản đồ
  refreshMapLayers() {
    this.renderCorridors();
    this.renderFloodPoints();
    this.renderIncidents();
  }

  // Đặt bộ lọc hiển thị
  setFilter(filterType) {
    this.activeFilter = filterType;
    this.refreshMapLayers();
  }

  // 1. Vẽ biển cảnh báo kẹt xe tại trung tâm mỗi tuyến đường
  renderCorridors() {
    this.layers.corridorsGroup.clearLayers();

    // Only show when filter is congestion
    if (this.activeFilter !== "congestion") {
      return;
    }

    const store = window.trafficStore;

    APP_CONFIG.corridors.forEach(corridor => {
      const status = store.corridorStatus[corridor.id] || {};
      const congestion = status.congestionLevel || "clear";
      const isBlocked = status.isBlocked;

      // Only show markers for congested corridors
      if (congestion === "clear" && !isBlocked) return;

      const isHeavy = congestion === "heavy" || isBlocked;
      const iconColor = isHeavy ? "#ef4444" : "#f59e0b"; // red or amber
      const borderColor = isHeavy ? "#991b1b" : "#92400e";
      const pulseClass = isHeavy ? "animate-ping" : "animate-pulse";
      const labelText = status.congestionLabel || (isHeavy ? "Ùn tắc nghiêm trọng" : "Đông xe di chuyển chậm");

      // Warning triangle icon
      const warningIcon = L.divIcon({
        className: "",
        html: `
          <div class="relative flex items-center justify-center" style="width:44px;height:44px;">
            <span class="absolute inset-0 flex items-center justify-center">
              <span class="w-9 h-9 rounded-sm opacity-30 ${pulseClass}" style="background-color:${iconColor};clip-path:polygon(50% 0%,100% 100%,0% 100%);"></span>
            </span>
            <svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
              <path d="M1 21h22L12 2 1 21z" fill="${iconColor}" stroke="${borderColor}" stroke-width="1.2"/>
              <text x="12" y="18.5" text-anchor="middle" font-size="11" font-weight="900" fill="white" font-family="sans-serif">!</text>
            </svg>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      // Use centerPoint for marker placement
      const markerLatLng = corridor.centerPoint;
      const marker = L.marker(markerLatLng, { icon: warningIcon });

      // Popup with corridor info
      const popupContent = `
        <div class="traffic-popup p-3 min-w-[200px] font-sans text-slate-800">
          <div class="flex items-center justify-between border-b pb-2 mb-2">
            <span class="font-bold text-sm text-slate-900">${corridor.name}</span>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded text-white" style="background-color:${iconColor}">
              ${labelText}
            </span>
          </div>
          <div class="text-xs mb-1">
            <div class="bg-slate-100 p-2 rounded">
              <span class="text-slate-500 block text-[10px]">Tốc độ hiện tại</span>
              <span class="font-bold text-slate-800 text-sm">${status.currentSpeed ?? "--"} km/h</span>
              <span class="text-[10px] text-slate-400 block">Chuẩn: ${corridor.baseSpeed} km/h</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      this.layers.corridorsGroup.addLayer(marker);
    });
  }

  // 2. Vẽ các điểm giám sát ngập lụt
  renderFloodPoints() {
    this.layers.floodPointsGroup.clearLayers();

    if (this.activeFilter !== "all" && this.activeFilter !== "flood") {
      return;
    }

    const store = window.trafficStore;

    APP_CONFIG.floodMonitoringPoints.forEach(pt => {
      const status = store.floodStatus[pt.id] || {};
      const waterCm = status.waterLevelCm || 0;
      const riskLevel = status.riskLevel || "low";

      let iconColor = "#0284c7"; // xanh dương
      let waveAnim = "";

      if (riskLevel === "high") {
        iconColor = "#ef4444"; // đỏ
        waveAnim = "animate-ping";
      } else if (riskLevel === "medium") {
        iconColor = "#f59e0b"; // vàng cam
        waveAnim = "animate-pulse";
      }

      // Tạo marker tùy biến với hiệu ứng sóng nước
      const floodIcon = L.divIcon({
        className: "custom-flood-icon",
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <span class="absolute w-8 h-8 rounded-full ${waveAnim} opacity-40" style="background-color: ${iconColor};"></span>
            <div class="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold" style="background-color: ${iconColor};">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>
            </div>
            ${waterCm > 0 ? `
              <span class="absolute -bottom-3 bg-slate-900 text-white text-[9px] px-1 py-0.2 rounded font-mono shadow">
                ${waterCm}cm
              </span>
            ` : ''}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker(pt.coords, { icon: floodIcon });

      const popupHtml = `
        <div class="p-3 min-w-[260px] font-sans text-slate-800">
          <div class="flex items-center justify-between border-b pb-2 mb-2">
            <div>
              <span class="text-[10px] text-cyan-700 font-bold block uppercase tracking-wider">Điểm giám sát ngập</span>
              <h4 class="font-bold text-sm text-slate-900">${pt.name}</h4>
            </div>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded text-white ${
              riskLevel === 'high' ? 'bg-rose-500' : (riskLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')
            }">
              ${riskLevel === 'high' ? 'Nguy cơ cao' : (riskLevel === 'medium' ? 'Cần chú ý' : 'Bình thường')}
            </span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex justify-between items-center bg-slate-50 p-2 rounded">
              <span class="text-slate-500">Mực nước đo/mô phỏng:</span>
              <span class="font-bold text-sm ${waterCm > 20 ? 'text-rose-600' : 'text-slate-800'}">${waterCm} cm</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Khả năng tiêu thoát:</span>
              <span class="font-medium text-slate-700">${pt.drainageCapacity}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Trạng thái:</span>
              <span class="font-semibold text-slate-800">${status.statusText}</span>
            </div>
          </div>

          <div class="mt-2 p-2 bg-blue-50/70 border border-blue-200/50 rounded text-[11px] text-blue-900">
            <strong>Ghi chú:</strong> Tích hợp dữ liệu lượng mưa thời gian thực từ trạm khí tượng Open-Meteo và trạm đo thoát nước đô thị.
          </div>

          <div class="text-[10px] text-slate-400 mt-2 space-y-0.5 border-t pt-1.5">
            <div>Nguồn: ${status.dataSource}</div>
            <div>Cập nhật: ${status.updatedAt}</div>
            <div>Độ tin cậy: ${status.reliability}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.layers.floodPointsGroup.addLayer(marker);
    });
  }

  // 3. Vẽ các sự cố (Tai nạn, Cản trở, Phong tỏa, Báo cáo người dân)
  renderIncidents() {
    this.layers.incidentsGroup.clearLayers();

    const store = window.trafficStore;
    const reports = store.incidentReports.filter(r => r.status !== "resolved");

    reports.forEach(report => {
      // Áp dụng bộ lọc
      if (this.activeFilter === "flood" && report.type !== "flood") return;
      if (this.activeFilter === "congestion" && report.type !== "congestion") return;
      if (this.activeFilter === "accident" && report.type !== "accident") return;
      if (this.activeFilter === "blocked" && report.type !== "blocked") return;

      let iconBg = "#f59e0b"; // Vàng
      let iconSvg = "";

      if (report.type === "accident") {
        iconBg = "#ef4444"; // Đỏ
        iconSvg = `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>`;
      } else if (report.type === "blocked") {
        iconBg = "#9333ea"; // Tím
        iconSvg = `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>`;
      } else if (report.type === "flood") {
        iconBg = "#0284c7"; // Xanh dương
        iconSvg = `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
      } else {
        iconBg = "#f97316"; // Cam
        iconSvg = `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
      }

      const isPending = report.status === "pending";

      const incidentIcon = L.divIcon({
        className: "custom-incident-icon",
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-7 h-7 rounded-full border-2 ${isPending ? 'border-dashed border-amber-300 ring-2 ring-amber-400/50' : 'border-white'} shadow-lg flex items-center justify-center text-white" style="background-color: ${iconBg};">
              ${iconSvg}
            </div>
            ${isPending ? `
              <span class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white animate-pulse" title="Chờ xác minh"></span>
            ` : ''}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker(report.coords, { icon: incidentIcon });

      const popupHtml = `
        <div class="p-3 min-w-[260px] font-sans text-slate-800">
          <div class="flex items-center justify-between border-b pb-2 mb-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded text-white" style="background-color: ${iconBg};">
              ${report.type === 'accident' ? 'Tai nạn / Va chạm' : (report.type === 'blocked' ? 'Đường cản trở' : (report.type === 'flood' ? 'Báo cáo ngập' : 'Ùn tắc'))}
            </span>
            <span class="text-[10px] font-mono text-slate-500">${report.id}</span>
          </div>

          <h4 class="font-bold text-sm text-slate-900 mb-1">${report.title}</h4>
          <p class="text-xs text-slate-600 mb-2 leading-relaxed">${report.description}</p>

          <div class="bg-slate-50 p-2 rounded text-xs space-y-1 mb-2">
            <div class="flex justify-between">
              <span class="text-slate-500">Vị trí:</span>
              <span class="font-medium text-slate-800">${report.locationName}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Mức độ:</span>
              <span class="font-medium capitalize ${report.severity === 'high' ? 'text-rose-600 font-bold' : ''}">${report.severity === 'high' ? 'Nghiêm trọng' : (report.severity === 'medium' ? 'Vừa' : 'Nhẹ')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Trạng thái:</span>
              <span class="font-bold ${isPending ? 'text-amber-600' : 'text-emerald-600'}">
                ${isPending ? '⏳ Chờ xác minh' : '✓ Đã xác minh'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Lượt xác nhận:</span>
              <span class="font-bold text-cyan-700">${report.upvotes || 1} người đồng tình</span>
            </div>
          </div>

          ${isPending ? `
            <div class="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-1.5 rounded mb-2">
              ⚠️ Thông tin chưa được kiểm chứng từ cơ quan chức năng. Cân nhắc khi di chuyển qua khu vực.
            </div>
            <button onclick="window.trafficStore.verifyReport('${report.id}'); window.trafficMap.map.closePopup();" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 rounded font-medium transition text-center mb-1">
              ✓ Tôi đang ở đây: Xác nhận đúng
            </button>
          ` : `
            <div class="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded mb-2">
              Xác thực bởi: ${report.verifiedBy || 'Hệ thống'}
            </div>
          `}

          <div class="text-[10px] text-slate-400 flex justify-between border-t pt-1.5">
            <span>Nguồn: ${report.source}</span>
            <span>${new Date(report.timestamp).toLocaleTimeString('vi-VN')}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.layers.incidentsGroup.addLayer(marker);
    });
  }

  // Vẽ lộ trình tìm đường trên bản đồ (Primary & Alternative)
  drawRoute(primaryCoords, altCoords = null, bounds = null) {
    this.layers.routeGroup.clearLayers();

    // Tuyến đường phụ (Alternative - nét đứt màu xám cam)
    if (altCoords && altCoords.length > 0) {
      const altLine = L.polyline(altCoords, {
        color: "#94a3b8",
        weight: 5,
        opacity: 0.8,
        dashArray: "8, 6",
        lineCap: "round"
      }).addTo(this.layers.routeGroup);
      altLine.bindTooltip("Tuyến thay thế dự phòng", { permanent: false });
    }

    // Tuyến đường chính (Primary - màu xanh cyan rực rỡ Digital Twin)
    if (primaryCoords && primaryCoords.length > 0) {
      // Glow nền
      L.polyline(primaryCoords, {
        color: "#06b6d4",
        weight: 10,
        opacity: 0.4,
        lineCap: "round"
      }).addTo(this.layers.routeGroup);

      // Nét chính
      const primaryLine = L.polyline(primaryCoords, {
        color: "#0284c7",
        weight: 6,
        opacity: 0.95,
        lineCap: "round"
      }).addTo(this.layers.routeGroup);

      primaryLine.bindTooltip("Lộ trình tối ưu đề xuất", { permanent: false });

      // Marker điểm xuất phát
      const startPoint = primaryCoords[0];
      const startIcon = L.divIcon({
        className: "custom-route-icon",
        html: `<div class="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-emerald-300">A</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker(startPoint, { icon: startIcon }).addTo(this.layers.routeGroup).bindTooltip("Điểm xuất phát");

      // Marker điểm đến
      const endPoint = primaryCoords[primaryCoords.length - 1];
      const endIcon = L.divIcon({
        className: "custom-route-icon",
        html: `<div class="w-6 h-6 bg-rose-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-rose-300">B</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker(endPoint, { icon: endIcon }).addTo(this.layers.routeGroup).bindTooltip("Điểm đến");

      // Canh khung nhìn bao trọn tuyến đường
      if (bounds) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        this.map.fitBounds(primaryLine.getBounds(), { padding: [50, 50] });
      }
    }
  }

  // Xóa các tuyến đường đang vẽ
  clearRoute() {
    this.layers.routeGroup.clearLayers();
  }

  // Di chuyển camera tới tọa độ chỉ định
  panTo(coords, zoom = 17) {
    if (this.map) {
      this.map.flyTo(coords, zoom, { duration: 1.2 });
    }
  }
}

// Khởi tạo Singleton Map Manager
window.trafficMap = new TrafficMapManager();
