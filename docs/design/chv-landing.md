# CHV landing

## Yêu cầu

- Trang `/` là landing công khai. Nền xoay quanh ảnh người dùng cấp.
- Chỉ cần brand `bracket.`, đăng nhập trên bar và một nút đăng nhập chính.
- Tách nền `logo_original.jpg`. Làm favicon rõ. Thay biểu tượng hai kiếm cạnh brand.
- Tham khảo portfolio dùng một ảnh tĩnh và React Bits Micro.
- Giữ đường vào app `/?app=operations`. Không thêm đăng ký tài khoản.

## Hướng chọn

[Codrops Background Segment Effect](https://tympanus.net/codrops/2016/09/21/background-segment-effect-with-css-clip/) lấy cảm hứng từ portfolio Filippo Bello. Một ảnh được lặp thành các mảng cắt, kết hợp chuyển động và parallax. Landing này tự viết hai mảng nhỏ ở viền, chuyển động chậm; phần sư tử và chữ giữa ảnh vẫn rõ. Không dùng mã hay ảnh của demo. Nền trôi theo chuột tối đa 8px ngang và 6px dọc.

Đã đọc registry chính thức [React Bits Micro Sling Button](https://reactbits.dev/c/micro/sling-button) (`SlingButton-TS-CSS.json`). Bản gốc kéo/thả một nút tròn. Landing lấy nguyên lý lực đàn hồi, tự viết link chữ nhật với spring nhẹ khi hover. Không bắt kéo, giữ hoặc chờ để đăng nhập. Click, touch, Enter và mở tab mới dùng hành vi link bình thường. Đây là bản lấy cảm hứng, không phải component Sling Button nguyên bản.

Có nút dừng nền. Reduced motion tắt cả nền và lực kéo. Font giữ Lens Grotesk / Be Vietnam Pro của ứng dụng. Không thêm menu, thẻ nội dung hay copy tiếp thị. Demo cũ chuyển sang `/?app=demo`; builder vẫn ở `/?prototype=builder`.

## Asset

- `public/brand/landing-original.jpg`: copy nguyên `D:/Downloads/logo_giai.jpg`, 2048 × 2048.
- `docs/design/source-assets/logo_original.jpg`: copy nguyên ảnh logo 960 × 960.
- `public/brand/chv-logo.png`: logo đầy đủ đã tách nền, 1254 × 1254.
- `public/brand/chv-mark.png`: đầu sư tử và vương miện, 1254 × 1254. Dùng làm favicon để không nhét chữ nhỏ vào icon.
- Cả hai PNG dùng imagegen tích hợp, alpha thật 0–255. Prompt: giữ thiết kế đỏ/đen/trắng; bỏ nền ngoài; giữ trắng trong logo; làm nét cạnh. Bản mark bỏ banner, chữ, lá và khiên. Imagegen làm lại nét, không phải vector hóa chính xác từng pixel.
- `node scripts/brand-assets.mjs` chỉ đổi kích thước/định dạng. Tạo WebP nền; PNG 16, 32, 48, 64, 180, 192, 512; ICO chứa 16/32/48. Master và JPG gốc giữ nguyên.

## Kiểm tra

Browser seam hiện có: landing không gọi API; hai link đăng nhập; bàn phím Enter vào login; tài khoản đăng nhập được vào workspace. Chụp desktop 1280 × 900 và mobile 390 × 844 trong `output/playwright/`. Chạy build, API/domain, operations và UI suite. Chỉ kiểm tra tại máy Windows. Chưa xác nhận CI Linux hoặc domain/Tunnel thật.
