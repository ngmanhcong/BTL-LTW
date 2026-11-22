# PTITSocial

PTITSocial là mạng xã hội dành cho sinh viên, có bảng tin, bạn bè, nhắn tin, Roadmap học tập và trợ lý Gemini. Project dùng React, Node.js, Express và MongoDB.

## Cấu trúc

```text
apps/web/                  React: giao diện đang sử dụng
  src/pages/               Các trang gắn với URL
  src/features/            Component và hook theo chức năng
  src/shared/              UI, icon, tiện ích dùng chung
  src/app/                 Redux store và state
  src/routes/              Điều hướng và kiểm tra phiên đăng nhập
services/
  gateway/                 Định tuyến HTTP và WebSocket
  accounts/                Tài khoản, hồ sơ, kết bạn, theo dõi, tìm kiếm
  content/                 Bài viết, bình luận, lượt thích, ảnh
  messaging/               Chat, tin nhắn, thông báo và trạng thái online
  learning/                Trợ lý Gemini, tìm kiếm ngữ nghĩa và lộ trình cá nhân
packages/service-kit/      Xử lý lỗi, HTTP client, xác thực và bản sao dữ liệu công khai
scripts/                   Khởi động, dừng, cấu hình, chuyển dữ liệu
tests/                     Kiểm tra ranh giới dịch vụ và luồng tích hợp
docs/                      Kiến trúc, API và hướng dẫn đọc source
legacy/backbook-server/    Backend cũ để tham khảo/chuyển dữ liệu; không chạy cùng bản mới
compose.yaml               MongoDB và Mailpit trên máy local
```

## Chạy local

Cần Node.js 22 và Docker Desktop. Trong thư mục gốc:

```powershell
npm.cmd install
npm.cmd --prefix apps/web ci
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

- Website: http://localhost:3000
- Gateway và trạng thái dịch vụ: http://localhost:8000/health
- Hộp thư thử nghiệm: http://localhost:8025

Script tự tạo cấu hình local nếu chưa có. Các file `.env`, dữ liệu upload, log và bản sao lưu không được đưa vào Git. Nếu dùng PowerShell bị chặn `npm.ps1`, gọi `npm.cmd` như các lệnh trên.

Dừng mà vẫn giữ dữ liệu:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\stop-local.ps1
```

Khi chạy lần đầu với MongoDB trống, đăng ký tài khoản trên website rồi mở Mailpit để xác minh email.

Firebase Messaging được tắt theo mặc định khi chạy local. Nếu bật tính năng tùy chọn này, dùng cấu hình Firebase của bạn ở frontend và service worker, đặt `REACT_APP_FIREBASE_API_KEY` trong `apps/web/.env.local` và thay giá trị mẫu trong `apps/web/public/firebase-messaging-sw.js`.

## Dịch vụ

| Thành phần | Cổng | Database               |
| ---------- | ---- | ---------------------- |
| Web        | 3000 | Gọi Gateway            |
| Gateway    | 8000 | Không kết nối database |
| Accounts   | 8001 | `ptitsocial_accounts`  |
| Content    | 8002 | `ptitsocial_content`   |
| Messaging  | 8003 | `ptitsocial_messaging` |
| Learning   | 8004 | `ptitsocial_learning`  |

Từng dịch vụ có `package.json`, `src/server.js`, `.env` và `/health` riêng. Có thể chạy riêng bằng `npm.cmd run start:accounts`, `start:content`, `start:messaging`, `start:gateway`. Khi gọi từ root bằng npm workspace, working directory được đặt vào dịch vụ tương ứng.

Một MongoDB local phục vụ bốn database tách biệt; không có dịch vụ nào truy vấn trực tiếp database của dịch vụ khác. Các bản sao tên, avatar và quan hệ theo dõi chỉ phục vụ đọc, được đồng bộ qua API nội bộ.

Góc học tập tại `/learning` có sáu roadmap tương tác, không cần API key. Chế độ **Learn with AI** tại `/learning/ai` dùng `GEMINI_API_KEY` trong `services/learning/.env` để tạo lộ trình và hỏi đáp. Xem [hướng dẫn Roadmap và Gemini](docs/AI-LEARNING.md).

## Kiểm tra

```powershell
npm.cmd run test:architecture
npm.cmd run test:learning
npm.cmd --prefix apps/web test -- --watchAll=false --runInBand
# Cần hệ thống đang chạy:
npm.cmd run test:integration
npm.cmd run build:web
```

Nếu Gateway chạy ở cổng khác, đặt `$env:TEST_API_URL='http://localhost:8010'` trước khi chạy kiểm tra tích hợp.

Kiểm tra tích hợp bao gồm xác minh email, kết bạn, ảnh, bình luận, WebSocket, quyền đọc tin nhắn và trạng thái đã đọc riêng cho từng thành viên nhóm. Các kiểm thử giao diện kiểm tra tên tiếng Việt, bài chia sẻ đã mất bài gốc và cập nhật trạng thái đọc. Bộ kiểm tra tích hợp tạo tài khoản thử riêng rồi dọn dữ liệu, email trong Mailpit và ảnh local của lần chạy đó; không xóa dữ liệu người dùng hiện có.

## Chuyển dữ liệu cũ

```powershell
npm.cmd run migrate:legacy
# Kiểm tra các ID cũ đã có trong database mới:
npm.cmd run check:migration
```

Lệnh sao chép từ database `backbook`, giữ nguyên ObjectId và không sửa database nguồn. Những bản ghi đã có trong database mới không bị ghi đè. Bản sao lưu nằm ở `.local-backups/`; ảnh được sao chép vào `services/content/uploads/`.

## Đọc tiếp

- [Học và trình bày BASE, Roadmap và Learn with AI](docs/HUONG-DAN-BAO-VE-PROJECT.md)
- [Kiến trúc và quyền sở hữu dữ liệu](docs/ARCHITECTURE.md)
- [Truy cập từ máy khác cùng Wi-Fi](docs/LAN.md)
- [Đường đi của API](docs/API.md)
- [Nên đọc và sửa file nào](docs/CODE-GUIDE.md)
- [Làm việc nhóm: clone, chia nhánh và Pull Request](docs/TEAM-WORKFLOW.md)
- [Ghi chú giao diện](PTITSOCIAL-DESIGN.md)
- [Kết quả kiểm thử](Doi_chieu_va_minh_chung_kiem_thu_PTITSocial.md)
