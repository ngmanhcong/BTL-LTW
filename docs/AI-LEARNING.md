# Trợ lý học tập và lộ trình cá nhân

Mốc `BASE` vẫn giữ nguyên. Góc học tập nằm ở `/learning` trong ứng dụng web,
gồm hai chế độ **Roadmap** và **Learn with AI**.

## Roadmap có sẵn

- Sáu lĩnh vực: AI Engineer, Cyber Security, Machine Learning, Python, SQL, C++.
- Chủ đề, vị trí node và các tài liệu theo từng mục được đối chiếu từ sáu URL roadmap.sh mà người dùng đã chỉ định. Số chủ đề giữ theo nguồn, không ép thành 8 bước/24 mục.
- Xem sơ đồ có nhánh hoặc danh sách; tìm chủ đề và thu/phóng sơ đồ.
- Bấm chủ đề để mở nội dung gốc của roadmap.sh và các tài liệu được dẫn riêng trong mục đó.
- Bốn trạng thái: chưa học, đang học, hoàn thành, bỏ qua. Tiến độ lưu trong
  MongoDB theo tài khoản, đồng bộ khi đăng nhập trên trình duyệt khác.
- Hoạt động không cần khóa AI. Dùng snapshot cục bộ có nguồn và phiên bản; không nhúng iframe hoặc phụ thuộc vào tài khoản roadmap.sh. Nội dung bài đầy đủ được mở tại nguồn, các liên kết học lấy riêng từ file nội dung tương ứng của từng node.

Danh mục trong `services/learning/src/roadmaps.js`. API đọc danh mục là
`GET /api/v1/learning/roadmaps`, đọc chi tiết qua `/roadmaps/:slug`, cập nhật
tiến độ bằng `PATCH /roadmaps/:slug/topics/:topicId` với `{ "status": "done" }`.
Các API đều yêu cầu tài khoản đăng nhập và đã xác minh; chỉ cập nhật dữ liệu
của người gọi, không nhận ID chủ sở hữu từ client.

**Learn with AI** nằm ở `/learning/ai`; các hội thoại cũ vẫn mở được.

Ô nhập có hai lựa chọn **Roadmap** và **Guide**, tương ứng trường `kind` trong
`POST /api/v1/learning/sessions` (mặc định `roadmap` để tương thích dữ liệu cũ).
Roadmap dùng cùng bộ vẽ sơ đồ với lộ trình có sẵn, hỗ trợ xem nhiệm vụ dạng
danh sách và đánh dấu hoàn thành. Guide yêu cầu Gemini viết hướng dẫn chi tiết,
lưu nội dung vào `guide` và hiển thị thành bài đọc với tài liệu tham khảo.
Guide mới dùng Markdown: tiêu đề, các mục, đoạn văn, danh sách, inline code và
code fence có tên ngôn ngữ. Giao diện tô màu cú pháp C++/Python/SQL/JavaScript
và các ngôn ngữ hỗ trợ khác; mỗi khối code có nút sao chép nguyên mã nguồn.
HTML thô không được thực thi, ảnh từ Markdown không được tải và liên kết chỉ
được mở khi dùng HTTP/HTTPS. Các câu trả lời hỏi tiếp cũng dùng cùng bộ hiển thị.
Guide và hỏi đáp giữ nguyên chuỗi answer Gemini trả về: không cắt ký tự,
không ép số mục và không đặt maxOutputTokens riêng. Markdown chỉ định dạng
hiển thị. Nếu API báo dừng vì giới hạn của mô hình, ứng dụng báo lỗi rõ ràng,
không trình bày phần JSON chưa hoàn tất như câu trả lời đầy đủ.
Hỏi tiếp trong Guide giữ nguyên bài hướng dẫn ban đầu, chỉ thêm lịch sử hội thoại.
Ô hỏi tiếp nằm dưới bài trả lời. Chatbot nổi **Khế** có màu xám, mở bằng biểu
tượng ở góc màn hình; kéo biểu tượng hoặc thanh tiêu đề để di chuyển, có thể
thu gọn/phóng to cửa sổ. Vị trí được giữ riêng theo tài khoản trên trình duyệt.
Khế hỏi đáp theo ngữ cảnh bài đang mở nhưng dùng `assistantMessages` riêng;
ô hỏi tiếp tiếp tục dùng `messages`. API gửi tin nhắn nhận `channel: "khe"`
cho Khế; mặc định là `followup`. Cả hai kênh cùng kiểm tra chủ sở hữu, giới hạn
sử dụng và khóa gửi đồng thời; lịch sử không bị trộn khi đổi kênh.
Cả hai đều tìm tài liệu theo ngữ nghĩa, dùng chung hạn mức và quyền truy cập riêng.
Giao diện nhập chỉ gồm ô nội dung, lựa chọn Roadmap/Guide và nút gửi. Hồ sơ mặc
định cho yêu cầu tạo nội dung là người mới học, 6 giờ mỗi tuần trong 8 tuần.
Nhấn Enter để gửi, Shift + Enter để xuống dòng. Khi bộ gõ còn đang ghép ký tự,
Enter không gửi yêu cầu. Quy tắc này áp dụng cả cho ô hỏi tiếp.

## Hoạt động

1. Người dùng nhập mục tiêu, chọn Roadmap hoặc Guide; backend dùng hồ sơ mặc định.
2. Learning dùng Gemini Embedding để tìm tài liệu theo ngữ nghĩa trong kho tuyển chọn.
3. Gemini generateContent tạo lộ trình theo cấu trúc JSON. Backend kiểm tra tuần học,
   nhiệm vụ và ID nguồn; liên kết chỉ được lấy từ danh mục nguồn đã biết.
4. Lộ trình, lịch sử hỏi đáp và tiến độ được lưu trong `ptitsocial_learning`,
   tách biệt theo ID tài khoản đã xác thực. Người khác không đọc hoặc sửa được.
5. Người dùng tích nhiệm vụ hoàn thành và hỏi trợ lý về từng bước. Hỏi đáp không
   tự thay đổi tiến độ hoặc ghi đè lộ trình. Muốn đổi mục tiêu, tạo lộ trình mới.

Kho gồm Web, JavaScript, React, Node.js và kiến thức từ cả sáu roadmap có sẵn. Các mô tả
chương trình học được viết riêng, kèm liên kết tài liệu chính thức MDN, Python,
React, Node.js, Microsoft Learn, PostgreSQL, scikit-learn, PyTorch, NumPy,
Hugging Face và OWASP. Đây là tìm kiếm ngữ nghĩa trong kho tài liệu, không phải tìm
kiếm Internet trực tiếp. Mở rộng kho trong `services/learning/src/catalog.js`.

Embedding được lưu và tái sử dụng theo mã băm nội dung, nhà cung cấp, mô hình và cấu hình vector.
Gemini dùng vector 768 chiều và task RETRIEVAL_DOCUMENT/RETRIEVAL_QUERY. Cache OpenAI cũ
không được dùng lại và không cần xóa dữ liệu học tập để chuyển nhà cung cấp. Với kho nhỏ,
cosine similarity được tính trong Node.js; chưa cần cơ sở dữ liệu vector riêng.

## Cấu hình Gemini

File riêng: `services/learning/.env` (đã bị Git bỏ qua).

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
AI_DAILY_LIMIT=30
```

Tạo API key tại https://aistudio.google.com/apikey bằng tài khoản Google và kiểm tra quota của dự án.
Hai mô hình mặc định có Free Tier theo tài liệu Google hiện tại, với hạn mức riêng của dự án.
Các biến OPENAI_* cũ không còn được dùng để gọi AI; không điền key Gemini vào OPENAI_API_KEY.
Không đặt key trong biến `REACT_APP_*`, không commit key và không nhập key vào
form công khai của website. Cấu hình AI được đọc lại khi gọi API, nên thêm key
vào file riêng xong chỉ cần tải lại trang, không cần khởi động lại dịch vụ.

Khi chưa có key, người dùng vẫn có thể xem lộ trình và cập nhật tiến độ đã lưu;
các nút tạo lộ trình/hỏi AI chưa được bật và không sinh câu trả lời AI giả.

Giới hạn mặc định: 5 yêu cầu tạo/hỏi mỗi phút và 30 lượt gọi mỗi tài khoản mỗi
ngày (ngày theo UTC+7). Lượt thử có gọi API cũng tính vào giới hạn, vì tìm kiếm
embedding có thể đã phát sinh chi phí trước khi bước tạo câu trả lời thất bại.
Hạn mức này không thay thế giới hạn chi phí cần đặt trên dự án Gemini.
Lỗi dịch vụ tạm thời 500/502/503/504 được tự thử lại tối đa ba lượt với thời gian
chờ tăng dần, có jitter và tôn trọng Retry-After trong ngân sách 60 giây của
mỗi yêu cầu, riêng tạo Guide là 90 giây. Lỗi key, cấu hình và quota không được tự thử lại liên tục.

## Chạy và kiểm tra

`start-local.ps1` tự chạy Learning ở cổng 8004. Có thể chạy riêng:

```powershell
npm.cmd run start:learning
npm.cmd run test:learning
node tests/learning-integration.cjs
```

Kiểm thử tích hợp Learning dùng Gemini giả lập ở loopback và một database thử
riêng. Nó kiểm tra xác thực, quyền sở hữu, lưu lộ trình, tiến độ, hỏi tiếp, lỗi API
và cache embedding. Chỉ coi kiểm tra Gemini thực tế hoàn thành sau khi cấu hình
key thật và thực hiện một yêu cầu có kết quả hợp lệ. Không có chế độ giả lập AI
trên website dành cho người dùng.

Tài liệu API tham khảo:

- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- https://ai.google.dev/gemini-api/docs/embeddings
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/pricing


### Cập nhật nguồn roadmap.sh

- Chạy `python scripts/sync-roadmaps.py` để kiểm tra sáu trang gốc và cập nhật `services/learning/src/roadmap-data/*.json`. Script chỉ dùng Python standard library và mạng; trang chạy thường không cần mạng để mở sơ đồ.
- Mỗi snapshot ghi URL gốc, ngày lấy dữ liệu, thời điểm nguồn cập nhật và commit kho `nilbuild/developer-roadmap`. Tên kỹ thuật giữ theo nguồn để dễ đối chiếu.
- Dữ liệu gồm tên chủ đề, vị trí sơ đồ và liên kết tài liệu của đúng node. Không chép toàn bộ bài viết; nút đọc chủ đề gốc mở file nội dung chính thức tại commit đã kiểm tra.
- Cyber Security: Fundamental IT Skills, Operating Systems và Networking Knowledge có tài liệu riêng. OWASP Top 10 nằm tại node Web Based Attacks and OWASP10, không được gán chung cho các nhóm nền tảng.
- Mã tiến độ mới theo ID node gốc (`rs-...`), không theo số thứ tự s1-t1 cũ. Dữ liệu tiến độ cũ vẫn được giữ trong database, nhưng được lọc khỏi phần tính tiến độ của tập chủ đề mới để tránh gán nhầm kiến thức đã học.
- Kho nguồn có điều kiện sử dụng tại trường `source.licenseUrl`; không đưa nguyên bài viết hoặc tài nguyên đồ họa của nguồn vào bản phân phối. Dùng nội dung bài tại liên kết gốc.
- Catalog tìm kiếm cho AI chia tên chủ đề thành nhóm tối đa 10 mục, tránh vượt giới hạn embedding khi một roadmap có hàng trăm node.


## Nhiều khóa Gemini dự phòng

Cấu hình `GEMINI_API_KEYS` trong file `.env` riêng của Learning, các khóa phân cách bằng dấu phẩy. Khi có danh sách này, nó được ưu tiên thay cho `GEMINI_API_KEY` một khóa. Không đưa file chứa khóa vào Git hoặc frontend.

- Khởi đầu dùng khóa thứ nhất. Khi gặp 429, backend thử khóa tiếp theo ngay trong cùng yêu cầu. Khóa dùng được sẽ tiếp tục được ưu tiên cho các lượt sau.
- Áp dụng cho cả tạo nội dung và embedding. Cache embedding vẫn theo nội dung/mô hình, không cần tạo lại chỉ vì đổi khóa.
- Khóa chạm quota tạm thời bị bỏ qua theo thời gian Retry-After, mặc định ít nhất 60 giây. Nếu Google xác định giới hạn theo ngày, bỏ qua đến nửa đêm múi giờ Pacific của Google.
- Cooldown quota theo từng mô hình. Khóa lỗi xác thực được tạm bỏ qua cho tất cả mô hình; mô hình chưa được cấp quyền thì thử project tiếp theo. Lỗi dữ liệu/schema không được thử lại bằng hàng loạt khóa.
- Lỗi 5xx vẫn thử lại có giới hạn; nếu chưa phục hồi thì thử khóa dự phòng trong tổng ngân sách timeout hiện có. Không lặp vô hạn khi toàn bộ khóa lỗi/quota.
- Danh sách và trạng thái cooldown chỉ nằm ở backend. Cooldown nằm trong RAM và mất khi khởi động lại Learning. Đổi cấu hình danh sách sẽ tạo pool mới.
- Nhiều khóa chung project vẫn có thể cùng bị giới hạn; chuyển khóa không tự tăng quota Google. Giới hạn 30 lượt/ngày/tài khoản của ứng dụng được giữ riêng như trước.
- `npm run test:learning` có kiểm thử tự động: key 1 bị 429 → key 2 thành công; tiếp tục dùng key 2; bỏ qua khóa lỗi; cả pool hết quota; giữ bí mật khóa; reset hạn mức ngày theo Pacific.
