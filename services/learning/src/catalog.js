// Original curriculum summaries. Links point to official learning material.
const mdn = 'https://developer.mozilla.org/en-US/docs/Learn_web_development';
const python = 'https://docs.python.org/3/tutorial/';
module.exports = [
  {
    id: 'web-basics',
    title: 'Bắt đầu với lập trình web',
    topic: 'web',
    level: 'beginner',
    url: mdn,
    description:
      'Làm quen trình duyệt, trình soạn thảo, tệp và thư mục, website và cách client-server giao tiếp. Phù hợp người mới bắt đầu chưa biết code.',
    practice: 'Tạo thư mục dự án và trang giới thiệu bản thân.',
  },
  {
    id: 'html',
    title: 'HTML và cấu trúc nội dung',
    topic: 'web',
    level: 'beginner',
    url: mdn,
    description:
      'Dùng HTML để mô tả tiêu đề, đoạn văn, liên kết, ảnh, danh sách và biểu mẫu có ngữ nghĩa. Nền tảng xây dựng website.',
    practice: 'Viết trang hồ sơ sinh viên với biểu mẫu liên hệ.',
  },
  {
    id: 'css',
    title: 'CSS và bố cục responsive',
    topic: 'web',
    level: 'beginner',
    url: mdn,
    description:
      'Selector, màu sắc, box model, Flexbox, Grid và bố cục thích ứng màn hình. Thiết kế giao diện trên máy tính và điện thoại.',
    practice: 'Làm giao diện trang cá nhân responsive.',
  },
  {
    id: 'javascript',
    title: 'JavaScript cơ bản',
    topic: 'web',
    level: 'beginner',
    url: mdn,
    description:
      'Biến, kiểu dữ liệu, toán tử, điều kiện, vòng lặp, hàm, mảng và đối tượng trong JavaScript.',
    practice: 'Viết chương trình quản lý danh sách việc cần làm.',
  },
  {
    id: 'dom',
    title: 'DOM, sự kiện và biểu mẫu',
    topic: 'web',
    level: 'beginner',
    url: mdn,
    description:
      'Tương tác giao diện bằng JavaScript: DOM, sự kiện click, nhập liệu và kiểm tra biểu mẫu.',
    practice: 'Thêm sửa xóa nhiệm vụ trên giao diện mà không tải lại trang.',
  },
  {
    id: 'http',
    title: 'HTTP, fetch và dữ liệu bất đồng bộ',
    topic: 'web',
    level: 'intermediate',
    url: mdn,
    description:
      'Request, response, JSON, Promise, async await, fetch và xử lý trạng thái tải hoặc lỗi khi gọi API.',
    practice: 'Lấy danh sách bài viết từ API và hiển thị có trạng thái tải.',
  },
  {
    id: 'accessibility',
    title: 'Khả năng truy cập và chất lượng giao diện',
    topic: 'web',
    level: 'intermediate',
    url: mdn,
    description:
      'HTML ngữ nghĩa, nhãn biểu mẫu, điều hướng bàn phím, độ tương phản và kiểm tra giao diện cho nhiều người dùng.',
    practice: 'Kiểm tra thao tác trang web chỉ bằng bàn phím.',
  },
  {
    id: 'react-basics',
    title: 'React: component, props và state',
    topic: 'web',
    level: 'intermediate',
    url: 'https://react.dev/learn',
    description:
      'Chia giao diện thành component, truyền props, quản lý state, điều kiện, danh sách và sự kiện trong React.',
    practice: 'Xây dựng ứng dụng ghi chú bằng React.',
  },
  {
    id: 'react-state',
    title: 'React: quản lý trạng thái giao diện',
    topic: 'web',
    level: 'intermediate',
    url: 'https://react.dev/learn',
    description:
      'Chia sẻ trạng thái giữa component, kiểm soát ô nhập và thiết kế dữ liệu giao diện. Phân biệt dữ liệu và cách hiển thị.',
    practice: 'Làm bộ lọc và form chỉnh sửa ghi chú.',
  },
  {
    id: 'node',
    title: 'Node.js và JavaScript phía server',
    topic: 'web',
    level: 'intermediate',
    url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
    description:
      'Môi trường Node.js, npm, module và JavaScript chạy trên server. Nền tảng để học backend web.',
    practice: 'Viết server HTTP trả dữ liệu JSON.',
  },
  {
    id: 'web-project',
    title: 'Dự án web tổng hợp',
    topic: 'web',
    level: 'intermediate',
    url: mdn,
    description:
      'Tổng hợp HTML, CSS, JavaScript, API và kiểm tra lỗi để xây dựng một sản phẩm web. Lập kế hoạch tính năng và chia nhỏ công việc.',
    practice:
      'Hoàn thành website theo dõi học tập với giao diện responsive và dữ liệu lưu bền vững.',
  },
  {
    id: 'python-start',
    title: 'Làm quen Python và môi trường chạy',
    topic: 'python',
    level: 'beginner',
    url: python,
    description:
      'Người mới học code Python bắt đầu với cài đặt môi trường, chạy chương trình, biến và kiểu dữ liệu. Tài liệu Python Tutorial phù hợp sau khi đã có nền tảng lập trình cơ bản.',
    practice: 'Viết chương trình nhập tên và tính chi phí học tập.',
  },
  {
    id: 'python-control',
    title: 'Python: điều kiện, vòng lặp và hàm',
    topic: 'python',
    level: 'beginner',
    url: python,
    description:
      'Biểu thức điều kiện if, vòng lặp for while, hàm, đối số và cách chia chương trình thành các phần nhỏ.',
    practice: 'Viết trò chơi đoán số và hàm kiểm tra dữ liệu nhập.',
  },
  {
    id: 'python-data',
    title: 'Python: cấu trúc dữ liệu',
    topic: 'python',
    level: 'beginner',
    url: python,
    description:
      'List, tuple, set, dictionary, thao tác chuỗi và xử lý danh sách dữ liệu bằng Python.',
    practice: 'Viết chương trình quản lý điểm sinh viên.',
  },
  {
    id: 'python-modules',
    title: 'Python: module và gói',
    topic: 'python',
    level: 'intermediate',
    url: python,
    description:
      'Tổ chức mã nguồn Python thành module và package. Làm quen môi trường ảo và quản lý thư viện.',
    practice: 'Chia chương trình quản lý điểm thành các module riêng.',
  },
  {
    id: 'python-files',
    title: 'Python: tệp, JSON và ngoại lệ',
    topic: 'python',
    level: 'beginner',
    url: python,
    description:
      'Đọc ghi tệp, dữ liệu JSON, quản lý đường dẫn và xử lý ngoại lệ để chương trình không dừng đột ngột.',
    practice: 'Lưu danh sách công việc vào tệp JSON và nạp lại khi mở chương trình.',
  },
  {
    id: 'python-oop',
    title: 'Python: lớp và đối tượng',
    topic: 'python',
    level: 'intermediate',
    url: python,
    description:
      'Định nghĩa class, phương thức, thuộc tính và kế thừa. Dùng lập trình hướng đối tượng khi cần tổ chức mô hình dữ liệu.',
    practice: 'Xây dựng lớp SinhVien và LopHoc.',
  },
  {
    id: 'python-project',
    title: 'Dự án Python thực hành',
    topic: 'python',
    level: 'intermediate',
    url: python,
    description:
      'Vận dụng cấu trúc dữ liệu, hàm, module, tệp và xử lý lỗi để giải quyết một bài toán thực tế.',
    practice: 'Hoàn thành công cụ quản lý chi tiêu chạy trên dòng lệnh.',
  },
  ...require('./roadmaps').flatMap((roadmap) => {
    const topics = roadmap.stages.flatMap((stage) => stage.topics);
    const chunks = [];
    // Keep embedding inputs small; a source roadmap may contain hundreds of nodes.
    for (let offset = 0; offset < topics.length; offset += 10) {
      const group = topics.slice(offset, offset + 10);
      chunks.push({
        id: `roadmap-sh-${roadmap.id}-${offset / 10 + 1}`,
        title: `${roadmap.title}: ${group.map((topic) => topic.title).join(', ')}`,
        topic: roadmap.id,
        level: offset < 30 ? 'beginner' : 'intermediate',
        url: roadmap.reference,
        description: `Các chủ đề trong roadmap gốc ${roadmap.reference}: ${group.map((topic) => topic.title).join('; ')}.`,
        practice: 'Đọc nội dung và các tài liệu được dẫn riêng trong từng chủ đề của roadmap gốc.',
      });
    }
    return chunks;
  }),
];
