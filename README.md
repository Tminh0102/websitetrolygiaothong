# TRỢ LÝ GIAO THÔNG – HỒ CON RÙA
### DỰ ÁN GIẢI QUYẾT GIAO THÔNG (KHU VỰC CÔNG TRƯỜNG QUỐC TẾ - HỒ CON RÙA)
### CHẾ ĐỘ HOẠT ĐỘNG: 100% KẾT NỐI API THỰC TẾ (REAL-TIME LIVE DATA)

---

## 1. Giới thiệu tổng quan
Website **“Trợ lý giao thông” – Hồ Con Rùa** là một giải pháp giám sát và hỗ trợ người tham gia giao thông thời gian thực thuộc dự án **TP.HCM Digital Twin**:
- Người tham quan sa bàn có thể **quét mã QR gắn trên sa bàn Hồ Con Rùa** bằng điện thoại di động để mở website và theo dõi trực tiếp dữ liệu.
- **Dữ liệu LUÔN LÀ THỰC TẾ và DUY NHẤT ở CHẾ ĐỘ KẾT NỐI API**:
  - Lưu lượng và tốc độ các tuyến đường: Kết nối trực tiếp với **MyTomTom Traffic Flow API**.
  - Nhiệt độ, độ ẩm và lượng mưa: Kết nối trực tiếp với trạm khí tượng **Open-Meteo Realtime API**.
  - Bản đồ nền: Sử dụng **Vietmap Map Tiles API**.
  - Định tuyến thông minh: Tính toán lộ trình thực tế, tự động phát hiện và cảnh báo các đoạn đường kẹt xe hoặc ngập nước.

---

## 2. Hướng dẫn chạy website

Website được xây dựng theo chuẩn Web hiện đại (HTML5, Modern ES6 JavaScript, Tailwind CSS, Leaflet, Chart.js) nên **không đòi hỏi cài đặt môi trường phức tạp**.

### Mở trực tiếp bằng trình duyệt:
1. Mở thư mục dự án `c:\Users\Minh\Documents\HAHA`.
2. Nhấp đúp chuột vào tệp `index.html` để mở trong trình duyệt (Google Chrome, Microsoft Edge, Safari, Cốc Cốc...).
3. Tất cả chức năng bản đồ, bảng kẹt xe thực tế và định tuyến sẽ chạy ngay lập tức.

---

## 3. Danh sách API Thực tế đã tích hợp

| Tên dịch vụ / API | Mục đích sử dụng | Khóa truy cập (API Key) | Trạng thái kết nối |
| :--- | :--- | :--- | :--- |
| **Vietmap Map Tiles** | Hiển thị bản đồ nền khu vực Hồ Con Rùa | `a4a3a35f4ce9f30472cf3cca93991c19fefcb545fc33d640` | **KẾT NỐI THỰC TẾ** |
| **MyTomTom Traffic Flow** | Lấy dữ liệu luồng giao thông và tốc độ xe thực tế | `FhH96we4j26GXTbHrz0e7jdDWPjcHLlo` | **KẾT NỐI THỰC TẾ** |
| **Open-Meteo Weather** | Lấy nhiệt độ, độ ẩm và lượng mưa thực tế tại Hồ Con Rùa | Miễn phí không cần key | **KẾT NỐI THỰC TẾ** |
| **OSRM Smart Routing** | Thuật toán tính toán lộ trình thực tế theo mạng lưới đường | Công cộng / OpenStreetMap | **KẾT NỐI THỰC TẾ** |

---

## 4. Các phần đã điều chỉnh theo yêu cầu mới

1. **Đã loại bỏ các phần**:
   - *Bảng điều khiển sa bàn (Simulator)*: Không còn thanh trượt mô phỏng.
   - *Các thẻ chỉ số KPI ở Section 1*: Đã loại bỏ các thẻ Ùn tắc trung bình, Nguy cơ ngập, Sự cố đang xử lý, Cập nhật dữ liệu.
   - *So sánh tốc độ các tuyến*: Đã loại bỏ biểu đồ so sánh tốc độ ở Section 3; bảng theo dõi kẹt xe được mở rộng toàn chiều rộng để hiển thị chi tiết, rõ ràng nhất.
   - *Danh sách sự cố đang theo dõi*: Đã loại bỏ cột danh sách sự cố ở Section 7; biểu mẫu gửi báo cáo sự cố được thiết kế căn giữa, tập trung và chuyên nghiệp.

2. **Chế độ hoạt động duy nhất**:
   - Toàn bộ dữ liệu trên website **LUÔN LÀ DỮ LIỆU THẬT** được lấy từ các API thời gian thực.
   - Hệ thống tự động đồng bộ định kỳ theo chu kỳ thời gian thực.
