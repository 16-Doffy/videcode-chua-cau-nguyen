# Kiểm tra bản chibi, khu chùa, tarot và hoàng đạo

Ngày 02/11/2026. Chrome headless với WebGL phần mềm; ảnh desktop 1440×1000, mobile 390×844 và 375×667; thêm kiểm tra luồng ở 844×390.

## Kiểm tra đã qua

- Chọn bốn nhân vật, nhớ lựa chọn sau tải lại, đổi nhân vật trong phiên.
- Rig chibi đi tới điểm đích, animation tương tác và trở về trạng thái nghỉ; vị trí hai bàn tay khép lại khi cầu nguyện.
- Bản đồ chín điểm đến và bốn khu chùa có tên, lời nguyện riêng.
- Gửi lời nguyện, lưu khi chọn, hiển thị chuỗi HTML như văn bản.
- Tarot ba lá không trùng, lật từng lá, chọn chủ đề/góc nhìn ngược, chỉ lưu sau khi lật đủ, tải lại và mở lịch sử.
- Tarot một lá trên mobile; đủ 12 lựa chọn hoàng đạo, nhớ cung và gợi ý theo ngày.
- Từ chối lịch sử tarot sai cấu trúc trong localStorage thay vì làm trang lỗi.
- Không tràn ngang ở các màn hình đã kiểm tra. Nút xác nhận nhân vật nằm trong màn hình 375×667, không buộc cuộn toàn bộ dialog mới thấy.
- Luồng bản đồ → khu chùa → gửi nguyện dùng được ở màn hình ngang 844×390.
- Trong các lượt kiểm tra trình duyệt đã qua: không có pageerror JavaScript hoặc tài nguyên HTTP lỗi.

Chạy kiểm tra logic bằng `node tests/core.mjs` hoặc `npm test`, không cần cài dependencies. Script kiểm tra trình duyệt của phiên này: `D:\Desktop\duy-gioi-qa\v3-check.cjs`; ảnh được giữ trong cùng thư mục QA và không đưa lên web.

## Giới hạn bằng chứng

Chưa đo FPS, bộ nhớ hoặc tải đồng thời trên thiết bị thật; chưa kiểm tra Safari/iPhone và Android thật; chưa thử với người dùng thật. Đây là bản trải nghiệm tĩnh, không phải hệ thống thương mại có tài khoản/thanh toán. Các phần đó được nêu trong PRODUCT.md.

## Kiểm tra tích hợp thống kê

- Policy unit tests: lọc query/hash, referrer chỉ còn origin, từ chối tên sự kiện/giá trị lạ, loại nội dung nhập khỏi tham số và kiểm tra hết hạn consent.
- Browser consent tests với tag giả: không có request Google trước khi đồng ý; từ chối vẫn chơi được và được nhớ sau reload; đồng ý nạp đúng tag; có queue sự kiện mong đợi và không có chuỗi riêng tư thử nghiệm/cung cụ thể trong payload.
- Tắt lại đặt cờ opt-out, tải lại không có tag và xóa cookie tiền tố `duygioi_ga`; consent hết hạn yêu cầu chọn lại. Dialog dữ liệu dùng được ở mobile và không tràn ngang.
- Tag thật trên localhost: request collect trả HTTP 204, Measurement ID G-C8Q2YZW3GS, event page_view, URL đã lọc; cookie có tên duygioi_ga và duygioi_ga_C8Q2YZW3GS. Không có lỗi CSP trong lượt kết nối này. Localhost gửi debug_mode, không phải bằng chứng đã xem được báo cáo quản trị GA4.
- Consent browser tests tạm dừng vòng vẽ trong tab thử để kiểm tra payload/giao diện; không dùng lượt này để kết luận về hiệu năng 3D.
- Chưa xác nhận Enhanced measurement và custom dimensions trong tài khoản GA4; xem ANALYTICS.md để thiết lập báo cáo.
