const assert = require('node:assert/strict');
const { MongoClient, ObjectId } = require('mongodb');
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const { io } = require('../apps/web/node_modules/socket.io-client');
const base = process.env.TEST_BASE_URL || process.env.TEST_API_URL || 'http://localhost:8000';
const tag = Date.now();
const ids = [];
const sockets = [];
const fixtureImages = [];
const fixtureChatImages = [];
const fixtureAttachments = [];
const mailIds = [];
async function api(method, pathname, { token, body, form, expected } = {}) {
  const response = await fetch(base + pathname, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (expected) assert.equal(response.status, expected, JSON.stringify(data));
  else assert(response.ok, `${method} ${pathname}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function account(index, names = {}) {
  const email = `architecture-${tag}-${index}@example.com`.toLowerCase();
  const result = await api('POST', '/api/v1/users/signup', {
    body: {
      first_name: 'Integration',
      last_name: 'Student' + index,
      ...names,
      email,
      password: 'Backbook@123',
      passwordConfirm: 'Backbook@123',
      gender: 'male',
      birth_Year: 2003,
      birth_Month: 1,
      birth_Day: 15,
    },
  });
  const user = { ...result.data.user, token: result.data.token, email };
  ids.push(new ObjectId(user._id));
  return user;
}
async function activate(user) {
  const inbox = await (await fetch('http://localhost:8025/api/v1/messages?limit=100')).json();
  const email = inbox.messages.find((message) =>
    message.To.some((to) => to.Address === user.email)
  );
  assert(email, 'Verification email must arrive');
  mailIds.push(email.ID);
  const detail = await (await fetch('http://localhost:8025/api/v1/message/' + email.ID)).json();
  const verificationToken = (detail.Text || detail.HTML).match(/\/activate\/([a-f0-9]+)/)[1];
  await api('POST', '/api/v1/users/emailVerification', {
    token: user.token,
    body: { token: verificationToken },
  });
}
async function connect(user) {
  const socket = io(base, {
    auth: { token: user.token },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), 8000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.emit('setup', {});
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return socket;
}
async function main() {
  const health = await api('GET', '/health');
  assert.deepEqual(health.services, {
    accounts: 'ok',
    content: 'ok',
    messaging: 'ok',
    learning: 'ok',
  });
  const first = await account('One');
  const second = await account('Two');
  await api('GET', '/api/v1/posts/getAllPosts', { token: first.token, expected: 403 });
  await activate(first);
  await activate(second);
  console.log('PASS signup and email verification across services');

  await api('PUT', `/api/v1/friends/add/${second._id}`, { token: first.token, body: {} });
  const pending = await api('GET', '/api/v1/friends/friendsPage', { token: second.token });
  const invitation = pending.data.recivedRequests.find(
    (request) => request.sender._id === first._id
  );
  assert(invitation);
  await api('PUT', `/api/v1/friends/acceptRequest/${invitation._id}`, {
    token: second.token,
    body: {},
  });
  const friends = await api('GET', '/api/v1/friends/friendsPage', { token: first.token });
  assert(friends.data.friendLists.some((user) => user._id === second._id));
  console.log('PASS friendship owned by accounts');

  const image = await sharp({
    create: { width: 100, height: 100, channels: 3, background: '#b8202e' },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set('type', 'image');
  form.set('text', 'Microservices integration check');
  form.set('images', new Blob([image], { type: 'image/png' }), 'check.png');
  const post = (await api('POST', '/api/v1/posts/createPost/images', { token: first.token, form }))
    .data;
  assert((await fetch(post.images[0])).ok);
  fixtureImages.push(post.images[0]);
  const feed = await api('GET', '/api/v1/posts/getAllPosts', { token: second.token });
  assert(feed.data.some((item) => item._id === post._id));
  await api('PUT', `/api/v1/posts/${post._id}/reacts`, {
    token: second.token,
    body: { type: 'like' },
  });
  const commentForm = new FormData();
  commentForm.set('text', 'Cross-service comment');
  await api('POST', `/api/v1/posts/addComment/${post._id}`, {
    token: second.token,
    form: commentForm,
  });
  const notification = await api('GET', '/api/v1/users/notifications', { token: first.token });
  assert(notification.data.notifications.some((item) => item.type === 'comment'));
  console.log('PASS image upload, following feed, reaction, comment and remote notifications');

  const outsider = await account('Outside');
  await activate(outsider);
  const acceptedList = await api('GET', '/api/v1/friends/friendsPage', { token: first.token });
  assert(acceptedList.data.friendLists.some((friend) => friend._id === second._id));
  assert(!acceptedList.data.friendLists.some((friend) => friend._id === outsider._id));
  await api('POST', '/api/v1/posts/createPost', {
    token: first.token,
    body: {
      type: 'normal',
      text: 'Cannot choose a stranger',
      audience: 'selected',
      allowedViewers: [outsider._id],
    },
    expected: 400,
  });
  await api('PUT', `/api/v1/friends/add/${outsider._id}`, { token: first.token, body: {} });
  const pendingList = await api('GET', '/api/v1/friends/friendsPage', { token: first.token });
  assert(!pendingList.data.friendLists.some((friend) => friend._id === outsider._id));
  await api('POST', '/api/v1/posts/createPost', {
    token: first.token,
    body: {
      type: 'normal',
      text: 'Pending is not accepted',
      audience: 'selected',
      allowedViewers: [outsider._id],
    },
    expected: 400,
  });
  await api('PUT', `/api/v1/friends/follow/${first._id}`, { token: outsider.token, body: {} });
  await api('POST', '/api/v1/posts/createPost', {
    token: first.token,
    body: { type: 'normal', text: 'Invalid audience', audience: 'selected', allowedViewers: [] },
    expected: 400,
  });
  const restrictedForm = new FormData();
  restrictedForm.set('type', 'image');
  restrictedForm.set('text', 'Only the chosen viewer');
  restrictedForm.set('audience', 'selected');
  restrictedForm.set('allowedViewers', JSON.stringify([second._id]));
  restrictedForm.set('images', new Blob([image], { type: 'image/png' }), 'private.png');
  const restricted = (
    await api('POST', '/api/v1/posts/createPost/images', {
      token: first.token,
      form: restrictedForm,
    })
  ).data;
  for (const viewer of [first, second]) {
    await api('GET', `/api/v1/posts/${restricted._id}`, { token: viewer.token });
    const ownFeed = await api('GET', '/api/v1/posts/getAllPosts', { token: viewer.token });
    assert(ownFeed.data.some((item) => item._id === restricted._id));
    const ownProfile = await api('GET', `/api/v1/users/getProfile/${first.username}/posts`, {
      token: viewer.token,
    });
    assert(ownProfile.data.some((item) => item._id === restricted._id));
  }
  const hiddenFeed = await api('GET', '/api/v1/posts/getAllPosts', { token: outsider.token });
  assert(!hiddenFeed.data.some((item) => item._id === restricted._id));
  const hiddenProfile = await api('GET', `/api/v1/users/getProfile/${first.username}/posts`, {
    token: outsider.token,
  });
  assert(!hiddenProfile.data.some((item) => item._id === restricted._id));
  await api('GET', `/api/v1/posts/${post._id}`, { token: outsider.token });
  for (const suffix of ['', '/reacts'])
    await api('GET', `/api/v1/posts/${restricted._id}${suffix}`, {
      token: outsider.token,
      expected: 404,
    });
  await api('GET', `/api/v1/posts/comments/${restricted._id}`, {
    token: outsider.token,
    expected: 404,
  });
  await api('PUT', `/api/v1/posts/${restricted._id}/reacts`, {
    token: outsider.token,
    body: { type: 'like' },
    expected: 404,
  });
  await api('POST', `/api/v1/posts/addComment/${restricted._id}`, {
    token: outsider.token,
    body: { text: 'Denied' },
    expected: 404,
  });
  const privateComment = (
    await api('POST', `/api/v1/posts/addComment/${restricted._id}`, {
      token: second.token,
      body: { text: 'Allowed' },
    })
  ).data.commendData;
  await api('PUT', `/api/v1/posts/comments/${privateComment._id}/like`, {
    token: outsider.token,
    body: {},
    expected: 404,
  });
  await api('POST', `/api/v1/posts/comments/${privateComment._id}/reply`, {
    token: outsider.token,
    body: { text: 'Denied' },
    expected: 404,
  });
  await api('POST', '/api/v1/posts/createPost', {
    token: second.token,
    body: { type: 'share', sharedID: restricted._id },
    expected: 403,
  });
  const spoofedShare = (
    await api('POST', '/api/v1/posts/createPost', {
      token: outsider.token,
      body: { type: 'normal', text: 'Unrelated public post', sharedID: restricted._id },
    })
  ).data;
  assert(!spoofedShare.sharedID, 'Non-share posts must not embed a restricted post');
  const privateUrl = base + new URL(restricted.images[0]).pathname;
  assert.equal((await fetch(privateUrl)).status, 401);
  assert.equal(
    (await fetch(privateUrl, { headers: { authorization: `Bearer ${outsider.token}` } })).status,
    404
  );
  assert.equal(
    (await fetch(privateUrl, { headers: { authorization: `Bearer ${second.token}` } })).status,
    200
  );
  const encodedUrl = privateUrl.replace('/restricted/', '/%72estricted/');
  assert.equal((await fetch(encodedUrl)).status, 401);
  assert.equal((await fetch(privateUrl.replace('/restricted/', '/restricted./'))).status, 400);
  assert.equal((await fetch(privateUrl.replace('/restricted/', '/restricted%20/'))).status, 400);
  const privatePhotos = await api('GET', `/api/v1/users/getProfile/${first.username}/photos`, {
    token: outsider.token,
  });
  assert(!privatePhotos.data.resources.some((photo) => photo.url === restricted.images[0]));
  console.log(
    'PASS selected audience: owner/viewer access, public compatibility, feed/profile filtering, comments, shares and protected images'
  );
  const friendsForm = new FormData();
  friendsForm.set('type', 'image');
  friendsForm.set('text', 'All accepted friends');
  friendsForm.set('audience', 'friends');
  friendsForm.set('images', new Blob([image], { type: 'image/png' }), 'friends.png');
  const friendsPost = (
    await api('POST', '/api/v1/posts/createPost/images', { token: first.token, form: friendsForm })
  ).data;
  for (const viewer of [first, second]) {
    await api('GET', `/api/v1/posts/${friendsPost._id}`, { token: viewer.token });
    const friendFeed = await api('GET', '/api/v1/posts/getAllPosts', { token: viewer.token });
    assert(friendFeed.data.some((item) => item._id === friendsPost._id));
  }
  await api('GET', `/api/v1/posts/${friendsPost._id}`, { token: outsider.token, expected: 404 });
  await api('GET', `/api/v1/posts/comments/${friendsPost._id}`, {
    token: outsider.token,
    expected: 404,
  });
  const outsiderProfile = await api('GET', `/api/v1/users/getProfile/${first.username}/posts`, {
    token: outsider.token,
  });
  assert(!outsiderProfile.data.some((item) => item._id === friendsPost._id));
  const friendsImage = base + new URL(friendsPost.images[0]).pathname;
  assert.equal(
    (await fetch(friendsImage, { headers: { authorization: `Bearer ${second.token}` } })).status,
    200
  );
  assert.equal(
    (await fetch(friendsImage, { headers: { authorization: `Bearer ${outsider.token}` } })).status,
    404
  );
  await api('POST', '/api/v1/posts/createPost', {
    token: second.token,
    body: { type: 'share', sharedID: friendsPost._id },
    expected: 403,
  });
  // Accepting a pending invitation grants access only to the all-friends post.
  const invitations = await api('GET', '/api/v1/friends/friendsPage', { token: outsider.token });
  const invite = invitations.data.recivedRequests.find((item) => item.sender._id === first._id);
  assert(invite);
  await api('PUT', `/api/v1/friends/acceptRequest/${invite._id}`, {
    token: outsider.token,
    body: {},
  });
  await api('GET', `/api/v1/posts/${friendsPost._id}`, { token: outsider.token });
  await api('GET', `/api/v1/posts/${restricted._id}`, { token: outsider.token, expected: 404 });
  await api('PUT', `/api/v1/friends/remove/${invite._id}`, { token: outsider.token, body: {} });
  await api('GET', `/api/v1/posts/${friendsPost._id}`, { token: outsider.token, expected: 404 });
  console.log(
    'PASS all-friends audience, pending requests excluded, new friendship access and revoked access after unfriend'
  );

  const avatar = new FormData();
  avatar.set('photo', new Blob([image], { type: 'image/png' }), 'avatar.png');
  avatar.set('text', 'Updated avatar');
  const updated = await api('POST', '/api/v1/users/update/profile/photo', {
    token: second.token,
    form: avatar,
  });
  assert((await fetch(updated.data.url)).ok);
  fixtureImages.push(updated.data.url);
  const profilePosts = await api('GET', `/api/v1/users/getProfile/${second.username}/posts`, {
    token: first.token,
  });
  assert(profilePosts.data.some((item) => item.type === 'profilePhoto'));
  const photos = await api('GET', `/api/v1/users/getProfile/${second.username}/photos`, {
    token: first.token,
  });
  assert(photos.data.resources.length > 0);
  console.log('PASS account photo update delegated to content storage and profile post');

  const chat = (
    await api('POST', '/api/v1/chats/create/private', {
      token: first.token,
      body: { userId: second._id },
    })
  ).data.chat;
  const sender = await connect(first);
  const recipient = await connect(second);
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Message relay timeout')), 8000);
    recipient.once('message_recieved', (message) => {
      clearTimeout(timer);
      resolve(message);
    });
  });
  const message = (
    await api('PUT', `/api/v1/messages/${chat._id}/send`, {
      token: first.token,
      body: { type: 'text', content: 'Hello through the API Gateway' },
    })
  ).data.message;
  sender.emit('new_message', { message, chat });
  assert.equal((await received).content, 'Hello through the API Gateway');
  const unread = await api('PUT', '/api/v1/users/ping', { token: second.token, body: {} });
  assert.equal(unread.unseenMessages, 1);
  await api('PUT', `/api/v1/messages/${message._id}/seen`, { token: second.token, body: {} });
  const ping = await api('PUT', '/api/v1/users/ping', { token: second.token, body: {} });
  assert.equal(ping.unseenMessages, 0);
  console.log('PASS real WebSocket upgrade, persisted message, relay and counters');

  await regressions({ first, second, sender, recipient, image, post, message });
  const reply = (
    await api('PUT', `/api/v1/messages/${chat._id}/send`, {
      token: second.token,
      body: {
        type: 'text',
        content: 'Reply to this specific message',
        replyMessageId: message._id,
        replyTo: { content: 'Forged quotation' },
      },
    })
  ).data.message;
  assert.equal(reply.replyTo.messageId, message._id);
  assert.equal(reply.replyTo.content, message.content);
  assert.equal(reply.replyTo.sender.id, first._id);
  const replyDelivered = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Reply relay timeout')), 8000);
    sender.once('message_recieved', (incoming) => {
      clearTimeout(timer);
      resolve(incoming);
    });
  });
  recipient.emit('new_message', { message: reply });
  assert.equal((await replyDelivered).replyTo.messageId, message._id);
  const history = await api('GET', `/api/v1/messages/${chat._id}?page=1&sort=-createdAt`, {
    token: first.token,
  });
  assert.equal(
    history.data.messages.find((item) => item._id === reply._id).replyTo.content,
    message.content
  );
  const otherChat = (
    await api('POST', '/api/v1/chats/create/private', {
      token: first.token,
      body: { userId: outsider._id },
    })
  ).data.chat;
  await api('PUT', `/api/v1/messages/${otherChat._id}/send`, {
    token: first.token,
    body: { type: 'text', content: 'Cross-chat reply denied', replyMessageId: message._id },
    expected: 400,
  });
  await api('PUT', `/api/v1/messages/${otherChat._id}/send`, {
    token: outsider.token,
    body: { forwardMessageId: message._id },
    expected: 403,
  });
  await api('PUT', `/api/v1/messages/${chat._id}/send`, {
    token: outsider.token,
    body: { forwardMessageId: message._id },
    expected: 400,
  });
  const forwarded = (
    await api('PUT', `/api/v1/messages/${otherChat._id}/send`, {
      token: first.token,
      body: { forwardMessageId: reply._id, type: 'image', content: 'Forged forwarding content' },
    })
  ).data.message;
  assert.equal(forwarded.content, reply.content);
  assert.equal(forwarded.type, 'text');
  assert.equal(forwarded.forwarded, true);
  assert(!forwarded.replyTo, 'Forwarding must not expose the source conversation quotation');
  assert.equal(forwarded.sender._id, first._id);
  const outsideSocket = await connect(outsider);
  const forwardDelivered = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Forward relay timeout')), 8000);
    outsideSocket.once('message_recieved', (incoming) => {
      clearTimeout(timer);
      resolve(incoming);
    });
  });
  sender.emit('new_message', { message: forwarded });
  const liveForward = await forwardDelivered;
  assert.equal(liveForward.forwarded, true);
  assert.equal(liveForward.content, reply.content);
  assert(!liveForward.replyTo);

  const forwardedHistory = await api('GET', `/api/v1/messages/${otherChat._id}?page=1`, {
    token: outsider.token,
  });
  assert(
    forwardedHistory.data.messages.some((item) => item._id === forwarded._id && item.forwarded)
  );
  await api('PUT', `/api/v1/messages/${otherChat._id}/send`, {
    token: first.token,
    body: { forwardMessageId: 'invalid' },
    expected: 400,
  });
  await api('PUT', `/api/v1/messages/${chat._id}/send`, {
    token: first.token,
    body: { replyMessageId: message._id, forwardMessageId: reply._id },
    expected: 400,
  });
  console.log(
    'PASS persisted reply quotations, real-time replies, forwarding, canonical source content and conversation access checks'
  );

  const themeChange = await api('PUT', `/api/v1/chats/${chat._id}/theme`, {
    token: first.token,
    body: { theme: 1 },
  });
  assert.equal(themeChange.data.theme, 1);
  const themeInfo = (
    await api('PUT', `/api/v1/messages/${chat._id}/send`, {
      token: first.token,
      body: { type: 'info', content: `${themeChange.data.name} changed the theme.` },
    })
  ).data.message;
  assert.equal(themeInfo.type, 'info');
  const infoHistory = await api('GET', `/api/v1/messages/${chat._id}?page=1`, {
    token: second.token,
  });
  assert(
    infoHistory.data.messages.some((item) => item._id === themeInfo._id && item.type === 'info')
  );
  await api('PUT', `/api/v1/messages/${chat._id}/send`, {
    token: first.token,
    body: { type: 'unsupported', content: 'Invalid type remains rejected' },
    expected: 400,
  });
  console.log('PASS theme changes and informational chat messages without message-type errors');

  const imageForm = new FormData();
  imageForm.set('type', 'image');
  imageForm.set('caption', 'Ảnh gửi trong chat 😀');
  imageForm.set('replyMessageId', message._id);
  imageForm.set('image', new Blob([image], { type: 'image/png' }), 'chat.png');
  const photoMessage = (
    await api('PUT', `/api/v1/messages/${chat._id}/send`, { token: first.token, form: imageForm })
  ).data.message;
  fixtureChatImages.push(photoMessage._id);
  assert.equal(photoMessage.type, 'image');
  assert.equal(photoMessage.caption, 'Ảnh gửi trong chat 😀');
  assert.equal(photoMessage.replyTo.messageId, message._id);
  const mediaUrl = base + new URL(photoMessage.content).pathname;
  assert.equal((await fetch(mediaUrl)).status, 401);
  assert.equal(
    (await fetch(mediaUrl, { headers: { authorization: `Bearer ${outsider.token}` } })).status,
    403
  );
  const readableImage = await fetch(mediaUrl, {
    headers: { authorization: `Bearer ${second.token}` },
  });
  assert.equal(readableImage.status, 200);
  assert.equal(readableImage.headers.get('content-type'), 'image/webp');
  assert((await sharp(Buffer.from(await readableImage.arrayBuffer())).metadata()).width > 0);
  const imageDelivered = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Image relay timeout')), 8000);
    recipient.once('message_recieved', (incoming) => {
      clearTimeout(timer);
      resolve(incoming);
    });
  });
  sender.emit('new_message', { message: photoMessage });
  assert.equal((await imageDelivered).caption, photoMessage.caption);
  const forwardedPhoto = (
    await api('PUT', `/api/v1/messages/${otherChat._id}/send`, {
      token: first.token,
      body: { forwardMessageId: photoMessage._id },
    })
  ).data.message;
  assert.equal(forwardedPhoto.caption, photoMessage.caption);
  assert.notEqual(forwardedPhoto.content, photoMessage.content);
  const forwardedMedia = base + new URL(forwardedPhoto.content).pathname;
  assert.equal(
    (await fetch(forwardedMedia, { headers: { authorization: `Bearer ${outsider.token}` } }))
      .status,
    200
  );
  const invalidImage = new FormData();
  invalidImage.set('type', 'image');
  invalidImage.set('image', new Blob(['not an image'], { type: 'image/png' }), 'invalid.png');
  await api('PUT', `/api/v1/messages/${chat._id}/send`, {
    token: first.token,
    form: invalidImage,
    expected: 400,
  });
  const emojiMessage = (
    await api('PUT', `/api/v1/messages/${chat._id}/send`, {
      token: first.token,
      body: { type: 'text', content: 'Xin chào 😀❤️' },
    })
  ).data.message;
  assert.equal(emojiMessage.content, 'Xin chào 😀❤️');
  console.log(
    'PASS chat image uploads, captions, protected media, live image delivery, image forwarding and emoji text'
  );
  const documentFixtures = [
    {
      name: 'báo-cáo.pdf',
      mime: 'application/pdf',
      bytes: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF'),
    },
    {
      name: 'bài-tập.docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      bytes: Buffer.from(
        'UEsDBBQAAAAIAK96bl26d6ScywAAAFMBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbJWQvVLDQAyEX+XmWiYnQ0HB2E4BtEDBC2jOsn3D/c1JCeHtkRNIQUcp7Wq/HfX7U4rmSI1DyYO9dZ3dj/37VyU2qmQe7CpSHwDYr5SQXamUVZlLSyg6tgUq+g9cCO667h58yUJZdrJl2LF/ohkPUczzSdcXSqPI1jxejBtrsFhrDB5FdTjm6Q9l90Nwenn28Boq36jBwti/av0WJjJv2OQFk8bBZ2kTTMUfkiLcZvwXr8xz8HS939JqK56YQ15SdFclYci/PeD8tvEbUEsDBBQAAAAIAK96bl1fM5VSlQAAAAcBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRD5AnTIwoKZdWLoiLhAlblPRPOSE1+3JwEARA6N///osd8PDr+JGnJcYFLSNhKHvTrTqUoPslpRFbYSswJWSDojZOPI6NzFRqJspsteljjxj0uaiZ8KdlHvkTwO2phitAh5tC+L8TPSPHadpMXSM5uoplB8nvhpV1jxTUXCPbNG+46aygH2Hmxf7F1BLAwQUAAAACACvem5dvHEdRpoAAAC/AAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sRY7LDcIwEERbsVxANnDgEOXTBA2ExCQWWa+1djCcOdAGDVBBjlSSTrDDgcsbjZ40mrK54SSuip0mU8ldlsumLkPRUzejMl5EbVwRKjl6bwsA140KW5eRVSa6MzG2PlYeIBD3lqlTzmkz4AT7PD8AttrINHmi/p7SJnCCr4+flxaTXpfnLC4xHij8uC7vEpJN5I12428B/u/qL1BLAQIUABQAAAAIAK96bl26d6ScywAAAFMBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQAFAAAAAgAr3puXV8zlVKVAAAABwEAAAsAAAAAAAAAAAAAAIAB/AAAAF9yZWxzLy5yZWxzUEsBAhQAFAAAAAgAr3puXbxxHUaaAAAAvwAAABEAAAAAAAAAAAAAAIABugEAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAADAAMAuQAAAIMCAAAAAA==',
        'base64'
      ),
    },
  ];
  for (const fixture of documentFixtures) {
    const form = new FormData();
    form.set('type', 'file');
    form.set('file', new Blob([fixture.bytes], { type: fixture.mime }), fixture.name);
    form.set('caption', 'Tài liệu của tôi');
    const documentMessage = (
      await api('PUT', `/api/v1/messages/${chat._id}/send`, { token: first.token, form })
    ).data.message;
    fixtureAttachments.push(documentMessage._id + require('node:path').extname(fixture.name));
    assert.equal(documentMessage.type, 'file');
    assert.equal(documentMessage.attachment.name, fixture.name);
    assert.equal(documentMessage.attachment.size, fixture.bytes.length);
    const download = base + new URL(documentMessage.content).pathname;
    assert.equal((await fetch(download)).status, 401);
    assert.equal(
      (await fetch(download, { headers: { authorization: `Bearer ${outsider.token}` } })).status,
      403
    );
    const readable = await fetch(download, {
      headers: { authorization: `Bearer ${second.token}` },
    });
    assert.equal(readable.status, 200);
    assert(readable.headers.get('content-disposition').startsWith('attachment;'));
    assert.deepEqual(Buffer.from(await readable.arrayBuffer()), fixture.bytes);
    const forwardDocument = (
      await api('PUT', `/api/v1/messages/${otherChat._id}/send`, {
        token: first.token,
        body: { forwardMessageId: documentMessage._id },
      })
    ).data.message;
    assert.equal(forwardDocument.attachment.name, fixture.name);
    assert.equal(
      (
        await fetch(base + new URL(forwardDocument.content).pathname, {
          headers: { authorization: `Bearer ${outsider.token}` },
        })
      ).status,
      200
    );
    const fileReply = (
      await api('PUT', `/api/v1/messages/${chat._id}/send`, {
        token: second.token,
        body: { type: 'text', content: 'Đã nhận tài liệu', replyMessageId: documentMessage._id },
      })
    ).data.message;
    assert.equal(fileReply.replyTo.attachmentName, fixture.name);
  }
  const rejected = new FormData();
  rejected.set('type', 'file');
  rejected.set('file', new Blob(['invalid'], { type: 'application/octet-stream' }), 'program.exe');
  await api('PUT', `/api/v1/messages/${chat._id}/send`, {
    token: first.token,
    form: rejected,
    expected: 400,
  });
  console.log(
    'PASS PDF and Word uploads, Vietnamese filenames, downloads, forwarding, reply and private access'
  );

  await api('GET', '/internal/projections', { expected: 404 });
  assert.equal(
    (
      await fetch('http://127.0.0.1:8002/internal/media', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    ).status,
    403
  );
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  try {
    for (const domain of ['content', 'messaging']) {
      const db = client.db('ptitsocial_' + domain);
      assert(!(await db.listCollections({ name: 'users' }).toArray()).length);
      const projection = await db.collection('user_projections').findOne({ _id: ids[0] });
      assert(
        projection && !projection.password && !projection.email && !projection.passwordResetToken
      );
    }
  } finally {
    await client.close();
  }
  console.log('PASS separate databases, secret-free projections and private internal APIs');
}
async function regressions({ first, second, sender, recipient, image, post, message }) {
  const third = await account('Three', { first_name: 'An', last_name: 'Lê' });
  const outsider = await account('Four', { first_name: 'Đỗ', last_name: 'Nguyễn' });
  await activate(third);
  await activate(outsider);
  assert.equal(third.last_name, 'Lê');
  assert.equal(outsider.last_name, 'Nguyễn');
  console.log('PASS Vietnamese names, including two-character names, and verification mail');

  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  try {
    const messages = client.db('ptitsocial_messaging').collection('messages');
    const before = await messages.findOne({ _id: new ObjectId(message._id) });
    const denied = await api('PUT', `/api/v1/messages/${message._id}/seen`, {
      token: outsider.token,
      body: {},
      expected: 403,
    });
    assert.equal(denied.data, undefined);
    assert(!JSON.stringify(denied).includes(message.content));
    assert.deepEqual(await messages.findOne({ _id: before._id }), before);
    await api('PUT', '/api/v1/messages/invalid/seen', {
      token: first.token,
      body: {},
      expected: 400,
    });
    await api('PUT', `/api/v1/messages/${new ObjectId()}/seen`, {
      token: first.token,
      body: {},
      expected: 404,
    });
    console.log('PASS nonmembers cannot read or mutate message receipts; invalid IDs rejected');

    const chat = (
      await api('POST', '/api/v1/chats/create/group', {
        token: first.token,
        body: { users: [second._id, third._id], chatName: 'Read receipt regression' },
      })
    ).data.chat;
    const thirdSocket = await connect(third);
    const unread = async (user) =>
      (
        await api('PUT', '/api/v1/users/ping', {
          token: user.token,
          body: {},
        })
      ).unseenMessages;
    const seen = async (msg, user) =>
      (
        await api('PUT', `/api/v1/messages/${msg._id}/seen`, {
          token: user.token,
          body: {},
        })
      ).data;
    const send = async (text) => {
      const receipts = [recipient, thirdSocket].map(
        (socket) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Group relay timeout')), 8000);
            socket.once('message_recieved', (saved, stats) => {
              clearTimeout(timer);
              resolve({ saved, stats });
            });
          })
      );
      const saved = (
        await api('PUT', `/api/v1/messages/${chat._id}/send`, {
          token: first.token,
          body: { type: 'text', content: text },
        })
      ).data.message;
      sender.emit('new_message', { message: saved, chat });
      for (const receipt of await Promise.all(receipts)) {
        assert.equal(receipt.saved._id, saved._id);
        assert.equal(receipt.stats.unseenMessages, 1);
      }
      return saved;
    };
    const older = await send('Unread for both recipients');
    assert.deepEqual(await Promise.all([first, second, third, outsider].map(unread)), [0, 1, 1, 0]);
    const groupBefore = await messages.findOne({ _id: new ObjectId(older._id) });
    await api('PUT', `/api/v1/messages/${older._id}/seen`, {
      token: outsider.token,
      body: {},
      expected: 403,
    });
    assert.deepEqual(await messages.findOne({ _id: groupBefore._id }), groupBefore);
    const firstRead = await seen(older, second);
    assert.equal(firstRead.unseenMessages, 0);
    assert.equal(firstRead.message.seen, 'unseen');
    assert.deepEqual(firstRead.message.seenBy, [second._id]);
    assert.equal(await unread(third), 1);
    const latest = await send('A second message in the same conversation');
    assert.equal((await seen(older, second)).unseenMessages, 1);
    const chats = await api('GET', '/api/v1/chats', { token: second.token });
    assert.equal(
      chats.data.chats.find((item) => item._id === chat._id).latestMessage._id,
      latest._id
    );
    await Promise.all([seen(latest, second), seen(latest, second), seen(latest, third)]);
    const readAgain = await seen(latest, second);
    assert.equal(readAgain.unseenMessages, 0);
    assert.equal(readAgain.message.seen, 'seen');
    assert.deepEqual([...readAgain.message.seenBy].sort(), [second._id, third._id].sort());
    assert.deepEqual(await Promise.all([first, second, third, outsider].map(unread)), [0, 0, 0, 0]);
    console.log(
      'PASS group counters, per-user reads, repeated/concurrent reads and older receipts'
    );

    const comments = client.db('ptitsocial_content').collection('comments');
    const filter = { post: new ObjectId(post._id) };
    const initialCount = await comments.countDocuments(filter);
    const photoOnly = new FormData();
    photoOnly.set('photo', new Blob([image], { type: 'image/png' }), 'comment.png');
    const photoComment = (
      await api('POST', `/api/v1/posts/addComment/${post._id}`, {
        token: second.token,
        form: photoOnly,
      })
    ).data.commendData;
    assert.equal(photoComment.text, '');
    assert((await fetch(photoComment.photo)).ok);
    assert.equal(await comments.countDocuments(filter), initialCount + 1);
    for (const text of [null, 123, [], {}, '']) {
      await api('POST', `/api/v1/posts/addComment/${post._id}`, {
        token: second.token,
        body: { text },
        expected: 400,
      });
    }
    await api('POST', `/api/v1/posts/addComment/${post._id}`, {
      token: second.token,
      body: {},
      expected: 400,
    });
    assert.equal(await comments.countDocuments(filter), initialCount + 1);
    console.log('PASS photo-only comment without text; invalid comments never persist');

    const shared = (
      await api('POST', '/api/v1/posts/createPost', {
        token: second.token,
        body: { type: 'share', sharedID: post._id, text: 'Shared caption remains' },
      })
    ).data;
    assert.equal(shared.sharesCount, 0);
    assert.equal(shared.sharedID.sharesCount, 1);
    assert.equal(
      (await api('GET', `/api/v1/posts/${post._id}`, { token: second.token })).data.post
        .sharesCount,
      1
    );
    const anotherShare = (
      await api('POST', '/api/v1/posts/createPost', {
        token: second.token,
        body: { type: 'share', sharedID: post._id, text: 'Second test share' },
      })
    ).data;
    assert.equal(anotherShare.sharedID.sharesCount, 2);
    await api('PUT', `/api/v1/posts/${anotherShare._id}`, { token: second.token, body: {} });
    assert.equal(
      (await api('GET', `/api/v1/posts/${post._id}`, { token: second.token })).data.post
        .sharesCount,
      1
    );
    console.log(
      'PASS original share count increments, returns authoritative count and excludes deleted shares'
    );
    await api('PUT', `/api/v1/posts/${post._id}`, { token: first.token, body: {} });
    const remaining = (await api('GET', `/api/v1/posts/${shared._id}`, { token: second.token }))
      .data.post;
    assert.equal(remaining.sharedID, null);
    assert.equal(remaining.text, 'Shared caption remains');
    await api('PUT', `/api/v1/posts/${shared._id}`, { token: second.token, body: {} });
    console.log('PASS share stays accessible after deleting the original post');
  } finally {
    await client.close();
  }
}
async function cleanup() {
  sockets.forEach((socket) => socket.close());
  if (!ids.length) return;
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  try {
    const participants = { $or: [{ sender: { $in: ids } }, { recipient: { $in: ids } }] };
    const accounts = client.db('ptitsocial_accounts');
    await accounts.collection('users').deleteMany({ _id: { $in: ids } });
    for (const name of ['friends', 'follows'])
      await accounts.collection(name).deleteMany(participants);
    const content = client.db('ptitsocial_content');
    for (const name of ['posts', 'comments', 'reactions'])
      await content.collection(name).deleteMany({ user: { $in: ids } });
    await content.collection('user_projections').deleteMany({ _id: { $in: ids } });
    await content.collection('follow_projections').deleteMany(participants);
    const messaging = client.db('ptitsocial_messaging');
    await messaging.collection('chats').deleteMany({ users: { $in: ids } });
    await messaging.collection('messages').deleteMany({ sender: { $in: ids } });
    await messaging.collection('notifications').deleteMany(participants);
    await messaging.collection('user_projections').deleteMany({ _id: { $in: ids } });
  } finally {
    await client.close();
    for (const filename of fixtureAttachments) {
      assert(/^[a-f0-9]{24}\.[a-z0-9]+$/.test(filename));
      await require('node:fs/promises')
        .unlink(
          require('node:path').resolve(
            __dirname,
            '../services/messaging/uploads/messages',
            filename
          )
        )
        .catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
    }
    for (const id of fixtureChatImages) {
      assert(/^[a-f0-9]{24}$/.test(id));
      await require('node:fs/promises')
        .unlink(
          require('node:path').resolve(
            __dirname,
            '../services/messaging/uploads/messages',
            id + '.webp'
          )
        )
        .catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
    }
  }
  const uploadRoot = path.resolve(__dirname, '../services/content/uploads');
  for (const url of fixtureImages) {
    const relative = decodeURIComponent(new URL(url).pathname).replace(/^\/uploads\//, '');
    for (const id of ids) {
      const parts = relative.split('/');
      const index = parts.indexOf(String(id));
      if (index < 1 || parts[index - 1] !== 'users') continue;
      const directory = path.resolve(uploadRoot, ...parts.slice(0, index + 1));
      assert(directory.startsWith(uploadRoot + path.sep));
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
  if (mailIds.length) {
    const response = await fetch('http://localhost:8025/api/v1/messages', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ IDs: mailIds }),
    });
    assert(response.ok, 'Fixture mail cleanup failed');
  }
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
