import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import LearningPage from './index';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }));
jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ user: { userinfo: { _id: 'test-user' } } }),
}));

const session = {
  _id: 'session-1',
  goal: 'Học Python',
  profile: { level: 'beginner', weeks: 8, hoursPerWeek: 6 },
  roadmap: {
    title: 'Lộ trình Python',
    summary: 'Bắt đầu từng bước.',
    milestones: [
      {
        _id: 'stage-1',
        title: 'Nền tảng',
        week: 1,
        description: 'Làm quen Python.',
        tasks: [{ _id: 'task-1', title: 'Chạy chương trình đầu tiên', done: false }],
        resourceIds: ['python'],
      },
    ],
  },
  messages: [
    {
      _id: 'message-1',
      role: 'assistant',
      content: 'Mình sẽ đồng hành cùng bạn.',
      resourceIds: ['python'],
    },
  ],
  resources: [
    { id: 'python', title: 'Tài liệu Python', url: 'https://docs.python.org/3/tutorial/' },
  ],
};
function mount(route = '/learning') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/learning/:sessionId" element={<LearningPage />} />
          <Route path="/learning/ai/:sessionId" element={<LearningPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
  axios.patch.mockReset();
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith('/status')
        ? { configured: true }
        : url.endsWith('/sessions')
          ? { sessions: [] }
          : { session },
    })
  );
});

test('unconfigured AI does not fabricate a roadmap or show removed introductory elements', async () => {
  axios.get.mockImplementation((url) =>
    Promise.resolve({ data: url.endsWith('/status') ? { configured: false } : { sessions: [] } })
  );
  await act(async () => {
    mount();
  });
  expect(screen.queryByText(/Trợ lý đang được thiết lập/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Bắt đầu với Python/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Bạn muốn học gì?' }), {
    target: { value: 'Tôi muốn học Python từ đầu' },
  });
  expect(screen.getByRole('button', { name: 'Tạo roadmap' })).toBeDisabled();
  expect(axios.post).not.toHaveBeenCalled();
});

test('Enter submits the prompt while Shift+Enter and IME composition do not', async () => {
  axios.post.mockResolvedValue({ data: { session } });
  await act(async () => {
    mount();
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Bạn muốn học gì?' }), {
    target: { value: 'Tôi muốn học Python từ đầu' },
  });
  const input = screen.getByRole('textbox', { name: 'Bạn muốn học gì?' });
  fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
  expect(axios.post).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() =>
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/learning/sessions'),
      expect.objectContaining({ profile: { level: 'beginner', weeks: 8, hoursPerWeek: 6 } }),
      expect.any(Object)
    )
  );
  expect(await screen.findByRole('heading', { name: 'Lộ trình Python' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Danh sách nhiệm vụ' }));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('task progress is saved and assistant questions use the current private session', async () => {
  axios.patch.mockResolvedValue({
    data: {
      session: {
        ...session,
        roadmap: {
          ...session.roadmap,
          milestones: [
            {
              ...session.roadmap.milestones[0],
              tasks: [{ ...session.roadmap.milestones[0].tasks[0], done: true }],
            },
          ],
        },
      },
    },
  });
  axios.post.mockResolvedValue({ data: { session } });
  await act(async () => {
    mount('/learning/session-1');
  });
  fireEvent.click(await screen.findByRole('button', { name: /Chạy chương trình đầu tiên/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành' }));
  await waitFor(() =>
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions/session-1/tasks/task-1'),
      { done: true },
      expect.any(Object)
    )
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Hoàn thành' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  );
  fireEvent.click(screen.getByRole('button', { name: 'Đóng chủ đề' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Hỏi trợ lý về lộ trình' }), {
    target: { value: 'Giải thích bước đầu' },
  });
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Hỏi trợ lý về lộ trình' }), {
    key: 'Enter',
  });
  await waitFor(() =>
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/sessions/session-1/messages'),
      { content: 'Giải thích bước đầu' },
      expect.any(Object)
    )
  );
});

test('Guide requests and renders GPT guidance independently of the roadmap', async () => {
  const guide = {
    ...session,
    _id: 'guide-1',
    kind: 'guide',
    goal: 'Tôi muốn học AI',
    roadmap: null,
    guide:
      '# Học AI từng bước\n\nBắt đầu với Python và thực hành mỗi ngày.\n\n## Ví dụ\n\n```python\nprint(1 + 1)\n```',
  };
  axios.post.mockResolvedValue({ data: { session: guide } });
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith('/status')
        ? { configured: true }
        : url.endsWith('/sessions')
          ? { sessions: [] }
          : { session: guide },
    })
  );
  await act(async () => {
    mount();
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Bạn muốn học gì?' }), {
    target: { value: guide.goal },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guide' }));
  expect(screen.getByRole('button', { name: 'Guide' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Tạo hướng dẫn' }));
  const article = await screen.findByRole('article', { name: 'Hướng dẫn học tập' });
  expect(article).toHaveTextContent('Bắt đầu với Python và thực hành mỗi ngày.');
  expect(screen.getAllByRole('heading', { name: 'Học AI từng bước' })).toHaveLength(1);
  expect(screen.queryByRole('heading', { name: guide.goal })).not.toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('/learning/sessions'),
    expect.objectContaining({ kind: 'guide', goal: guide.goal }),
    expect.any(Object)
  );
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

test('inline follow-up stays below the answer and Khế sends to its own channel', async () => {
  axios.post.mockResolvedValue({
    data: {
      session: {
        ...session,
        assistantMessages: [
          { _id: 'khe-1', role: 'user', content: 'Khế giúp mình nhé' },
          { _id: 'khe-2', role: 'assistant', content: 'Mình là Khế, cùng học tiếp nhé.' },
        ],
      },
    },
  });
  await act(async () => {
    mount('/learning/session-1');
  });
  expect(screen.queryByText('Người bạn đồng hành')).not.toBeInTheDocument();
  const inline = await screen.findByRole('region', { name: 'Hỏi tiếp về nội dung này' });
  expect(
    within(inline).getByRole('textbox', { name: 'Hỏi trợ lý về lộ trình' })
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mở trò chuyện với Khế' }));
  const panel = screen.getByRole('dialog', { name: 'Trò chuyện với Khế' });
  fireEvent.change(within(panel).getByRole('textbox', { name: 'Hỏi Khế' }), {
    target: { value: 'Khế giúp mình nhé' },
  });
  fireEvent.keyDown(within(panel).getByRole('textbox'), { key: 'Enter' });
  await waitFor(() =>
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/sessions/session-1/messages'),
      { content: 'Khế giúp mình nhé', channel: 'khe' },
      expect.any(Object)
    )
  );
  expect(await within(panel).findByText('Mình là Khế, cùng học tiếp nhé.')).toBeInTheDocument();
  expect(within(inline).queryByText('Mình là Khế, cùng học tiếp nhé.')).not.toBeInTheDocument();
});
