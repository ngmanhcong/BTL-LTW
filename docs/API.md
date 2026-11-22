# API qua Gateway

Frontend chỉ gọi `http://localhost:8000`. Các URL giữ tương thích với giao diện hiện tại.

| Tiền tố/đường dẫn                                                                | Dịch vụ   |
| -------------------------------------------------------------------------------- | --------- |
| `/api/v1/users/signup`, `/login`, `/logout`, `/forgotPassword`, `/resetPassword` | Accounts  |
| `/api/v1/users/emailVerification`, `/resendEmailVerifivation`, `/ping`           | Accounts  |
| `/api/v1/users/search*`, `/update/profile/*`                                     | Accounts  |
| `/api/v1/users/getProfile/:username`                                             | Accounts  |
| `/api/v1/friends/*`                                                              | Accounts  |
| `/api/v1/posts/*`                                                                | Content   |
| `/api/v1/users/getProfile/:username/posts`                                       | Content   |
| `/api/v1/users/getProfile/:username/photos`                                      | Content   |
| `/uploads/*`                                                                     | Content   |
| `/api/v1/chats/*`, `/api/v1/messages/*`                                          | Messaging |
| `/api/v1/users/notifications*`                                                   | Messaging |
| `/socket.io/*`                                                                   | Messaging |

`resendEmailVerifivation` là tên route cũ có lỗi chính tả, tạm giữ để không làm hỏng giao diện. Khi chuẩn hóa API, đổi đồng thời route và nơi gọi, hoặc giữ alias trong một giai đoạn chuyển tiếp.

## API nội bộ

Chỉ dùng giữa dịch vụ, không gọi từ React. Cần header `x-service-key` lấy từ cấu hình local, không hardcode key vào source hay frontend.

| Dịch vụ   | API                            | Dữ liệu                                                          |
| --------- | ------------------------------ | ---------------------------------------------------------------- |
| Accounts  | `POST /internal/auth/verify`   | `{ token }` → thông tin phiên người dùng hợp lệ                  |
| Accounts  | `GET /internal/projections`    | Danh sách hồ sơ công khai và quan hệ theo dõi                    |
| Content   | `POST /internal/media`         | `{ buffer, folder }`, buffer base64 → URL ảnh                    |
| Content   | `POST /internal/profile-posts` | `{ user, type, text, images }`, type `profilePhoto` hoặc `cover` |
| Messaging | `POST /internal/notifications` | `{ action, payload }` → thông báo đã lưu                         |
| Messaging | `GET /internal/stats/:userId`  | Bộ đếm tin nhắn/thông báo chưa đọc                               |

Mỗi dịch vụ có `GET /health`. Gateway có `GET /health` tổng hợp và trả HTTP 503 nếu một dịch vụ chưa sẵn sàng.
