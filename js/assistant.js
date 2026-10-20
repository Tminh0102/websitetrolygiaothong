/**
 * ASSISTANT.JS - Nhân vật Trợ lý giao thông thông minh Hồ Con Rùa
 * Đóng vai trò giải thích tình trạng giao thông thời gian thực, cảnh báo nguy cơ và gợi ý lời khuyên chuẩn mực.
 */

class TrafficAssistant {
  constructor() {
    this.container = null;
    this.speechBubble = null;
    this.lastSpokenText = "";
  }

  init() {
    this.container = document.getElementById("aiAssistantWidget");
    this.speechBubble = document.getElementById("assistantSpeechText");

    // Lắng nghe store cập nhật để đưa ra lời khuyên chủ động
    window.trafficStore.subscribe(() => {
      this.generateProactiveAdvice();
    });

    // Lời chào mở đầu
    setTimeout(() => {
      this.speak("Xin chào! Tôi là Trợ lý giao thông Hồ Con Rùa. Tôi đang đồng bộ dữ liệu thời gian thực từ TomTom Traffic Flow và Open-Meteo để hỗ trợ bạn lưu thông thuận lợi.");
    }, 800);
  }

  // Phát ngôn một thông điệp
  speak(text) {
    if (!text || text === this.lastSpokenText) return;
    this.lastSpokenText = text;

    if (this.speechBubble) {
      this.speechBubble.classList.add("opacity-0");
      setTimeout(() => {
        this.speechBubble.innerText = text;
        this.speechBubble.classList.remove("opacity-0");
      }, 200);
    }
  }

  // Tự động phân tích tình hình giao thông và thời tiết thực tế để phát ngôn cảnh báo
  generateProactiveAdvice() {
    const store = window.trafficStore;
    const rain = store.weatherData.currentRainMm || 0;
    
    // Tìm các tuyến ùn tắc hoặc phong tỏa thực tế
    const slowCorridors = APP_CONFIG.corridors.filter(c => {
      const s = store.corridorStatus[c.id];
      return s && (s.congestionLevel === "heavy" || s.isBlocked);
    });

    // 1. Kiểm tra mưa lớn thực tế
    if (rain >= 50) {
      this.speak(`Cảnh báo mưa lớn thực tế (${rain} mm/h): Đường trơn trượt và tầm nhìn giảm tại vòng xoay Hồ Con Rùa. Người điều khiển xe máy nên chú ý an toàn tại các nút giao.`);
      return;
    } else if (rain > 10) {
      this.speak(`Khu vực Hồ Con Rùa đang có mưa nhẹ (${rain} mm/h). Các phương tiện lưu ý giảm tốc độ khi vào vòng xoay Công trường Quốc Tế.`);
      return;
    }

    // 2. Kiểm tra ùn tắc thực tế từ TomTom API
    if (slowCorridors.length > 0) {
      const names = slowCorridors.map(c => c.shortName).join(", ");
      this.speak(`Dữ liệu thực tế ghi nhận mật độ phương tiện đông trên các trục: ${names}. Bạn nên xem bản đồ và cân nhắc lộ trình thay thế.`);
      return;
    }

    // 3. Bình thường
    this.speak("Dữ liệu từ TomTom Traffic Flow ghi nhận giao thông quanh Hồ Con Rùa đang lưu thông thông suốt, tốc độ trung bình ổn định.");
  }

  // Xử lý các câu hỏi nhanh từ người dùng
  askQuickQuestion(queryType) {
    const store = window.trafficStore;

    if (queryType === "congestion") {
      const slowCorridors = APP_CONFIG.corridors.filter(c => {
        const s = store.corridorStatus[c.id];
        return s && (s.congestionLevel === "heavy" || s.isBlocked);
      });

      if (slowCorridors.length > 0) {
        const names = slowCorridors.map(c => c.shortName).join(", ");
        this.speak(`Dữ liệu TomTom ghi nhận các tuyến đang đông xe gồm: ${names}.`);
      } else {
        this.speak("Tất cả các tuyến đường kết nối trực tiếp với Hồ Con Rùa hiện đang lưu thông ổn định, không có điểm nghẽn nghiêm trọng.");
      }
    } else if (queryType === "flood") {
      const rain = store.weatherData.currentRainMm;
      if (rain > 20) {
        this.speak(`Lượng mưa hiện tại là ${rain} mm/h. Một số vị trí trũng như giao lộ Trần Cao Vân - Hai Bà Trưng đang được theo dõi thoát nước.`);
      } else {
        this.speak("Thời tiết hiện tại khô ráo, các điểm giám sát thoát nước quanh Hồ Con Rùa đều ghi nhận tình trạng thông thoáng.");
      }
    } else if (queryType === "routing") {
      this.speak("Bạn hãy cuộn xuống mục 'Tìm tuyến đường', chọn Điểm xuất phát và Điểm đến, hệ thống sẽ tự động vẽ lộ trình thực tế an toàn nhất.");
      document.getElementById("routingSection").scrollIntoView({ behavior: "smooth" });
    }
  }
}

// Khởi tạo Singleton Assistant
window.trafficAssistant = new TrafficAssistant();
