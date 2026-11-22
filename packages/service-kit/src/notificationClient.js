const { request } = require('./http');

class NotificationClient {
  constructor(payload) {
    const pick = (user, fields) => Object.fromEntries(fields.map((field) => [field, user[field]]));
    this.payload = {
      recipient: pick(payload.recipient, ['_id', 'username']),
      sender: pick(payload.sender, ['_id', 'username', 'first_name', 'last_name', 'photo']),
      postId: payload.postId,
      postReact: payload.postReact,
    };
  }
  async dispatch(action) {
    const result = await request('messaging', '/internal/notifications', {
      method: 'POST',
      body: { action, payload: this.payload },
    });
    return result.notification;
  }
}
for (const action of [
  'sendPostReact',
  'sendPostComment',
  'sendCommentLike',
  'sendCommentComment',
  'sendFriendRequest',
  'sendFriendAccept',
  'sendFollow',
  'sendMessage',
]) {
  NotificationClient.prototype[action] = function () {
    return this.dispatch(action);
  };
}
module.exports = NotificationClient;
