# Duy Giới — Videcode chùa cầu nguyện

Không gian đền neon 3D của Duy, dành cho những khoảng nghỉ giữa một ngày nhiều tiếng ồn.

**Chơi tại:** https://16-doffy.github.io/videcode-chua-cau-nguyen/

## Có gì trong thế giới này?

- Đền trên đảo nổi, cực quang, sao băng, đom đóm và hồ ánh sáng.
- Chạm trực tiếp đèn, chuông, mặt hồ hoặc dùng các nút để thắp đèn, nghe chuông, gửi điều ước.
- 100 lời nhắn tiếng Việt viết riêng theo sáu tâm trạng và từng hành động, rút hết bộ mới lặp.
- Giữ câu thích để đọc lại; khoảng nghỉ 30 giây với vòng sáng có thể dừng bất cứ lúc nào.
- Hỗ trợ điện thoại, bàn phím, chế độ hiệu ứng nhẹ và giảm chuyển động.
- Font, Three.js và toàn bộ tài nguyên cần chạy được đóng gói trong repo.

Điều ước, số đèn và câu đã giữ chỉ lưu trong trình duyệt trên thiết bị hiện tại. Không có tài khoản, chat nhiều người, máy chủ dữ liệu hoặc tính năng đoán vận mệnh.

## Chạy local

Cần Node.js, không cần cài dependencies:

```sh
node serve.cjs
```

Mở http://localhost:4173. Kéo để xoay, cuộn hoặc chụm hai ngón để zoom; phím 1/2/3 chuyển khu vực. Âm thanh chỉ phát khi bạn bật nút ở góc trên.

## Deploy GitHub Pages

Nhánh `main` chứa source. GitHub Pages phục vụ thư mục gốc nhánh `gh-pages`, được tách từ `dist/`.

Sau khi chỉnh sửa, commit source, push `main`, rồi chạy:

```sh
node deploy.cjs
```

Script push nội dung `dist/` tới `gh-pages`; GitHub tự chạy lượt build Pages. Không cần token lưu trong repo.

## Công nghệ và nguồn

HTML/CSS, JavaScript modules, Three.js 0.169.0, Web Audio API, localStorage. Cảnh 3D được dựng từ hình học, không tải mô hình từ website khác.

Ý tưởng tham khảo: [didenchua.online](https://didenchua.online/). Thiết kế, cảnh và lời nhắn của Duy Giới được viết riêng. Xem [khảo sát thiết kế](./RESEARCH.md).

Three.js dùng giấy phép MIT trong `dist/vendor/THREE-LICENSE.txt`. Font Be Vietnam Pro và Manrope dùng SIL OFL, kèm giấy phép trong `dist/fonts/`.
