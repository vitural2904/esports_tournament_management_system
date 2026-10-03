# Review identity slice

Mốc: `42471309` (visual/prototype đã duyệt) → `db32631` (identity đầu tiên). Hai reviewer chạy độc lập theo skill code-review. Người dùng giao quyền tự chọn mốc và tự vá.

## Standards

Không vi phạm quy định dự án hoặc ADR. Một lỗi P1: login đọc password hash trước khi await scrypt, sau đó có thể tạo session dùng mật khẩu cũ sau khi đổi mật khẩu đã thu hồi phiên.

Đã sửa: đọc lại hash hiện tại sau await; kiểm tra và tạo phiên liên tiếp, không có await ở giữa. Regression dùng request HTTP đồng thời tái hiện đỏ (session cũ trả 200), sau vá xanh (401). Reviewer xác nhận hết P1/P2.

## Spec

Hai lỗi: P1 race kể trên; P2 chỉ có form đổi mật khẩu lần đầu, quản trị và người đã đổi không vào được form thường.

Đã sửa: nút đổi mật khẩu cho mọi người đăng nhập; lần đầu không hủy được, đổi thường có quay lại. Lưu thu hồi phiên cũ và trở về workspace. Reviewer xác nhận cả hai đã sửa. Nhãn “Mật khẩu hiện tại” áp dụng cho cả hai trường hợp.

## Verification

5 API integration tests đạt, gồm persistence sau restart, cấp tài khoản/forced change/quyền, origin, rate limit, đăng nhập đồng thời với đổi mật khẩu. Production build đạt. `npm run dev:local` khởi động API 3001 và Vite 5173 thành công. Browser xác nhận màn tạo quản trị; 390px không tràn ngang, input 16px; không lỗi console. Chưa tự tạo tài khoản thật trong database của tổ chức; người dùng tự nhập mật khẩu khi sử dụng.

Lát này chưa gồm grant theo giải; phần đó ở ticket builder. Bản mẫu `/` vẫn ghi dữ liệu mẫu. Bản có lưu dữ liệu ở `?app=operations`.
