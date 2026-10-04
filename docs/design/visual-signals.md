# Hệ thống tín hiệu thị giác

Thiết kế đề xuất v1. Dùng chung trong lịch, danh sách trận, nhánh đấu và màn hình nhập game. Chưa thay giao diện ở bước này.

Mục tiêu: biết trận nào sắp tới, dữ liệu nào cần xử lý và trạng thái nào đã chốt, trong một lần nhìn. Không tô cả dashboard hoặc thêm hàng loạt thẻ thống kê.

## Ba lớp thông tin

1. **Trạng thái dữ liệu:** chưa đủ điều kiện, sẵn sàng, đang vận hành, hoàn tất, không cần đấu.
2. **Thời gian:** chưa đặt lịch, tiếp theo, sắp đến giờ, đến giờ, giờ lịch đã qua.
3. **Việc cần làm:** chờ xác nhận, thiếu điều kiện, lỗi lưu, dữ liệu vừa đổi, bản đang nhập chưa lưu.

Ba lớp độc lập. Trận tiếp theo có thể đang chờ đủ đội. Không đổi trạng thái trận vì đã đến giờ lịch. Không coi hai trận cùng giờ là xung đột nếu chưa có bằng chứng trùng đội hoặc nguồn lực.

## Bảng màu và dấu hiệu

| Ý nghĩa | Màu nhấn đề xuất | Icon/chữ | Nơi dùng |
| --- | --- | --- | --- |
| Tiếp theo theo lịch | Lavender `#c9b5f0` | ClockArrowUp · Tiếp theo | Viền trái 3px, giờ và nhãn nhỏ |
| Đang vận hành | Mint hiện có `#bdd7c7` | Activity · Đang vận hành | Nhãn trạng thái và icon |
| Cần chú ý hoặc chờ xử lý | Ochre hiện có `#e7c48c` | TriangleAlert / ClipboardCheck | Chưa đủ điều kiện, chờ xác nhận, giờ đã qua |
| Lỗi thao tác hoặc bị chặn do dữ liệu đổi | Rose `#f0a3a3` | CircleAlert · Lỗi lưu / Dữ liệu đã đổi | Cảnh báo có hành động sửa/tải lại |
| Đã xác nhận, thao tác thành công | Mint hiện có | Check / CircleCheck · Đã xác nhận / Đã lưu | Game đã xác nhận, phản hồi lưu |
| Trạng thái thường hoặc đã kết thúc | Neutral hiện có `#b7bfb5` | Check · Hoàn tất; Minus · Không cần đấu | Trận đã xong, dữ liệu không cần ưu tiên |

Mint mang nghĩa tích cực. Icon/chữ phân biệt đang vận hành với xác nhận thành công. Màu coral của thương hiệu giữ cho hành động chính; không dùng nó thay cho mọi trạng thái khẩn cấp.

Các giá trị trên là màu foreground trên surface tối hiện có. Nhãn có nền màu nhẹ, nhưng chữ/icon dùng màu đủ rõ. Khi làm giao diện phải đo tương phản trên cả surface sáng và tối; không mặc định cùng một mã màu dùng tốt cho cả hai.

## Trận tiếp theo

- Tính trong toàn bộ giải người dùng đang mở. Không tính lại theo bộ lọc đang xem hoặc danh sách chỉ hiện một phần.
- Ứng viên: trận chưa hoàn tất/không bị bỏ qua, chưa ghi nhận bắt đầu vận hành (`ready` hoặc `waiting`), có lịch hợp lệ và thời gian lịch không trước hiện tại.
- Lấy thời điểm nhỏ nhất trong tập ứng viên. **Tất cả trận có cùng thời điểm đó đều là Tiếp theo.** So sánh thời điểm UTC, không so chuỗi giờ hiển thị.
- Trận `waiting` vẫn nhận nhãn Tiếp theo, đồng thời có cảnh báo Chờ đủ điều kiện. Không che lịch quan trọng chỉ vì đội chưa xác định.
- Không có ứng viên: không đánh dấu trận nào. Nếu chỉ còn trận chưa đặt lịch, hiện Chưa đặt lịch; không tự chọn trận đầu làm Tiếp theo.
- Trận nằm ngày mai vẫn là Tiếp theo. Nhãn giờ phải hiện cả ngày khi khác hôm nay.
- Cùng giờ nhưng khác ngày là hai thời điểm khác nhau. Những chuỗi timezone khác nhau biểu diễn cùng một thời điểm phải cho cùng kết quả.

Ví dụ lúc 17:20: trận A và B lúc 18:00 cùng lavender/Tiếp theo. Trận C lúc 19:00 giữ màu thường. A và B chưa bắt đầu sau 18:00: hiện Giờ lịch đã qua, không tự gắn LIVE. C trở thành Tiếp theo. Một dòng tổng hợp có thể hiện “2 trận có giờ lịch đã qua”.

## Các ngưỡng đề xuất

- Còn tối đa 30 phút: Sắp đến giờ, icon đồng hồ, giữ màu Tiếp theo nếu thuộc nhóm tiếp theo. Đây là chú thích thời gian, không thêm một màu mới.
- Đúng giờ lịch: Đến giờ theo lịch.
- Sau giờ lịch, chưa có ghi nhận bắt đầu: Giờ lịch đã qua · chưa ghi nhận vận hành. Màu ochre. Đây là nhắc cập nhật dữ liệu, không khẳng định trận thực sự bị trễ.
- Không có đồng hồ đếm ngược từng giây. Hiện giờ tuyệt đối và chú thích theo phút. Khi trang hoạt động, cập nhật tối đa mỗi phút; cập nhật ngay khi trở lại tab hoặc lịch/kết quả thay đổi.
- Ngưỡng là cấu hình trình bày tập trung. Không thuộc thể thức thi đấu. Không làm thay đổi quy tắc chốt thể thức.

## Không hiển thị LIVE sai

Hiện tại `startedAt` được ghi khi lưu game đầu tiên, kể cả lưu nháp (`server/results.mjs`). Nó không phải bằng chứng trận đang diễn ra ngoài thực tế.

Vì vậy dùng **Đang vận hành** cho `in_progress`. Không tự phát sáng, chạy chấm LIVE hoặc gọi là Đang đấu chỉ vì đồng hồ vượt giờ lịch. Nếu cần LIVE thật sau này, phải có thao tác bắt đầu/kết thúc trận hoặc nguồn dữ liệu được xác nhận riêng. Không thay ý nghĩa `startedAt` đang dùng để khóa danh sách đăng ký.

## Khi tín hiệu cùng xuất hiện

- Trạng thái gốc luôn có chữ. Ví dụ: “Chờ đủ điều kiện” hoặc “Đang vận hành”.
- Viền trái của dòng ưu tiên: lỗi/chặn thao tác → cần chú ý/chờ xác nhận → đang vận hành → tiếp theo → thường.
- Tối đa hai nhãn ngắn trên một dòng: trạng thái gốc và tín hiệu ưu tiên. Các chi tiết khác nằm dưới giờ hoặc trong phần chi tiết.
- Tiếp theo nhưng thiếu đội: viền ochre, trạng thái Chờ đủ điều kiện; giờ vẫn lavender kèm chữ Tiếp theo. Không mất thông tin của lớp lịch.
- Đang vận hành và có game chờ xác nhận: viền ochre, Activity/Đang vận hành và ClipboardCheck/Chờ xác nhận. Trận không đổi thành một trạng thái “chờ xác nhận” thay cho trạng thái vận hành.
- Lỗi lưu thuộc thao tác của người dùng, không đổi trạng thái trận. Lỗi hệ thống không bị gọi là đội thua.
- Lựa chọn của người dùng dùng nền/viền trung tính và `aria-pressed` hoặc `aria-current`. Focus bàn phím có outline riêng. Không lấy màu trạng thái làm dấu hiệu duy nhất của lựa chọn.
- Không tự đổi trận đang mở hoặc nhảy con trỏ khi thời gian/tín hiệu đổi. Danh sách Lịch giữ thứ tự thời gian ổn định; danh sách Cần xử lý có thứ tự riêng. Không trộn hai mục tiêu trong một bảng.

## Áp dụng rộng hơn

| Đối tượng | Cách phân biệt |
| --- | --- |
| Game nháp / đã gửi / đã xác nhận | Pencil neutral / ClipboardCheck ochre / Check mint, kèm chữ |
| Đội đủ danh sách / thiếu danh sách | Users neutral / TriangleAlert ochre, ghi phần còn thiếu |
| Danh sách đăng ký đã khóa | Lock và chữ Đã khóa; không gọi là lỗi |
| Tài khoản hoạt động / bị khóa / cần đổi mật khẩu | UserCheck neutral / Lock neutral / KeyRound ochre |
| Admin / điều hành / nhập liệu | Tên quyền + icon; không dùng màu để ngụ ý quyền cao hơn |
| Bảng A/B, nhánh thắng/thua, giai đoạn | Tên, bố cục, connector và ký hiệu cố định; không chiếm màu cảnh báo |
| Đội thắng/thua | Check và W/L hoặc chữ Thắng/Thua; không dùng đỏ cho đội thua như một lỗi |
| Xử thắng | Gavel + chữ Xử thắng, lý do trong chi tiết; không giả dữ liệu game |

## Component và chuyển động

- `StatusLabel`: icon, chữ, semantic tone. Không icon đơn độc cần đoán nghĩa.
- `MatchSignals`: một nơi tính lifecycle, nhóm lịch tiếp theo và attention từ dữ liệu trận + thời gian hiện tại.
- `MatchRow`: nhận kết quả tính sẵn. Cùng quy tắc cho lịch và nhánh, không tự suy diễn màu ở từng màn hình.
- Token ba lớp: palette → `signal-next`, `signal-active`, `signal-attention`, `signal-error`, `signal-success`, `signal-neutral` → nhãn, viền dòng, giờ lịch. Không rải mã màu trong component.
- Chỉ nhãn/viền đổi opacity hoặc màu trong 150–200ms. Không nhấp nháy, không pulse liên tục, không animate cả danh sách mỗi phút. Tôn trọng reduced motion.
- Chữ trạng thái 14–16px. Không giảm opacity cả hàng hoàn tất khiến tên đội khó đọc. Nền gradient chỉ trang trí; surface phía sau thông tin phải đảm bảo đọc được.
- Chú giải gọn mở khi cần. Không thêm một bảng màu thường trực vào trang đầu chọn giải.

## Kiểm chứng khi triển khai

Hàm tính tín hiệu nhận `now` để kiểm tra mốc thời gian xác định. Bao phủ: cùng giờ, khác ngày, timezone tương đương, thiếu lịch, lịch sai, trận hoàn tất/bỏ qua, trận đang vận hành, đến đúng giờ, sang phút mới, bộ lọc không đổi nhóm Tiếp theo, chờ xác nhận cùng tín hiệu lịch. Trạng thái chú ý biến mất khi dữ liệu tương ứng được xử lý.

Kiểm tra bằng mắt trên desktop/mobile, bàn phím, reduced motion và mô phỏng không phân biệt màu. Nhãn không cắt chữ. Các màn hình dùng cùng nghĩa.

Màu không được là cách duy nhất truyền ý nghĩa: [WCAG Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Dấu hiệu giao diện thiết yếu cần tương phản tối thiểu 3:1 với màu kề: [WCAG Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
