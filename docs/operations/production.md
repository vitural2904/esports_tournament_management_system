# Production: Hostinger VPS và Cloudflare

Trạng thái hiện tại: runtime và công cụ đã có. Chưa có tên miền, VPS hay đích offsite được cấu hình trong repo. Không bật public chỉ bằng máy chủ dev. URL ứng dụng là `https://<hostname>/?app=operations`.

## Hai đường truy cập

- Trực tiếp: trình duyệt → Caddy HTTPS trên VPS → API loopback. Dùng `deploy/Caddyfile`, DNS trỏ về VPS và cổng 80/443 cho Caddy. Không bật Cloudflare proxy trước khi kiểm tra origin; nếu bật về sau, phải thiết kế lại nguồn IP tin cậy. Cấu hình trực tiếp hiện dùng IP peer Caddy, không dùng header Cloudflare.
- Tunnel: trình duyệt → Cloudflare HTTPS → cloudflared trên cùng máy → Caddy `127.0.0.1:8080` → API `127.0.0.1:3001`. Dùng `deploy/Caddyfile.tunnel`. Không mở port router hay cổng app trên VPS. Không dùng Quick Tunnel thay cho tên miền cố định khi vận hành.

API chỉ tin header `X-Bracket-Client-IP` từ peer `127.0.0.1`. Caddy luôn ghi đè header này. Caddy trực tiếp dùng IP socket; Caddy Tunnel dùng `CF-Connecting-IP` do Cloudflare cung cấp. Listener tunnel phải chỉ bind loopback. Không đưa listener này qua một proxy công khai khác. Người dùng có quyền chạy tiến trình local trên máy được xem là người vận hành đáng tin. Không cấu hình Worker thay đổi header IP trên hostname app.

Cloudflare: không bật cache toàn bộ trang. Bypass cache cho `/api` và `/api/*`; không cache HTML có phiên. Giữ Visitor IP headers, không bật chế độ xóa header IP. Các header `X-Forwarded-For`, `X-Real-IP` và `CF-Connecting-IP` gửi thẳng tới API không được dùng để vượt giới hạn đăng nhập.

## Đóng gói ở máy build

```powershell
npm ci
npm run build
npm test
npx playwright test
node --test tests/operations/*.test.mjs
npm run package:release -- .local/releases/<release-id> <release-id>
```

Tạo thư mục `.local/releases` trước. Dùng release-id duy nhất, chẳng hạn thời gian cộng commit. Gói chỉ gồm giao diện đã build, API, shared, scripts, deploy, package/lockfile và metadata `release.json`. Không chứa database, `.local`, token hay `node_modules` của Windows. Không sửa nội dung bản đã phát hành. Gửi cả thư mục qua SSH hoặc archive riêng tư; giữ bản này cùng backup tương ứng.

## Cài lần đầu trên Linux

Yêu cầu Node >= 22.19 thuộc dòng Node hỗ trợ `node:sqlite`; runtime đã kiểm tra với 22.19.0. Cài Caddy theo tài liệu chính thức. Tunnel cần cloudflared có `--token-file`. Kiểm tra đường dẫn binary trong các service; Node API template dùng `/usr/bin/node`, cloudflared dùng `/usr/bin/cloudflared`. Nếu Node nằm nơi khác, sửa template trước khi cài. Không cài app qua Vite dev/preview.

Các lệnh sau dành cho VPS mới do quản trị kiểm soát. Thay `<release-id>` bằng bản vừa tải lên `/opt/bracket/releases/<release-id>`.

```bash
sudo useradd --system --home /var/lib/bracket --shell /usr/sbin/nologin bracket
sudo install -d -o bracket -g bracket -m 0700 /var/lib/bracket /var/backups/bracket
sudo install -d -o root -g root -m 0755 /opt/bracket/releases
sudo install -d -o root -g root -m 0700 /etc/bracket
cd /opt/bracket/releases/<release-id>
npm ci --omit=dev
sudo chown -R root:root /opt/bracket/releases/<release-id>
sudo chmod 0644 release.json
sudo ln -s /opt/bracket/releases/<release-id> /opt/bracket/current
sudo install -m 0600 .env.example /etc/bracket/app.env
```

Sửa `/etc/bracket/app.env`: `NODE_ENV=production`, `APP_ORIGIN=https://<hostname>` không có dấu `/` cuối; `APP_HOST=<hostname>`; `API_PORT=3001`; `TRUSTED_PROXY=127.0.0.1`; `DATABASE_PATH=/var/lib/bracket/bracket.sqlite`; `RELEASE_ROOT=/opt/bracket/current`; `PROXY_PORT=8080` nếu dùng Tunnel. File là các dòng `KEY=value`; không chứa lệnh shell. Quyền ghi chỉ root. Không lưu file này trong Git.

Database mới: chuẩn bị một file JSON riêng tư có `username`, `displayName`, `password` tự chọn. Quyền `0600`, owner bracket, ngoài repo/public. Không nhập mật khẩu trong tham số lệnh hoặc lịch sử shell. Chạy:

```bash
sudo -u bracket /usr/bin/node /opt/bracket/current/scripts/initialize-admin.mjs /var/lib/bracket/bracket.sqlite < /đường/dẫn/riêng/tư/admin.json
```

Công cụ đọc stdin, không mở cổng, không in mật khẩu, không tạo quản trị thứ hai. Xóa file JSON riêng tư sau khi đăng nhập được. Nếu dùng dữ liệu local đã có quản trị, bỏ bước khởi tạo.

```bash
sudo install -m 0644 deploy/bracket.service /etc/systemd/system/bracket.service
sudo install -m 0644 deploy/Caddy.common /etc/caddy/Caddy.common
# Chọn đúng một:
sudo install -m 0644 deploy/Caddyfile.tunnel /etc/caddy/Caddyfile
# Hoặc deploy/Caddyfile cho HTTPS trực tiếp.
sudo install -d /etc/systemd/system/caddy.service.d
```

Tạo `/etc/systemd/system/caddy.service.d/bracket.conf`:

```ini
[Service]
EnvironmentFile=/etc/bracket/app.env
```

Kiểm tra Caddy với các biến môi trường ở app.env được nạp. Kiểm tra service bằng `systemd-analyze verify /etc/systemd/system/bracket.service`. Sau đó:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bracket.service
sudo systemctl restart caddy.service
curl --fail http://127.0.0.1:3001/api/health
```

Chỉ API service giữ lock `/var/lib/bracket/api.lock`. Không chạy API thủ công song song với service. Service tự chạy sau reboot, restart sau lỗi. Dữ liệu không nằm trong thư mục phát hành. Restart thủ công: `sudo systemctl restart bracket.service`. Xem lỗi: `sudo journalctl -u bracket.service`; health chỉ trả `{ "ok": true }`. Không bật log debug/request-body hay access log chứa cookie.

## Nối Cloudflare Tunnel

Tạo named tunnel trong tài khoản Cloudflare có hostname đã chọn. Published application: hostname trùng `APP_HOST`; service URL `http://127.0.0.1:8080`; HTTP Host Header trùng `APP_HOST`. Không tắt kiểm tra origin HTTPS ở trình duyệt; đoạn HTTP này chỉ chạy trên loopback của máy nối tunnel.

Lưu token vào `/etc/cloudflared/bracket.token` bằng kênh riêng tư. Không gửi token vào chat/Git hay đưa vào tham số lệnh. Tạo user hệ thống `cloudflared`, thư mục token root:cloudflared `0750`, file token root:cloudflared `0640`. Cài `deploy/cloudflared.service` thành `/etc/systemd/system/bracket-tunnel.service`; `daemon-reload`, rồi enable/start. Service dùng token-file. API, Caddy và tunnel phải chạy cùng máy trong cấu hình này.

Thử hostname HTTPS: giao diện, login, logout, đổi mật khẩu, cả bốn role. Thử gửi header IP giả; không được reset giới hạn đăng nhập. API 3001 và proxy 8080 không được mở ra mạng ngoài. Windows local có thể chạy Caddy với app.env và cloudflared token-file; máy phải bật khi người khác dùng. Chưa có dịch vụ tự chạy Windows trong gói Linux này.

## Nhập dữ liệu local

Backup local bằng công cụ SQLite có sẵn, không copy riêng file DB đang có WAL. Gửi backup qua SSH riêng tư. Dừng API VPS. Phục hồi backup vào một file mới dưới `/var/lib/bracket` bằng `scripts/restore.mjs`; chỉnh owner bracket, quyền `0600` và `DATABASE_PATH`. Công cụ bỏ phiên cũ. Chạy service, đăng nhập bằng mật khẩu tại thời điểm backup, kiểm tra số giải, đăng ký, kết quả, lịch sử và ảnh. Giữ database cũ để quay lại. Không đưa backup vào `/dist` hoặc DNS/tunnel public.

## Backup theo lịch và offsite

Trước khi bật lịch, chủ hệ thống chọn: giờ backup, số ngày giữ local, máy/lưu trữ ngoài VPS, chính sách giữ bản offsite và người nhận thông báo lỗi. Không có giá trị mặc định đã được phê duyệt.

Mount đích ngoài VPS vào `/mnt/bracket-offsite` bằng SSHFS/NFS hoặc dịch vụ lưu trữ phù hợp. Cấu hình mount bền sau reboot, xác thực riêng tư, bảo đảm dữ liệu thật ở máy khác và chỉ bracket có quyền ghi. Không tạo một thư mục local thay thế khi mount mất. Service dùng `mountpoint` để kiểm tra; file backup.env bắt buộc `OFFSITE_DIRECTORY=/mnt/bracket-offsite`. `RequiresMountsFor` phụ thuộc mount đã cấu hình; không tự tạo mount.

Cài backup.env từ template, điền `BACKUP_KEEP_DAYS` đã chọn. Cài backup.service. Sao chép timer.example thành `/etc/systemd/system/bracket-backup.timer`, thêm `OnCalendar` đã duyệt rồi kiểm tra `systemd-analyze calendar '<lịch>'`. Enable timer chỉ sau khi backup thủ công qua service đã thành công. Timer thiếu lịch cố ý chưa sẵn sàng dùng.

```bash
sudo systemctl start bracket-backup.service
sudo journalctl -u bracket-backup.service
sudo systemctl list-timers bracket-backup.timer
```

Mỗi bundle có `database.sqlite` và `backup.json`: checksum, schema, phiên bản app, thời điểm và trạng thái xác minh offsite. Backup đọc lại checksum từ đích offsite trước khi ghi thành công và dọn bản local quá hạn. Chỉ dọn bundle đã xác minh; không tự xóa bản offsite. Archive offsite giữ riêng theo chính sách đã chọn. Lỗi trả exit code khác 0 và systemd failed; cấu hình giám sát trạng thái failed/health tại hệ thống của chủ VPS. Gói này chưa nối một kênh thông báo bên ngoài.

Giữ thư mục backup và offsite riêng tư. Nếu tiến trình bị kill giữa backup, `.backup-lock` có thể còn; chỉ gỡ thư mục lock rỗng sau khi xác nhận không có job backup đang chạy. Snapshot Hostinger là lớp thêm, không thay backup SQLite và bản sao ngoài VPS.

## Cập nhật

Tải bản mới vào một thư mục release mới. Cài phụ thuộc bằng `npm ci --omit=dev` trên chính VPS. Kiểm tra build/test ở máy build trước. Giữ bản cũ. Chạy:

```bash
sudo bash /opt/bracket/current/deploy/update.sh /opt/bracket/releases/<release-mới>
```

Công cụ yêu cầu offsite mount đã có, cấu hình production/backup và đường dẫn release chuẩn. Dừng API → backup cả local/offsite → kiểm tra/migrate với app mới không mở port → chuyển symlink → start → health → reload Caddy. Backup được lấy sau khi dừng để không mất ghi giữa snapshot và migration. Nếu lỗi sau khi dừng, API được giữ dừng. Không tự chạy app cũ với DB đã migration. Kiểm tra HTTPS và dữ liệu trước khi cho nhập kết quả tiếp.

## Phục hồi

Phục hồi bản snapshot làm mất các thay đổi sau thời điểm đó. Chốt với ban tổ chức trước khi dùng snapshot làm dữ liệu chính. Dừng API. Chọn bundle và release-id cùng cặp; tool kiểm tra checksum và metadata trước khi tạo file mới.

```bash
sudo systemctl stop bracket.service
sudo -u bracket /usr/bin/node /opt/bracket/current/scripts/production-restore.mjs \
  /var/backups/bracket/<bundle> /var/lib/bracket/restored-<id>.sqlite /opt/bracket/releases/<release-id>
```

Nếu máy cũ mất, tải bundle từ offsite và cài lại đúng gói release cùng các phụ thuộc. Chỉnh symlink current về release tương ứng. Chỉnh DATABASE_PATH sang file mới. Restart API/Caddy. Phiên cũ trong snapshot đã bị xóa; mọi người đăng nhập lại. Kiểm tra giải, kết quả, lịch sử, media trước khi dùng tiếp. Giữ DB gốc. Không ghi đè nó bằng restore.

Quay về app cũ mà giữ DB mới chỉ khi đã xác minh schema tương thích. Nếu không, phục hồi cặp app/database như trên. Không tự giảm schema.

## Cửa kiểm tra trước dùng thật

- [ ] Có VPS, hostname, quyền truy cập và lựa chọn direct/Tunnel.
- [ ] Linux CI qua: service syntax, restart sau SIGKILL, bản phát hành mới và health. Windows local không xác minh reboot Linux.
- [ ] Máy thật reboot: API, Caddy, tunnel nếu dùng và mount offsite tự lên.
- [ ] HTTPS hợp lệ. Đăng nhập/đổi mật khẩu/logout và đúng quyền cả bốn role.
- [ ] API/proxy nội bộ không truy cập trực tiếp từ Internet. Không cache API.
- [ ] Backup chạy theo lịch đã duyệt, giữ bản đã chọn, offsite thật đọc lại được và lỗi được người vận hành phát hiện.
- [ ] Restore trên DB thử: tài khoản, đăng ký, kết quả, lịch sử và ảnh khớp; phiên cũ bị thu hồi.
- [ ] Đo tải giải/lưu game từ mạng Việt Nam. Ghi số đo thực tế trước khi quyết định dung lượng thuê.

Nguồn cấu hình: [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Caddy service](https://caddyserver.com/docs/running), [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/), [Cloudflare headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/), [token-file](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/).
