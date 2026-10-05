# Một role toàn hệ thống cho mỗi tài khoản

Ngày 2026-10-05, người dùng chọn bốn role: admin, operator, referee và caster. Mỗi tài khoản có một role cho mọi giải. Chỉ admin quản lý tài khoản. Quyết định thay thế mô hình ghép operator/entry và cấp quyền riêng theo giải trong thiết kế v1.

Referee ghi, xác nhận và sửa kết quả cũ. Caster chỉ đọc dữ liệu nghiệp vụ. Operator quản lý toàn bộ vận hành nhưng không quản lý tài khoản. Admin có mọi quyền. Xem [spec và ma trận quyền](../specs/global-roles.md).

Migration chuyển quyền cũ theo thứ tự admin, operator, entry thành referee, còn lại caster. Thu hồi phiên cũ. Giữ bảng grants chỉ để bảo toàn dữ liệu cũ; API grants trả 410 và UI không còn cấp quyền theo giải. Sửa role là thao tác quản trị có revision, lịch sử và thu hồi phiên.

Mọi giải đều nhìn thấy được theo phạm vi của role. Không còn cách cấp hoặc thu hồi một giải riêng. Referee đọc metadata để chọn trận và đội hình. Caster được đổi mật khẩu riêng và đăng xuất; các thao tác này không phải chỉnh sửa dữ liệu nghiệp vụ.

Giữ quyết định 0001: thể thức vẫn chốt một lần trước khi thi đấu. Role rộng hơn không vượt quy tắc tính điểm, kiểm tra revision hay giới hạn sửa trận khi trận sau đã bắt đầu.
