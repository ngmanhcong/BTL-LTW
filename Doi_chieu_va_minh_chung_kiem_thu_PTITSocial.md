# Kiểm thử PTITSocial

Kiểm tra trên bản local ngày 22/11/2026, dùng Chrome, MongoDB và Mailpit. Hai tài khoản thử được dùng để kiểm tra dữ liệu theo từng người.

| Nhóm | Pass | Fail | Chưa kiểm chứng |
| --- | ---: | ---: | ---: |
| Chức năng chung | 4 | 0 | 0 |
| Roadmap | 8 | 0 | 0 |
| Learn with AI | 7 | 0 | 1 |

- **Chức năng chung**. Kiểm tra đăng nhập đúng và sai mật khẩu, mở trang học tập khi chưa đăng nhập, đăng xuất rồi truy cập lại.
- **Roadmap**. Kiểm tra thư viện lĩnh vực, chi tiết chủ đề, tìm kiếm, chế độ sơ đồ và danh sách, đổi trạng thái, tải lại trang và tiến độ riêng theo tài khoản.
- **Learn with AI**. Kiểm tra mục tiêu rỗng hoặc quá ngắn, tạo Roadmap và Guide, tải lại phiên, mở lại Khế và quyền truy cập phiên. Hai lượt tạo nội dung dùng Gemini thật. Phản hồi giao diện khi Gemini gặp lỗi hoặc timeout chưa được kiểm chứng.

## Bộ kiểm thử tự động

| Lệnh | Kết quả |
| --- | --- |
| `npm.cmd run test:architecture` | 3/3 đạt |
| `npm.cmd run test:learning` | 18/18 đạt |
| `npm.cmd --prefix apps/web test -- --watchAll=false --runInBand` | 50/50 đạt |
| `node tests/learning-integration.cjs` | Đạt với Gemini giả lập |
| `npm.cmd run test:integration` | Đạt trên hệ thống local |
| `npm.cmd run build:web` | Build thành công, còn cảnh báo |
