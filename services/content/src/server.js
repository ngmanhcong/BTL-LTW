require('dotenv').config();
const express = require('express');
const path = require('node:path');
const { createApp, start } = require('@ptitsocial/service-kit/server');
const { internalOnly } = require('@ptitsocial/service-kit/http');
const auth = require('@ptitsocial/service-kit/auth');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const User = require('./models/userModel');
const Follow = require('./models/followModel');
const Post = require('./models/postModel');
require('./models/commentModel');
require('./models/reactionModel');
const media = require('./storage/mediaStorage');
const profiles = require('./controllers/profileContentController');
const sync = require('@ptitsocial/service-kit/projections').projectionSync({ User, Follow });
const app = createApp('content');

// Restricted files always require the same access as their parent post.
app.use('/uploads', (req, res, next) => {
  let mediaPath;
  try {
    const decoded = decodeURIComponent(req.path).replace(/\\/g, '/');
    // Reject Windows filename aliases before passing the path to express.static.
    if (decoded.includes(':') || decoded.split('/').some((part) => /[. ]$/.test(part)))
      return next(new AppError('Đường dẫn tệp không hợp lệ', 400));
    mediaPath = path.posix.normalize(decoded);
  } catch {
    return next(new AppError('Đường dẫn tệp không hợp lệ', 400));
  }
  if (!mediaPath.toLowerCase().startsWith('/restricted/')) return next();
  res.set('Cache-Control', 'private, no-store');
  auth.protect(req, res, (err) => {
    if (err) return next(err);
    catchAsync(async (req, res, next) => {
      const match = mediaPath.match(/^\/restricted\/posts\/([a-f0-9]{24})\//i);
      if (!match) throw new AppError('Không tìm thấy ảnh', 404);
      const { assertView, friendIdsFor } = require('./utils/postAccess');
      if (!req.user.verified)
        throw new AppError('Vui lòng xác minh email trước khi sử dụng PTITSocial', 403);
      assertView(await Post.findById(match[1]), req.user.id, await friendIdsFor(req.user.id));
      next();
    })(req, res, next);
  });
});
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/internal', internalOnly);
app.post(
  '/internal/media',
  catchAsync(async (req, res, next) => {
    if (typeof req.body.buffer !== 'string' || typeof req.body.folder !== 'string')
      return next(new AppError('Thiếu ảnh hoặc thư mục lưu trữ', 400));
    const image = Buffer.from(req.body.buffer, 'base64');
    res.json({ media: await media.uploadImage(image, req.body.folder) });
  })
);
app.post(
  '/internal/profile-posts',
  catchAsync(async (req, res, next) => {
    const { user, type, text, images } = req.body;
    if (!['profilePhoto', 'cover'].includes(type))
      return next(new AppError('Loại bài cập nhật hồ sơ không hợp lệ', 400));
    await sync.sync();
    const post = await Post.create({ user, type, text, images });
    res.status(201).json({ post });
  })
);

app.use(
  '/api',
  auth.protect,
  auth.requireVerified,
  sync.middleware,
  catchAsync(async (req, res, next) => {
    req.friendIds = await require('./utils/postAccess').friendIdsFor(req.user.id);
    next();
  })
);
app.use('/api/v1/posts', require('./routes/postRoutes'));
app.get('/api/v1/users/getProfile/:username/photos', profiles.getPhotos);
app.get('/api/v1/users/getProfile/:username/posts', profiles.getUserPosts);

start(app, { name: 'content', port: Number(process.env.PORT || 8002) }).catch((err) => {
  console.error(err);
  process.exit(1);
});
