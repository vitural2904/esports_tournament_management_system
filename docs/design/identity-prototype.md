# Mẫu nhận diện, hồ sơ đội và tín hiệu trận

Primary source: nhánh `codex/prototype-identity`. Câu hỏi: bố cục nào giúp hồ sơ đội dễ đọc, ảnh nhất quán và trạng thái lịch rõ mà không làm dashboard quá tải?

Mẫu nằm trong OperationsApp, dưới header đăng nhập hiện tại. Chỉ hoạt động ở development. Không đổi API/schema, không ghi dữ liệu thật. Chưa chọn mẫu thắng.

Chạy `npm run prototype:identity` nếu ứng dụng chưa chạy. Nó khởi động cả API và Vite giống `dev:local`. Mở:

`http://127.0.0.1:5173/?app=operations&prototype=identity&variant=A`

Đăng nhập tài khoản hiện tại nếu cần. Thanh dưới màn hình đổi mẫu; phím trái/phải cũng đổi khi không nhập liệu. URL giữ variant qua reload.

## Ba hướng

- A: đầu trang đội gọn, roster năm cột desktop, hai cột mobile, giới thiệu và giải tham dự phía sau. Khuyến nghị để phát triển tiếp.
- B: thông tin đội bên trái, bảng roster bên phải. Ưu tiên tốc độ vận hành và kiểm tra đăng ký.
- C: tên đội lớn, một tuyển thủ nổi bật, toàn roster phía dưới. Ưu tiên diện mạo esports; nhiều không gian hơn trên mobile.

Ba tab dùng chung: Hồ sơ đội, Lịch & tín hiệu, Nhận diện & ảnh. Dữ liệu giả được ghi rõ trên màn hình. Chân dung mẫu là minh họa không có khuôn mặt; bốn tuyển thủ còn lại thử fallback thiếu ảnh.

## Các tương tác thử được

- Lịch: 17:20/17:35/18:00/18:05. Hai trận cùng 18:00 nhận cùng nhãn Tiếp theo. Sau giờ lịch cùng chuyển chú ý; trận 19:00 nhận Tiếp theo đồng thời giữ Chờ đủ điều kiện.
- Xác nhận game mẫu đổi nhãn và bỏ việc chờ xác nhận, vẫn giữ trạng thái vận hành. Nút lỗi lưu mẫu hiển thị rose với chữ giải thích.
- Logo đội/giải/app/favicon; ảnh tuyển thủ và bìa. Fixtures logo trong suốt, nền trắng, ngang; ảnh chân dung và cutout minh họa.
- Chọn PNG/JPEG/WebP tối đa 10MB ở máy để preview bằng object URL. Không gửi file đến server. Thay nền preview và điểm cắt ảnh. Áp dụng ảnh đội/chân dung/bìa vào profile mẫu; gỡ về fallback.
- Favicon chỉ là preview 16/32/64/128px; không thay favicon thật. Nhận diện app/giải cũng chỉ preview.
- State sống trong bộ nhớ. Reload mất mọi thay đổi ảnh. Đổi tab/mẫu giữ ảnh đã áp dụng, nhưng lịch giả lập đặt lại khi rời tab hoặc đổi mẫu.

## Phạm vi chưa triển khai

Không có xử lý upload máy chủ, kho media, crop zoom, loại bỏ metadata, snapshot media theo roster, quyền media hay phiên bản asset. Điểm cắt dùng object-position để thử UI, chưa phải pipeline crop ảnh. Không tự xóa nền. Ảnh bìa mới chỉ áp dụng vào mẫu A; B và C cố ý có cấu trúc khác.

Sau khi chọn bố cục, viết lại phần thắng theo thiết kế [media](media-and-team-profiles.md) và [tín hiệu](visual-signals.md). Giữ mẫu thử ở nhánh riêng làm nguồn tham chiếu.

## Kiểm chứng

- Build/typecheck đạt. Không thêm test tự động cho mã prototype dùng một lần.
- Browser authenticated: ba variant chạy, nhãn lịch cùng giờ/quá giờ và xác nhận đúng; logo nền trắng và ngang load thành công với contain; portrait/cutout áp dụng vào profile.
- Các slot logo giải/app/favicon/bìa mở được; chọn WebP từ máy cập nhật preview rồi áp dụng bìa trong memory.
- Responsive 390×844: profile A/B/C và vùng nhận diện không làm document tràn ngang. Override viewport được reset sau kiểm tra.
- Prototype không gọi mutation API. Các hành động thực trên header (logout/password) vẫn thuộc ứng dụng thật, không phải nút mẫu.
