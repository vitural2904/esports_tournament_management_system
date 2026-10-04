# Bracket

Ứng dụng cục bộ cho một ban tổ chức vận hành nhiều giải Liên Minh Huyền Thoại. Có lưu dữ liệu, tài khoản và quyền theo giải.

## Chạy local

```bash
npm ci
npm run dev:local
```

## Bản local có lưu dữ liệu

Yêu cầu Node.js 22.19 trở lên. Bản hiện tại dùng `node:sqlite` của Node 22 (API experimental).

```bash
npm run dev:local
```

Mở [không gian vận hành](http://127.0.0.1:5173/?app=operations). Lần đầu, tạo quản trị bằng mật khẩu riêng. Không có tài khoản hay mật khẩu mặc định. Quản trị cấp tài khoản; thành viên phải đổi mật khẩu ở lần đăng nhập đầu. Mật khẩu từ 12 đến 128 ký tự.

Database ở `data/bracket.sqlite`, ngoài thư mục public và bị loại khỏi Git. Hai máy chủ chỉ nghe loopback: giao diện 5173, API 3001. Dừng bằng Ctrl+C. Dữ liệu còn khi chạy lại. Cổng đang dùng sẽ báo lỗi; không tự chuyển sang cổng khác. Dashboard tại `/` là giao diện mẫu; không ghi dữ liệu vào giải thật.

## Luồng dùng

1. Tạo đội và tuyển thủ trong danh bạ. Tạo giải. Đăng ký đội và tuyển thủ riêng cho giải.
2. Quản trị gán **Điều hành** và/hoặc **Nhập liệu** trong “Thành viên của giải”. Thành viên chỉ thấy giải được cấp quyền. Điều hành quản lý danh bạ, chuẩn bị giải, lịch và xác nhận. Nhập liệu lưu nháp và gửi game. Quản trị có cả hai quyền.
3. Chọn preset, chỉnh giai đoạn, bảng, BO và nguồn đội bên cạnh nhánh. Chốt đúng một lần trước thi đấu. Nếu nguồn đội có thể trùng trong một giai đoạn, sửa trước khi chốt. Không đổi cấu trúc sau chốt.
4. Xếp lịch từng trận hoặc hàng loạt. Nhập game: chỉ cần đội thắng để gửi; thông tin khác tùy chọn. Điều hành xác nhận để cộng điểm. Nháp chưa tính điểm. BO kết thúc ở 1/2/3 game thắng.
5. Xem bảng điểm và nhánh đấu trực tiếp. Hòa chưa phân định tạo trận phụ BO1. Nhánh tự lấy seed, đội thắng/thua. Loại kép reset khi đội từ nhánh thua thắng chung kết tổng đầu.
6. Sửa kết quả: nhập lý do, xem trước ảnh hưởng, rồi xác nhận. Trận sau bị ảnh hưởng đã bắt đầu thì chặn sửa. Xử thắng game/cả trận có lý do; không bịa số liệu game.
7. Đăng ký khóa khi đội lưu nháp game đầu hoặc được xử thắng. Sau khóa, điều hành chọn “Duyệt bổ sung”, chọn người mới và ghi lý do. Game cũ và đăng ký mùa khác giữ nguyên. Lịch sử hiển thị người duyệt và danh sách trước/sau.

Khi có thông báo dữ liệu đã đổi, tải lại mục đang chỉnh. Bản chưa lưu giữ nguyên khi tải dữ liệu liên quan hoặc đổi đội trong đăng ký; nút “Tải lại …” ghi rõ khi bỏ bản đang nhập. Đăng xuất/đóng trang sẽ bỏ phần chưa lưu; lưu nháp trước.

## Hồ sơ đội và ảnh

Mở hồ sơ từ danh bạ, đăng ký hoặc trận đấu. Hồ sơ dùng mẫu A. Chọn giải để xem đăng ký của mùa đó. Một đội có thể có 7–8 người; giới hạn bảo vệ hiện tại là 20. Mỗi game vẫn chọn 5 người thi đấu. Không gán chính thức/dự bị cố định.

Thêm người có sẵn hoặc tạo người mới ngay trong hồ sơ. Nickname bắt buộc; tên, vị trí và ảnh tùy chọn. Đăng ký đã khóa cần người điều hành duyệt bổ sung và ghi lý do.

Logo, ảnh bìa và chân dung nhận PNG/JPEG/WebP tĩnh, tối đa 10 MB, 24 triệu pixel và 8192 pixel mỗi chiều. Có chỉnh điểm hiển thị và nền sáng. Ảnh được xử lý, bỏ metadata và lưu trong database. Backup gồm cả ảnh. Sửa danh bạ không đổi tên hay ảnh trong đăng ký cũ.

Hồ sơ, danh sách, lịch, nhánh và màn nhập game dùng chung tín hiệu trận. Lịch gần tới không tự chuyển trận sang đang thi đấu. [Đặc tả hồ sơ, ảnh và tín hiệu](docs/specs/team-profiles-media-signals.md).

## Sao lưu và phục hồi

Sao lưu có thể chạy khi app đang mở. Lệnh dùng SQLite backup để gồm cả dữ liệu đang nằm trong WAL. Chọn tên file mới; không ghi đè file có sẵn.

```powershell
node scripts/backup.mjs data/bracket.sqlite data/backups/cup-2026-10-04.sqlite
```

Giữ backup riêng tư: file chứa tài khoản băm, đăng ký và kết quả. Đừng đưa vào Git/public. Không chỉ copy file `.sqlite` đang mở rồi bỏ qua WAL.

Để phục hồi: dừng app bằng Ctrl+C. Phục hồi vào file mới. Giữ database gốc để quay lại.

```powershell
node scripts/restore.mjs data/backups/cup-2026-10-04.sqlite data/restored/bracket.sqlite
$env:DATABASE_PATH = 'data/restored/bracket.sqlite'
npm run dev:local
```

Phục hồi xóa phiên đăng nhập trong bản mới. Thành viên đăng nhập lại bằng mật khẩu tại thời điểm backup. Kiểm tra giải và lịch sử trước khi dùng tiếp. Muốn quay về database gốc: dừng app, chạy `Remove-Item Env:DATABASE_PATH`, rồi `npm run dev:local`. Biến môi trường chỉ áp dụng trong cửa sổ terminal hiện tại.

Migration chạy theo phiên bản trong một giao dịch trước khi API mở. Có bước sửa marker của các bản thử cũ. Database có phiên bản mới hơn app sẽ bị từ chối; giữ nguyên file và dùng đúng bản. Nếu backup/restore lỗi, giữ nguồn; dùng đường dẫn đích mới cho lần thử tiếp.

## Kiểm tra

```bash
npm test
npm run build
```

Test dùng database tạm, tài khoản thử riêng và API loopback. Không đụng database thật. Mật khẩu băm scrypt; phiên được lưu dạng hash, cookie HttpOnly/SameSite Strict. Đổi mật khẩu thu hồi toàn bộ phiên của tài khoản. Đăng xuất thu hồi phiên hiện tại.

Đã kiểm tra mẫu 8 đội qua hai thành viên: 24 trận bảng, 15 trận loại kép có reset, 58 game xác nhận, nhà vô địch và dữ liệu sau hai lần khởi động lại. Có kiểm tra quyền trực tiếp, bản cũ, rollback, hòa nhiều đội, xử thắng, sửa kết quả, đăng ký, nâng database cũ và backup/restore.

Bản này chạy trên máy tổ chức. Chưa có hosting, HTTPS hay truy cập từ máy thành viên/điện thoại qua mạng. Bố cục điện thoại được kiểm tra bằng viewport. Dùng SQLite tích hợp Node 22.19, hiện vẫn có cảnh báo experimental. [Đặc tả](docs/specs/v1-operations.md) ghi phạm vi đầy đủ.

## UI và animation

- Nền gradient dùng ảnh WebP tĩnh 1600×1000 (~49 KB). Không có animation nền, pointer tracking hay blur lúc chạy. Tạo lại ảnh bằng `scripts/render-dashboard-background.py` (CairoSVG/Pillow), không cần Python khi chạy ứng dụng.
- Be Vietnam Pro dùng cho chữ giao diện để đủ bộ dấu tiếng Việt, không trộn nét chữ trong cùng từ. Lens Grotesk giữ cho logo và số.
- React Bits Micro: `BellToggle`, `StatusMark`, `SwipeToast`.
- Motion: animation và tương tác trong React.
- AutoAnimate: chuyển động khi danh sách thay đổi.
- Thêm component React Bits qua registry `@react-bits` trong `components.json`.

## Quản trị tài khoản

Mở `?app=operations&view=accounts` sau khi đăng nhập quản trị. Có tìm kiếm, trạng thái, quyền theo giải, cấp tài khoản, chỉnh tên/quyền quản trị, khóa/mở, mật khẩu tạm, thu hồi phiên và lịch sử. API không trả mật khẩu hoặc bản băm. Mọi sửa kiểm tra revision. Không tự khóa/đổi quyền quản trị tại bảng; tự đổi mật khẩu và đăng xuất dùng nút trên đầu trang. Luôn giữ quản trị hoạt động.

Khóa, reset mật khẩu, đổi quyền quản trị và thu hồi phiên vô hiệu phiên cũ. Reset buộc thành viên đổi mật khẩu. Quyền theo giải được kiểm tra lại mỗi request. Không xóa tài khoản đã có lịch sử. Thông tin tài khoản thử và mật khẩu chỉ ở `.local/`, không nằm trong Git. [Phạm vi](docs/specs/admin-accounts.md).
