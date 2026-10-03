# Kết luận bản thử nhập kết quả

Nguồn: bản thử độc lập `public/prototypes/result-flow.html`, mở từ ứng dụng tại `/prototypes/result-flow.html` hoặc mở trực tiếp file HTML. Dữ liệu chỉ trong bộ nhớ.

Câu hỏi: nháp và kết quả chính thức tách được không; việc xác nhận, đi tiếp và chặn sửa có rõ với các vị trí?

Đã thử qua trình duyệt:

- Hai game GAM thắng, nhập rồi gửi rồi điều hành xác nhận: BO3 kết thúc 2–0, GAM đi tiếp.
- Nhập liệu thử xác nhận: bị chặn; điểm vẫn 0–0, game vẫn chờ xác nhận.
- Sửa game 2 trước khi trận sau bắt đầu: thành 1–1, thu hồi chỗ đi tiếp, mở game 3.
- Xác nhận game 3 rồi bắt đầu trận sau: sửa game 2 bị chặn; kết quả vẫn 2–1.
- Điện thoại 390px: không tràn ngang; nút cao tối thiểu 44px.

Kết luận: dùng chuỗi nháp → gửi → xác nhận. Chỉ xác nhận mới tính điểm. API phải kiểm tra vị trí; giao diện ẩn nút chưa đủ. Luồng sửa thật phải xem trước ảnh hưởng, ghi lý do, kiểm tra lại phiên bản khi xác nhận. Bản thử dùng lý do và ảnh hưởng cố định; không thay kiểm thử tính nhánh đầy đủ.

Người dùng giao quyền tự đánh giá, tự chọn và tự triển khai khi đi ngủ. Chọn bố cục C làm hướng dựng thể thức. A/B giữ làm nguồn thử nghiệm. Các kiểm tra triển khai dùng API công khai và giao diện, được lựa chọn dưới quyền tự quyết này.
