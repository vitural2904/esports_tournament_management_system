# Bracket

App React + TypeScript cho quản lý giải esports.

## Chạy local

```bash
npm install
npm run dev
```

## Bản local có lưu dữ liệu

Yêu cầu Node.js 22.19 trở lên. Bản hiện tại dùng `node:sqlite` của Node 22 (API experimental).

```bash
npm run dev:local
```

Mở <http://127.0.0.1:5173/?app=operations>. Lần đầu, tự tạo quản trị bằng mật khẩu riêng. Không có tài khoản hay mật khẩu mặc định. Quản trị cấp tài khoản; thành viên phải đổi mật khẩu ở lần đăng nhập đầu. Mật khẩu từ 12 đến 128 ký tự.

Nếu giao diện đang chạy bằng `npm run dev`, chạy thêm `npm run api`. Database ở `data/bracket.sqlite`, không nằm trong public và bị loại khỏi Git. Chưa triển khai công khai. Bản này đang xây từng lát; hiện có đăng nhập, đổi mật khẩu và cấp tài khoản. Dashboard tại `/` vẫn ghi dữ liệu mẫu.

```bash
npm test
npm run build
```

Test dùng database tạm, tài khoản thử riêng và API loopback. Không đụng database thật. Mật khẩu băm scrypt; phiên được lưu dạng hash, cookie HttpOnly/SameSite Strict. Đổi mật khẩu thu hồi toàn bộ phiên của tài khoản. Đăng xuất thu hồi phiên hiện tại.

## UI và animation

- React Bits Micro: `BellToggle`, `StatusMark`, `SwipeToast`.
- Motion: animation và tương tác trong React.
- AutoAnimate: chuyển động khi danh sách thay đổi.
- Thêm component React Bits qua registry `@react-bits` trong `components.json`.
