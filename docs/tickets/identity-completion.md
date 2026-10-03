Đã hoàn thành ticket #2 trong nhánh local work/v1-operations, commits db32631 và 82f647d.

Tạo quản trị đầu tiên một lần; đăng nhập/đăng xuất; scrypt có salt, cookie HttpOnly/SameSite Strict; cấp tài khoản; bắt buộc đổi mật khẩu lần đầu; đổi mật khẩu thường; thu hồi phiên. SQLite giữ dữ liệu sau restart. Nguồn ngoài và thử đăng nhập lặp bị chặn.

Năm kiểm tra API qua. Build qua. Lệnh dev:local chạy cả API và UI. Browser kiểm tra màn tạo quản trị và kích thước điện thoại. Review Standards/Spec tìm lỗi login đồng thời và thiếu nút đổi mật khẩu thường; đã vá và reviewer xác nhận.

Chưa có grant theo giải, danh bạ và giải thật; các phần đó thuộc tickets kế tiếp. Không triển khai công khai, không đẩy source lên remote.
