# Team image controls

GitHub issue: https://github.com/vitural2904/esports_tournament_management_system/issues/17

# Problem
Ban tổ chức không thấy chức năng tải ảnh đội tuyển. Bộ lưu media đã có, nhưng nút logo/ảnh bìa bị ẩn sau “Sửa hồ sơ”. Form sửa đội trong danh bạ chỉ có tên và tên viết tắt.

# Scope
- Hiện nút thêm/thay logo và ảnh bìa ngay trong hồ sơ đội, không cần mở sửa thông tin.
- Thêm lối vào “Ảnh đội” từ danh bạ đội tuyển.
- Giữ bộ tải PNG/JPEG/WebP hiện có: preview, thay/gỡ, lưu lâu dài, kiểm tra quyền và revision.
- Chỉ admin/operator sửa ảnh. Caster/referee không thấy công cụ sửa.
- Ảnh danh bạ đổi ngay. Ảnh đăng ký giải cũ giữ nguyên; hiển thị rõ thông báo này.

# Acceptance
Từ Danh bạ → Ảnh đội, chọn ảnh, xem trước, lưu, tải lại vẫn thấy ảnh. Thay và gỡ được cả logo lẫn ảnh bìa. Lưu ảnh không làm mất nội dung hồ sơ đang nhập. Kiểm tra desktop/mobile, quyền chỉ đọc, build và suite hiện có.

# Context
User request 2026-10-06. Follow docs/specs/team-profiles-media-signals.md and ADR 0002. No format or tournament-result changes.
