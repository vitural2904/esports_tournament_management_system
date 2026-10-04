# Hồ sơ đội, ảnh và tín hiệu vận hành

## Problem Statement
Ban tổ chức đã chọn mẫu A. App thật còn dùng danh bạ dạng danh sách; chưa có hồ sơ đội, ảnh lưu lâu dài hay tín hiệu lịch thống nhất. Đội có thể có 7–8 tuyển thủ; năm người ra sân không phải giới hạn đăng ký.

## Solution
Đưa mẫu A vào không gian vận hành. Hồ sơ có logo, tên, giới thiệu, đội hình theo giải, giải tham dự và trận thực tế. Thêm thành viên nhanh với thông tin ít nhất. Lưu ảnh an toàn; ảnh của đăng ký cũ giữ nguyên. Áp dụng tín hiệu lịch/kết quả đã duyệt.

## User Stories
1. Là quản trị, tôi muốn mở hồ sơ từ danh bạ để xem đội.
2. Là thành viên có quyền giải, tôi muốn mở đội từ đăng ký hoặc trận và quay lại đúng giải.
3. Là điều hành, tôi muốn chọn giải để xem đúng danh sách đăng ký.
4. Là điều hành, tôi muốn đăng ký 7–8 người, không bị khóa ở năm.
5. Là điều hành, tôi muốn thêm người có sẵn từ danh bạ.
6. Là điều hành, tôi muốn tạo người bằng nickname; họ tên và vị trí tùy chọn.
7. Là điều hành, tôi muốn sửa thông tin danh bạ mà không đổi đăng ký cũ.
8. Là điều hành, tôi muốn dùng quy trình duyệt bổ sung khi đăng ký đã khóa.
9. Là thành viên, tôi muốn xem đầy đủ tên trên điện thoại.
10. Là thành viên, tôi muốn thấy trạng thái trống khi đội chưa đăng ký; không có đội hình giả.
11. Là điều hành, tôi muốn lưu logo đội, ảnh bìa và ảnh tuyển thủ từ PNG/JPEG/WebP.
12. Là điều hành, tôi muốn preview, chỉnh nền logo và điểm trọng tâm trước khi lưu.
13. Là điều hành, tôi muốn thay/gỡ ảnh mà không xóa đội hoặc tuyển thủ.
14. Là thành viên, tôi muốn ảnh còn sau restart.
15. Là thành viên, tôi muốn đăng ký cũ giữ phiên bản ảnh cũ.
16. Là quản trị, tôi muốn backup/restore gồm ảnh.
17. Là thành viên, tôi muốn người không có quyền không đọc được media của giải.
18. Là điều hành, tôi muốn ảnh cũ giữ nguyên khi lưu thất bại hoặc revision cũ.
19. Là thành viên, tôi muốn biết mọi trận có cùng giờ tiếp theo.
20. Là thành viên, tôi muốn phân biệt giờ đã qua với đang vận hành.
21. Là điều hành, tôi muốn biết game chờ xác nhận mà trạng thái trận không bị thay thế.
22. Là thành viên, tôi muốn nhãn lịch cập nhật mỗi phút và khi trở lại tab.
23. Là thành viên, tôi muốn bộ lọc không đổi cách chọn trận tiếp theo.
24. Là thành viên, tôi muốn chữ/icon đủ rõ khi không phân biệt màu.
25. Là thành viên, tôi muốn giảm chuyển động tắt hiệu ứng phóng ảnh.

## Implementation Decisions
- Mẫu A đã chốt; prototype là nguồn tham khảo, không đưa mã mẫu vào đường chạy thật.
- Một hồ sơ theo đội; đội hình là đăng ký của giải được chọn. Không thêm roster chung hoặc tự gán từ giải gần nhất.
- Tên thi đấu bắt buộc, họ tên và vị trí tùy chọn; ID hệ thống cấp. Không thu tuổi/email/số điện thoại. Vị trí dùng Top/Jungle/Mid/ADC/Support; không lưu nhãn chính/dự bị cố định.
- Giữ giới hạn an toàn hiện có 20 người/đăng ký. Không thêm giới hạn năm hoặc tám. Quy tắc đội hình từng game giữ nguyên.
- Dùng quyền danh bạ hiện có để sửa hồ sơ; thành viên giải chỉ đọc snapshot thuộc giải được cấp. Mọi mutation kiểm tra revision.
- Thêm người mới và đăng ký từ hồ sơ phải atomic. Đăng ký khóa dùng duyệt bổ sung có lý do và lịch sử hiện có.
- Media là module riêng qua HTTP. Nhận PNG/JPEG/WebP tĩnh, tối đa 10MB, 24 megapixel, 8192px mỗi chiều; kiểm tra nội dung, không tin đuôi/MIME. Từ chối file động/SVG và decode lỗi. Chuẩn hóa EXIF, bỏ metadata, giữ alpha; không upscale.
- Chọn SQLite BLOB cho media của bản local: một backup đã gồm metadata và ảnh; không có đường dẫn file do người dùng cấp. Đây là thay đổi so với đề xuất kho file riêng, nhằm giữ backup hiện có đầy đủ và đơn giản. Lưu bản chuẩn hóa và các cỡ hiển thị; crop/điểm trọng tâm là thiết lập không phá nguồn chuẩn hóa.
- Mỗi thay ảnh tạo asset ID mới. Không xóa asset còn tham chiếu. Snapshot logo/ảnh/vị trí tại đăng ký; cập nhật ảnh danh bạ không đổi giải cũ. Việc cập nhật nhận diện đăng ký riêng để sau.
- Hover 180ms: viền/nền đổi nhẹ, ảnh phóng 1.025 trong khung; tên luôn hiện. Chỉ chuột fine/hover; reduced motion tắt phóng. Thẻ chỉ đọc không giả nút bấm.
- Tín hiệu theo thiết kế visual-signals đã duyệt: lifecycle, thời gian, attention độc lập. Tính trên toàn giải bằng UTC; đồng thời đều là Tiếp theo. Không gắn LIVE tự động. Dùng chữ Đang vận hành.
- Dùng semantic token và một hàm tính nhận now; lịch/danh sách/nhánh/màn hình game dùng cùng nghĩa. Cập nhật tối đa mỗi phút, ngay khi visibility hoặc dữ liệu đổi.

## Testing Decisions
- Người dùng ủy quyền tự quyết và không duyệt giữa bước. Dùng seam HTTP hiện có cho hồ sơ, đăng ký, media, quyền, revision, persistence, backup/restore. Dùng seam hàm tín hiệu công khai với now xác định cho lịch.
- TDD từng hành vi. Không test chi tiết SQL hay cấu trúc component.
- Kiểm thử 8 người, nickname-only, trùng, đăng ký khóa, API trái quyền, snapshot và restart.
- Kiểm thử media thật có alpha/EXIF, giả định dạng/động/quá giới hạn, lỗi revision, quyền đọc, snapshot sau thay/gỡ và backup/restore.
- Kiểm thử tín hiệu đồng giờ/khác ngày/timezone, thiếu/sai lịch, completed/skipped/in_progress, đúng giờ/quá giờ, attention.
- Build/typecheck và full suite cuối. Browser desktop/mobile, focus, reduced motion; dùng dữ liệu thử riêng, không thay kết quả thật.

## Out of Scope
Hosting/public pages, roster tổ chức nhiều game, dữ liệu cá nhân bổ sung, xóa nền AI, SVG/HEIC/AVIF/animation, logo app/favicon/logo giải, cập nhật nhận diện đăng ký lịch sử, garbage collection media, thay đổi thể thức hay luật tính kết quả.

## Further Notes
Nguồn: docs/design/identity-prototype.md, docs/design/media-and-team-profiles.md, docs/design/visual-signals.md. Prototype được giữ trên codex/prototype-identity. Không cần phê duyệt giữa bước theo yêu cầu người dùng.
