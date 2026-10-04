# Mở ứng dụng để chọn giải

Admin chọn “Chọn giải đang quản lý” làm việc đầu tiên khi mở ứng dụng. Trang cũ tự chọn giải đầu tiên rồi xếp nhánh đấu, phân quyền, các form tạo giải, danh bạ và đăng ký cùng một màn hình. Thay bằng luồng chọn giải → tổng quan giải → công cụ cần dùng.

## Phạm vi

- Trang Giải đấu chỉ hiện danh sách giải, trạng thái chuẩn bị/chốt và số đội. Không tự chọn giải.
- Nút Tạo giải mới mở form. Hủy đóng form. Giữ dữ liệu giải hiện tại.
- Chọn giải mở Tổng quan ngắn, một hành động chính theo trạng thái giải.
- Công cụ trong giải chia Tổng quan, Trận đấu, Đăng ký, Thể thức, Phân quyền. Đăng ký dành cho điều hành; Phân quyền dành cho admin. API vẫn thực thi quyền hiện tại.
- Trận đấu chưa chốt có trạng thái trống rõ ràng, đường sang Thể thức.
- Công cụ chỉ khởi tạo khi người dùng mở lần đầu. Sau đó giữ công cụ đã mở trong giải, ẩn các tab khác để giữ bản đang nhập khi đổi tab. Rời giải/trang hoặc tải lại không lưu bản nháp chưa gửi.
- Danh bạ và Tài khoản là khu riêng. Form tạo/sửa danh bạ và đăng ký chỉ mở qua hành động cụ thể.
- Thành viên có quyền điều hành cũng có đường đến Danh bạ. Không thay luồng thành viên chỉ nhập liệu trong đợt này.
- Giữ font, gradient tĩnh đã duyệt. Motion ngắn, hỗ trợ reduced motion. Không thêm hiệu ứng nền.

## Kiểm chứng

Browser: trang đầu không có form/cây nhánh; mở và hủy tạo giải; chọn giải; chuyển công cụ; mở/đóng chỉnh đăng ký; chuyển tab giữ bản nhập; danh bạ mở/đóng form; tài khoản vẫn truy cập được; điện thoại không tràn ngang.

Production build/typecheck và bộ kiểm tra API đầy đủ. Đợt này đổi điều hướng UI, không đổi schema hay API. Không cần dữ liệu giả mới trong cơ sở dữ liệu thật.
