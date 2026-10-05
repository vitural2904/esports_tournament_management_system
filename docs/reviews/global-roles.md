# Review bốn role toàn hệ thống

Baseline: b9f16f0. Spec: docs/specs/global-roles.md. Hai trục review độc lập.

## Standards

Tìm thấy referee reload vẫn gọi standings, trang accounts render không kiểm tra admin, và hai CSS class quản lý tài khoản bị đổi tên. Đã sửa cả ba. Không có vấn đề bảo mật hoặc chuẩn code khác được báo.

## Spec

Hai lỗi reload và accounts nói trên được xác nhận độc lập. Review lại: không còn finding. Quyền mới, migration, thu hồi phiên và chức năng sửa kết quả cũ khớp spec.

## Validation

Kết quả cuối: build thành công; 70 kiểm tra API/domain và 5 luồng UI đều qua.

Kiểm tra HTTP API gồm ma trận bốn role, login, đổi role, thu hồi phiên, dữ liệu cũ, migration và referee đổi đội thắng của trận đã hoàn tất. UI gồm tạo role bởi admin, operator chuẩn bị giải, referee ghi/xác nhận/sửa kết quả cũ, caster đọc tiến trình/danh bạ và bị chặn viết, accounts deep link không lộ công cụ, đổi role thu hồi phiên. Ba hồi quy hồ sơ và luồng giải bốn đội tiếp tục được chạy.

Dữ liệu local được sao lưu trước migration vào .local/backups/before-global-roles-20261005.sqlite. Tạo ba tài khoản bằng API admin. Kiểm tra login trả đúng role và yêu cầu đổi mật khẩu lần đầu. Mật khẩu và backup nằm ngoài Git. Không thay mật khẩu hoặc tạo thêm admin.
