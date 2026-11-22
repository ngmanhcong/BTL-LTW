# Hướng dẫn đọc source

## Đọc từ một thao tác cụ thể

**Đăng nhập:**

1. `apps/web/src/features/auth/components/login/LoginForm.jsx`: nhận email/mật khẩu.
2. `services/gateway/src/routes.js`: chọn dịch vụ Accounts.
3. `services/accounts/src/routes/userRoutes.js`: ánh xạ URL sang controller.
4. `services/accounts/src/controllers/authController.js`: kiểm tra thông tin, tạo JWT.
5. `services/accounts/src/models/userModel.js`: schema tài khoản, băm mật khẩu.

**Đăng bài:**

1. `apps/web/src/features/posts/components/CreatePostPopup/`: form và nội dung bài.
2. `apps/web/src/features/posts/hooks/useCreatePost.js`: gọi API.
3. `services/content/src/routes/postRoutes.js` và `controllers/postController.js`.
4. `services/content/src/models/postModel.js`: dữ liệu bài viết.
5. `services/content/src/storage/`: xử lý ảnh và upload.

**Nhắn tin:**

1. `apps/web/src/pages/messages/`: bố cục hội thoại và ô nhập.
2. `apps/web/src/features/messaging/hooks/useSendMessage.js`: lưu tin qua API.
3. `services/messaging/src/controllers/messagesController.js`: kiểm tra thành viên và lưu tin.
4. `services/messaging/src/utils/socket.js`: xác thực và phát sự kiện tới người nhận.

## Quy ước

- `pages/` là màn hình ứng với route. Component nhỏ và hook riêng cho nghiệp vụ nằm trong `features/<tên>/`.
- `shared/components/` chứa UI có thể dùng ở nhiều feature; `shared/icons/` chứa icon; `shared/lib/` chứa tiện ích; `shared/hooks/` chứa hook không gắn nghiệp vụ.
- Import sang feature khác dùng đường dẫn từ `src`, ví dụ `shared/components/ui/Card/Card`. Import cạnh nhau vẫn dùng `./...`. `jsconfig.json` khai báo `baseUrl: src`.
- Backend: route nhận request, controller điều phối nghiệp vụ, model mô tả dữ liệu của dịch vụ. Model projection được đặt tên và ghi chú riêng để phân biệt bản sao phục vụ đọc với nguồn dữ liệu chính.
- `services/accounts/src/clients/` chứa lời gọi sang Content/Messaging; `services/content/src/storage/` chứa adapter lưu ảnh local/Cloudinary. Việc gọi thông báo dùng client chung trong `packages/service-kit`.
- Dùng `packages/service-kit` cho HTTP client, xác thực, lỗi, tiện ích kỹ thuật. Không đưa model tài khoản, bài viết hoặc chat vào package chung.
- Dùng Prettier theo `.prettierrc.json`. Chưa thay toàn bộ logic cũ hoặc xử lý toàn bộ cảnh báo React Hooks trong lần tổ chức source này.

## Khi thêm chức năng

1. Xác định dịch vụ sở hữu dữ liệu cần ghi.
2. Thêm model/controller/route trong dịch vụ đó.
3. Khai báo tuyến ở Gateway nếu có URL mới.
4. Thêm hook/component trong feature tương ứng của React.
5. Nếu cần dữ liệu của dịch vụ khác, dùng HTTP client/API nội bộ hoặc projection; không import model của dịch vụ khác.
6. Thêm kiểm tra tích hợp cho luồng đi qua các dịch vụ.

Các tên lịch sử còn trong state hoặc API được giữ khi cần tương thích. Ví dụ file đã đổi thành `socketSlice.js`, nhưng key state `soketSlice` vẫn được các component dùng; không đổi key một nửa.
