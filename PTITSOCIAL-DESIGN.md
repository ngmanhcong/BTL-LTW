# PTITSocial — giao diện đã duyệt

Giữ nguyên font gốc `"Segoe UI", Helvetica, Arial, sans-serif`, kể cả nút và ô nhập liệu. Màu chủ đạo `#B8202E`, nền `#F4F5F7`, thẻ trắng, hỗ trợ giao diện tối.

Các trang: đăng nhập, bảng tin, hồ sơ, bạn bè và tin nhắn. Giữ dữ liệu người dùng và các luồng xác minh email. Cột kết nối trên bảng tin hiển thị lời mời và bạn bè online thật; các tài khoản, ảnh và bài viết trong mockup không được thêm vào dữ liệu thật.

Logo hai bong bóng trò chuyện được dựng bằng SVG trong `apps/web/src/shared/components/brand/Brand.jsx`. Bản icon độc lập: `apps/web/public/icons/ptitsocial.svg`.

Minh họa đăng nhập và ảnh bìa mặc định: `apps/web/public/images/ptit-campus.png`, tạo bằng công cụ Imagegen tích hợp. Đây là minh họa phong cách khuôn viên, không phải ảnh chụp hay bản vẽ kiến trúc chính thức.

Prompt dùng cho minh họa:

> Create ONLY a wide 3:2 architectural illustration for the left side of the login screen of PTITSocial, a Vietnamese student social network. Match the approved concept: elegant thin deep-red #B8202E architectural ink lines, soft pale-red washes on a pure white background. A friendly Vietnamese university building with a modest red facade accent and a small sign reading PTIT, leafy campus trees, 4 Vietnamese university students with backpacks chatting in foreground. Tasteful minimal realistic line illustration, not anime, not mascot, no giant faces. Spacious white sky in upper third; all important content in lower two thirds. Flat graphic suitable for a website. No UI, no login fields, no slogans, no wordmark, no watermark. This is a stylized campus illustration, not an exact claim of official architecture.

Kiểm tra: font thực tế trên trình duyệt; responsive; đăng nhập; mở form đăng ký; tìm kiếm và mở hồ sơ; các tab bạn bè; mở và gửi chat; chặn tài khoản chưa xác minh, gửi lại và kích hoạt email; đổi sáng/tối và đăng xuất.

Chưa dịch toàn bộ thông báo lỗi và nội dung do backend tạo. Giao diện đang chạy local tại http://localhost:3000.

