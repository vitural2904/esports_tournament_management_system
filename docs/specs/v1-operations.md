# V1 — Vận hành giải LoL có lưu dữ liệu và phân quyền

## Problem Statement

Ban tổ chức hiện chỉ có giao diện với dữ liệu mẫu. Tải lại mất cấu hình; chưa thể tạo tài khoản, chia quyền, giữ lịch sử hoặc nhập kết quả thật. Cần một ứng dụng chạy cục bộ đầy đủ luồng đã thống nhất, trước khi lựa chọn nơi triển khai.

## Solution

Giữ visual đã duyệt. Chọn hướng C: dựng nhánh trước, chỉnh cấu hình cạnh nhánh. Tạo nhiều giải trong một tổ chức, lưu vào database phía máy chủ. Thành viên đăng nhập; thao tác theo quyền của giải. Nhập liệu chọn đội thắng game, lưu nháp và gửi. Điều hành xác nhận; kết quả cập nhật điểm và đội đi tiếp. Sửa kết quả có xem trước ảnh hưởng và lưu lịch sử.

## User Stories

1. Là quản trị, tôi muốn tạo tài khoản đầu tiên tại máy của tổ chức, để bắt đầu quản lý mà không cần dịch vụ ngoài.
2. Là thành viên, tôi muốn đăng nhập và đăng xuất, để dữ liệu gắn với người thao tác.
3. Là thành viên được cấp tài khoản, tôi muốn đổi mật khẩu ở lần đầu, để chỉ mình giữ mật khẩu mới.
4. Là quản trị, tôi muốn cấp tài khoản và gán nhiều vị trí theo giải, để phân chia công việc.
5. Là thành viên, tôi muốn chỉ thấy giải được cấp quyền, để tránh thao tác nhầm.
6. Là điều hành, tôi muốn tạo nhiều giải, để giữ lịch sử các mùa.
7. Là điều hành, tôi muốn quản lý đội và tuyển thủ dùng chung, để không nhập lại cho mỗi giải.
8. Là điều hành, tôi muốn danh sách đăng ký riêng từng giải, để thay đổi mùa mới không sửa lịch sử.
9. Là điều hành, tôi muốn chọn preset rồi chỉnh bảng, BO và luật đi tiếp, để dùng thể thức của giải.
10. Là điều hành, tôi muốn chốt thể thức đúng một lần, để tránh đổi cấu trúc trong khi đấu.
11. Là điều hành, tôi muốn xem seed chưa xác định trên nhánh, để hiểu nguồn đội trước khi vòng bảng xong.
12. Là điều hành, tôi muốn nhập lịch từng trận hoặc hàng loạt và đổi giờ khi đang chạy, để xử lý lịch thực tế.
13. Là nhập liệu, tôi muốn lưu nháp thiếu trường, để không mất dữ liệu đang nhập.
14. Là nhập liệu, tôi muốn chỉ cần đội thắng khi gửi game, để nhập nhanh trên điện thoại.
15. Là nhập liệu, tôi muốn thêm thời lượng, bên xanh/đỏ, đội hình, chọn/cấm tướng và patch khi có, để ghi thông tin tùy chọn.
16. Là điều hành, tôi muốn xác nhận từng game, để điểm chính thức không lấy từ nháp.
17. Là điều hành, tôi muốn trận tự kết thúc ở ngưỡng BO, để không tạo game thừa.
18. Là điều hành, tôi muốn bảng tính điểm và đối đầu, để xác định seed từ kết quả.
19. Là điều hành, tôi muốn trận phụ khi vẫn hòa, để không dùng thời lượng làm tiêu chí phụ.
20. Là điều hành, tôi muốn nhánh nhận đội thắng/thua đúng nguồn, để loại kép tính đủ hai lần thua.
21. Là điều hành, tôi muốn chung kết tổng reset nếu đội từ nhánh thua thắng loạt đầu, để giữ điều kiện hai lần thua.
22. Là điều hành, tôi muốn xem ảnh hưởng trước khi sửa đội thắng, để biết các trận phải thu hồi kết quả.
23. Là điều hành, tôi muốn bị chặn sửa nếu trận sau bị ảnh hưởng đã bắt đầu, để bảo vệ kết quả đang thi đấu.
24. Là điều hành, tôi muốn xử thắng game hoặc trận kèm lý do, để ghi quyết định mà không bịa dữ liệu game.
25. Là điều hành, tôi muốn khóa đăng ký trước trận đầu và duyệt bổ sung có lịch sử, để quản lý tuyển thủ đúng thời điểm.
26. Là thành viên, tôi muốn dữ liệu còn sau tải lại và khởi động lại máy chủ, để dùng cho giải thật.
27. Là thành viên, tôi muốn báo lỗi rõ và không ghi đè thao tác mới của người khác, để phối hợp nhiều người.
28. Là thành viên, tôi muốn chữ dễ đọc và thao tác chạm lớn, để nhập trên laptop lẫn điện thoại.

## Implementation Decisions

- React và Motion hiện có; giữ Lens Grotesk, fallback tiếng Việt, gradient có bề mặt và chế độ giảm chuyển động.
- Máy chủ Node 22.19 trở lên; SQLite phía máy chủ, migration có phiên bản và transaction cho lệnh cập nhật. Database không nằm trong thư mục public. Dữ liệu sản xuất, bí mật và ảnh kiểm tra không vào Git.
- API cùng origin qua proxy phát triển. Bản chạy cục bộ chỉ bind loopback. Có một lệnh chạy giao diện và API. Không cần tài khoản hosting.
- Mật khẩu băm scrypt có salt riêng; cookie phiên HttpOnly, SameSite=Strict; hết hạn phiên, thu hồi khi đăng xuất/đổi mật khẩu. Giới hạn thử đăng nhập và kích thước request. Máy chủ kiểm tra origin đối với lệnh sửa.
- Tạo quản trị đầu tiên chỉ khi chưa có tài khoản. Không có mật khẩu mẫu dùng được trong bản chạy thật. Tài khoản do quản trị cấp bắt buộc đổi mật khẩu.
- Quản trị có quyền tổ chức; operator/entry được gán theo giải. Nhiều vị trí cùng một người được hợp quyền. Người không có grant không đọc hoặc sửa giải đó. Quyền phải kiểm tra trong API, không tin vai trò hoặc người dùng gửi từ client.
- Model giữ tổ chức, tài khoản, grant, đội, tuyển thủ, giải, đăng ký, cấu hình giai đoạn, bảng, trận, game, phiên bản và lịch sử. Cấu hình giai đoạn là dữ liệu có kiểm tra schema; không dùng mã tùy ý từ người dùng.
- Luồng game: draft → submitted → confirmed. Draft không ảnh hưởng điểm. Entry gửi; operator xác nhận. Thao tác lặp hoặc game thừa bị chặn; winner thuộc hai đội của trận.
- Nhánh là đồ thị không chu trình với nguồn đội cố định/lấy seed/lấy thắng/lấy thua. Chốt cấu trúc trước giai đoạn đầu. Thuật toán điểm và nhánh tách khỏi vận chuyển HTTP; API là seam kiểm tra ưu tiên.
- Khi chốt, các nguồn trong cùng giai đoạn phải được chứng minh không lấy cùng một đội: khác nhóm đội, khác hạng cùng bảng/nhánh, hoặc nguồn thắng/thua đối nhau. Kết hợp nguồn không chứng minh được tính riêng biệt bị chặn trước khóa; sửa cấu hình trong bản nháp. Đây là giới hạn kiểm tra an toàn của v1, không phải thay đổi thể thức giữa giải.
- BO1/3/5; preset mẫu 8 đội, 2 bảng, 2 lượt: 24 trận bảng, 14–15 trận loại kép. Cả 8 đội vào nhánh. Chung kết nhánh thắng/thua/tổng/reset BO5, còn lại loại kép BO3.
- Hòa xét điểm rồi đối đầu trong nhóm bằng điểm. Còn hòa thì BO1 cho hai đội hoặc vòng tròn BO1 cho nhóm lớn; tạo lượt phụ tiếp cho nhóm chưa phân định. Seed không được âm thầm tự chọn.
- Lịch độc lập với khóa thể thức. Snapshot đăng ký theo giải. Đội hình từng game phải lấy từ danh sách được phép.
- Sửa đội thắng dùng preview ảnh hưởng, lý do và phiên bản dự kiến. Confirm tính lại cùng transaction; nếu có trận bị ảnh hưởng đã bắt đầu, chặn. Metadata vẫn sửa được, có lịch sử. Không tự xóa kết quả chính thức đã xác nhận ở trận phụ thuộc.
- Mỗi command có kiểm tra dữ liệu, quyền, revision để chặn ghi đè; lỗi trả mã và thông báo dễ hiểu. Lịch sử có người, thời điểm, dữ liệu trước/sau và lý do.
- Prototype C và prototype luồng kết quả là nguồn quyết định. Có thể bỏ shell thử khỏi bản chạy thật; không dùng prototype in-memory làm backend.

## Testing Decisions

- Người dùng giao quyền tự chọn, kiểm chứng và vá lỗi. Theo quyền này, chọn API công khai là seam chính; không hỏi lại khi người dùng đang ngủ.
- Test qua request/response với database tạm thật. Đăng nhập thật, grant thật, không mock nội bộ hoặc đọc trực tiếp database để xác nhận hành vi.
- TDD từng lát: viết một hành vi đỏ, triển khai xanh, tiếp tục. Test quyền bằng truy cập trái phép trực tiếp, không chỉ kiểm tra nút ẩn.
- Dùng tình huống mẫu độc lập cho số trận, BO, thứ tự đi tiếp, hai lần thua, reset và hòa. Test restart đọc lại dữ liệu qua API; test stale revision/rollback không ghi nửa lệnh.
- Browser QA cho đăng nhập, tạo giải, nhập/xác nhận/sửa, responsive và focus. Không kiểm thử snapshot CSS hoặc hằng số visual.
- Chưa có test hành vi trong codebase; bổ sung Node test runner để không cần dịch vụ mới.

## Out of Scope

Nhiều tổ chức độc lập, mọi loại luật có thể tưởng tượng, đổi thể thức sau khóa, tự lấy dữ liệu Riot, tự xếp lịch toàn giải, trang bị/KDA/chỉ số, hosting công khai, email mời, thanh toán và tài khoản dịch vụ ngoài.

## Further Notes

V1 này là bản chạy cục bộ; không đồng nghĩa đã triển khai cho các máy thành viên. Trước hosting thật cần chọn nơi chạy, HTTPS và quy trình backup. Không cần người dùng tham gia để hoàn thiện bản local. Tài liệu sản phẩm và ADR khóa thể thức là nguồn quy định. Khi phát hiện thiếu thông tin nhỏ, tự chọn phương án ít rủi ro và ghi lại; không mở rộng phạm vi sản phẩm.
