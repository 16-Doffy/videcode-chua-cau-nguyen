# Thống kê Duy Giới

GA4 Measurement ID công khai: `G-C8Q2YZW3GS`. Không phải mật khẩu hay API secret.

## Cách thu thập

- Lần đầu hỏi lựa chọn; chưa chọn hoặc từ chối thì không tải Google tag. Web vẫn dùng được.
- Sau khi đồng ý mới tải `gtag.js` và gửi page view/sự kiện. Không lưu hàng đợi thao tác trước khi đồng ý để gửi bù.
- Trạng thái cảnh đã sẵn sàng/thất bại được giữ trong bộ nhớ để báo trạng thái hiện tại sau khi đồng ý. Thời gian mở cảnh chỉ gửi theo ba khoảng, không gửi dữ liệu nhập.
- Nhớ lựa chọn trên thiết bị tối đa 180 ngày, cookie Analytics cấu hình 30 ngày và đường dẫn riêng của Duy Giới.
- Nút “Dữ liệu & thống kê” ở chân trang cho phép đổi lựa chọn. Tắt đặt cờ opt-out ngay, xóa cookie có tiền tố riêng và tải lại trang để bỏ script đã nạp. Không xóa dữ liệu đã gửi trước đó khỏi Google.
- Tắt Google Signals và ad personalization trong cấu hình. Ba loại consent quảng cáo đều `denied`. Không tích hợp Meta Pixel, TikTok Pixel hoặc session replay.

## Sự kiện do ứng dụng gửi

| Sự kiện | Tham số cho phép | Ý nghĩa |
| --- | --- | --- |
| `page_view` | URL đã lọc, tiêu đề cố định, referrer chỉ còn origin | Lượt mở trang sau khi đồng ý |
| `scene_ready` | `load_bucket`: under_3s / 3_to_10s / over_10s | Cảnh mở được, khoảng thời gian khởi tạo |
| `scene_failed` | Không có dữ liệu lỗi chi tiết | Khởi tạo cảnh thất bại trong phần ứng dụng bắt được |
| `experience_started` | Không có ID nhân vật | Xác nhận nhân vật và bắt đầu, tối đa một lần/trang |
| `feature_opened` | `feature_name`: map / tarot / zodiac / notes / breathing / character | Mở tính năng |
| `interaction_completed` | `activity`: world / tarot / breathing / saved_note | Hoàn tất thao tác; không gửi tên khu chùa cụ thể |
| `app_error` | `error_type`: script / promise / webgl | Loại lỗi, không gửi message, stack hoặc URL thô |

Không gửi lời nguyện, điều ước, nội dung nhập tự do, tâm trạng, cung cụ thể, lá bài, tên hoặc email. Danh sách sự kiện/tham số được lọc tại `analytics-policy.js`; không truyền thẳng dữ liệu giao diện vào gtag.

Google vẫn xử lý dữ liệu kỹ thuật như cookie, thiết bị và dữ liệu kết nối theo dịch vụ của họ. Không quảng cáo đây là thống kê “ẩn danh tuyệt đối”. Số người dùng chỉ là ước tính từ những người cho phép đo và không chặn tag.

## Việc cần kiểm tra trong tài khoản GA4

Mã frontend không thay đổi cấu hình quản trị GA4. Cần giữ **Enhanced measurement tắt** cho luồng này theo hướng dẫn thiết lập, tránh tự động phát sinh các event ngoài danh sách ứng dụng. Chưa xác nhận được trạng thái tùy chọn này từ phiên đăng nhập của chủ tài khoản.

Trong Admin → Custom definitions, có thể tạo event-scoped dimensions cho `feature_name`, `activity`, `load_bucket` để phân tích tham số trong báo cáo. Dùng Realtime để kiểm tra event; DebugView dành cho kiểm tra phát triển. Trên localhost, mã đặt `debug_mode: true`; bản public không tự đặt debug mode.

Không thể xác nhận số liệu đã xuất hiện trong dashboard GA4 nếu không có quyền truy cập dashboard. Kiểm tra request mạng/HTTP thành công không đồng nghĩa tất cả thiết lập báo cáo đều đúng.

## Link chiến dịch cho bài đăng

- Facebook: https://16-doffy.github.io/videcode-chua-cau-nguyen/?utm_source=facebook&utm_medium=social&utm_campaign=beta_launch&utm_content=post_01
- Instagram: https://16-doffy.github.io/videcode-chua-cau-nguyen/?utm_source=instagram&utm_medium=social&utm_campaign=beta_launch&utm_content=post_01
- TikTok: https://16-doffy.github.io/videcode-chua-cau-nguyen/?utm_source=tiktok&utm_medium=social&utm_campaign=beta_launch&utm_content=video_01

Hiện cho phép source facebook/instagram/tiktok/youtube, campaign beta_launch, medium social/paid_social/cpc/organic; content bio hoặc post/reel/story/video kèm số. Cần cập nhật danh sách khi có chiến dịch khác. Mã bỏ các query/hash khác khỏi URL trước khi tải Google tag. Không đặt thông tin cá nhân trong UTM.

## Bảo vệ và giới hạn

CSP được đặt bằng meta: script chỉ từ cùng nguồn hoặc Google Tag Manager; chặn object/frame, form submit qua mạng và hạn chế connect/img/font. Có `no-referrer` để tránh gửi URL thô qua header Referer ra ngoài. Style inline vẫn cho phép vì cảnh/giao diện dùng màu động. CSP meta không thay thế các security header như frame-ancestors; GitHub Pages không phải backend tài khoản/thanh toán.

Kiểm tra logic: `node tests/analytics.mjs`. Kiểm tra trình duyệt cho consent và payload dùng tag giả để không gửi dữ liệu thử nghiệm riêng tư sang Google; kiểm tra kết nối tag thật được báo riêng với giới hạn tương ứng.

Tài liệu tham chiếu: [Google basic consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode), [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [Google enhanced measurement](https://support.google.com/analytics/answer/9216061).
