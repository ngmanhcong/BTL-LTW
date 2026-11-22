require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createApp, start } = require('@ptitsocial/service-kit/server');
const { internalOnly } = require('@ptitsocial/service-kit/http');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const User = require('./models/userModel');
const Follow = require('./models/followModel');
const Friend = require('./models/friendsModel');

const app = createApp('accounts');
app.use('/internal', internalOnly);
app.get(
  '/internal/friends/:userId',
  catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    if (!/^[a-f0-9]{24}$/i.test(userId))
      return next(new AppError('Mã người dùng không hợp lệ', 400));
    const friendships = await Friend.find({
      status: 'accepted',
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .select('sender recipient')
      .lean();
    const friendIds = [
      ...new Set(
        friendships.map((friend) =>
          String(friend.sender) === userId ? String(friend.recipient) : String(friend.sender)
        )
      ),
    ];
    res.json({ friendIds });
  })
);
app.post(
  '/internal/friends/validate',
  catchAsync(async (req, res, next) => {
    const { userId, friendIds } = req.body;
    const validId = (id) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
    if (
      !validId(userId) ||
      !Array.isArray(friendIds) ||
      friendIds.length > 100 ||
      !friendIds.every(validId)
    )
      return next(new AppError('Danh sách bạn bè không hợp lệ', 400));
    const friendships = await Friend.find({
      status: 'accepted',
      $or: [
        { sender: userId, recipient: { $in: friendIds } },
        { recipient: userId, sender: { $in: friendIds } },
      ],
    })
      .select('sender recipient')
      .lean();
    const accepted = new Set(
      friendships.map((friend) =>
        String(friend.sender) === userId ? String(friend.recipient) : String(friend.sender)
      )
    );
    res.json({ valid: friendIds.every((id) => accepted.has(id.toLowerCase())) });
  })
);
app.get(
  '/internal/projections',
  catchAsync(async (req, res) => {
    const users = await User.find()
      .select('_id first_name last_name username photo cover gender confirmed verified')
      .lean();
    const follows = await Follow.find().select('_id sender recipient').lean();
    res.json({ users, follows });
  })
);
app.post(
  '/internal/auth/verify',
  catchAsync(async (req, res, next) => {
    let decoded;
    try {
      decoded = jwt.verify(req.body.token, process.env.JWT_SECRET);
    } catch {
      return next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401));
    }
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user || user.changedPasswordAfter(decoded.iat))
      return next(new AppError('Vui lòng đăng nhập lại', 401));
    res.json({ user: { ...user.toObject(), id: user.id } });
  })
);
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/friends', require('./routes/friendsRoutes'));

start(app, { name: 'accounts', port: Number(process.env.PORT || 8001) }).catch((err) => {
  console.error(err);
  process.exit(1);
});
