import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useSendMessage } from '../hooks/useSendMessage';
import SendMessage from 'pages/messages/SendMessage';
import MessageContext from './MessageContext';
import ForwardMessageModal from './ForwardMessageModal';
import MessageMenu from './MessageMenu';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('emoji-picker-react', () => ({
  __esModule: true,
  default: ({ onEmojiClick }) => (
    <button type="button" onClick={() => onEmojiClick({ emoji: '😀' })}>
      Emoji thử nghiệm
    </button>
  ),
}));

jest.mock('../hooks/useSendMessage', () => ({ useSendMessage: jest.fn() }));
jest.mock('routes/IsLoggedIn', () => ({ socket: { emit: jest.fn() } }));

const original = {
  _id: 'source-message',
  type: 'text',
  content: 'Tin nhắn cần trả lời',
  sender: { _id: 'sender', first_name: 'Bình', last_name: 'Nguyễn' },
};
let send;
beforeEach(() => {
  URL.createObjectURL = jest.fn(() => 'blob:chat-preview');
  URL.revokeObjectURL = jest.fn();
  send = jest.fn().mockResolvedValue({});
  useSendMessage.mockReturnValue({ mutate: send, mutateAsync: send, isLoading: false });
  axios.get.mockReset();
  axios.post.mockReset();
});

test('reply composer quotes a chosen message, sends its ID and clears only on success', () => {
  const cancel = jest.fn();
  render(
    <SendMessage
      chat={{ _id: 'chat' }}
      chatId="chat"
      isTyping={{ status: true }}
      setIsTyping={() => {}}
      scrollToBottom={() => {}}
      replyTo={original}
      onCancelReply={cancel}
    />
  );
  expect(screen.getByText(original.content)).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toHaveFocus();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Câu trả lời của tôi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      replyMessageId: original._id,
      content: 'Câu trả lời của tôi',
      chatId: 'chat',
    }),
    expect.any(Object)
  );
  expect(screen.getByRole('textbox')).toHaveValue('Câu trả lời của tôi');
  act(() => send.mock.calls[0][1].onSuccess());
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(cancel).toHaveBeenCalledTimes(1);
});

test('stored reply shows its original content and supports jumping to the source', () => {
  const jump = jest.fn();
  render(
    <MessageContext
      message={{ replyTo: { ...original, messageId: original._id }, forwarded: true }}
      onJump={jump}
    />
  );
  expect(screen.getByText('Đã chuyển tiếp')).toBeInTheDocument();
  expect(screen.getByText(original.content)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(jump).toHaveBeenCalledWith(original._id);
});

test('forward picker lists conversations, creates a conversation for a friend, and prevents repeat sends', async () => {
  axios.get.mockImplementation((url) =>
    Promise.resolve(
      url.includes('/chats?')
        ? {
            data: {
              data: {
                chats: [
                  { _id: 'current', chatName: 'Bình', type: 'private', users: [{ _id: 'binh' }] },
                  { _id: 'other-chat', chatName: 'Nhóm học tập', type: 'group', users: [] },
                ],
              },
            },
          }
        : {
            data: {
              data: {
                friendLists: [{ _id: 'an', first_name: 'An', last_name: 'Trần', photo: '/an.png' }],
              },
            },
          }
    )
  );
  axios.post.mockResolvedValue({ data: { data: { chat: { _id: 'new-chat' } } } });
  await act(async () => {
    render(<ForwardMessageModal message={original} currentChatId="current" onClose={() => {}} />);
  });
  expect(screen.getByText('Nhóm học tập')).toBeInTheDocument();
  expect(screen.getByText('An Trần')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'An Tran' } });
  expect(screen.queryByText('Nhóm học tập')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
  await waitFor(() =>
    expect(send).toHaveBeenCalledWith({ chatId: 'new-chat', forwardMessageId: original._id })
  );
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('/chats/create/private'),
    { userId: 'an' },
    expect.any(Object)
  );
  expect(await screen.findByRole('button', { name: /Đã gửi/ })).toBeDisabled();
});

test('ellipsis opens reply and forward actions for the selected message and Escape dismisses it', () => {
  const reply = jest.fn();
  const forward = jest.fn();
  render(<MessageMenu message={original} onReply={reply} onForward={forward} />);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn tin nhắn' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Trả lời' }));
  expect(reply).toHaveBeenCalledWith(original);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn tin nhắn' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Chuyển tiếp' }));
  expect(forward).toHaveBeenCalledWith(original);
  fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn tin nhắn' }));
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('emoji button opens a picker and inserts an emoji at the cursor position', async () => {
  render(
    <SendMessage
      chat={{ _id: 'chat' }}
      chatId="chat"
      isTyping={{ status: true }}
      setIsTyping={() => {}}
      scrollToBottom={() => {}}
    />
  );
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'AB' } });
  input.setSelectionRange(1, 1);
  fireEvent.click(screen.getByRole('button', { name: 'Chọn biểu tượng cảm xúc' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Emoji thử nghiệm' }));
  expect(input).toHaveValue('A😀B');
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({ content: 'A😀B', type: 'text' }),
    expect.any(Object)
  );
});

test('photo selection previews the file and sends it with a caption', () => {
  render(
    <SendMessage
      chat={{ _id: 'chat' }}
      chatId="chat"
      isTyping={{ status: true }}
      setIsTyping={() => {}}
      scrollToBottom={() => {}}
    />
  );
  const file = new File(['image bytes'], 'photo.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Chọn ảnh gửi trong chat'), { target: { files: [file] } });
  expect(screen.getByAltText('Ảnh chuẩn bị gửi')).toHaveAttribute('src', 'blob:chat-preview');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ảnh của tôi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'image', imageFile: file, content: 'Ảnh của tôi' }),
    expect.any(Object)
  );
  act(() => send.mock.calls[0][1].onSuccess());
  expect(screen.queryByAltText('Ảnh chuẩn bị gửi')).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chat-preview');
});

test('removing a selected photo restores the normal composer', () => {
  render(
    <SendMessage
      chat={{ _id: 'chat' }}
      chatId="chat"
      isTyping={{ status: true }}
      setIsTyping={() => {}}
      scrollToBottom={() => {}}
    />
  );
  fireEvent.change(screen.getByLabelText('Chọn ảnh gửi trong chat'), {
    target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh đã chọn' }));
  expect(screen.queryByAltText('Ảnh chuẩn bị gửi')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gửi lượt thích' })).toBeInTheDocument();
});

test('Word document selection shows its name and sends a file message', () => {
  render(
    <SendMessage
      chat={{ _id: 'chat' }}
      chatId="chat"
      isTyping={{ status: true }}
      setIsTyping={() => {}}
      scrollToBottom={() => {}}
    />
  );
  const file = new File(['word bytes'], 'bài-tập.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  fireEvent.change(screen.getByLabelText('Chọn tệp đính kèm'), { target: { files: [file] } });
  expect(screen.getByText(/bài-tập.docx/)).toBeInTheDocument();
  expect(screen.queryByAltText('Ảnh chuẩn bị gửi')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'file', imageFile: file }),
    expect.any(Object)
  );
});
