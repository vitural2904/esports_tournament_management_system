## What to build
Upload logo/bìa đội và ảnh tuyển thủ qua UI hồ sơ/danh bạ. Lưu SQLite asset versions, bảo vệ quyền, snapshot media và backup/restore.
## Acceptance criteria
- [ ] PNG/JPEG/WebP tĩnh: 10MB/24MP/8192px, content inspection, EXIF/metadata/alpha, không upscale.
- [ ] Preview nền logo/điểm trọng tâm, thay/gỡ, lỗi giữ ảnh cũ, revision conflict.
- [ ] Đọc ảnh có quyền; người không có grant không đọc snapshot media của giải.
- [ ] Snapshot đăng ký giữ ảnh cũ sau thay/gỡ danh bạ; asset ID bất biến.
- [ ] DB backup/restore gồm ảnh; restart, quyền, giới hạn, giả file có test HTTP.
## Blocked by
01 — Hồ sơ đội và danh sách linh hoạt.
