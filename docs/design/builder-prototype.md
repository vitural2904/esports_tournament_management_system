# Prototype dựng thể thức

## Câu hỏi

Ban tổ chức dựng thể thức giải linh hoạt bằng bố cục nào thì ít thao tác và ít nhầm nhất?

## Mở bản thử

Chạy `npm run prototype`. Trên máy đang chạy máy chủ, mở:

- A — theo bước: <http://127.0.0.1:5173/?prototype=builder&variant=A>
- B — chỉnh trực tiếp: <http://127.0.0.1:5173/?prototype=builder&variant=B>
- C — nhánh đấu trước: <http://127.0.0.1:5173/?prototype=builder&variant=C>

Thanh chọn ở cuối màn hình đổi bản thử và giữ cấu hình trong cùng phiên. URL giữ lựa chọn bố cục. Phím trái/phải đổi bố cục khi không thao tác trong ô nhập hoặc điều khiển. Thanh chọn chỉ hiện trong chế độ phát triển.

## Phạm vi

- Ba bố cục trên cùng route ứng dụng. Giữ bảng màu và khung điều hướng của app hiện có.
- Tạo giải từ ba preset 8 đội: hai bảng sang loại kép; hai bảng sang loại trực tiếp; loại kép thẳng.
- Đổi tên giải, bốc bảng, kéo đội hoặc chọn hai đội để đổi chỗ. Số đội cố định ở 8 cho câu hỏi prototype này.
- Đổi số lượt vòng tròn và BO từng vòng. Số trận, BO trên nhánh và cặp đấu cập nhật theo cấu hình.
- Nhánh hiển thị đủ đường đi nhánh thắng, nhánh thua, chung kết và reset khi dùng loại kép. Chọn trận để xem đường đi; bật đường thua và đổi thu phóng.
- Seed A1–B4 là nguồn đội từ vòng bảng, không phải thứ tự đội đang hiển thị trong bảng.
- Kiểm tra, xác nhận chốt, rồi khóa chỉnh thể thức. Mở bản thử mới để thử lại; thao tác này không mô phỏng việc mở khóa một giải thật.
- Trạng thái cấu hình có thể xem ở cuối trang.

## Animation

Motion for React: phản hồi nút, chuyển bước và bố cục, chọn BO, đường nối SVG, trận xuất hiện, hộp xác nhận. AutoAnimate: thay đổi vị trí đội. Dùng lại SwipeToast hiện có cho thông báo.

Nguồn API: [Motion](https://motion.dev/docs/react-animation), [AutoAnimate](https://auto-animate.formkit.com/).

Tôn trọng lựa chọn giảm chuyển động của thiết bị. Không cần thêm gói animation mới hoặc tài khoản thư viện trả phí.

## Giới hạn

Đây là mã prototype. Dữ liệu chỉ ở bộ nhớ và mất khi tải lại. Không backend, đăng nhập, lưu giải thật, nhập kết quả game hoặc tính bảng từ kết quả. Không phải trình dựng mọi loại thể thức hoàn chỉnh.

Workspace hiện chưa có Git repository. Chưa thể lưu prototype vào nhánh Git riêng. Giữ mã trong các file có tên Prototype cho đến khi có Git và chọn được bố cục.

## Kiểm tra và kết luận

- Build TypeScript và bản production đã qua; cấu hình TypeScript cũ được chỉnh cho phiên bản cài trong dự án.
- Đã thử luồng đổi đội, chỉnh BO/số lượt, xác nhận chốt, kiểm tra các điều khiển bị khóa, chuyển bố cục giữ cấu hình và đổi preset loại trực tiếp.
- Đã kiểm tra bố cục điện thoại 390 × 844; sơ đồ cuộn trong vùng riêng, không làm tràn toàn trang.
- Chưa chọn bố cục thắng. Cần người dùng thử ba bản và đánh giá số thao tác, độ rõ của seed và mức animation.
