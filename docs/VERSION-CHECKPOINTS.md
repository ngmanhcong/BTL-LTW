# Mốc phiên bản PTITSocial

## BASE — mốc khôi phục theo yêu cầu người dùng

Tên Git tag: `BASE`.

Đây là trạng thái mã nguồn được người dùng chọn làm BASE ngày 14/11/2026.
Khi người dùng yêu cầu "quay về BASE", dùng đúng tag này làm mốc khôi phục.

Mốc bao gồm toàn bộ chức năng đã hoàn thành trong các phần bên dưới, sáu sửa lỗi
được khôi phục từ nhh và thay đổi bỏ dòng "Bạn đã xem hết tin nhắn" trong chat.
Tính năng AI gợi ý roadmap mới được trao đổi ý tưởng, chưa được triển khai.

Không di chuyển hoặc ghi đè tag BASE khi tiếp tục thêm chức năng. Trước khi
khôi phục sau này, lưu riêng những thay đổi mới cần giữ. Mốc chỉ lưu mã nguồn,
không hoàn tác MongoDB, cấu hình `.env` hay tệp người dùng đã tải lên.

## checkpoint-2026-11-14-vi-chat

Mốc mã nguồn ngày 14/11/2026, trước đợt bổ sung chức năng tiếp theo.

Các chức năng đã hoàn thành:

- Quyền xem bài viết: Công khai, Bạn bè, Bạn bè được chọn; kiểm tra quyền ở backend.
- Danh sách chọn người xem chỉ hiển thị bạn bè đã chấp nhận kết bạn.
- Biểu tượng quyền xem đồng bộ trên bài viết và phần tạo bài.
- Cho phép bôi đen và sao chép nội dung.
- Trả lời tin nhắn bằng trích dẫn; chuyển tiếp đến bạn bè hoặc cuộc trò chuyện khác.
- Menu dấu ba chấm trên tin nhắn; thời gian chỉ hiện khi rê chuột; bỏ bong bóng đang nhập.
- Gửi ảnh có xem trước và chú thích, chọn emoji, gửi tài liệu Word/PDF và các tệp được hỗ trợ.
- Giới hạn ảnh 10 MB, tài liệu 25 MB; kiểm tra quyền tải tệp theo thành viên cuộc trò chuyện.
- Việt hóa giao diện, thông báo, lỗi nhập liệu, chủ đề chat và email hệ thống.
- Sửa lỗi tin thông báo khi đổi chủ đề hoặc tên nhóm.

Kiểm tra đã thực hiện: 13 kiểm thử giao diện/ngôn ngữ, kiểm tra kiến trúc,
kiểm tra tích hợp API và Socket.IO, kiểm tra email và bản build frontend.
Bản build thành công, còn các cảnh báo lint của dự án.

Mốc Git lưu mã nguồn và tài liệu. Cấu hình `.env`, dữ liệu MongoDB, tệp đã tải lên,
thư viện cài đặt và nhật ký không nằm trong mốc mã nguồn.

Các chức năng mới tiếp tục phát triển từ mốc này. Không tự động hoàn tác dữ liệu
người dùng khi cần đối chiếu hoặc khôi phục mã nguồn.

## Khôi phục bản sửa của nhh ngày 14/11/2026

Áp dụng lại commit `2e31177` sau khi đã pull lịch sử có commit hoàn tác `5c91132`.
Giải quyết xung đột để giữ các chức năng trong mốc ở trên và giao diện tiếng Việt.

- Kiểm tra thành viên trước khi xem hoặc đánh dấu tin nhắn đã đọc.
- Theo dõi trạng thái đọc và bộ đếm riêng cho từng thành viên nhóm; đọc lại
  hoặc đọc tin cũ không thay thế tin mới nhất và không trừ sai bộ đếm.
- Thống nhất tên tiếng Việt từ 2 đến 25 ký tự giữa đăng ký và backend.
- Hiển thị thông báo khi bài gốc của bài chia sẻ không còn khả dụng.
- Cho phép bình luận chỉ có ảnh, chặn bình luận trống hoặc sai dữ liệu trước khi lưu.
- Bắt lỗi khi trình duyệt chặn tự phát âm thanh thông báo.

Kiểm tra sau khi hợp nhất: 30 kiểm thử frontend, kiểm tra kiến trúc, kiểm tra tích hợp
toàn bộ chức năng hiện tại và các lỗi trên; bản build frontend thành công.
