# Production trên Hostinger VPS và tên miền

## Problem Statement
Ban tổ chức cần truy cập app qua Internet từ nhiều máy. Bản hiện tại chỉ chạy loopback bằng máy chủ phát triển; chưa có cấu hình tên miền, cookie Secure hay cách vận hành production. Người dùng đã chọn mua VPS và tên miền tại Hostinger.

## Solution
Chuẩn bị bản production dùng tên miền HTTPS trên một VPS. Giữ tài khoản, phân quyền theo giải, SQLite và ảnh hiện có. Có cách khởi động lại, cập nhật, sao lưu và phục hồi rõ ràng. Việc mua dịch vụ và cấu hình tài khoản Hostinger do chủ tài khoản thực hiện; không lưu mật khẩu/token trong repo.

## User Stories
1. Là quản trị, tôi muốn mở app qua tên miền HTTPS để vận hành từ bất cứ đâu.
2. Là thành viên, tôi muốn đăng nhập từ nhiều máy để dùng đúng quyền giải.
3. Là quản trị, tôi muốn kết quả và ảnh còn khi restart VPS để không mất dữ liệu.
4. Là quản trị, tôi muốn dùng dữ liệu local hiện có để không nhập lại giải.
5. Là quản trị, tôi muốn cập nhật app mà giữ database để tiếp tục giải.
6. Là quản trị, tôi muốn giữ bản app trước để xử lý cập nhật lỗi.
7. Là quản trị, tôi muốn backup nhất quán gồm tài khoản, ảnh và kết quả để phục hồi được.
8. Là quản trị, tôi muốn giữ backup ngoài VPS để phục hồi khi VPS mất.
9. Là quản trị, tôi muốn app tự chạy sau reboot và lỗi tiến trình để giảm thao tác tay.
10. Là quản trị, tôi muốn biết app không hoạt động qua health check và log lỗi.
11. Là thành viên, tôi muốn giới hạn đăng nhập không gộp mọi người thành IP của proxy.
12. Là quản trị, tôi muốn người ngoài không tạo tài khoản quản trị đầu tiên trên database trống.
13. Là quản trị, tôi muốn CI kiểm tra cấu hình production trước khi đưa bản mới lên máy thật.

## Implementation Decisions
### Đã chốt
- Nhà cung cấp VPS và tên miền: Hostinger. VPS là hướng chính, thay cho miniPC phục vụ app.
- Mục tiêu truy cập qua Internet. Tài khoản và quyền hiện có tiếp tục bảo vệ dữ liệu; chưa thêm trang xem công khai cho khán giả.
- Giữ mô hình một tổ chức, một tiến trình API ghi SQLite trên ổ đĩa VPS. Không chạy nhiều bản ghi vào nhiều database riêng.
- Không thuê dịch vụ, thanh toán hay đổi DNS trong bước viết đặc tả này.

### Đề xuất cho bản đầu
- Pilot với KVM 1 tại Malaysia nếu còn vị trí này khi thiết lập. Đây là cấu hình khởi đầu, chưa phải cam kết dung lượng; đo từ mạng người dùng trước khi chọn kỳ thuê dài.
- VPS Linux, ưu tiên Ubuntu LTS được Hostinger hỗ trợ. Bản giao diện build tĩnh; Caddy phục vụ giao diện và proxy API trên cùng tên miền HTTPS. API tiếp tục nghe loopback.
- Chạy API bằng service của hệ điều hành, tự khởi động sau reboot, restart khi lỗi. Không dùng Vite dev/preview làm máy chủ production.
- Cấu hình origin HTTPS, cổng nội bộ và đường dẫn database qua môi trường; production thiếu/sai cấu hình phải từ chối khởi động. Cookie phiên có Secure. Không cho wildcard origin.
- Chỉ tin địa chỉ client do proxy đã cấu hình cung cấp. Header do client tự gửi không được vượt giới hạn đăng nhập. API không mở cổng trực tiếp ra Internet.
- Khởi tạo quản trị đầu tiên qua đường local riêng hoặc database đã chuẩn bị. Không để endpoint tạo quản trị mở cho người đầu tiên truy cập Internet.
- Dữ liệu và backup nằm ngoài thư mục public và thư mục bản phát hành. Bản cập nhật có phiên bản riêng; chỉ chuyển sang bản mới sau build, backup và health check.
- Không hứa rollback database đã migration bằng app cũ. Khôi phục phải chọn cặp app/database tương thích; giữ backup trước migration và kiểm tra phục hồi.
- Backup dùng cơ chế SQLite nhất quán hiện có, gồm WAL và media. Lịch backup, thời gian giữ và nơi lưu ngoài VPS cần được chốt trước go-live. Snapshot của nhà cung cấp là lớp bổ sung.
- Health check không trả bí mật. Log không ghi mật khẩu, cookie hoặc dữ liệu upload. Hướng dẫn vận hành gồm deploy, restart, backup, restore và kiểm tra sau phục hồi.

## Testing Decisions
- Tiếp tục dùng HTTP API công khai và UI trình duyệt làm ranh giới kiểm thử. Kiểm tra hành vi; không kiểm tra cấu trúc SQL hay component.
- API: cấu hình origin production; từ chối origin ngoài danh sách; cookie Secure khi đăng nhập/đổi mật khẩu/đăng xuất; proxy/IP thật và header giả; endpoint setup trong production; restart và dữ liệu còn.
- UI: giữ năm luồng hiện có. Thêm smoke test dưới origin production đại diện khi runtime được xây dựng.
- Vận hành: chạy bản build và proxy, health check, restart tiến trình; backup/restore cả ảnh; giữ dữ liệu khi đổi bản app; từ chối cấu hình sai trước khi nghe cổng.
- CI chạy test và build. Máy thật cần đo đăng nhập/tải giải/lưu game từ mạng Việt Nam, thử HTTPS, đăng nhập hai vai trò và phục hồi bản backup trước go-live.
- Tất cả kiểm tra tự động dùng tài khoản/database tạm; không ghi lên giải thật.

## Out of Scope
Trang khán giả công khai, đăng ký tài khoản tự phục vụ, thanh toán, nhiều tổ chức, nhiều máy chủ, đổi database, automatic deploy lên tài khoản chưa được cấu hình, email/SSO và thay luật giải.

## Further Notes
- Chưa có xác nhận đã mua VPS, tên miền cụ thể, hệ điều hành đã cài hay cách truy cập máy.
- Chưa chốt lịch backup, thời gian giữ và đích backup ngoài VPS. Đây là các đầu vào vận hành, cần trước go-live; có thể chuẩn bị runtime và test local trước.
- Các mục đề xuất là mặc định để xây kế hoạch, không ghi nhận thành lựa chọn đã được người dùng xác nhận.
- Thông tin giá, khuyến mại tên miền và vị trí VPS cần kiểm tra tại giỏ hàng/hPanel lúc mua. Không mặc định Singapore hay tên miền .com được tặng.
- Nguồn: https://www.hostinger.com/vps-hosting ; https://www.hostinger.com/vps/ubuntu-hosting ; https://www.hostinger.com/support/1583267-where-are-hostinger-servers-located/ ; https://caddyserver.com/docs/automatic-https
