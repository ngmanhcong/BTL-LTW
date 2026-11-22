import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GuideContent from './GuideContent';

const code = '#include <utility>\nint main() {\n  int a = 10;\n  auto b = std::move(a);\n}';
const lesson =
  '# C++ Move Semantics\n\nHiểu cách chuyển quyền sở hữu.\n\n## Chi phí sao chép\n\nDùng `std::move` để minh họa.\n\n```cpp\n' +
  code +
  '\n```\n\n### Thực hành\n\n- Chạy ví dụ.\n- Giải thích kết quả.';
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete navigator.clipboard;
});

test('renders a lesson with headings, inline code, highlighted C++ and exact code copying', async () => {
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const { container } = render(<GuideContent content={lesson} />);
  expect(screen.getByRole('heading', { level: 1, name: 'C++ Move Semantics' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Chi phí sao chép' })).toBeInTheDocument();
  expect(screen.getByText('std::move', { selector: 'code' })).toBeInTheDocument();
  expect(container.querySelector('pre code').textContent.trimEnd()).toBe(code);
  expect(container.querySelectorAll('pre code span').length).toBeGreaterThan(0);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Sao chép mã' }));
  await screen.findByRole('button', { name: 'Đã sao chép mã' });
  expect(writeText.mock.calls[0][0].trimEnd()).toBe(code);
});

test('treats HTML as text, blocks unsafe links and never loads remote markdown images', () => {
  const { container } = render(
    <GuideContent
      content={
        '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[unsafe](javascript:alert(1))\n\n![tracker](https://example.com/pixel.png)\n\n[Python](https://docs.python.org/3/)'
      }
    />
  );
  expect(container.querySelector('script, img, iframe')).toBeNull();
  expect(container.querySelector('[onerror]')).toBeNull();
  expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(screen.getByRole('link', { name: 'Python' })).toHaveAttribute(
    'rel',
    'noopener noreferrer'
  );
});

test('unknown code languages remain readable and clipboard errors are recoverable', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockRejectedValue(new Error('Permission denied')) },
  });
  const { container } = render(
    <GuideContent content={'```unknown-language\n<script>literal code</script>\n```'} />
  );
  expect(container.querySelector('pre code')).toHaveTextContent('<script>literal code</script>');
  expect(container.querySelector('script')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Sao chép mã' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Chưa sao chép được'));
});
