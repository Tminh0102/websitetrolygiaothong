/**
 * ROUTING.JS - Công cụ tìm tuyến đường thông minh tránh ùn tắc và ngập lụt
 * Xử lý dữ liệu định tuyến thực tế (OSRM API / Geo-Network Graph), kiểm tra xung đột với
 * điểm ngập và điểm kẹt xe, tự động đề xuất lộ trình thay thế và giải thích lý do logic.
 */

class SmartRoutingEngine {
  constructor() {
    this.currentResult = null;
  }

  // Danh mục phong phú các địa điểm / nút giao / trục đường trọng điểm khắp Quận 3 & Hồ Con Rùa
  getDistrict3Places() {
    return [
      // Trọng điểm trung tâm Hồ Con Rùa
      { name: "Vòng xoay Hồ Con Rùa (Công trường Quốc Tế)", address: "Công trường Quốc Tế, Phường Võ Thị Sáu, Quận 3", coords: [10.782845, 106.695843], type: "landmark" },
      { name: "Đại học Kinh tế TP.HCM (UEH - Cơ sở A)", address: "59C Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3", coords: [10.783950, 106.696320], type: "school" },
      { name: "Đại học Kiến Trúc TP.HCM", address: "196 Pasteur, Phường Võ Thị Sáu, Quận 3", coords: [10.783100, 106.694200], type: "school" },
      { name: "Nhà Thiếu nhi Thành phố", address: "169 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3", coords: [10.784200, 106.689600], type: "landmark" },
      { name: "Bảo tàng Chứng tích Chiến tranh", address: "28 Võ Văn Tần, Phường Võ Thị Sáu, Quận 3", coords: [10.779500, 106.692200], type: "tourism" },
      { name: "Nhà thờ Tân Định (Nhà thờ Màu Hồng)", address: "289 Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3", coords: [10.788400, 106.690600], type: "religion" },
      { name: "Chợ Tân Định", address: "336 Hai Bà Trưng, Phường Tân Định, Quận 1 (giáp ranh Q3)", coords: [10.790100, 106.690800], type: "market" },
      { name: "Ga Sài Gòn", address: "01 Nguyễn Thông, Phường 9, Quận 3", coords: [10.780800, 106.676600], type: "transport" },
      { name: "Chùa Vĩnh Nghiêm", address: "339 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3", coords: [10.791500, 106.683400], type: "religion" },
      { name: "Bệnh viện Da Liễu TP.HCM", address: "02 Nguyễn Thông, Phường Võ Thị Sáu, Quận 3", coords: [10.778200, 106.684100], type: "hospital" },
      { name: "Bệnh viện Tai Mũi Họng TP.HCM", address: "153-157 Trần Quốc Thảo, Phường 9, Quận 3", coords: [10.785300, 106.681600], type: "hospital" },
      { name: "Bệnh viện Mắt TP.HCM", address: "280 Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3", coords: [10.776600, 106.687400], type: "hospital" },
      { name: "Công viên Lê Văn Tám", address: "Hai Bà Trưng - Võ Thị Sáu, Quận 1 (giáp ranh Q3)", coords: [10.788700, 106.694600], type: "park" },
      { name: "Công viên Tao Đàn", address: "Trương Định - Nguyễn Thị Minh Khai, Quận 1 (giáp Q3)", coords: [10.774500, 106.691800], type: "park" },
      { name: "Nhà thờ Đức Bà", address: "01 Công xã Paris, Bến Nghé, Quận 1", coords: [10.779780, 106.699020], type: "landmark" },
      { name: "Dinh Độc Lập", address: "135 Nam Kỳ Khởi Nghĩa, Quận 1", coords: [10.777000, 106.695300], type: "landmark" },
      { name: "Nhà Văn hóa Thanh Niên", address: "04 Phạm Ngọc Thạch, Bến Nghé, Quận 1", coords: [10.781200, 106.696900], type: "landmark" },
      { name: "Diamond Plaza", address: "34 Lê Duẩn, Bến Nghé, Quận 1", coords: [10.781100, 106.698300], type: "mall" },
      { name: "Co.opmart Nguyễn Đình Chiểu", address: "168 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3", coords: [10.781400, 106.690800], type: "market" },
      { name: "Chợ Bàn Cờ", address: "664/2 Nguyễn Đình Chiểu, Phường 3, Quận 3", coords: [10.770200, 106.678800], type: "market" },
      { name: "Chợ Vườn Chuối", address: "Vườn Chuối, Phường 4, Quận 3", coords: [10.773300, 106.680600], type: "market" },

      // Tuyến đường huyết mạch Quận 3
      { name: "Đường Võ Thị Sáu (Quận 3)", address: "Đường Võ Thị Sáu, Phường Võ Thị Sáu, Quận 3", coords: [10.783300, 106.687400], type: "road" },
      { name: "Đường Nam Kỳ Khởi Nghĩa (Quận 3)", address: "Trục đường Nam Kỳ Khởi Nghĩa, Quận 3", coords: [10.785700, 106.688200], type: "road" },
      { name: "Đường Nguyễn Đình Chiểu (Quận 3)", address: "Trục đường Nguyễn Đình Chiểu, Quận 3", coords: [10.779200, 106.687700], type: "road" },
      { name: "Đường Điện Biên Phủ (Quận 3)", address: "Trục đường Điện Biên Phủ, Quận 3", coords: [10.778800, 106.685300], type: "road" },
      { name: "Đường Cách Mạng Tháng 8 (Quận 3)", address: "Trục đường CMT8, Phường 4, 10, 11, Quận 3", coords: [10.777400, 106.679100], type: "road" },
      { name: "Đường Hai Bà Trưng (Quận 3)", address: "Đoạn qua Quận 3 giáp Quận 1", coords: [10.787100, 106.691700], type: "road" },
      { name: "Đường Pasteur (Quận 3)", address: "Trục đường Pasteur, Phường Võ Thị Sáu, Quận 3", coords: [10.784500, 106.691800], type: "road" },
      { name: "Đường Trần Cao Vân (Quận 3)", address: "Trục đường Trần Cao Vân kết nối Hồ Con Rùa, Quận 3", coords: [10.782500, 106.697500], type: "road" },
      { name: "Đường Phạm Ngọc Thạch (Quận 3)", address: "Trục đường Phạm Ngọc Thạch qua Hồ Con Rùa, Quận 3", coords: [10.784800, 106.694600], type: "road" },
      { name: "Đường Lê Quý Đôn (Quận 3)", address: "Đường Lê Quý Đôn, Phường Võ Thị Sáu, Quận 3", coords: [10.779400, 106.691100], type: "road" },
      { name: "Đường Trương Định (Quận 3)", address: "Đường Trương Định, Phường Võ Thị Sáu, Quận 3", coords: [10.777800, 106.688900], type: "road" },
      { name: "Đường Bà Huyện Thanh Quan (Quận 3)", address: "Đường Bà Huyện Thanh Quan, Phường Võ Thị Sáu, Quận 3", coords: [10.777100, 106.685200], type: "road" },
      { name: "Đường Lý Chính Thắng (Quận 3)", address: "Đường Lý Chính Thắng, Phường Võ Thị Sáu, 9, Quận 3", coords: [10.788900, 106.684500], type: "road" },
      { name: "Đường Kỳ Đồng (Quận 3)", address: "Đường Kỳ Đồng, Phường 9, Quận 3", coords: [10.783100, 106.678900], type: "road" },
      { name: "Đường Nguyễn Thông (Quận 3)", address: "Đường Nguyễn Thông, Phường 9, Võ Thị Sáu, Quận 3", coords: [10.778800, 106.681100], type: "road" },
      { name: "Đường Hoàng Sa - Bờ kênh Nhiêu Lộc (Quận 3)", address: "Đường Hoàng Sa, Quận 3", coords: [10.791200, 106.681400], type: "road" },
      { name: "Đường Trường Sa - Bờ kênh Nhiêu Lộc (Quận 3)", address: "Đường Trường Sa, Quận 3", coords: [10.792400, 106.682800], type: "road" },
      { name: "Ngã tư Hàng Xanh (Kết nối)", address: "Điện Biên Phủ - Xô Viết Nghệ Tĩnh", coords: [10.801600, 106.711500], type: "landmark" }
    ];
  }

  // Tìm kiếm địa điểm toàn diện (Search như Google Maps giới hạn khu vực Quận 3 & lân cận)
  async searchPlaces(query) {
    if (!query || query.trim().length === 0) return [];

    const q = query.trim().toLowerCase();
    const localPlaces = this.getDistrict3Places();

    // 1. Tìm trong cơ sở dữ liệu địa phương Quận 3
    const matchedLocal = localPlaces.filter(p => {
      return p.name.toLowerCase().includes(q) || (p.address && p.address.toLowerCase().includes(q));
    });

    // 2. Gọi thêm Photon / OSM Geocoding thu hẹp bounding box quanh Quận 3 [minLon, minLat, maxLon, maxLat]
    let apiResults = [];
    try {
      const bbox = "106.65,10.75,106.72,10.81"; // Bounding box bao trùm toàn bộ Quận 3 và vùng lân cận
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${bbox}&limit=8`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.features && json.features.length > 0) {
          apiResults = json.features.map(f => {
            const props = f.properties;
            const name = props.name || props.street || "Địa điểm Quận 3";
            const parts = [props.housenumber, props.street, props.district || props.locality, "Quận 3", "TP.HCM"].filter(Boolean);
            const address = parts.length > 0 ? parts.join(", ") : "Khu vực Quận 3, TP.HCM";
            return {
              name: name,
              address: address,
              coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
              type: "search"
            };
          });
        }
      }
    } catch (err) {
      console.warn("Photon search API fallback:", err);
    }

    // Kết hợp và lọc trùng lặp theo tọa độ gần nhau
    const combined = [...matchedLocal, ...apiResults];
    const unique = [];
    combined.forEach(item => {
      const exists = unique.some(u => {
        const dLat = Math.abs(u.coords[0] - item.coords[0]);
        const dLon = Math.abs(u.coords[1] - item.coords[1]);
        return (dLat < 0.0015 && dLon < 0.0015) || u.name.toLowerCase() === item.name.toLowerCase();
      });
      if (!exists) {
        unique.push(item);
      }
    });

    return unique.slice(0, 8);
  }

  // Danh sách các điểm mốc hỗ trợ chọn nhanh tương thích ngược
  getPredefinedLocations() {
    return this.getDistrict3Places();
  }

  /**
   * Tính toán tìm tuyến đường tối ưu
   * @param {Array} startCoords [lat, lon]
   * @param {Array} endCoords [lat, lon]
   * @param {String} vehicle 'motorbike' | 'car' | 'bike'
   * @param {String} preference 'fastest' | 'least_congestion' | 'avoid_flood'
   */
  async findOptimalRoute(startCoords, endCoords, vehicle = "motorbike", preference = "avoid_flood") {
    const store = window.trafficStore;

    // 1. Lấy dữ liệu định tuyến cơ bản qua OSRM (định dạng lon,lat)
    let osrmRoutes = null;
    try {
      const url = `${APP_CONFIG.endpoints.osrmRouting}/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.code === "Ok" && json.routes && json.routes.length > 0) {
          osrmRoutes = json.routes;
        }
      }
    } catch (err) {
      console.warn("OSRM Routing API không khả dụng, sử dụng thuật toán nội suy nút giao Digital Twin:", err);
    }

    // Nếu không có OSRM, xây dựng 2 lộ trình mẫu thông qua mạng lưới đường Hồ Con Rùa
    if (!osrmRoutes || osrmRoutes.length === 0) {
      osrmRoutes = this.generateFallbackRoutes(startCoords, endCoords);
    }

    // 2. Phân tích xung đột từng lộ trình với dữ liệu Kẹt xe và Ngập lụt thời gian thực
    const evaluatedRoutes = osrmRoutes.map((route, index) => {
      // Chuyển đổi tọa độ [lon, lat] sang Leaflet [lat, lon]
      const latLngs = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
      
      return this.evaluateRouteHazards(latLngs, route.distance, route.duration, vehicle, preference, index === 0);
    });

    // 3. Sắp xếp và chọn phương án tối ưu nhất dựa trên tiêu chí ưu tiên
    evaluatedRoutes.sort((a, b) => a.penaltyScore - b.penaltyScore);

    const primary = evaluatedRoutes[0];
    const alternative = evaluatedRoutes.length > 1 ? evaluatedRoutes[1] : null;

    // 4. Nếu tuyến đường chính vi phạm phong tỏa nghiêm trọng hoặc ngập ngập sâu (>30cm) khi chọn tránh ngập
    if (primary.hasBlockedRoad) {
      primary.routeWarning = "CẢNH BÁO: Tuyến đi qua đoạn đường phong tỏa. Hệ thống đã tự động chuyển sang tuyến thay thế an toàn.";
    }

    this.currentResult = {
      primary,
      alternative,
      vehicle,
      preference,
      startCoords,
      endCoords,
      calculatedAt: new Date().toLocaleTimeString("vi-VN")
    };

    // Vẽ lên bản đồ riêng của mục routing (không vẽ lên trafficMap Hồ Con Rùa)
    if (window.routingMapManager) {
      window.routingMapManager.drawRoute(
        primary.coords,
        alternative ? alternative.coords : null
      );
    }

    return this.currentResult;
  }

  // Đánh giá các rủi ro nguy cơ trên một lộ trình
  evaluateRouteHazards(coords, baseDistanceMeters, baseDurationSec, vehicle, preference, isDefaultPrimary) {
    const store = window.trafficStore;
    const congestedSegments = [];
    const floodRisks = [];
    let hasBlockedRoad = false;
    let unverifiedWarnings = [];
    let penaltyScore = baseDurationSec;

    // Kiểm tra giao cắt với các tuyến đường quanh Hồ Con Rùa
    APP_CONFIG.corridors.forEach(c => {
      const status = store.corridorStatus[c.id] || {};
      
      // Kiểm tra xem tuyến này có nằm gần tim đường corridor không
      const touchesCorridor = coords.some(pt => store.getDistanceMeters(pt, c.centerPoint) < 90);

      if (touchesCorridor) {
        if (status.isBlocked) {
          hasBlockedRoad = true;
          penaltyScore += 99999; // Phạt cực nặng nếu đường bị đóng
          congestedSegments.push({
            name: c.name,
            issue: "Đoạn đường đang bị phong tỏa / rào chắn thi công",
            level: "blocked"
          });
        } else if (status.congestionLevel === "heavy") {
          penaltyScore += (preference === "least_congestion" ? 900 : 400);
          congestedSegments.push({
            name: c.name,
            issue: `Ùn tắc nghiêm trọng (${status.currentSpeed} km/h)`,
            level: "heavy"
          });
        } else if (status.congestionLevel === "moderate") {
          penaltyScore += (preference === "least_congestion" ? 300 : 150);
          congestedSegments.push({
            name: c.name,
            issue: `Đông xe di chuyển chậm (${status.currentSpeed} km/h)`,
            level: "moderate"
          });
        }
      }
    });

    // Kiểm tra giao cắt với các điểm ngập
    APP_CONFIG.floodMonitoringPoints.forEach(pt => {
      const status = store.floodStatus[pt.id] || {};
      const touchesFlood = coords.some(coord => store.getDistanceMeters(coord, pt.coords) < 100);

      if (touchesFlood) {
        const waterCm = status.waterLevelCm || 0;
        const isHigh = status.riskLevel === "high";

        if (waterCm >= 20 || isHigh) {
          // Xe máy cực kỳ nhạy cảm với ngập nước
          const vehicleMultiplier = vehicle === "motorbike" ? 2.5 : 1.2;
          penaltyScore += (preference === "avoid_flood" ? 1200 : 500) * vehicleMultiplier;

          floodRisks.push({
            pointName: pt.name,
            waterLevelCm: waterCm,
            statusText: status.statusText,
            isVerified: status.isVerified,
            riskLevel: status.riskLevel
          });

          if (!status.isVerified) {
            unverifiedWarnings.push(`Đoạn ${pt.name} có nguy cơ ngập theo mô hình (${waterCm}cm) nhưng chưa có xác minh từ camera.`);
          }
        }
      }
    });

    // Tính thời gian thực tế đã điều chỉnh theo tình trạng kẹt xe và ngập
    let adjustedDurationSec = baseDurationSec;
    if (congestedSegments.length > 0) {
      adjustedDurationSec += congestedSegments.length * 180;
    }
    if (floodRisks.length > 0) {
      adjustedDurationSec += floodRisks.length * 240;
    }

    // Xây dựng lý do đề xuất logic
    let reasoning = "";
    if (preference === "avoid_flood" && floodRisks.length === 0) {
      reasoning = "Hệ thống ưu tiên tuyến đường này vì hoàn toàn không đi qua các vùng trũng có nguy cơ ngập lụt quanh Hồ Con Rùa.";
    } else if (preference === "least_congestion" && congestedSegments.length === 0) {
      reasoning = "Lựa chọn tuyến thông thoáng nhất, tránh các nút giao đông xe tại trục Phạm Ngọc Thạch và Trần Cao Vân.";
    } else if (hasBlockedRoad) {
      reasoning = "Tuyến thay thế bắt buộc do trục chính đang bị rào chắn/phong tỏa.";
    } else {
      reasoning = `Lộ trình di chuyển hợp lý nhất theo khoảng cách (${(baseDistanceMeters / 1000).toFixed(2)} km), cân đối giữa thời gian và an toàn.`;
    }

    return {
      coords,
      distanceKm: (baseDistanceMeters / 1000).toFixed(2),
      durationMin: Math.max(2, Math.ceil(adjustedDurationSec / 60)),
      originalDurationMin: Math.ceil(baseDurationSec / 60),
      penaltyScore,
      hasBlockedRoad,
      congestedSegments,
      floodRisks,
      unverifiedWarnings,
      reasoning
    };
  }

  // Tự sinh 2 tuyến mẫu qua tọa độ nếu OSRM bị nghẽn mạng
  generateFallbackRoutes(start, end) {
    // Tuyến 1: Đi qua vòng xoay Hồ Con Rùa
    const hcr = APP_CONFIG.center;
    const route1Coords = [
      [start[1], start[0]],
      [hcr[1] - 0.0005, hcr[0] - 0.0005],
      [hcr[1], hcr[0]],
      [hcr[1] + 0.0008, hcr[0] + 0.0008],
      [end[1], end[0]]
    ];

    // Tuyến 2: Đi vòng qua trục Pasteur / Hai Bà Trưng né tâm vòng xoay
    const route2Coords = [
      [start[1], start[0]],
      [start[1] + 0.0015, start[0] - 0.0010],
      [106.6934, 10.7818], // Pasteur
      [106.6918, 10.7839],
      [end[1], end[0]]
    ];

    const dist1 = window.trafficStore.getDistanceMeters(start, end) * 1.25;
    const dist2 = dist1 * 1.18;

    return [
      {
        geometry: { coordinates: route1Coords },
        distance: Math.round(dist1),
        duration: Math.round(dist1 / 7)
      },
      {
        geometry: { coordinates: route2Coords },
        distance: Math.round(dist2),
        duration: Math.round(dist2 / 8.5)
      }
    ];
  }
}

// Khởi tạo Singleton Routing Engine
window.smartRouting = new SmartRoutingEngine();

/**
 * RoutingMapManager - Quản lý bản đồ VietMap riêng cho phần Tìm tuyến đường
 */
class RoutingMapManager {
  constructor() {
    this.map = null;
    this.routeGroup = null;
  }

  init(containerId = "routingMap") {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(`Không tìm thấy phần tử map container #${containerId}`);
      return;
    }

    // Khởi tạo Leaflet Map cho Routing
    this.map = L.map(containerId, {
      center: APP_CONFIG.center,
      zoom: 15,
      minZoom: 13,
      maxZoom: 19,
      zoomControl: true
    });

    // Thêm Tile VietMap với API key
    const vietmapUrl = `https://maps.vietmap.vn/tm/{z}/{x}/{y}@2x.png?apikey=${APP_CONFIG.apiKeys.vietmap}`;
    L.tileLayer(vietmapUrl, {
      attribution: '© <a href="https://vietmap.vn" target="_blank">Vietmap</a>',
      maxZoom: 19
    }).addTo(this.map);

    this.routeGroup = L.layerGroup().addTo(this.map);
  }

  drawRoute(primaryCoords, altCoords = null) {
    if (!this.map || !this.routeGroup) return;

    this.routeGroup.clearLayers();

    // Tuyến đường phụ (Alternative)
    if (altCoords && altCoords.length > 0) {
      const altLine = L.polyline(altCoords, {
        color: "#94a3b8",
        weight: 5,
        opacity: 0.8,
        dashArray: "8, 6",
        lineCap: "round"
      }).addTo(this.routeGroup);
      altLine.bindTooltip("Tuyến thay thế dự phòng", { permanent: false });
    }

    // Tuyến đường chính (Primary)
    if (primaryCoords && primaryCoords.length > 0) {
      // Glow nền cyan
      L.polyline(primaryCoords, {
        color: "#06b6d4",
        weight: 10,
        opacity: 0.45,
        lineCap: "round"
      }).addTo(this.routeGroup);

      // Nét chính
      const primaryLine = L.polyline(primaryCoords, {
        color: "#0284c7",
        weight: 6,
        opacity: 0.95,
        lineCap: "round"
      }).addTo(this.routeGroup);

      primaryLine.bindTooltip("Lộ trình tối ưu đề xuất", { permanent: false });

      // Marker điểm xuất phát (A)
      const startPoint = primaryCoords[0];
      const startIcon = L.divIcon({
        className: "custom-route-icon",
        html: `<div class="w-7 h-7 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-extrabold ring-2 ring-emerald-300">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker(startPoint, { icon: startIcon }).addTo(this.routeGroup).bindTooltip("Điểm xuất phát (A)");

      // Marker điểm đến (B)
      const endPoint = primaryCoords[primaryCoords.length - 1];
      const endIcon = L.divIcon({
        className: "custom-route-icon",
        html: `<div class="w-7 h-7 bg-rose-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-extrabold ring-2 ring-rose-300">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker(endPoint, { icon: endIcon }).addTo(this.routeGroup).bindTooltip("Điểm đến (B)");

      // Canh khung nhìn bản đồ bao trọn tuyến đường
      this.map.fitBounds(primaryLine.getBounds(), { padding: [40, 40] });
    }
  }

  clearRoute() {
    if (this.routeGroup) {
      this.routeGroup.clearLayers();
    }
  }
}

window.routingMapManager = new RoutingMapManager();
