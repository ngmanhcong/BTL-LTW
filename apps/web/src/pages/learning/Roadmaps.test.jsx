import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import Roadmaps from './Roadmaps';

jest.mock('axios', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ user: { userinfo: { _id: 'learner' } } }),
}));
const roadmap = {
  id: 'python',
  title: 'Python',
  symbol: 'Py',
  category: 'Ngôn ngữ lập trình',
  description: 'Học Python từ nền tảng.',
  outcome: 'Tạo công cụ thực hành.',
  reference: 'https://roadmap.sh/python',
  stages: [
    {
      id: 's1',
      title: 'Bắt đầu với Python',
      topics: [
        {
          id: 's1-t1',
          title: 'Biến và kiểu dữ liệu',
          description: 'Hiểu số và chuỗi.',
          practice: 'Viết chương trình tính chi tiêu.',
          resources: [{ title: 'Python Tutorial', url: 'https://docs.python.org/3/tutorial/' }],
        },
      ],
    },
  ],
};
const roadmaps = ['AI Engineer', 'Cyber Security', 'Machine Learning', 'Python', 'SQL', 'C++'].map(
  (title) => ({
    ...roadmap,
    id: title === 'Python' ? 'python' : title.toLowerCase().replaceAll(' ', '-'),
    title,
    stageCount: 8,
    topicCount: 24,
    progress: {},
  })
);
function mount(route = '/learning') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/learning" element={<Roadmaps />} />
          <Route path="/learning/roadmaps/:roadmapId" element={<Roadmaps />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  axios.get.mockReset();
  axios.patch.mockReset();
  axios.get.mockImplementation((url) =>
    Promise.resolve({ data: url.endsWith('/roadmaps') ? { roadmaps } : { roadmap, progress: {} } })
  );
});
test('library offers two learning modes, six fields and navigates to the interactive map', async () => {
  mount();
  const library = await screen.findByRole('region', { name: 'Các lĩnh vực học tập' });
  expect(within(library).getAllByRole('link')).toHaveLength(6);
  expect(screen.getByRole('navigation', { name: 'Chế độ học tập' })).toHaveTextContent(
    'Learn with AI'
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Tìm roadmap' }), {
    target: { value: 'Python' },
  });
  expect(within(library).getAllByRole('link')).toHaveLength(1);
  fireEvent.click(within(library).getByRole('link'));
  expect(await screen.findByRole('button', { name: /Biến và kiểu dữ liệu/ })).toBeInTheDocument();
});
test('topic details expose resources, persist progress and restore focus on close', async () => {
  axios.patch.mockResolvedValue({ data: { progress: { 's1-t1': 'done' } } });
  mount('/learning/roadmaps/python');
  const node = await screen.findByRole('button', { name: /Biến và kiểu dữ liệu/ });
  node.focus();
  fireEvent.click(node);
  const panel = screen.getByRole('dialog', { name: 'Biến và kiểu dữ liệu' });
  expect(within(panel).getByText('Viết chương trình tính chi tiêu.')).toBeInTheDocument();
  expect(within(panel).getByRole('link', { name: /Python Tutorial/ })).toHaveAttribute(
    'href',
    'https://docs.python.org/3/tutorial/'
  );
  fireEvent.click(within(panel).getByRole('button', { name: 'Hoàn thành' }));
  await waitFor(() =>
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  );
  expect(axios.patch).toHaveBeenCalledWith(
    expect.stringContaining('/roadmaps/python/topics/s1-t1'),
    { status: 'done' },
    expect.any(Object)
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(node).toHaveFocus();
});
test('failed progress updates preserve saved state; list and zoom controls work', async () => {
  axios.patch.mockRejectedValue({ response: { data: { message: 'Không lưu được tiến độ' } } });
  mount('/learning/roadmaps/python');
  fireEvent.click(await screen.findByRole('button', { name: /Biến và kiểu dữ liệu/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được tiến độ');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  fireEvent.click(screen.getByRole('button', { name: 'Đóng chủ đề' }));
  fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ sơ đồ' }));
  expect(screen.getByRole('button', { name: 'Đặt lại kích thước sơ đồ' })).toHaveTextContent('90%');
  fireEvent.click(screen.getByRole('button', { name: 'Xem danh sách' }));
  expect(screen.getByRole('button', { name: 'Xem danh sách' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByRole('button', { name: /Biến và kiểu dữ liệu/ })).toBeInTheDocument();
});

test('source diagram keeps parallel nodes and opens only the selected topic references', async () => {
  const os = {
    id: 'rs-os',
    sourceId: 'os',
    title: 'Operating Systems',
    description: 'Chủ đề hệ điều hành từ nguồn.',
    resources: [
      {
        kind: 'source',
        title: 'Đọc chủ đề gốc: Operating Systems',
        url: 'https://github.com/nilbuild/developer-roadmap/blob/test/roadmaps/cyber-security/content/operating-systems@os.md',
      },
      {
        kind: 'listed-resource',
        title: 'What is an operating system? - IBM',
        url: 'https://www.ibm.com/think/topics/operating-systems',
      },
    ],
  };
  const owasp = {
    id: 'rs-web',
    sourceId: 'web',
    title: 'Web Based Attacks and OWASP10',
    description: 'Chủ đề bảo mật web.',
    resources: [
      {
        kind: 'listed-resource',
        title: 'OWASP Top Ten',
        url: 'https://owasp.org/www-project-top-ten/',
      },
    ],
  };
  const sourceRoadmap = {
    ...roadmap,
    id: 'cyber-security',
    title: 'Cyber Security',
    source: { fetchedAt: '2026-11-18T00:00:00Z' },
    reference: 'https://roadmap.sh/cyber-security',
    stages: [{ id: 'source', title: 'Các chủ đề theo sơ đồ gốc', topics: [os, owasp] }],
    graph: {
      nodes: [
        { id: 'os', type: 'topic', x: 40, y: 10, width: 200, height: 45 },
        { id: 'web', type: 'subtopic', x: 350, y: 10, width: 230, height: 45 },
      ],
      edges: [{ source: 'os', target: 'web' }],
    },
  };
  axios.get.mockResolvedValue({ data: { roadmap: sourceRoadmap, progress: {} } });
  mount('/learning/roadmaps/cyber-security');
  const osNode = await screen.findByRole('button', { name: /Operating Systems/ });
  const webNode = screen.getByRole('button', { name: /Web Based Attacks/ });
  expect(osNode.style.top).toBe(webNode.style.top);
  expect(osNode.style.left).not.toBe(webNode.style.left);
  fireEvent.click(osNode);
  const panel = screen.getByRole('dialog', { name: 'Operating Systems' });
  expect(within(panel).getByRole('link', { name: /IBM/ })).toHaveAttribute(
    'href',
    'https://www.ibm.com/think/topics/operating-systems'
  );
  expect(within(panel).queryByRole('link', { name: /OWASP/ })).not.toBeInTheDocument();
  expect(within(panel).queryByText('Thử sức với một bài thực hành')).not.toBeInTheDocument();
});
