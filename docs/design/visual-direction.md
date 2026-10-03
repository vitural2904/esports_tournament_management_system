# Visual và typography — Bản thử 02

## Hướng đã áp dụng

Thẩm mỹ editorial cho ứng dụng vận hành giải: nền mực, vùng nội dung màu giấy, coral cho hành động chính, mint cho lựa chọn và đường đi, ochre cho trạng thái cần chú ý. Chữ và khoảng cách tạo thứ bậc; nội dung thi đấu vẫn là trọng tâm.

Nguồn tham khảo:

- [Dennis Snellenberg](https://dennissnellenberg.com/): đã xem portfolio trong trình duyệt. Tham khảo tỷ lệ chữ lớn, chênh lệch trọng lượng chữ và chuyển động tương tác. Không sao chép ảnh hoặc mã.
- [Locomotive](https://locomotive.ca/en): tham khảo nội dung và cách tổ chức danh mục work/agency, hướng editorial. Trang chặn truy cập visual bằng Cloudflare trong phiên này; không mô tả hiệu ứng chưa trực tiếp kiểm chứng.
- [Bruno Simon](https://bruno-simon.com/): tham khảo ý tưởng portfolio như một trải nghiệm tương tác. Chỉ lấy tinh thần phản hồi vui; ứng dụng này không thêm thế giới 3D hoặc âm thanh.

## Font

- Đã copy toàn bộ 15 file OTF Lens Grotesk từ ZIP của người dùng vào `public/fonts/lens-grotesk`.
- Giữ bản gốc. Có bản WOFF2 được tạo từ cùng font để dùng trên web; self-host, không tải font của người dùng lên dịch vụ ngoài.
- Đăng ký Thin 100, ExtraLight 200, Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700 và các bản italic có sẵn. Book/BookItalic là family thay thế Lens Grotesk Book, weight 400 theo metadata gốc.
- Lens Grotesk là font chính. Family này thiếu một số ký tự tiếng Việt có dấu, ví dụ ả, ấ, ậ, ể, ố, ộ, ứ.
- [Be Vietnam Pro từ Google Fonts](https://github.com/google/fonts/tree/main/ofl/bevietnampro) bổ sung glyph thiếu, với weight 400, 500, 600, 700; tải và dùng nội bộ, giữ OFL.txt.
- Chữ nội dung và điều khiển dùng 400/500. Tên đội và tiêu đề dùng 600. Chữ brand dùng 700. Số liệu lớn và dòng tiêu đề phụ dùng 300. Không dùng Thin cho chữ nhỏ.

## Token

`src/visual-system.css` giữ ba lớp: màu gốc → màu theo mục đích → token của component. Font có một stack chung cho dashboard và ba bố cục builder.

## Motion

- Motion for React: chữ và panel xuất hiện theo nhịp ngắn, số liệu chạy tới giá trị mẫu, nút có phản hồi, tab đổi bằng indicator chung, chi tiết trận mở từ cạnh.
- AutoAnimate: lọc và thêm trận; di chuyển đội trong builder.
- Giữ animation trên icon chuông, đổi nhãn chỉ fade opacity. Không dùng blur cho nhãn nút.
- Tôn trọng reduced motion; số liệu cập nhật ngay khi người dùng giảm chuyển động.
- Dữ liệu dashboard là mẫu minh họa. Counter không lấy dữ liệu từ giải thật.

## Lỗi nhãn thông báo

Đã tái hiện trên component thực: nhãn “Thông báo” đang hiện với opacity 1 nhưng filter vẫn là blur(2px). Selector bỏ blur cũ không loại được hiệu ứng trong CSS đã sinh. Bỏ toàn bộ blur ở hai nhãn, giữ opacity và animation chuông. CSS button chung còn ghi đè màu chữ của utility trong component; đặt màu trạng thái ở style của button để chữ tối trên nền mint khi bật. Kiểm tra lại cả trạng thái bật/tắt bằng computed style và ảnh giao diện.

## Phạm vi

Dashboard mẫu được làm lại để xem rõ hướng visual. Cùng font và token áp dụng cho builder A/B/C. Đây vẫn là UI mẫu; việc thêm trận chỉ thay đổi bộ nhớ, không tạo dữ liệu thật.

## Nền sóng và chữ lớn hơn

- Tham chiếu hình dạng: [Vibrant Wavy Backgrounds](https://elements.envato.com/vibrant-wavy-backgrounds-JSD4GD2). Tự dựng các đường cong SVG; không thêm video hoặc ảnh tải từ mẫu.
- Nền mint/sage, độ mờ 1.4px, độ hiện 22%. Chỉ lớp nền có blur. Panel vẫn có nền đặc.
- Laptop: nhịp sóng 26 giây; con trỏ dịch nền tối đa 12px ngang, 9px dọc. Chỉ biến đổi vị trí/góc/tỉ lệ, không tính lại hình học mỗi khung hình.
- Điện thoại hoặc con trỏ thô: nền tĩnh. Reduced motion: nền tĩnh. Tab ẩn: dừng nhịp sóng. Có dọn sự kiện khi rời màn hình.
- Lens Grotesk và fallback tiếng Việt giữ nguyên. Chữ chính 15–16px, chữ phụ 13–14px, nút chính tối thiểu cao 44px. Tăng cả chữ của ba bản dựng thể thức. Chữ trong nhánh vẫn đi theo mức thu phóng.
- Điện thoại: tiêu đề và hành động tách hàng; lịch đấu xếp metadata dưới đội; khoảng cách tăng theo chữ.
- Kiểm tra: build thành công; laptop 1280px và điện thoại 390px không tràn ngang; lọc chờ xác nhận còn một trận; bản C không cắt nút inspector.

## Sửa hướng gradient theo mẫu gốc

Bản đường mint trước đó thiếu gradient và bề mặt có chiều sâu. Bản hiện tại thay đường đơn bằng 30 dải kín, dùng gradient teal/mint/lavender/vàng ấm, khe tối và mép sáng. Khối chính nghiêng 8 độ, lệch phải; khối phụ xoay ở phía dưới. Lớp che riêng giữ chữ bên trái rõ. Chỉ nền có blur 0.7px. Độ hiện khối chính 80%, khối phụ 22%; lớp che giảm màu ở vùng đọc. Các thông số này thay thông số nền mint ở mục trước.

Đã đọc lại mô tả và ảnh người dùng đưa. Envato ghi asset là JPG, 10 thiết kế, 4500 × 3000; chuyển động là phần ứng dụng tự thêm. Component sống trong src/components/AmbientWaves.tsx. Bản xem riêng của bề mặt: public/art/folded-gradient.svg. Đây là bản dựng SVG riêng, lấy hướng thị giác từ mẫu, không phải asset Envato.

Build đạt. Desktop không tràn ngang. Ở 390px, main rộng 375px và nền chuyển sang trạng thái still.
