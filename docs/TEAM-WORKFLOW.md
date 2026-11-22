# Làm việc nhóm với base PTITSocial

## Một repository chung

Đưa toàn bộ thư mục gốc lên một repository GitHub. Không tạo repository riêng cho mỗi service. Monorepo giữ cùng phiên bản frontend, Gateway và các dịch vụ, giúp mọi người clone rồi chạy cả hệ thống.

Repository nhóm là [Young-Tobi/PTITSocial](https://github.com/Young-Tobi/PTITSocial), chế độ private. Base được lưu trên nhánh `main`; chủ repo cần mời ba thành viên còn lại để họ có quyền truy cập.

Các lệnh sau chỉ để tham khảo khi khởi tạo một repo khác; không chạy lại bước tạo commit/remote ban đầu cho repo này:

```powershell
git add .
git status
git commit -m "chore: initialize PTITSocial base"
git remote add origin https://github.com/Young-Tobi/PTITSocial.git
git push -u origin main
```

`.gitignore` đã loại `.env`, node_modules, file upload, log và bản sao lưu local. Commit source, các file lock và `.env.example`; không gửi cả node_modules cho nhau.

## Mỗi thành viên cài trên máy riêng

```powershell
git clone https://github.com/Young-Tobi/PTITSocial.git
cd PTITSocial
npm.cmd ci
npm.cmd --prefix apps/web ci
# Mở Docker Desktop trước:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

Script khởi động tạo `.env` cho backend và `.env.local` cho React nếu chưa có. Không cần dùng khóa bí mật trên máy trưởng nhóm.

Mỗi máy có MongoDB và dữ liệu riêng: cùng source không có nghĩa là cùng tài khoản/bài viết. Thành viên cài mới tự đăng ký và xác minh qua http://localhost:8025. Dữ liệu mẫu dùng chung sau này nên được tạo bằng seed script, không commit database hoặc `.env` thật.

## Chia việc theo tính năng xuyên suốt

Mỗi người làm cả giao diện, API và dữ liệu của chức năng được giao:

| Thành viên | Ví dụ phạm vi                      | Nhánh                   |
| ---------- | ---------------------------------- | ----------------------- |
| 1          | Kho tài liệu                       | `feature/documents`     |
| 2          | Quiz                               | `feature/quiz`          |
| 3          | Phòng học ảo                       | `feature/study-rooms`   |
| 4          | Chức năng thứ tư sau khi nhóm chốt | `feature/ten-chuc-nang` |

Không cần chia cứng một người frontend, một người backend, hoặc mỗi người giữ độc quyền một service của base. Một chức năng có thể dùng nhiều dịch vụ hiện có.

Trước khi code, thống nhất tên route, request/response, bên sở hữu dữ liệu và việc cần sửa ở Gateway. Với file dùng chung như `package.json`, `compose.yaml`, Gateway, service-kit và Redux store, báo nhau trước để tránh xung đột.

## Một vòng làm việc

Bắt đầu chức năng:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/documents
```

Code, chạy thử rồi lưu một phần công việc hoàn chỉnh:

```powershell
git add .
git commit -m "feat(documents): add document upload"
git push -u origin feature/documents
```

Tạo Pull Request từ nhánh đó vào `main`. Một thành viên khác đọc thay đổi và thử chạy trước khi merge. Dùng PR nhỏ theo luồng hoàn chỉnh, không chờ xong toàn bộ tính năng mới gửi PR đầu tiên. Bản thân việc push nhánh chưa làm thay đổi `main`.

Lấy code chung trong lúc đang làm:

```powershell
# Commit công việc hiện tại trước khi cập nhật.
git fetch origin
git merge origin/main
```

Nếu có conflict, cùng người sửa file đó xử lý các đoạn xung đột, chạy lại chức năng liên quan rồi commit phần giải quyết. Không dùng force push lên `main`.

## Trước khi ghép code

- Test chức năng mới bằng ít nhất hai tài khoản nếu có tương tác giữa người dùng.
- Nếu đổi ranh giới dịch vụ hoặc API chung, chạy `npm.cmd run test:architecture` và `npm.cmd run test:integration` khi hệ thống đang chạy.
- Nếu đổi frontend, chạy `npm.cmd run build:web`.
- Cập nhật `docs/API.md` và cấu hình mẫu nếu thêm API hoặc biến môi trường.
- PR mô tả thay đổi, cách chạy thử và ảnh chụp màn hình nếu sửa giao diện.

Giữ `main` ở trạng thái chạy được. Với nhóm bốn người, bắt đầu bằng `main` và các nhánh chức năng là đủ; chưa cần thêm tầng nhánh `develop` nếu chưa có nhu cầu.
