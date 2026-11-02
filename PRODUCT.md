# Duy Giới — bản trải nghiệm mở rộng

## Phạm vi đã triển khai

- Bốn chibi Mây, Na, Miu, An với model hình học và rig riêng. Chọn khi vào, đổi trong phiên, nhớ lựa chọn trên thiết bị.
- Animation: đứng nghỉ, đi tới vị trí, cúi chào, chắp tay, gõ chuông, thả đèn, xáo bài và ngắm sao. Đổi đảo dùng cổng dịch chuyển rồi đi một đoạn tới điểm tương tác; chưa phải game đi bộ tự do có vật lý/collision.
- Chín điểm trên bản đồ: chính điện, bốn khu chùa cầu nguyện riêng, chuông, hồ đèn, tarot và hoàng đạo. Kiến trúc, tên và lời nguyện của các khu là hư cấu.
- Tarot dùng 22 lá Ẩn chính, không phải toàn bộ bộ 78 lá. Minh họa SVG và lời giải viết riêng. Trải một hoặc ba lá, bốn chủ đề, lựa chọn góc nhìn ngược, lật từng lá, lưu tối đa 12 trải bài trên thiết bị.
- Mười hai cung: tự chọn cung, biểu tượng và chủ đề, ba gợi ý theo ngày. Cùng cung/cùng ngày cho cùng gợi ý. Không dùng dữ liệu thiên văn hoặc giờ/nơi sinh để tính bản đồ sao; không cần cung cấp ngày sinh.
- Kế thừa 100 lời nhắn, lưu câu, vòng nghỉ, đèn, âm thanh và các chế độ hiển thị trước đó.

## Model tham khảo

Link Duy cung cấp: https://sketchfab.com/3d-models/pagoda-dfc7fc0095014d7da0da129b984af346

API công khai tại thời điểm 02/11/2026: `isDownloadable: false`, `animationCount: 0`, `faceCount: 2224251`, tác giả `loaferspore / okotaru`. Nhãn license API là Standard; nhãn này không cung cấp file tải hay chứng minh dự án đã mua quyền dùng model.

Không tải trích xuất, không nhúng asset này và không đưa model đó vào repo. Khu chùa và nhân vật trong bản này được dựng bằng code của dự án. Nếu sau này mua/được cấp file chính thức, cần giữ chứng từ quyền sử dụng, tối ưu model và đo trên thiết bị thật trước khi tích hợp.

## Dữ liệu và giới hạn của bản đang chạy

Toàn bộ trải nghiệm chạy ở trình duyệt. localStorage giữ nhân vật, số đèn, điều ước gần nhất, câu đã giữ, cung đã chọn và trải bài đã lưu. Lời nguyện chỉ được lưu khi người dùng đánh dấu muốn nhớ. Không có tài khoản, đồng bộ đa máy, xử lý thanh toán, cộng đồng hay backend. Google Analytics là tùy chọn sau khi người dùng đồng ý, có nút tắt; cấu hình, dữ liệu và giới hạn nằm trong ANALYTICS.md.

Tarot và hoàng đạo là nội dung giải trí, tự suy ngẫm. Không đưa ra kết luận chắc chắn về tình cảm, sức khỏe hoặc tài chính, và không thu phí để “giải hạn” hay hứa biến điều ước thành thật.

## Trước khi mở kinh doanh

1. Cho người dùng thử và ghi nhận nơi họ bỏ cuộc, mức dễ hiểu của chọn chibi, bản đồ, trải bài và lời nhắn. Chưa có số liệu người dùng thật.
2. Đo thời gian mở cảnh, độ ổn định và trải nghiệm trên điện thoại Android/iPhone thật. Hiện chưa có chứng cứ FPS hoặc tải đồng thời để cam kết thương mại.
3. Chốt giá trị trả phí cùng Duy trước khi xây hệ thống tài khoản, quyền lợi và thanh toán. Các lựa chọn chưa quyết định: trang phục/chủ đề hoặc hội viên. Không giả lập nút mua thành thanh toán thật.
4. Nếu có tài khoản và thu phí: thiết kế quyền lợi phía server, kiểm chứng thanh toán phía server, quản lý hoàn tiền, hỗ trợ, điều khoản và thông báo dữ liệu phù hợp với hoạt động thực tế. Chỉ triển khai sau khi có nhà cung cấp và yêu cầu cụ thể.
5. Hoàn thiện nhận diện, nội dung, bản quyền asset, kiểm tra bảo mật và vận hành trước khi quảng cáo là sản phẩm thương mại hoàn chỉnh.

Không coi bản demo này là bằng chứng đã sẵn sàng thu tiền hoặc có doanh thu.

## Nguồn khảo sát

- Sketchfab model API: https://api.sketchfab.com/v3/models/dfc7fc0095014d7da0da129b984af346
- Sketchfab Download API guidelines: https://sketchfab.com/developers/download-api/guidelines
- V&A, lịch sử và cấu trúc bộ tarot: https://www.vam.ac.uk/articles/tarot-cards — bộ chuẩn gồm 78 lá, trong đó có 22 lá Ẩn chính. Dự án dùng một bộ 22 lá và tự viết nội dung.
- Các nguồn về thư giãn và nội dung tử tế được lưu trong RESEARCH.md.
