# Ảnh, nhận diện và hồ sơ đội

Thiết kế đề xuất. Chưa triển khai upload hoặc đổi mô hình dữ liệu. Phục vụ ban tổ chức hiện tại, ưu tiên Liên Minh Huyền Thoại. Không biến trang đội thành một dashboard nhiều form.

## Trang riêng cho đội

Mỗi đội có một hồ sơ trong Danh bạ. Bấm tên đội từ lịch/trận/đăng ký cũng đến hồ sơ này. Khi đi từ giải, giữ ngữ cảnh giải và đường quay lại.

- Đầu trang: logo, tên đội, viết tắt, game, ảnh bìa tùy chọn. Một nút Chỉnh sửa cho người có quyền.
- Tổng quan: giới thiệu ngắn, đội hình của giải đang chọn, trận sắp tới. Bỏ mục trống thay vì dựng số liệu giả.
- Đội hình: các thẻ tuyển thủ; chọn giải để xem đúng danh sách đăng ký. Ảnh, nickname, tên; vị trí thi đấu chỉ hiện khi có dữ liệu.
- Giải đã tham dự: danh sách từ đăng ký thực tế. Bấm vào một giải để xem đội hình và trận của đội tại giải đó.
- Trận đấu: lịch và kết quả của đội, dùng hệ thống tín hiệu thị giác đã duyệt.

Không dồn mọi phần vào trang đầu. Tổng quan ngắn; các phần lớn có tab riêng. Trên điện thoại roster hai cột nếu đủ rộng, một cột trên màn hình hẹp. Nickname được ưu tiên; không cắt chữ vào ảnh.

Chưa có đội hình chung trong dữ liệu hiện tại: không tự lấy roster của giải gần nhất rồi gọi là đội hình hiện tại. Ban đầu hiển thị “Đội hình tại [giải]”. Đội chưa đăng ký giải có trạng thái trống và đường đăng ký, không tự gán tuyển thủ.

Nếu cần roster chung về sau, thêm đội hình mặc định như nguồn để sao chép khi đăng ký giải. Sửa đội hình mặc định không sửa các đăng ký đã có.

Mở rộng nhiều game: một tổ chức esports có nhiều đội theo game. Hồ sơ tổ chức là lớp nhóm tùy chọn sau này; LoL/Valorant là đội riêng, không trộn roster. V1 không bắt người dùng khai thêm tổ chức nếu chỉ quản lý đội LoL.

## Các vai trò của ảnh

| Vai trò | Khung | Cách hiển thị |
| --- | --- | --- |
| Logo đội/giải | Ô vuông, khoảng đệm | Contain, không kéo méo, không cắt biểu tượng |
| Wordmark của app | Khung ngang giới hạn chiều cao | Contain; có bản mark vuông riêng |
| Avatar tuyển thủ trong danh sách/trận | 1:1 | Crop từ ảnh gốc theo điểm chọn; dự phòng chữ nickname |
| Thẻ tuyển thủ trong roster | 4:5 | Ảnh chân dung hoặc cutout; tên nằm dưới ảnh |
| Ảnh bìa đội/giải | Khoảng 3:1 desktop, 16:9 mobile | Cover với điểm trọng tâm riêng, không đặt thông tin thiết yếu trong ảnh |
| Favicon | Bản mark vuông | Preview nhỏ 16/32px; không ép wordmark dài vào favicon |

`contain` giữ toàn bộ ảnh; `cover` lấp khung và có thể cắt: [MDN object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit).

## Xử lý những ảnh khác nhau

- PNG/WebP trong suốt: giữ alpha. Logo có nền ô sáng/tối chọn được. Cutout tuyển thủ nằm trên nền roster chung, chân ảnh căn dưới.
- JPEG/PNG có nền trắng: giữ nền. Ô logo chuyển nền sáng để hòa khối. Không dùng blend mode/invert/filter để giả xóa nền.
- Logo trắng trên nền trong: chọn nền tối. Logo đen trên nền trong: chọn nền sáng. Có thể đề xuất theo ảnh, nhưng người dùng xem và đổi được.
- Logo rộng/dọc: contain, khoảng đệm và zoom có giới hạn. Không buộc crop vuông làm mất chữ. Có thể tải một bản mark riêng cho ô nhỏ.
- Ảnh có nhiều khoảng trống: công cụ chỉnh vùng nội dung/zoom, luôn có preview. Không cắt phá ảnh gốc.
- Ảnh tuyển thủ nằm ngang, selfie, toàn thân: chọn điểm trọng tâm và crop 4:5, 1:1 riêng. Vùng crop không được vượt ảnh.
- Cutout và chân dung có nền không phải cùng loại: chọn “Ảnh chân dung” hoặc “Ảnh tách nền”. Không tự đoán chỉ từ việc file có kênh alpha.
- Ảnh nhỏ: báo có thể mờ ở cỡ lớn, cho dùng ở cỡ phù hợp. Không tuyên bố phóng ảnh là phục hồi chi tiết.
- Thiếu ảnh hoặc tải lỗi: chữ viết tắt của đội, icon người/initial nickname cho tuyển thủ. Giữ kích thước ô để bố cục không nhảy. Không sinh khuôn mặt giả.
- Không tự xóa nền ảnh trắng: dễ mất nét trắng trong logo hoặc áo đấu. Tách nền có thể là công cụ tùy chọn sau này, có preview và hoàn tác.

## Luồng upload

Chọn/kéo file → preview trong các ô thật → chỉnh nền hoặc crop khi cần → Lưu. Mặc định đẹp ngay, không bắt người dùng đi qua wizard cấu hình.

- Logo preview đồng thời ở dòng trận, hồ sơ đội và ô nhỏ. Ảnh tuyển thủ preview avatar lẫn roster.
- Có thay ảnh, gỡ ảnh và hoàn tác trước khi lưu. Gỡ ảnh đưa về fallback, không xóa đội/tuyển thủ.
- Mỗi lần thay ảnh tạo phiên bản mới. Lưu thất bại giữ ảnh đang dùng. Có kiểm tra revision để người sửa sau không ghi đè thay đổi vừa có.
- Sửa ảnh không làm đổi tên, roster, kết quả hay thể thức đã chốt.
- Crop được lưu như thiết lập hiển thị trên ảnh gốc, không phá file gốc. Các cỡ phái sinh được tạo từ cấu hình đã lưu.

## Phạm vi định dạng và lưu trữ

V1 nhận PNG, JPEG và WebP tĩnh. Không hứa hỗ trợ mọi file chỉ vì trình duyệt chọn được nó. AVIF/HEIC bổ sung khi bộ giải mã phía máy chủ hỗ trợ và đã có kiểm thử. SVG upload cần bước làm sạch/chuyển raster riêng; chưa phục vụ SVG gốc trực tiếp. SVG do dự án kiểm soát cho logo app là tài sản khác với file upload.

GIF/WebP/APNG động không tự phát trong danh bạ: chọn ảnh tĩnh đại diện qua xử lý có hỗ trợ hoặc báo định dạng chưa hỗ trợ. Giữ hướng nhẹ đã duyệt.

Giới hạn đề xuất: 10MB/file, tối đa 24 megapixel và 8192px mỗi chiều; kiểm tra trước khi giải mã đầy đủ. Thông báo giới hạn ngay ở vùng upload. Mức cụ thể cần đối chiếu tài nguyên máy chủ khi triển khai.

Máy chủ kiểm tra nội dung thực, không chỉ đuôi file/Content-Type. Chuẩn hóa hướng EXIF, không phục vụ metadata vị trí, chuẩn hóa màu khi có profile; mã hóa lại bản hiển thị, giữ transparency khi có. Dùng tên lưu do hệ thống cấp, không dùng tên người upload làm đường dẫn. Xử lý upload có kiểm tra quyền và giới hạn tài nguyên. Nguyên tắc từ [OWASP File Upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload).

Một kho asset dùng chung: file gốc được giữ riêng, bản hiển thị có version để cache. Database lưu asset ID, chủ thể, kích thước và cấu hình hiển thị; file ở kho media. Ban đầu lưu local cùng ứng dụng; backup phải gồm DB và media. Không tự gửi ảnh qua dịch vụ bên thứ ba.

Logo có bản nhỏ 64/128px, hồ sơ 256/512px; chân dung có thumbnail và 400/800px. Không upscale quá kích thước nguồn. Ảnh có `width/height`, tải các cỡ đúng viewport; lazy load ảnh ngoài màn hình. Không tải nguyên file 10MB vào mỗi hàng trận.

Quyền mặc định theo mô hình hiện tại: admin chỉnh nhận diện app/favicon; admin và điều hành chỉnh danh bạ/logo đội/ảnh tuyển thủ qua quyền danh bạ; điều hành có quyền giải chỉnh logo/bìa của giải đó; nhập liệu không tự đổi nhận diện. Truy cập media theo phạm vi quyền của chủ thể; chưa có trang public ngoài đăng nhập. Asset dùng chung phải có quy tắc đọc rõ, không vô tình công khai ảnh tuyển thủ qua URL tĩnh.

## Lịch sử và nhận diện

Danh sách đăng ký giải đã có snapshot tên/handle riêng. Khi bổ sung media, đề xuất snapshot asset ID/phiên bản tại đăng ký; chỉnh ảnh danh bạ không tự đổi hình trong giải cũ. Điều hành có thể cập nhật nhận diện cho một đăng ký bằng thao tác riêng có lịch sử, kể cả khi roster đã khóa; thao tác này không thêm/bớt tuyển thủ hoặc sửa game.

Không xóa vật lý asset còn được hồ sơ, đăng ký hoặc lịch sử tham chiếu. Gỡ/thay ảnh chỉ bỏ hoặc đổi tham chiếu hiện tại. Dọn file không còn dùng là quy trình riêng có thời gian giữ lại.

Màu thương hiệu đội có thể làm nền ảnh bìa hoặc dải roster nhỏ. Không dùng nó thay các màu Tiếp theo, Chờ xác nhận, Lỗi đã thống nhất. Nhận diện đội và trạng thái vận hành phải đọc độc lập.

## Những điểm cần thử bằng mẫu UI

Logo trong suốt trắng/đen, logo JPEG nền trắng, logo dài, logo có viền trống; chân dung dọc/ngang, cutout, ảnh thấp nét, thiếu ảnh; năm tuyển thủ với nickname dài trên điện thoại. Xem cùng asset ở hồ sơ đội, dòng trận và nhánh nhỏ trước khi chốt bố cục.

Kiểm thử upload khi triển khai: file giả đuôi, lỗi decode, quá byte/pixel/chiều, alpha, EXIF xoay, frame động, crop biên, sửa đồng thời, quyền đọc/ghi asset, asset được giải cũ tham chiếu, backup/restore cả DB và media.
