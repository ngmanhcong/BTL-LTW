import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import KheChat from './KheChat';

const defaultProps = {
  userId: 'test-learner',
  ready: true,
  busy: false,
  pending: false,
  messages: [],
  resources: [],
};
const originalPointerEvent = window.PointerEvent;
const originalWidth = window.innerWidth;
beforeEach(() => {
  localStorage.clear();
  window.PointerEvent = MouseEvent;
});
afterEach(() => {
  window.PointerEvent = originalPointerEvent;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});

test('Khế opens, accepts Enter questions and can be minimized and reopened', async () => {
  const onSend = jest.fn().mockResolvedValue();
  render(<KheChat {...defaultProps} onSend={onSend} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mở trò chuyện với Khế' }));
  expect(screen.getByRole('dialog', { name: 'Trò chuyện với Khế' })).toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: 'Hỏi Khế' });
  fireEvent.change(input, { target: { value: 'Giải thích con trỏ' } });
  fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
  expect(onSend).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(onSend).toHaveBeenCalledWith('Giải thích con trỏ'));
  await waitFor(() => expect(input).toHaveValue(''));
  fireEvent.click(screen.getByRole('button', { name: 'Thu gọn Khế' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mở trò chuyện với Khế' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cho mình bài tập luyện tập' }));
  expect(screen.getByRole('textbox')).toHaveValue('Cho mình bài tập luyện tập');
});

test('dragging does not open the window and keeps the launcher in bounds', async () => {
  render(<KheChat {...defaultProps} onSend={jest.fn()} />);
  const launcher = screen.getByRole('button', { name: 'Mở trò chuyện với Khế' });
  fireEvent.pointerDown(launcher, { button: 0, clientX: 950, clientY: 600 });
  fireEvent.pointerMove(launcher, { clientX: -500, clientY: -500 });
  fireEvent.pointerUp(launcher, { clientX: -500, clientY: -500 });
  fireEvent.click(launcher);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(launcher.style.left).toBe('12px');
  expect(launcher.style.top).toBe('76px');
  fireEvent.keyDown(launcher, { key: 'ArrowRight' });
  expect(launcher.style.left).toBe('22px');
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem('ptitsocial:khe-position:test-learner')).x).toBe(22)
  );
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 240 });
  fireEvent(window, new Event('resize'));
  expect(parseFloat(launcher.style.left)).toBeLessThanOrEqual(164);
  fireEvent.click(launcher);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('API errors preserve the draft and show an actionable error', async () => {
  const onSend = jest
    .fn()
    .mockRejectedValue({ response: { data: { message: 'Gemini đang bận' } } });
  render(<KheChat {...defaultProps} onSend={onSend} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mở trò chuyện với Khế' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mình cần giúp' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi cho Khế' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Gemini đang bận');
  expect(screen.getByRole('textbox')).toHaveValue('Mình cần giúp');
});
