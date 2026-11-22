const mongoose = require('mongoose');
const User = require('../models/userModel');
const Chat = require('../models/chatModel');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const APIFeatures = require('@ptitsocial/service-kit/apiFeatures');

const ObjectId = mongoose.Types.ObjectId;

exports.createChat = catchAsync(async (req, res, next) => {
  const user = req.user.id;
  const { userId } = req.body;

  if (!userId) return next(new AppError('Vui lòng chọn người dùng', 400));

  const checkUser = await User.findById(userId);
  if (!checkUser) return next(new AppError('Không tìm thấy người dùng', 400));

  const existingChat = await Chat.findOne({
    type: 'private',
    $and: [{ users: { $elemMatch: { $eq: user } } }, { users: { $elemMatch: { $eq: userId } } }],
  });

  if (existingChat)
    return res.status(200).json({
      status: 'success',
      data: { chat: existingChat },
    });

  const newChat = await Chat.create({
    chatName: 'private',
    type: 'private',
    users: [user, userId],
  });

  await newChat.save();

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { chat: newChat },
  });
});

exports.getChats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  let filter = {
    users: { $elemMatch: { $eq: req.user._id } },
  };
  const features = new APIFeatures(
    Chat.find(filter).populate({
      path: 'users groupAdmin',
      select: 'first_name last_name photo username gender confirmed',
    }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const chats = await features.query;

  const filteredChats = chats.map((obj) => {
    obj.users = obj.users.filter((user) => {
      return user._id.toString() !== userId;
    });
    if (obj.type === 'private') {
      obj.photo = obj.users[0].photo;
      obj.chatName = `${obj.users[0].first_name} ${obj.users[0].last_name}`;
    } else if (obj.type === 'group' && !obj.photo) {
      obj.photo =
        'https://res.cloudinary.com/dcu2kxr5x/image/upload/v1675105115/BACKBOOK/assets/group_fu7eoo.png';
    }
    return obj;
  });

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { chats: filteredChats },
  });
});

exports.createGroupChat = catchAsync(async (req, res, next) => {
  const user = req.user.id;
  const { users, chatName } = req.body;

  if (!users || !chatName)
    return next(new AppError('Vui lòng nhập tên nhóm và chọn thành viên', 400));

  if (users.length < 2) return next(new AppError('Vui lòng chọn ít nhất 2 thành viên', 400));

  users.push(user);

  const newGroupChat = await Chat.create({
    chatName,
    type: 'group',
    users,
    groupAdmin: user,
    photo:
      'https://res.cloudinary.com/dcu2kxr5x/image/upload/v1675105115/BACKBOOK/assets/group_fu7eoo.png',
  });

  await newGroupChat.save();

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { chat: newGroupChat },
  });
});

exports.renameGroupChat = catchAsync(async (req, res, next) => {
  const user = req.user.id;
  const { chatName, chatId } = req.body;

  if (!chatId || !chatName) return next(new AppError('Vui lòng chọn nhóm và nhập tên nhóm', 400));

  const existingeGroupChat = await Chat.findById(chatId);
  if (!existingeGroupChat) return next(new AppError('Không tìm thấy cuộc trò chuyện', 400));

  if (existingeGroupChat.groupAdmin._id.toString() !== user)
    return next(new AppError('Bạn không phải quản trị viên nhóm', 400));

  if (existingeGroupChat.chatName === chatName.trim())
    return next(new AppError('Tên mới trùng tên hiện tại. Vui lòng chọn tên khác', 400));

  existingeGroupChat.chatName = chatName;
  await existingeGroupChat.save();

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { chatName: existingeGroupChat.chatName, user: req.user.id },
  });
});

exports.addToGroupChat = catchAsync(async (req, res, next) => {
  const user = req.user.id;
  const { userId, chatId } = req.body;

  if (!chatId || !userId)
    return next(new AppError('Vui lòng chọn cuộc trò chuyện và người dùng', 400));

  const existingeGroupChat = await Chat.findById(chatId);
  if (!existingeGroupChat) return next(new AppError('Không tìm thấy cuộc trò chuyện', 400));

  if (existingeGroupChat.groupAdmin._id.toString() !== user)
    return next(new AppError('Bạn không phải quản trị viên nhóm', 400));

  const targetId = new ObjectId(userId);
  if (existingeGroupChat.users.some((id) => id.equals(targetId)))
    return next(new AppError('Người dùng này đã ở trong nhóm', 400));

  const newGroupChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  );

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { user: newGroupChat.users[newGroupChat.users.length - 1] },
  });
});

exports.removeFromGroupChat = catchAsync(async (req, res, next) => {
  const user = req.user.id;
  const { userId, chatId } = req.body;

  if (!chatId || !userId)
    return next(new AppError('Vui lòng chọn cuộc trò chuyện và người dùng', 400));

  const existingeGroupChat = await Chat.findById(chatId);
  if (!existingeGroupChat) return next(new AppError('Không tìm thấy cuộc trò chuyện', 400));

  if (existingeGroupChat.groupAdmin._id.toString() !== user)
    return next(new AppError('Bạn không phải quản trị viên nhóm', 400));

  const targetId = new ObjectId(userId);
  if (!existingeGroupChat.users.some((id) => id.equals(targetId)))
    return next(new AppError('Người dùng này không thuộc nhóm', 400));

  const deletedUser = existingeGroupChat.users.find((id) => id.equals(targetId));

  await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  );

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { user: userId, deletedUser },
  });
});

exports.changeTheme = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { theme } = req.body;
  const { chatId } = req.params;

  if (!theme || theme < 1 || theme > 39)
    return next(new AppError('Vui lòng chọn một chủ đề hợp lệ', 400));

  const existingChat = await Chat.findById(chatId);
  if (!existingChat) return next(new AppError('Không tìm thấy cuộc trò chuyện', 400));

  const targetId = new ObjectId(userId);
  if (!existingChat.users.some((id) => id.equals(targetId)))
    return next(new AppError('Bạn không thuộc cuộc trò chuyện này', 400));

  existingChat.theme = theme;
  await existingChat.save();

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: {
      theme: existingChat.theme,
      name: `${req.user.first_name} ${req.user.last_name}`,
      user: req.user.id,
    },
  });
});
