# Third’s Hideaway — Videcode chùa cầu nguyện

Không gian đền neon 3D của Third, dành cho những khoảng nghỉ giữa một ngày nhiều tiếng ồn.

**Chơi tại:** https://16-doffy.github.io/videcode-chua-cau-nguyen/

## Thư viện trò chơi

Trang gốc là thư viện kiểu Steam: mỗi trò một ô, bấm để chơi.

- **Chùa cầu nguyện** (`chua.html`): ngôi đền neon bên dưới.
- **Third’s Zoo** (`zoo/`): game quản lý vườn thú 3D, lấy cảm hứng từ thể loại mô phỏng vườn thú. Tự do vẽ mạng lưới lối đi và dựng chuồng đa giác khép kín bằng hàng rào 3 cấp (rào thấp thì thú xổng chuồng ra đường); tô địa hình (cỏ, đất khô, cát, tuyết, sỏi đá) và đặt hồ nước, nhà trú, cây theo môi trường, đồ chơi. Mỗi con thú có giới tính, tuổi, sức khỏe và 8 nhu cầu (ăn, uống, bầy đàn, môi trường, chỗ trú, vui chơi, sức khỏe, vệ sinh) gộp thành phúc lợi; thú vui thì sinh con, ốm thì cần bác sĩ, già thì mất. Khách tham quan và nhân viên (chăm thú, bác sĩ, thợ máy, lao công, bảo vệ) di chuyển thực tế trên mạng lưới lối đi; xây quầy ăn, quầy nước, nhà vệ sinh, thùng rác, ghế nghỉ sát đường; điều chỉnh giá vé và giá quầy, nghiên cứu mở khóa đồ, chợ thú, thả thú về tự nhiên lấy điểm bảo tồn, sổ thu chi 7 ngày, mục tiêu 3 bậc sao và bản đồ nhiệt cảm xúc khách. Mô phỏng ở `dist/zoo/sim.js` (không vẽ, chạy được bằng Node qua `dist/zoo/geom.js`), hình 3D ở `dist/zoo/world.js`, giao diện ở `dist/zoo/ui.js`, số liệu ở `dist/zoo/data.js`. Tám loài dùng mô hình 3D từ Sketchfab (CC BY 4.0, ghi nguồn ở `dist/zoo/credits.html`); `dist/zoo/models/manifest.json` khai file, chiều cao và đoạn cử động. Chế độ admin `zoo/?admin`: mọi thứ miễn phí, mở hết nghiên cứu, lưu riêng (`thirds-zoo-admin-v3`). Kiểm tra: `node tests/zoo-sim.mjs` (mô phỏng), và khi `node serve.cjs` đang chạy: `node tests/zoo-play.cjs`, `node tests/zoo-admin.cjs`, `node tests/hub-check.cjs`.

## Có gì trong thế giới này?

- Đền trên đảo nổi, cực quang, sao băng, đom đóm và hồ ánh sáng.
- Chạm trực tiếp đèn, chuông, mặt hồ hoặc dùng các nút để thắp đèn, nghe chuông, gửi điều ước.
- 100 lời nhắn tiếng Việt viết riêng theo sáu tâm trạng và từng hành động, rút hết bộ mới lặp.
- Giữ câu thích để đọc lại; khoảng nghỉ 30 giây với vòng sáng có thể dừng bất cứ lúc nào.
- Hỗ trợ điện thoại, bàn phím, chế độ hiệu ứng nhẹ và giảm chuyển động.
- Font, Three.js và toàn bộ tài nguyên cần chạy được đóng gói trong repo.
- Bốn chibi có animation, chọn bạn đồng hành khi vào và đổi tự do trong phiên.
- Bản đồ chín điểm đến, gồm bốn khu cầu nguyện riêng, Vườn Tarot và Đài Hoàng Đạo.
- Tarot 22 lá Ẩn chính, trải một/ba lá, lật bài, chủ đề và lưu lịch sử trên thiết bị. Mười hai cung có gợi ý theo ngày, không cần nhập ngày sinh.

Nhân vật, điều ước, số đèn, câu đã giữ, cung đã chọn và trải bài chỉ lưu trong trình duyệt trên thiết bị hiện tại. Lời nguyện chỉ nhớ khi bạn chọn lưu. Không có tài khoản, chat nhiều người, máy chủ dữ liệu hoặc thanh toán. Tarot/hoàng đạo là nội dung giải trí và tự suy ngẫm.

Google Analytics chỉ tải khi người dùng đồng ý, có thể tắt trong “Dữ liệu & thống kê”. Không gửi nội dung nhập vào các sự kiện ứng dụng. Xem [cấu hình, sự kiện và link chiến dịch](./ANALYTICS.md).

Xem [phạm vi, model tham khảo và các bước trước khi kinh doanh](./PRODUCT.md).

## Chạy local

Cần Node.js, không cần cài dependencies:

```sh
node serve.cjs
```

Mở http://localhost:4173. Kéo để xoay, cuộn hoặc chụm hai ngón để zoom; phím 1/2/3 chuyển khu vực. Âm thanh chỉ phát khi bạn bật nút ở góc trên.

Chạy `node tests/core.mjs` để kiểm tra rig nhân vật, animation, dữ liệu và logic rút bài. Xem [kết quả và giới hạn kiểm tra](./QA.md).

## Deploy GitHub Pages

Nhánh `main` chứa source. GitHub Pages phục vụ thư mục gốc nhánh `gh-pages`, được tách từ `dist/`.

Sau khi chỉnh sửa, commit source, push `main`, rồi chạy:

```sh
node deploy.cjs
```

Script push nội dung `dist/` tới `gh-pages`; GitHub tự chạy lượt build Pages. Không cần token lưu trong repo.

## Công nghệ và nguồn

HTML/CSS, JavaScript modules, Three.js 0.169.0, Web Audio API, localStorage. Cảnh 3D được dựng từ hình học, không tải mô hình từ website khác.

Ý tưởng tham khảo: [didenchua.online](https://didenchua.online/). Thiết kế, cảnh và lời nhắn của Third’s Hideaway được viết riêng. Xem [khảo sát thiết kế](./RESEARCH.md).

Three.js dùng giấy phép MIT trong `dist/vendor/THREE-LICENSE.txt`. Font Be Vietnam Pro và Manrope dùng SIL OFL, kèm giấy phép trong `dist/fonts/`.
