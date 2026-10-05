# 02: Chạy, cập nhật, sao lưu và phục hồi bản production

## Parent

https://github.com/vitural2904/esports_tournament_management_system/issues/14

## What to build

Ban tổ chức dùng một bản phát hành có phiên bản trên VPS. App tự chạy lại khi tiến trình lỗi hoặc máy reboot. Cập nhật app giữ database và ảnh; bản lỗi có đường phục hồi rõ ràng.

## Acceptance criteria

- [ ] Có cấu hình service Linux chạy API bằng tài khoản riêng, tự khởi động sau reboot và restart khi lỗi. Không chạy nhiều API ghi cùng database.
- [ ] Giao diện, API và các phụ thuộc cần thiết được đóng gói thành bản phát hành có phiên bản. Có hướng dẫn cài từ bản này trên máy Linux mới.
- [ ] Database, media và backup nằm ngoài thư mục public và các bản phát hành. Quyền file giới hạn cho tài khoản dịch vụ và quản trị máy.
- [ ] Health check báo tình trạng phục vụ, gồm khả năng đọc database, không trả bí mật. Log lỗi không ghi mật khẩu, cookie hoặc nội dung upload.
- [ ] Quy trình cập nhật kiểm tra bản mới, sao lưu nhất quán trước migration, chuyển bản và kiểm tra health. Lỗi phải được báo rõ; không ghi đè database gốc hoặc tự chạy app cũ với schema không tương thích.
- [ ] Hướng dẫn phân biệt quay về app cũ khi schema tương thích và phục hồi cặp app/database trước migration. Cảnh báo rõ dữ liệu phát sinh sau backup khi chọn phục hồi.
- [ ] Kiểm chứng restart tiến trình và đổi bản vẫn giữ tài khoản, giải, kết quả và ảnh trên dữ liệu tạm. Có kiểm chứng service/proxy trên môi trường Linux; ghi rõ phần nào chưa chạy được trên máy hiện tại.
- [ ] CI kiểm tra test/build và cấu hình triển khai phù hợp. Không tự triển khai lên VPS chưa được cấu hình.


- [ ] Dùng cơ chế SQLite backup nhất quán hiện có, gồm dữ liệu WAL, tài khoản, lịch sử, đăng ký, kết quả và media. Không ghi đè backup hoặc database đã có.
- [ ] Có cấu hình lịch backup và số ngày giữ do quản trị đặt. Chưa có lựa chọn của chủ hệ thống thì giữ trạng thái chưa sẵn sàng go-live, không ghi nhận mặc định thành quyết định đã duyệt.
- [ ] Có cách chuyển backup riêng tư ra nơi ngoài VPS bằng đích do chủ hệ thống cung cấp. Không lưu khóa truy cập trong Git; lỗi backup hoặc chuyển bản sao được báo rõ. Không xóa backup trước khi có bản sao được kiểm chứng.
- [ ] Backup gắn với phiên bản app và schema để chọn đúng cặp phục hồi. Có hướng dẫn dừng dịch vụ, phục hồi vào file mới, thu hồi phiên và giữ dữ liệu gốc để quay lại.
- [ ] Diễn tập dữ liệu tạm: backup khi app đang chạy, phục hồi bằng bản app tương thích, đăng nhập lại và đối chiếu giải, kết quả, lịch sử và ảnh. Phiên cũ trong bản phục hồi không còn hiệu lực.
- [ ] Có hướng dẫn đưa dữ liệu local lên VPS qua backup riêng tư và xác minh sau nhập. Không chuyển database thật hoặc đổi DNS trong kiểm tra local.
- [ ] Checklist go-live nêu các đầu vào còn thiếu: VPS, tên miền, quyền truy cập, lịch/giữ backup và đích ngoài VPS. Kiểm tra máy thật gồm HTTPS, bốn role, restart, backup/restore và thời gian tải/lưu từ mạng Việt Nam.
- [ ] Báo cáo tách rõ kiểm tra tự động đã qua, kiểm tra Linux đã qua và kiểm tra máy thật còn chờ. Không tuyên bố đã triển khai hoặc sẵn sàng go-live khi chưa có bằng chứng.

## Blocked by

#15 — Đăng nhập và vận hành qua HTTPS.

## Status

GitHub: #16. Đã triển khai công cụ và kiểm chứng local. Review 0 finding còn mở. Linux service/CI chưa chạy vì push repo công khai cần phê duyệt. Cửa go-live còn chờ VPS/hostname và chính sách backup/offsite của chủ hệ thống. Báo cáo: docs/reviews/hostinger-production.md.


