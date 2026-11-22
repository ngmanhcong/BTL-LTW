import { isMessageUnread } from './messageReadState';

test('a group receipt is specific to each recipient, including populated readers', () => {
  const message = { sender: { _id: 'sender' }, seen: 'seen', seenBy: [{ _id: 'first' }] };
  expect(isMessageUnread(message, 'first')).toBe(false);
  expect(isMessageUnread(message, 'second')).toBe(true);
  expect(isMessageUnread(message, 'sender')).toBe(false);
  expect(isMessageUnread({ ...message, seenBy: ['first'] }, 'first')).toBe(false);
  expect(isMessageUnread(null, 'second')).toBe(false);
});
