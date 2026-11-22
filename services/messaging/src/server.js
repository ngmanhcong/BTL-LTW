require('dotenv').config();
const { createApp, start } = require('@ptitsocial/service-kit/server');
const { internalOnly } = require('@ptitsocial/service-kit/http');
const auth = require('@ptitsocial/service-kit/auth');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const User = require('./models/userModel');
require('./models/chatModel');
require('./models/messageModel');
require('./models/notificationModel');
const Notification = require('./utils/notification');
const notifications = require('./controllers/notificationController');
const sync = require('@ptitsocial/service-kit/projections').projectionSync({ User });
const app = createApp('messaging');

app.use('/internal', internalOnly);
app.get(
  '/internal/stats/:userId',
  catchAsync(async (req, res) => {
    const user = await User.findById(req.params.userId);
    res.json({
      unseenMessages: user?.unseenMessages || 0,
      unseenNotification: user?.unseenNotification || 0,
    });
  })
);
const actions = [
  'sendPostReact',
  'sendPostComment',
  'sendCommentLike',
  'sendCommentComment',
  'sendFriendRequest',
  'sendFriendAccept',
  'sendFollow',
  'sendMessage',
];
app.post(
  '/internal/notifications',
  catchAsync(async (req, res, next) => {
    const { action, payload } = req.body;
    if (!actions.includes(action) || !payload?.sender?._id || !payload?.recipient?._id)
      return next(new AppError('Thông báo không hợp lệ', 400));
    await sync.sync();
    const notification = await new Notification(payload)[action]();
    if (notification) {
      await notification.populate({
        path: 'sender',
        select: 'first_name last_name photo username',
      });
      require('./utils/socket')
        .getIO()
        ?.to(`user:${payload.recipient._id}`)
        .emit('new_notification', { notification });
    }
    res.status(201).json({ notification });
  })
);

app.use('/api', auth.protect, auth.requireVerified, sync.middleware);
app.use('/api/v1/chats', require('./routes/chatRoutes'));
app.use('/api/v1/messages', require('./routes/messagesRoutes'));
app.get('/api/v1/users/notifications', notifications.getNotification);
app.put('/api/v1/users/notifications/:nid/seen', notifications.seenNotification);

start(app, {
  name: 'messaging',
  port: Number(process.env.PORT || 8003),
  realtime: require('./utils/socket').init,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
