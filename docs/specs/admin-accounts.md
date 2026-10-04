# Quản trị tài khoản

- Trang riêng trong bản vận hành. Chỉ quản trị được vào; API cũng kiểm tra quyền.
- Danh sách tìm theo tên/tên đăng nhập, trạng thái, quyền quản trị và các quyền theo giải. Không trả hash, mật khẩu hay session token.
- Cấp tài khoản; chỉnh tên; cấp/thu hồi quyền quản trị; khóa/mở; đặt mật khẩu tạm (buộc đổi); thu hồi phiên; gán quyền theo giải; xem lịch sử.
- Tên đăng nhập giữ nguyên. Mọi sửa dùng revision để tránh ghi đè. Khóa, đổi quyền quản trị, reset mật khẩu, thu hồi phiên đều vô hiệu phiên cũ.
- Không cho tự khóa, tự đổi quyền quản trị, tự reset hoặc tự thu hồi phiên tại bảng này. Tự đổi mật khẩu/đăng xuất dùng luồng hiện có. Luôn giữ ít nhất một quản trị hoạt động đã đổi mật khẩu.
- Audit người thực hiện, thời điểm, loại thao tác, dữ liệu trước/sau. Không ghi mật khẩu. Cấp tài khoản và gán quyền theo giải cũng có audit.
- Không xóa tài khoản qua UI. Giữ người thực hiện trong lịch sử kết quả.
- Bỏ persona An Nguyễn trong giao diện mẫu (không có tài khoản này trong DB). Giữ giải mẫu. Tạo admin được người dùng chỉ định qua thao tác cục bộ; không đưa credentials vào Git.
- Database hiện trống. Tạo Community Cup 2026 thật: 8 đội, 2 bảng vòng tròn hai lượt, loại kép; 5 tuyển thủ mẫu mỗi đội. Giữ bản nháp để người dùng tự chốt.
- Tạo tài khoản thử: điều hành, nhập liệu, cả hai, không có quyền. Kiểm tra toàn bộ route qua HTTP trên bản sao database; không sửa kết quả giải thật khi test.
- Test seam đã được người dùng giao tự chọn trong phiên: HTTP API trên SQLite thật tạm; UI qua browser. Chạy full suite và build. Review hai trục.
