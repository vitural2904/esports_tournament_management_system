# 01: Đăng nhập và vận hành qua HTTPS

## Parent

https://github.com/vitural2904/esports_tournament_management_system/issues/14

## What to build

Ban tổ chức mở bản giao diện đã build qua proxy HTTPS, đăng nhập và dùng ứng dụng theo bốn role toàn hệ thống. Bản production từ chối cấu hình sai và không cho khách Internet tạo quản trị đầu tiên. Có cách chuẩn bị database riêng trước khi mở dịch vụ.

## Acceptance criteria

- [ ] Chạy được bản giao diện tĩnh và API qua cùng origin HTTPS bằng cấu hình Caddy mẫu. Hỗ trợ Cloudflare Tunnel nối tới proxy local; không cần mở port router. API chỉ nghe loopback; không dùng máy chủ phát triển để phục vụ production.
- [ ] Production yêu cầu origin HTTPS chính xác, cổng hợp lệ và đường dẫn database rõ ràng. Thiếu hoặc sai cấu hình thì từ chối trước khi mở cổng. Chế độ local hiện có tiếp tục chạy.
- [ ] Cookie phiên có Secure, HttpOnly và SameSite khi đăng nhập, đổi mật khẩu và đăng xuất. Request ghi từ origin lạ hoặc thiếu origin bị từ chối.
- [ ] Chỉ tin địa chỉ client do proxy đã cấu hình cung cấp. Proxy ghi đè header client; header giả và chuỗi header không hợp lệ không vượt giới hạn đăng nhập. Hai client khác nhau không bị gộp vào IP proxy.
- [ ] Endpoint setup production không cho tạo quản trị qua Internet, kể cả database trống. Có quy trình local riêng hoặc database đã chuẩn bị để khởi tạo; không dùng mật khẩu mặc định hoặc đưa bí mật vào Git/log.
- [ ] UI qua HTTPS đăng nhập và thực hiện hành vi được phép cho admin/operator/referee/caster; các thao tác vượt quyền bị chặn. Không cấp quyền riêng theo giải.
- [ ] Kiểm tra API, cấu hình khởi động và trình duyệt chạy trên database tạm. Các hồi quy hiện có vẫn qua. Không ghi lên giải thật.

## Blocked by

None (can start immediately).

## Status

ready-for-agent.
