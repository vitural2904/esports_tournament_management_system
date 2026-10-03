# Thiết kế v1.0 — Vận hành giải Liên Minh Huyền Thoại

Tổng hợp các quyết định được người dùng xác nhận trong phiên thiết kế. Đây là thiết kế sản phẩm; chưa chọn kiến trúc lưu trữ, hạ tầng triển khai hoặc xây dựng ứng dụng hoàn chỉnh.

## Mục tiêu

Một ban tổ chức có nhiều thành viên vận hành nhiều giải đấu của tổ chức. Luồng chính: tạo giải, thêm đội và tuyển thủ, dựng thể thức, xếp lịch, nhập kết quả từng game, xác định đội đi tiếp, xác định nhà vô địch và kết thúc giải.

## Cấu trúc giải

- Giải gồm các giai đoạn được ghép với nhau.
- Ba loại giai đoạn đầu tiên: vòng tròn, loại trực tiếp, loại kép.
- Giai đoạn có thể chia bảng và cấu hình BO, cách xếp hạng, cách chuyển đội sang giai đoạn sau.
- Preset là cấu hình có sẵn, có thể sửa trong lúc chuẩn bị; không phải loại giải bị cố định trong mã.
- Tính linh hoạt giới hạn trong các khối và luật đã hỗ trợ. Loại luật mới cần bổ sung khối; không hứa hỗ trợ mọi luật thi đấu có thể tưởng tượng.
- Chốt thể thức đúng một lần trước giai đoạn đầu. Sau đó khóa cấu trúc, BO, thành phần bảng, luật xếp hạng và quy tắc chuyển đội.
- Khi giai đoạn sau nhận seed từ giai đoạn trước, quy tắc lấy seed được chốt trước; tên đội thực tế được xác định từ kết quả thi đấu. Điền đội theo quy tắc này không phải sửa thể thức.
- Lịch và dữ liệu vận hành được thay đổi theo các quyền và giới hạn đã thống nhất; không bị khóa toàn bộ cùng thể thức.

## Đội, tuyển thủ và lịch sử

- Đội và tuyển thủ có danh sách dùng chung cho tổ chức.
- Mỗi giải giữ danh sách đăng ký riêng của từng đội; thay đổi ở giải mới không làm mất lịch sử giải cũ.
- Khóa danh sách đăng ký trước trận đầu của đội.
- Mỗi game có đội hình ra sân riêng. Được thay người giữa các game trong danh sách đã đăng ký.
- Bổ sung tuyển thủ ngoài danh sách đã khóa cần điều hành giải duyệt và lưu lịch sử.

## Trận và game

- Trận là loạt BO; game là một ván trong loạt đó.
- BO1, BO3, BO5 lần lượt cần 1, 2, 3 game thắng để thắng trận.
- Lịch thuộc trận. Có nhập lịch từng trận và đặt lịch hàng loạt; cho đổi lịch trong lúc giải đang chạy.
- Game có đội thắng; thời lượng, bên xanh/đỏ, đội hình, tướng chọn/cấm, phiên bản game đều tùy chọn.
- Không thu thập trang bị hoặc chỉ số thi đấu, bao gồm K/D/A.
- Lưu được bản nháp thiếu dữ liệu. Đội thắng bắt buộc khi xác nhận kết quả game thông thường; không ép điền trường tùy chọn.
- Kết quả game do ban tổ chức nhập bằng tay.

## Xác nhận và ngoại lệ

- Nhập liệu lưu nháp và gửi xác nhận. Điều hành giải xác nhận kết quả.
- Sửa đội thắng khi các trận sau bị ảnh hưởng chưa bắt đầu: hiển thị ảnh hưởng trước khi xác nhận sửa.
- Nếu trận sau bị ảnh hưởng đã bắt đầu: v1.0 chặn đổi đội thắng. Thông tin phụ vẫn được sửa.
- Lưu người sửa và lý do sửa kết quả.
- Hỗ trợ xử thắng một game hoặc cả trận, có lý do; không tạo số liệu game giả.
- Xử thua cả trận ở giai đoạn loại kép tính là một lần thua trận.

## Tài khoản và vị trí

Quản trị tạo tài khoản trực tiếp. Thành viên đổi mật khẩu ở lần đăng nhập đầu. Quản trị gán vị trí và quyền theo giải. Một người có thể giữ nhiều vị trí.

| Vị trí | Công việc đã thống nhất |
| --- | --- |
| Quản trị | Cấp tài khoản, gán quyền |
| Điều hành giải | Chuẩn bị giải, chốt thể thức, xác nhận và sửa kết quả, duyệt bổ sung tuyển thủ |
| Nhập liệu | Nhập game, lưu nháp, gửi xác nhận |

Không có luồng mời tài khoản qua email ở v1.0.

## UX

- Laptop ưu tiên cho dựng thể thức, nhánh đấu và lịch.
- Điện thoại vẫn nhập được kết quả game nhanh.
- Màn hình vận hành ưu tiên trận sắp đấu, đang đấu, chờ xác nhận.
- Từ trận mở được game để nhập dữ liệu; trường tùy chọn không cản lưu kết quả.
- Tận dụng thư viện UI và animation hiện đại. Animation phục vụ nhận biết thay đổi và thao tác; mức dùng thư viện được kiểm tra trong prototype.
- Thiết kế chi tiết màn hình và animation chưa được kiểm chứng bằng prototype.

## Giải dùng để kiểm tra thiết kế

[Giải mẫu 8 đội](./8-team-demo.md): hai bảng, mỗi bảng bốn đội; vòng tròn lượt đi/lượt về; cả tám đội vào nhánh loại kép theo seed.

- Vòng bảng BO1; thắng 1 điểm, thua 0 điểm.
- Bằng điểm xét đối đầu trong nhóm bằng điểm. Vẫn hòa thì đánh trận phụ, không xét thời lượng game.
- Hai đội hòa đánh BO1. Từ ba đội hòa đánh vòng tròn một lượt BO1; xét điểm và đối đầu trong lượt phụ. Nhóm còn hòa tiếp tục đấu để phân hạng.
- Chia bảng ngẫu nhiên, có kéo đội giữa bảng khi chuẩn bị; chốt thể thức thì khóa thành phần bảng.
- Loại kép thông thường BO3. Chung kết nhánh thắng, nhánh thua, chung kết tổng và loạt reset nếu cần đều BO5.
- Chung kết tổng có reset, giữ điều kiện loại sau hai trận thua trong giai đoạn loại kép.
- 38–39 trận trước khi tính trận phụ phân hạng.

## Phần chưa thuộc v1.0

- Phục vụ nhiều ban tổ chức độc lập.
- Tự viết luật thi đấu tùy ý ngoài các khối đã hỗ trợ.
- Đổi thể thức sau khi đã chốt.
- Tự lấy dữ liệu game, tự xếp lịch toàn giải.
- Thu thập trang bị và chỉ số thi đấu.

## Bước thiết kế tiếp theo

Prototype hai luồng cần nhìn và thao tác để kiểm chứng: dựng giải từ preset rồi chốt thể thức; nhập và xác nhận kết quả game trên laptop và điện thoại. Dùng giải mẫu để kiểm tra các trạng thái nhánh đấu, trường hợp sửa kết quả và trận phụ trước khi viết đặc tả triển khai.
