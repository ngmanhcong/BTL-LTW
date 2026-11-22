export function isMessageUnread(message, userId) {
  if (!message || !userId || (message.sender?._id || message.sender) === userId) return false;
  return !message.seenBy?.some((reader) => (reader?._id || reader) === userId);
}
