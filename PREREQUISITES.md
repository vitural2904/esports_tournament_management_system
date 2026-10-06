# Cài đặt và chuyển máy

## Yêu cầu

| Thành phần | Khi cần |
| --- | --- |
| Git | Clone và cập nhật mã nguồn |
| Node.js 22.19.0, npm 10.9.3 | Phiên bản đã kiểm tra; `.nvmrc` ghi phiên bản Node |
| Chromium của Playwright | Chạy kiểm thử giao diện |
| Caddy | Host production qua HTTPS hoặc Cloudflare Tunnel |
| cloudflared | Chỉ khi dùng Cloudflare Tunnel |

Phụ thuộc JavaScript nằm trong `package.json` và được khóa trong `package-lock.json`. Cài bằng `npm ci`. Không cần `requirements.txt`, Python hoặc cài SQLite riêng để chạy app. Python chỉ dùng nếu muốn tạo lại ảnh nền bằng script thiết kế.

## Clone để phát triển

```bash
git clone https://github.com/vitural2904/esports_tournament_management_system.git
cd esports_tournament_management_system
node --version
npm --version
npm ci
npm run dev:local
```

Nếu dùng nvm, chạy `nvm install` và `nvm use` để dùng `.nvmrc`. Với nvm-windows, dùng `nvm install 22.19.0` và `nvm use 22.19.0`.

Mở http://127.0.0.1:5173/?app=operations. Database mới chưa có tài khoản. Tạo một quản trị đầu tiên tại màn khởi tạo. Mẫu tài khoản phát triển được ghi trong [README](README.md#tài-khoản-demo-cho-phát-triển). Không dùng mật khẩu demo cho server thật.

```bash
npm test
npm run build
npx playwright install chromium
npx playwright test
```

Linux có thể cần `npx playwright install --with-deps chromium`. Kiểm thử HTTPS production cần Caddy trong `PATH`, hoặc biến `CADDY_BIN` trỏ đến file Caddy. Chi tiết: [vận hành production](docs/operations/production.md).

## Chuyển giải đang dùng sang máy trạm

Clone chỉ chuyển mã nguồn. GitHub không chứa tài khoản, dữ liệu giải, ảnh đã tải, phiên đăng nhập hoặc cấu hình riêng. `data/`, `.local/` và các file `.env` được loại khỏi Git.

1. Trên máy cũ, sao lưu đúng database đang dùng. Nếu đã đặt `DATABASE_PATH`, dùng đường dẫn đó thay `data/bracket.sqlite`. Dừng nhận dữ liệu mới trong lúc chuyển máy.

   ```powershell
   node scripts/backup.mjs data/bracket.sqlite data/backups/workstation-transfer.sqlite
   ```

2. Chuyển file backup qua kênh riêng tư. Không upload lên GitHub. Backup chứa dữ liệu giải, tài khoản đã băm mật khẩu và ảnh. Lệnh backup gồm cả dữ liệu trong WAL; không copy riêng file `.sqlite` khi app đang mở. Nếu tên backup đã có, chọn tên mới.
3. Clone và `npm ci` trên máy mới. Không chuyển `node_modules` giữa Windows và Linux.
4. Trước khi mở app, phục hồi vào một file mới:

   ```powershell
   node scripts/restore.mjs D:/Private/workstation-transfer.sqlite data/restored/bracket.sqlite
   $env:DATABASE_PATH = 'data/restored/bracket.sqlite'
   npm run dev:local
   ```

   Đổi đường dẫn nguồn theo nơi đã lưu backup. Trên Linux/macOS, lệnh chạy local tương đương là `DATABASE_PATH=data/restored/bracket.sqlite npm run dev:local` sau khi restore.

5. Đăng nhập bằng tài khoản của bản backup. Phiên cũ bị thu hồi. Kiểm tra giải, đội, đăng ký, lịch, kết quả và ảnh. Bản backup đã có quản trị thì không tạo tài khoản demo nữa. Giữ máy cũ và backup đến khi kiểm tra xong.

## Host server thật

`dev:local` chỉ nghe loopback. Để thành viên truy cập qua mạng, dùng bản production với HTTPS. Không mở Vite dev ra Internet.

Từ bản clone đầy đủ:

```bash
npm ci
npm run build
npm test
npm run package:release -- .local/releases/workstation-v1 workstation-v1
```

Tạo thư mục cha `.local/releases` trước; thư mục đích `workstation-v1` phải chưa tồn tại. Gói phát hành không chứa database hoặc cấu hình riêng. Cài `npm ci --omit=dev` trong gói trên máy đích. Production cần `NODE_ENV`, `APP_ORIGIN`, `APP_HOST`, `TRUSTED_PROXY`, `DATABASE_PATH` tuyệt đối ngoài thư mục phát hành và `RELEASE_ROOT`; dùng `.env.example` làm mẫu.

[Hướng dẫn production](docs/operations/production.md) có cài đặt Linux/systemd, Caddy trực tiếp, Cloudflare Tunnel, nhập backup, cập nhật và phục hồi. Windows có thể chạy API, Caddy và cloudflared; chưa có service Windows tự khởi động trong repo. Database production mới phải khởi tạo admin qua `scripts/initialize-admin.mjs` bằng stdin riêng tư; chọn mật khẩu riêng.

Trước khi cho nhập dữ liệu thật: kiểm tra HTTPS, đăng nhập, quyền, khởi động lại và phục hồi backup trên máy đích.
