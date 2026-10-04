## What to build
Hồ sơ đội thật theo mẫu A, mở từ danh bạ/đăng ký/trận và quay lại đúng ngữ cảnh. Đội hình theo giải, thêm người có sẵn hoặc tạo nickname-only, hỗ trợ 8 người. Họ tên/vị trí tùy chọn. Không roster chung.
## Acceptance criteria
- [ ] Profile A responsive; chọn giải, đăng ký, giải đã tham dự, lịch/kết quả thật hoặc empty state.
- [ ] Danh bạ player: nickname bắt buộc, name/position tùy chọn; giữ tương thích client cũ.
- [ ] Thêm người và đăng ký atomic qua HTTP; kiểm tra quyền/revision; sau khóa dùng additions có lý do hiện có.
- [ ] 8 thành viên; ảnh fallback; hover nhẹ/reduced motion; không giả dữ liệu.
- [ ] Snapshot name/handle/position giữ nguyên qua sửa danh bạ; restart và quyền đọc theo giải kiểm chứng.
## Blocked by
None (can start immediately).
