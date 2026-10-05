# Production HTTPS, vận hành và phục hồi — kiểm chứng

Spec: `docs/specs/hostinger-production.md`. Ticket GitHub #15 (HTTPS/Tunnel) và #16 (gộp vận hành + phục hồi). Fixed point: `e30cadb0560eddbef1751e9bc8b3ef3b628662e6`. Nhánh: `codex/hostinger-production`. Chưa triển khai public.

## Standards

Review độc lập: 0 lỗi chuẩn bắt buộc, một nhận xét trùng predicate đường dẫn (P3). Đã dùng chung `shared/paths.mjs`. Review lại đến `3c9f0d6`: 0 lỗi, 0 nhận xét cần sửa.

## Spec

Review độc lập và review lại: 0 finding còn mở. Bốn role theo ADR 0002. Cửa kiểm tra Linux và VPS thật còn mở; không tuyên bố go-live.

## Local đã chạy

- Build/typecheck thành công. Không thay giao diện nghiệp vụ.
- 75/75 API/domain test qua, gồm 5 test production mới: chặn bootstrap web; từ chối cấu hình sai; Secure cookie/origin; IP qua proxy; bootstrap stdin; health (các hành vi liên quan được gộp trong từng test).
- 3/3 kiểm tra vận hành qua: gói release + backup/restore; lỗi offsite/retention/checksum; cấu hình Tunnel thật.
- 6/6 luồng trình duyệt qua: 5 hồi quy local và bốn role qua Caddy HTTPS thật trong một luồng production. Có kiểm tra header IP giả vẫn bị giới hạn đăng nhập.
- ShellCheck 0 finding. Bash syntax qua cho update và Linux CI script. Caddy Tunnel validate qua.
- Backup khi API chạy, đọc lại bản offsite giả lập bằng thư mục tạm, rồi phục hồi bằng API từ gói release: kết quả, lịch sử và ảnh khớp. Phiên cũ bị thu hồi trong DB phục hồi; DB nguồn vẫn dùng được.
- Offsite mất thì không dọn backup cũ. Chỉ dọn bản local quá hạn có archive đọc lại đúng checksum. Backup hỏng không tạo DB phục hồi.
- Test Tunnel phát hiện site-address loopback lọc nhầm hostname app và guard bị sắp sau handle. Đã dùng listener không lọc host tự động, bind loopback rõ ràng và route giữ guard trước proxy. Test thật: health JSON từ API; sai Host 421; thiếu edge IP 400; header nội bộ giả bị ghi đè; hai client giữ giới hạn riêng.

Các test cuối chỉ dùng DB/temp server riêng. Không chuyển dữ liệu thật lên Internet. Công cụ Caddy/ShellCheck nằm trong `.local/tools`, không cài hệ thống.

## Chưa chạy

- Linux service thật, SIGKILL/restart, đổi release và backup bằng service: đã viết CI nhưng chưa có kết quả. Máy Windows không có WSL/Linux. Không cài thêm OS.
- Reboot VPS, offsite mount thật, hostname HTTPS qua Cloudflare edge và đo từ mạng Việt Nam: cần máy/tài khoản cụ thể. Thư mục offsite trong test chỉ giả lập, không phải bản sao ngoài VPS thật.
- Lịch backup, số ngày giữ và nơi offsite chưa được chủ hệ thống chọn. Timer mẫu chưa có OnCalendar; retention production không có mặc định.
- Chưa nối cảnh báo ra kênh ngoài; systemd báo failed và health cho người vận hành/giám sát sử dụng.

Push nhánh lên GitHub đã bị automatic approval review từ chối: repo công khai; người dùng chưa cho phép công khai payload mã production mới và hướng dẫn triển khai. Không thử cách khác để vượt chặn. Mã đã commit local. Cần người dùng cho phép push nhánh này trước khi chạy CI Linux hoặc mở PR.

Hướng dẫn triển khai, Cloudflare, cập nhật, backup, restore và checklist dùng thật: `docs/operations/production.md`.
