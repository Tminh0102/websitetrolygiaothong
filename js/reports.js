/**
 * REPORTS.JS - Xử lý tiếp nhận và kiểm duyệt báo cáo sự cố giao thông Hồ Con Rùa
 * Bao gồm cơ chế kiểm tra trùng lặp, tự động gộp phiếu và quản lý vòng đời xác minh.
 */

class IncidentReportManager {
  constructor() {
    this.form = null;
    this.listContainer = null;
    this.attachedImageBase64 = "";
    this.selectedCoords = null;
  }

  init() {
    this.form = document.getElementById("incidentReportForm");
    this.listContainer = document.getElementById("incidentReportsList");

    this.bindFormEvents();
    this.renderReportsList();

    // Lắng nghe cập nhật từ store
    window.trafficStore.subscribe(() => {
      this.renderReportsList();
    });
  }

  bindFormEvents() {
    if (!this.form) return;

    // Xử lý đính kèm ảnh
    const imageInput = document.getElementById("reportImageInput");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImg = document.getElementById("imagePreviewImg");
    const removeImgBtn = document.getElementById("removeImageBtn");

    if (imageInput) {
      imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 3 * 1024 * 1024) {
            alert("Vui lòng chọn ảnh có kích thước dưới 3MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.attachedImageBase64 = evt.target.result;
            if (previewImg && previewContainer) {
              previewImg.src = this.attachedImageBase64;
              previewContainer.classList.remove("hidden");
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeImgBtn) {
      removeImgBtn.addEventListener("click", () => {
        this.attachedImageBase64 = "";
        if (imageInput) imageInput.value = "";
        if (previewContainer) previewContainer.classList.add("hidden");
      });
    }

    // Submit form
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Nút chọn vị trí từ bản đồ
    const pickMapBtn = document.getElementById("pickLocationFromMapBtn");
    if (pickMapBtn) {
      pickMapBtn.addEventListener("click", () => {
        alert("Nhấp chuột vào một điểm trên bản đồ Hồ Con Rùa để chọn tọa độ sự cố.");
        window.trafficMap.onMapClickCallback = (latlng) => {
          this.selectedCoords = [latlng.lat, latlng.lng];
          const locationInput = document.getElementById("reportLocationInput");
          if (locationInput) {
            locationInput.value = `Tọa độ chọn: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
          }
          // Vẽ marker tạm thời
          window.trafficMap.layers.tempMarkerGroup.clearLayers();
          L.marker(latlng).addTo(window.trafficMap.layers.tempMarkerGroup)
            .bindPopup("Vị trí sự cố bạn vừa chọn").openPopup();
          
          window.trafficMap.onMapClickCallback = null;
        };
        // Cuộn nhẹ tới bản đồ
        document.getElementById("mapSection").scrollIntoView({ behavior: "smooth" });
      });
    }
  }

  // Xử lý gửi báo cáo
  handleSubmit() {
    const typeSelect = document.getElementById("reportTypeSelect");
    const locationInput = document.getElementById("reportLocationInput");
    const severitySelect = document.getElementById("reportSeveritySelect");
    const descTextarea = document.getElementById("reportDescTextarea");

    const type = typeSelect ? typeSelect.value : "congestion";
    let locationName = locationInput ? locationInput.value.trim() : "";
    const severity = severitySelect ? severitySelect.value : "medium";
    const description = descTextarea ? descTextarea.value.trim() : "";

    if (!locationName) {
      alert("Vui lòng nhập hoặc chọn vị trí xảy ra sự cố.");
      return;
    }

    if (!description) {
      alert("Vui lòng nhập mô tả tình trạng sự cố.");
      return;
    }

    // Xác định tọa độ: Nếu người dùng không pick trên bản đồ thì lấy tọa độ trung tâm Hồ Con Rùa
    let coords = this.selectedCoords;
    if (!coords) {
      // Phỏng đoán theo tên vị trí nếu có trong danh sách
      const foundCorridor = APP_CONFIG.corridors.find(c => locationName.includes(c.shortName) || locationName.includes(c.name));
      if (foundCorridor) {
        coords = foundCorridor.centerPoint;
      } else {
        coords = APP_CONFIG.center;
      }
    }

    const titles = {
      flood: "Báo cáo nước đọng / ngập đường",
      congestion: "Báo cáo ùn tắc giao thông",
      accident: "Báo cáo tai nạn / va chạm",
      blocked: "Báo cáo rào chắn / công trình cản trở",
      other: "Báo cáo sự cố hạ tầng giao thông"
    };

    const result = window.trafficStore.addIncidentReport({
      title: titles[type] || "Báo cáo sự cố",
      type: type,
      locationName: locationName,
      coords: coords,
      severity: severity,
      description: description,
      imageUrl: this.attachedImageBase64
    });

    // Hiển thị thông báo phản hồi
    const alertBox = document.getElementById("reportFeedbackAlert");
    if (alertBox) {
      alertBox.innerHTML = `
        <div class="p-3 rounded-lg text-xs leading-relaxed ${result.isDuplicate ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}">
          <div class="font-bold mb-1">${result.isDuplicate ? 'GỘP BÁO CÁO TRÙNG LẶP' : 'GỬI BÁO CÁO THÀNH CÔNG'}</div>
          <p>${result.message}</p>
          <div class="mt-1 text-[11px] font-mono text-slate-500">Mã phiếu: <strong>${result.report.id}</strong> • Trạng thái: <strong>${result.report.status === 'verified' ? 'ĐÃ XÁC MINH' : 'CHỜ XÁC MINH'}</strong></div>
        </div>
      `;
      alertBox.classList.remove("hidden");
    }

    // Reset form
    this.form.reset();
    this.attachedImageBase64 = "";
    this.selectedCoords = null;
    const previewContainer = document.getElementById("imagePreviewContainer");
    if (previewContainer) previewContainer.classList.add("hidden");
    window.trafficMap.layers.tempMarkerGroup.clearLayers();

    // Thông báo cho trợ lý giao thông
    window.trafficAssistant.speak(`Hệ thống đã ghi nhận báo cáo sự cố mã ${result.report.id} tại ${locationName}. Cảm ơn bạn đã đóng góp dữ liệu cho Bản sao số Hồ Con Rùa!`);
  }

  // Render danh sách các báo cáo thời gian thực
  renderReportsList() {
    if (!this.listContainer) return;
    const store = window.trafficStore;
    const reports = store.incidentReports;

    if (!reports || reports.length === 0) {
      this.listContainer.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Chưa có sự cố nào được ghi nhận.</div>`;
      return;
    }

    let html = "";
    reports.forEach(r => {
      const isPending = r.status === "pending";
      const isResolved = r.status === "resolved";

      let typeBadge = "bg-slate-100 text-slate-700";
      if (r.type === "accident") typeBadge = "bg-rose-100 text-rose-800";
      else if (r.type === "flood") typeBadge = "bg-blue-100 text-blue-800";
      else if (r.type === "blocked") typeBadge = "bg-purple-100 text-purple-800";
      else if (r.type === "congestion") typeBadge = "bg-amber-100 text-amber-800";

      html += `
        <div class="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-cyan-300 transition text-xs space-y-2 ${isResolved ? 'opacity-60 bg-slate-50' : ''}">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded font-bold text-[10px] uppercase ${typeBadge}">
              ${r.type}
            </span>
            <span class="font-mono text-[11px] text-slate-500 font-medium">${r.id}</span>
          </div>

          <div>
            <div class="font-bold text-slate-900 text-sm">${r.title}</div>
            <div class="text-slate-600 mt-1 leading-relaxed">${r.description}</div>
          </div>

          ${r.imageUrl ? `
            <div class="mt-1">
              <img src="${r.imageUrl}" alt="Ảnh hiện trường" class="h-24 w-auto rounded border object-cover">
            </div>
          ` : ''}

          <div class="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>📍 ${r.locationName}</span>
            <span>🕒 ${new Date(r.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="inline-flex items-center gap-1 font-semibold text-[11px] ${
              isPending ? 'text-amber-600' : (isResolved ? 'text-slate-400' : 'text-emerald-600')
            }">
              ${isPending ? '⏳ Chờ xác minh' : (isResolved ? '✓ Đã giải quyết' : '✓ Đã xác minh')}
              <span class="text-slate-400 font-normal">(${r.upvotes || 1} xác nhận)</span>
            </span>

            <div class="flex items-center gap-1">
              <button onclick="window.trafficMap.panTo([${r.coords[0]}, ${r.coords[1]}], 18)" class="text-cyan-700 hover:text-cyan-900 bg-cyan-50 px-2 py-1 rounded text-[11px] font-medium transition">
                Xem trên bản đồ
              </button>
              ${isPending ? `
                <button onclick="window.trafficStore.verifyReport('${r.id}')" class="text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded text-[11px] font-medium transition">
                  Xác thực
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });

    this.listContainer.innerHTML = html;
  }
}

// Khởi tạo Singleton Reports
window.incidentReports = new IncidentReportManager();
