# Giải mẫu 8 đội

## Phạm vi đã chốt

- Một ban tổ chức, nhiều thành viên, nhiều giải đấu.
- Giải mẫu Liên Minh Huyền Thoại có 8 đội, chia 2 bảng, mỗi bảng 4 đội.
- Vòng bảng thi đấu vòng tròn lượt đi và lượt về. Mỗi bảng có 12 trận; tổng cộng 24 trận.
- Cả 4 đội mỗi bảng được xếp seed 1–4 rồi tham dự nhánh loại kép.
- Thể thức được chốt đúng một lần trước khi giai đoạn đầu diễn ra.
- Ban tổ chức nhập dữ liệu game bằng tay. Đội thắng là dữ liệu bắt buộc để xác nhận kết quả game; dữ liệu khác có thể bổ sung. Bản nháp có thể chưa đầy đủ.
- Lịch thuộc trận; đội hình, chọn/cấm tướng, bên xanh/đỏ và kết quả thuộc từng game.
- Đội và tuyển thủ có danh sách dùng chung. Danh sách đăng ký của đội được lưu riêng theo giải để giữ lịch sử.
- Có tài khoản thành viên và phân quyền theo vị trí, thử nghiệm ở v1.0. Một người có thể giữ nhiều vị trí; quyền làm việc có thể giới hạn theo giải.

## BO và xếp hạng đã chốt

- BO được cấu hình khi chuẩn bị thể thức, trước khi chốt; không cố định BO của giải mẫu cho mọi giải.
- Giải mẫu: vòng bảng BO1; các trận loại kép thông thường BO3; U7 (chung kết nhánh thắng), L6 (chung kết nhánh thua), F1 và F2 nếu diễn ra đều BO5.
- Vòng bảng: thắng 1 điểm, thua 0 điểm.
- Bằng điểm: xét thành tích đối đầu giữa các đội bằng điểm. Nếu vẫn hòa, thi đấu trận phụ. Không dùng thời lượng game để phân hạng.
- Trận phụ: hai đội hòa thi đấu BO1; từ ba đội hòa thi đấu vòng tròn một lượt BO1. Xét điểm và đối đầu trong lượt phụ; nhóm còn hòa tiếp tục thi đấu để phân hạng.
- Có chia bảng ngẫu nhiên và kéo đội giữa hai bảng khi chuẩn bị. Thành phần bảng được khóa khi chốt thể thức.

## Các vị trí thử nghiệm v1.0

- Quản trị: cấp tài khoản và gán quyền.
- Điều hành giải: chuẩn bị giải, chốt thể thức, xác nhận hoặc sửa kết quả.
- Nhập liệu: nhập dữ liệu game, lưu nháp và gửi xác nhận.
- Quản trị tạo tài khoản trực tiếp, gán vị trí và quyền theo giải. Thành viên đổi mật khẩu ở lần đăng nhập đầu. Không dùng luồng mời qua email trong v1.0.
- Chi tiết giới hạn quyền vẫn còn mở.

## Dữ liệu game đã chốt

- Đội thắng bắt buộc khi xác nhận kết quả game thông thường. Bản nháp được lưu khi chưa có đội thắng; xử thắng dùng quyết định của ban tổ chức.
- Các trường tùy chọn: thời lượng, bên xanh/đỏ, đội hình ra sân, tướng chọn/cấm và phiên bản game.
- Không thu thập trang bị hoặc chỉ số thi đấu, bao gồm K/D/A. Đây là phần bị loại khỏi phạm vi, không phải việc để dành cho bản sau.
- Không yêu cầu điền hết các trường tùy chọn mới được lưu hoặc xác nhận kết quả.

## Các trường hợp vận hành đã chốt

- Sửa đội thắng: được sửa nếu các trận sau bị ảnh hưởng chưa bắt đầu. Hiển thị các trận bị ảnh hưởng trước khi xác nhận sửa.
- Nếu trận sau bị ảnh hưởng đã bắt đầu, v1.0 chặn thay đổi đội thắng. Thông tin phụ vẫn được sửa.
- Lưu lịch sử sửa kết quả và lý do sửa.
- Hỗ trợ xử thắng một game hoặc cả trận, kèm lý do. Không tạo số liệu game giả để biểu diễn quyết định xử thắng.
- Xử thua cả trận trong giai đoạn loại kép được tính là một lần thua trận.
- Khóa thể thức không có nghĩa là cấm các thao tác sửa dữ liệu hoặc xử thắng được cho phép ở trên.

## Nhánh loại kép mẫu

Nhánh mẫu do người dùng giao thiết kế. A1–A4 và B1–B4 là thứ hạng cuối vòng bảng của bảng A và bảng B.

### Nhánh thắng

| Trận | Đội thứ nhất | Đội thứ hai |
| --- | --- | --- |
| U1 | A1 | B4 |
| U2 | B2 | A3 |
| U3 | B1 | A4 |
| U4 | A2 | B3 |
| U5 | Thắng U1 | Thắng U2 |
| U6 | Thắng U3 | Thắng U4 |
| U7 | Thắng U5 | Thắng U6 |

### Nhánh thua

| Trận | Đội thứ nhất | Đội thứ hai |
| --- | --- | --- |
| L1 | Thua U1 | Thua U2 |
| L2 | Thua U3 | Thua U4 |
| L3 | Thắng L1 | Thua U6 |
| L4 | Thắng L2 | Thua U5 |
| L5 | Thắng L3 | Thắng L4 |
| L6 | Thắng L5 | Thua U7 |

Thua một trận ở nhánh thắng thì xuống nhánh thua. Thua ở nhánh thua thì bị loại. Các lượt L3 và L4 nhận đội từ phía đối diện của nhánh thắng để tránh tái đấu ngay đối thủ vừa gặp.

### Chung kết

- F1: thắng U7 gặp thắng L6.
- Nếu đội thắng U7 thắng F1: giải kết thúc.
- Nếu đội thắng L6 thắng F1: hai đội thi đấu F2 để quyết định nhà vô địch.
- Quy tắc này giữ nguyên điều kiện bị loại sau hai trận thua trong giai đoạn loại kép. Thua ở vòng bảng không được tính vào điều kiện này.
- Nhánh loại kép có 14 trận, hoặc 15 trận nếu cần F2. Cả giải có 38 hoặc 39 trận, chưa tính trận phụ để phân hạng nếu được chọn; số game phụ thuộc BO của từng vòng.

## Cách vận hành đã chốt

- v1.0 hỗ trợ ba khối giai đoạn: vòng tròn, loại trực tiếp và loại kép. Cho ghép nhiều giai đoạn, chia bảng, cấu hình BO, luật xếp hạng và cách chuyển đội. Preset điền sẵn cấu hình; loại luật mới cần bổ sung khối.
- Nhập lịch bằng tay, có đặt lịch hàng loạt. Được đổi lịch khi giải đang chạy; lịch không thuộc thể thức bị khóa.
- Danh sách đăng ký của đội khóa trước trận đầu của đội. Đội hình từng game chọn người từ danh sách này; cho thay người giữa các game. Bổ sung người ngoài danh sách cần điều hành giải duyệt và lưu lịch sử.
- Laptop là thiết bị chính để dựng giải, nhánh đấu và lịch. Điện thoại hỗ trợ nhập nhanh kết quả game.
- Màn hình vận hành ưu tiên trận sắp đấu, đang đấu và chờ xác nhận.
- Thiết kế tổng hợp được ghi tại [Thiết kế v1.0](./v1-design.md).
