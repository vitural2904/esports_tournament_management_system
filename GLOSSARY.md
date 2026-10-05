# Vận hành giải đấu thể thao điện tử

Ngôn ngữ chung cho ban tổ chức quản lý nhiều giải đấu. Phạm vi ban đầu là giải Liên Minh Huyền Thoại của một tổ chức.

## Language

**Ban tổ chức**:
Nhóm người chịu trách nhiệm tổ chức và vận hành các giải đấu của tổ chức.

**Thành viên ban tổ chức**:
Người thuộc ban tổ chức, sử dụng ứng dụng để thực hiện công việc vận hành giải đấu.

**Giải đấu**:
Một sự kiện thi đấu do ban tổ chức tạo và vận hành, từ chuẩn bị đến xác định nhà vô địch và kết thúc.

**Thể thức giải**:
Bộ quy định về các giai đoạn thi đấu, cách xếp hạng, loại đội và chuyển đội giữa các giai đoạn của một giải đấu.

**Preset thể thức**:
Mẫu thể thức có sẵn để ban tổ chức chọn và tùy chỉnh khi chuẩn bị giải đấu.

**Dữ liệu game đấu**:
Thông tin của game đấu do ban tổ chức nhập bằng tay, bao gồm thông tin cơ bản và kết quả thi đấu.

**Trận đấu**:
Cuộc đối đầu giữa hai đội, gồm một hoặc nhiều game đấu theo thể thức BO1, BO3 hoặc BO5. Lịch thi đấu thuộc về trận đấu.
_Avoid_: Game đấu khi nói về toàn bộ một loạt BO3 hoặc BO5

**Game đấu**:
Một ván thi đấu trong trận đấu, có kết quả riêng. Đội hình ra sân, chọn/cấm tướng và bên xanh/đỏ thuộc về từng game đấu.
_Avoid_: Trận đấu khi nói về một ván trong loạt đấu

**Đội tuyển**:
Đội thi đấu được ban tổ chức quản lý và có thể tham dự nhiều giải đấu.

**Tuyển thủ**:
Người thi đấu được ban tổ chức quản lý và có thể đăng ký tham dự các giải đấu trong đội tuyển.

**Danh sách đăng ký của đội**:
Danh sách tuyển thủ của một đội tại một giải cụ thể, được lưu riêng để giữ lịch sử tham dự giải đó.

**Bản nháp dữ liệu game đấu**:
Dữ liệu game đấu đã lưu nhưng chưa được xác nhận là kết quả chính thức; có thể chưa đầy đủ.

**BO (Best of)**:
Thể thức trận đấu quy định số game tối đa của một loạt đấu. BO1, BO3 và BO5 lần lượt yêu cầu đội thắng đạt 1, 2 và 3 game thắng.

**Seed**:
Vị trí xếp hạng dùng để xác định chỗ của đội trong giai đoạn tiếp theo. Trong giải mẫu, seed 1–4 là thứ hạng cuối vòng bảng của từng bảng.

**Trận phụ phân hạng**:
Trận đấu dùng để xác định thứ hạng khi điểm số và thành tích đối đầu chưa phân định được các đội bằng điểm.

**Quản trị**:
Role `admin` toàn hệ thống. Có mọi quyền, gồm tạo và quản lý tài khoản. Mỗi tài khoản có đúng một role.

**Điều hành giải**:
Role `operator` toàn hệ thống. Vận hành mọi giải, danh bạ, đăng ký, thể thức, lịch và kết quả. Không quản lý tài khoản.

**Trọng tài**:
Role `referee` toàn hệ thống. Truy cập trận đấu, ghi và xác nhận kết quả, sửa kết quả cũ hoặc xử thắng. Không sửa lịch, thể thức, đăng ký hay danh bạ.
_Avoid_: `entry`, Nhập liệu — tên quyền cũ đã được thay thế.

**Bình luận viên**:
Role `caster` toàn hệ thống. Chỉ đọc trận, tiến trình giải, đội tuyển và tuyển thủ. Không sửa dữ liệu nghiệp vụ.

**Xử thắng**:
Quyết định của ban tổ chức trao chiến thắng một game hoặc cả trận cho một đội, kèm lý do, chẳng hạn khi đối thủ bỏ cuộc. Kết quả xử thắng không đòi hỏi số liệu thi đấu giả.

**Lịch sử sửa kết quả**:
Bản ghi các thay đổi kết quả, gồm người sửa và lý do sửa.

**Giai đoạn thi đấu**:
Một phần của giải có cách thi đấu và quy tắc xếp hạng hoặc loại đội riêng. Giai đoạn có thể nhận đội từ kết quả của giai đoạn trước.

**Bảng đấu**:
Nhóm đội cùng thi đấu và được xếp hạng trong một giai đoạn.

**Nhánh đấu**:
Cấu trúc các trận và đường đi của đội theo kết quả thắng hoặc thua.

**Vòng tròn**:
Cách thi đấu trong đó mỗi đội gặp các đội còn lại của bảng theo số lượt đã quy định.

**Loại trực tiếp**:
Cách thi đấu trong đó đội thua một trận bị loại khỏi giai đoạn.

**Loại kép**:
Cách thi đấu trong đó đội bị loại sau hai trận thua trong giai đoạn, với nhánh thắng và nhánh thua.
