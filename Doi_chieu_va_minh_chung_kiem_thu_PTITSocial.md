# Đối chiếu và minh chứng kiểm thử PTITSocial

Kiểm tra ngày 22/11/2026 trên bản PTITSocial dùng React, Node.js và MongoDB. Website mở tại `http://localhost:3000`. Hai tài khoản A, B được tạo riêng cho lần chạy trình duyệt và xác minh bằng Mailpit.

## A. Các vấn đề phát hiện và cách xử lý

| Vị trí | Nội dung trước khi sửa | Căn cứ đối chiếu | Cách xử lý trong bản Word |
|---|---|---|---|
| Chương 1–2 | Nhắc đến phụ lục chưa có trong file và những ví dụ về tính điểm, bảng xếp hạng. | Bản báo cáo kết thúc ở tài liệu tham khảo. Các màn hình trong phạm vi gồm BASE, Roadmap và Learn with AI. | Sửa mô tả bố cục, dùng ví dụ biểu mẫu đăng nhập, nhập mục tiêu và chi tiết chủ đề. |
| Mục 3.3 và 3.4 | Cột “Tác nhân chính” trong Bảng 3 thực tế ghi kết quả. Tìm kiếm Roadmap và số tài liệu AI cần mô tả đúng hành vi. | `Roadmaps.jsx` lọc theo tiêu đề. Sơ đồ làm mờ kết quả không khớp, danh sách ẩn chúng. `retrieval.js` trả tối đa tám mục. | Đổi tên cột và làm rõ hai luồng. Thử từ khóa có và không có kết quả trên Chrome. |
| Mục 3.6, Bảng 11 | Tiêu chí BQ, BP, chủ phòng, đáp án ẩn và Judge0 thuộc phạm vi khác. | `services/learning/src/server.js` xử lý tiến độ, phiên AI, phân quyền và hạn mức. Giao diện Learning có ô nhập và trạng thái chờ. | Thay bằng sáu tiêu chí cho Roadmap và Learn with AI. Lỗi quota/timeout của Gemini thật được giữ ở mức chưa kiểm chứng trên giao diện. |
| Chương 4, mục 4.4 | Lời dẫn nói bảng API theo mã kịch bản và đường dẫn đầy đủ, trong khi bảng dùng đường dẫn tương đối theo tiền tố. | Route Gateway và Learning đặt các API dưới `/api/v1/learning`. Cả Roadmap và AI yêu cầu tài khoản đã xác minh. | Khớp lời dẫn với bảng. Giữ kiến trúc React, Gateway, bốn dịch vụ Node.js và dữ liệu MongoDB của bản đang chạy. |
| Mục 5.1–5.3 | Nhắc tới công thức tính điểm, bộ phân tích đề, trang soạn và một mục mang tên thư viện bộ đề. Hình bảng tin còn các mục Quiz và Thi đấu lập trình. | Các file `Roadmaps.jsx`, `index.jsx`, `KheChat.jsx`, `server.js`, `retrieval.js`, `provider.js`, `validation.js` thể hiện đúng luồng học tập. | Sửa mô tả theo file thực tế. Giữ vị trí Hình 4 và thay bằng ảnh bảng tin chụp thật từ tài khoản thử. |
| Mục 6.2, Bảng 20 | Kết quả của nhiều lần chạy được trình bày chung, một số thiếu cách tái hiện. | Đã chạy lại các bộ Node.js, Jest, hai bộ API tích hợp và build frontend. Phần tích hợp Learning dùng Gemini giả lập. | Ghi rõ lệnh, mức kiểm thử và kết quả theo log. Tách phần chạy trên Chrome. |
| Mục 6.3–6.5, Bảng 21–23 | Nhiều dòng dùng schema, API hoặc hàm làm thay cho kết quả thao tác giao diện. | Chrome điều khiển các thao tác qua giao diện thật. Network chỉ dùng để xác nhận form không phát request khi mục tiêu sai. | Viết lại thành 20 kịch bản sáu cột. Ghi quan sát và trạng thái riêng từng dòng. |
| Mục 6.6, Bảng 24 và kết luận | Nhận xét cần phân biệt chức năng đã thấy với phần còn thiếu bằng chứng giao diện. | Hai lần tạo nội dung dùng Gemini thật. Kiểm thử quota và xử lý lỗi trong bộ tự động dùng phản hồi giả lập. | Nêu giới hạn của lần chạy và các thao tác AI cần thử thêm trên trình duyệt. |

## B. Danh sách kịch bản cuối cùng

| Nhóm | Mã trong bản Word | Kịch bản |
|---|---|---|
| Chức năng chung | C01–C04 | Mở trang học tập khi chưa đăng nhập, nhập sai mật khẩu, đăng nhập hợp lệ, đăng xuất rồi truy cập lại. |
| Roadmap thường | R01–R08 | Mở thư viện và Cyber Security, mở chi tiết chủ đề, tìm có và không có kết quả, đổi chế độ xem, đổi trạng thái, tải lại, kiểm tra tiến độ bằng tài khoản B. |
| Learn with AI | A01–A08 | Mục tiêu rỗng, mục tiêu ngắn, tạo Roadmap Python, tạo Guide có mã, tải lại phiên, mở lại Khế, thử mở phiên của tài khoản khác, phản hồi UI khi Gemini lỗi. |

Bản Word gộp hai bước mở thư viện và mở Cyber Security thành R01. Trong log Chrome, hai bước này là R01 và R02. Các mã R02–R08 trong bản Word tương ứng R03–R09 trong log.

## C. Kết quả kiểm thử

| Nhóm | Pass | Fail | Chưa kiểm chứng |
|---|---:|---:|---:|
| Chức năng chung | 4 | 0 | 0 |
| Roadmap thường | 8 | 0 | 0 |
| Learn with AI | 7 | 0 | 1 |
| Tổng | 19 | 0 | 1 |

- **Chrome**. Log thao tác và quan sát, kết quả có mã kịch bản và ghi nhận request tạo phiên. Request được ghi theo đường dẫn và thời điểm, không lưu nội dung hay khóa API.
- **Roadmap thường**. Ảnh thực tế của bảng chi tiết chủ đề, tìm không có kết quả và trạng thái Đang học sau khi tải lại.
- **Gemini thật**. Hai phản hồi quan sát được trên giao diện là Roadmap học Python và Guide có ví dụ mã Python. Hai lượt chạy xác nhận luồng hiển thị, chưa đánh giá độ chính xác toàn bộ nội dung.
- **Kiểm thử tự động**. Kiến trúc 3/3, Learning 18/18, React 50/50, API Learning với Gemini giả lập và API tích hợp nền tảng.
- **Biên dịch**. Bản production của frontend build thành công và còn cảnh báo. Log build

## D. Bản Word

Bản Word, log và ảnh kiểm thử được giữ trong bộ hồ sơ local.

## E. Thay đổi và phần còn cần thử

Giữ bìa, hệ thống tiêu đề, font, lề, kiểu bảng, sơ đồ kiến trúc và các mô tả phù hợp của bản gốc. Ba bảng kịch bản dùng sáu cột theo yêu cầu. Bản Word cập nhật mục lục, danh mục hình, danh mục bảng và số trang.

A08 chưa được kiểm chứng trên Chrome vì hai lượt gọi thật đều nhận được kết quả. Khi có môi trường phù hợp, cần thử thông báo khi Gemini trả quota hoặc timeout. Các thao tác gửi câu hỏi qua Khế, hỏi tiếp theo ngữ cảnh và đánh dấu nhiệm vụ AI có bằng chứng từ bộ API giả lập. Để bổ sung bằng chứng giao diện, mở một phiên thử, thực hiện từng thao tác và ghi lại kết quả trong chính trình duyệt. Mục A06 hiện chỉ xác nhận mở, thu gọn và mở lại Khế.
