# Bốn role toàn hệ thống

Mỗi tài khoản có đúng một role: admin, operator, referee hoặc caster. Role áp dụng cho mọi giải hiện tại và tương lai. Thay thế quyền kết hợp theo từng giải.

| Role | Quyền |
| --- | --- |
| admin | Mọi chức năng, gồm tạo và quản lý tài khoản |
| operator | Mọi chức năng vận hành, danh bạ, đăng ký, thể thức, lịch và kết quả; không quản lý tài khoản |
| referee | Danh sách giải để chọn trận, đọc trận và dữ liệu đội hình cần cho trận; lưu nháp, gửi, xác nhận, sửa kết quả cũ, xử thắng; không sửa lịch, thể thức, đăng ký hay danh bạ |
| caster | Đọc giải, trận, tiến trình, đội tuyển và tuyển thủ; không sửa dữ liệu nghiệp vụ |

Mọi tài khoản vẫn đổi mật khẩu riêng và đăng xuất. Caster không được đổi dữ liệu nghiệp vụ. Referee không có công cụ danh bạ hoặc tiến trình; API cho phép metadata giải cần hiển thị trận, không cho đọc danh bạ, hồ sơ đội hoặc bảng xếp hạng riêng.

Chỉ admin cấp, đổi role, khóa, reset mật khẩu, thu hồi phiên hoặc đọc lịch sử tài khoản. Đổi role thu hồi phiên cũ; giữ ít nhất một admin hoạt động. Bỏ UI và API cấp quyền riêng theo giải. Các ràng buộc revision, lịch sử và ảnh hưởng đến trận sau khi sửa kết quả giữ nguyên.

Migration: admin cũ giữ admin; tài khoản có grant operator thành operator; còn lại có grant entry thành referee; tài khoản không có grant thành caster. Thu hồi phiên cũ khi migration. Giữ dữ liệu grants cũ chỉ để bảo toàn lịch sử, không còn cấp quyền. Không tạo quyền admin từ request không hợp lệ.

Kiểm tra qua các giao diện đã có: HTTP API, browser UI, backup/restore. Kiểm tra ma trận bốn role, kết quả mới và cũ, caster chỉ đọc, đổi role thu hồi phiên, migration và UI hồi quy.

Sau kiểm tra: backup dữ liệu local, khởi động app bản mới, tạo một tài khoản operator, referee và caster bằng API admin. Mật khẩu ngẫu nhiên; yêu cầu đổi lần đầu. Lưu thông tin trong file riêng ngoài Git. Giữ admin hiện có.
