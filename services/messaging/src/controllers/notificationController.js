const User = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');

const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');

exports.getNotification = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const notifications = await NotificationModel.find({
    recipient: userId,
  }).sort('-createdAt');
  const existingUser = await User.findById(userId);
  existingUser.unseenNotification = 0;
  await existingUser.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      notifications,
    },
  });
});

exports.seenNotification = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { nid } = req.params;

  console.log(nid);

  const notification = await NotificationModel.findById(nid);

  if (!notification || notification.recipient.toString() !== userId)
    return next(new AppError('Không tìm thấy thông báo', 404));

  notification.seen = 'seen';
  await notification.save();

  const existingUser = await User.findById(userId);
  existingUser.unseenNotification = 0;
  await existingUser.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      notification,
    },
  });
});
