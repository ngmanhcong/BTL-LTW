// Snapshot topic names, node layout and topic-specific references from the six
// user-requested roadmap.sh pages. Refresh with python scripts/sync-roadmaps.py.
// Full article bodies remain on roadmap.sh / its official content repository.
const metadata = [
  {
    id: 'ai-engineer',
    title: 'AI Engineer',
    symbol: 'AI',
    category: 'Trí tuệ nhân tạo',
    description:
      'LLM, prompt và context engineering, mô hình, embedding, RAG, agent, MCP và đánh giá hệ thống AI.',
    outcome:
      'Theo dõi các chủ đề trong AI Engineer roadmap gốc, từ phần giới thiệu đến công cụ phát triển và đánh giá.',
  },
  {
    id: 'cyber-security',
    title: 'Cyber Security',
    symbol: 'CS',
    category: 'An toàn thông tin',
    description:
      'Kỹ năng IT nền tảng, hệ điều hành, mạng, kiến thức bảo mật, cloud và lập trình theo roadmap gốc.',
    outcome:
      'Học nền tảng IT và mạng trước khi đi sâu vào bảo mật; OWASP nằm trong chủ đề tấn công web, không phải tài liệu chung cho nền tảng hệ thống.',
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    symbol: 'ML',
    category: 'Dữ liệu & mô hình',
    description:
      'Toán, Python, dữ liệu, các kiểu học máy, đánh giá mô hình, mạng nơ-ron và deep learning.',
    outcome:
      'Đi theo các nhánh toán, dữ liệu, học máy và deep learning được trình bày trong Machine Learning roadmap gốc.',
  },
  {
    id: 'python',
    title: 'Python',
    symbol: 'Py',
    category: 'Ngôn ngữ lập trình',
    description:
      'Cú pháp, cấu trúc dữ liệu, module, OOP, typing, concurrency, xử lý tệp và kiểm thử.',
    outcome:
      'Học các chủ đề của Python Developer roadmap, từ cơ bản đến thư viện và những tính năng nâng cao.',
  },
  {
    id: 'sql',
    title: 'SQL',
    symbol: 'SQL',
    category: 'Cơ sở dữ liệu',
    description:
      'Cú pháp, DDL/DML, truy vấn tổng hợp, ràng buộc, JOIN, chỉ mục, giao dịch và tối ưu.',
    outcome:
      'Nắm các chủ đề SQL theo sơ đồ gốc; tài liệu được gắn riêng cho từng câu lệnh hoặc khái niệm.',
  },
  {
    id: 'cpp',
    title: 'C++',
    symbol: 'C++',
    category: 'Ngôn ngữ lập trình',
    description:
      'Môi trường, cú pháp, con trỏ, class, STL, template, idiom, chuẩn ngôn ngữ và công cụ build.',
    outcome:
      'Theo dõi C++ Developer roadmap từ thiết lập môi trường đến ngôn ngữ, thư viện và công cụ phát triển.',
  },
];
module.exports = metadata.map((item) => ({
  ...item,
  ...require(`./roadmap-data/${item.id}.json`),
}));
