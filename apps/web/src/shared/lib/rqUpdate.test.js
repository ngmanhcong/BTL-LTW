import { queryClient } from 'App';
import { updateSeenMessages } from './rqUpdate';

jest.mock('App', () => {
  const { QueryClient } = require('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});

afterEach(() => queryClient.clear());

test('an old read receipt updates that message without replacing the latest message', () => {
  const older = { _id: 'old', chat: 'chat', seenBy: [] };
  const latest = { _id: 'latest', chat: 'chat', seenBy: [] };
  const chat = { _id: 'chat', latestMessage: latest };
  queryClient.setQueryData(['getMessages', 'chat'], {
    pages: [{ data: { chat, messages: [latest, older] } }, { data: { chat: null, messages: [] } }],
  });
  queryClient.setQueryData(['getChats'], { data: { chats: [chat] } });
  const receipt = { ...older, seenBy: ['reader'] };
  updateSeenMessages(receipt, chat);
  const messages = queryClient.getQueryData(['getMessages', 'chat']);
  expect(messages.pages[0].data.chat.latestMessage._id).toBe('latest');
  expect(messages.pages[0].data.messages[1].seenBy).toEqual(['reader']);
  expect(queryClient.getQueryData(['getChats']).data.chats[0].latestMessage._id).toBe('latest');
  updateSeenMessages({ ...latest, seenBy: ['reader'] }, chat);
  expect(queryClient.getQueryData(['getChats']).data.chats[0].latestMessage.seenBy).toEqual([
    'reader',
  ]);
});
