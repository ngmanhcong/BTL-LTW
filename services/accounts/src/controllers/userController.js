const { request } = require('@ptitsocial/service-kit/http');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Friend = require('../models/friendsModel');

const Follow = require('../models/followModel');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const { uploadImage } = require('../clients/mediaClient');
const multer = require('multer');
const sharp = require('sharp');
const getRelationship = require('../utils/getRelationship');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Vui lòng chọn tệp ảnh', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const path = `${process.env.APP_NAME}/users/${req.user.id}/public/profile_photos/`;

  const processedImage = await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('webp')
    .webp({ quality: 90 })
    .toBuffer();

  const filePath = await uploadImage(processedImage, path);

  req.body.photo = filePath.url;

  next();
});

exports.resizeUserCover = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const path = `${process.env.APP_NAME}/users/${req.user.id}/public/profile_covers/`;

  const processedImage = await sharp(req.file.buffer)
    .toFormat('webp')
    .webp({ quality: 90 })
    .toBuffer();

  const filePath = await uploadImage(processedImage, path);

  req.body.cover = filePath.url;

  next();
});

const filterObj = (obj, ...allowed) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowed.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getProfile = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({ username }).select('-search -savedPosts -email');

  if (!user) {
    return next(new AppError('Không tìm thấy tài khoản này', 404));
  }

  const profileID = user.id;
  const userID = req.user.id;

  const friendship = await getRelationship(userID, profileID);

  const friends = await Friend.find({
    $or: [{ sender: profileID }, { recipient: profileID }],
    status: 'accepted',
  })
    .sort({ createdAt: -1 })
    .limit(9)
    .populate({
      path: 'sender recipient',
      select: 'first_name last_name photo username gender cover confirmed',
    });

  // Map the friend documents to an array of user documents
  const users = friends.map((friend) => {
    if (friend.sender._id.equals(profileID)) {
      return friend.recipient;
    } else {
      return friend.sender;
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
      friendship,
      friends: users,
    },
  });
});

exports.updatePhoto = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('Không thể đổi mật khẩu tại đây', 400));

  const userId = req.user.id;

  const filteredBody = filterObj(req.body, 'photo', 'text');

  await User.findByIdAndUpdate(userId, filteredBody, {
    new: true,
    runValidators: true,
  });

  await request('content', '/internal/profile-posts', {
    method: 'POST',
    body: {
      user: userId,
      type: 'profilePhoto',
      text: filteredBody.text,
      images: [filteredBody.photo],
    },
  });

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: {
      url: filteredBody.photo,
    },
  });
});

exports.updateCover = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('Không thể đổi mật khẩu tại đây', 400));

  const userId = req.user.id;

  const filteredBody = filterObj(req.body, 'cover');

  await User.findByIdAndUpdate(userId, filteredBody, {
    new: true,
    runValidators: true,
  });

  await request('content', '/internal/profile-posts', {
    method: 'POST',
    body: {
      user: userId,
      type: 'cover',
      images: [filteredBody.cover],
    },
  });

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: {
      url: filteredBody.cover,
    },
  });
});

exports.updateDetails = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const filteredBody = filterObj(req.body, 'infos');

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      details: filteredBody.infos,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: {
      details: updated.details,
    },
  });
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const { term } = req.body;
  const userId = req.user.id;

  if (typeof term !== 'string' || !term.trim())
    return next(new AppError('Vui lòng nhập nội dung tìm kiếm', 400));

  const searchTerm = term.trim().replace(/\s+/g, ' ');
  if (searchTerm.length > 100) return next(new AppError('Nội dung tìm kiếm quá dài', 400));
  const pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const results = await User.aggregate([
    {
      $match: {
        $or: [
          { first_name: { $regex: pattern, $options: 'i' } },
          { last_name: { $regex: pattern, $options: 'i' } },
          { email: { $regex: pattern, $options: 'i' } },
          { username: { $regex: pattern, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$first_name', ' ', '$last_name'] },
                regex: pattern,
                options: 'i',
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        first_name: 1,
        last_name: 1,
        photo: 1,
        username: 1,
      },
    },
  ]);

  const filteredResults = results.filter((x) => x._id.toString() !== userId);

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: {
      results: filteredResults,
    },
  });
});

exports.addToSearchHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { searchUser } = req.body;

  if (!searchUser) return next(new AppError('Vui lòng chọn người dùng', 400));

  const user = await User.findById(userId);
  const check = user.search.find((x) => x.user.toString() === searchUser);

  if (check) {
    await User.updateOne(
      {
        _id: userId,
        'search._id': check._id,
      },
      {
        $set: { 'search.$.createdAt': new Date() },
      }
    );
  } else {
    await User.findByIdAndUpdate(userId, {
      $push: {
        search: { user: searchUser },
      },
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Đã thêm vào lịch sử tìm kiếm',
  });
});

exports.removeFromSearch = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { searchUser } = req.body;

  if (!searchUser) return next(new AppError('Vui lòng chọn người dùng', 400));

  const user = await User.findById(userId);
  const check = user.search.find((x) => x.user.toString() === searchUser);

  if (check) {
    await User.updateOne(
      {
        _id: userId,
      },
      { $pull: { search: { user: searchUser } } }
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Đã xóa khỏi lịch sử tìm kiếm',
  });
});

exports.getSearchHistory = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const searchHistory = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $unwind: '$search',
    },
    {
      $group: {
        _id: '$search.user',
        createdAt: { $last: '$search.createdAt' },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $replaceRoot: {
        newRoot: { _id: '$_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $project: {
        'user.first_name': 1,
        'user.last_name': 1,
        'user.photo': 1,
        'user.username': 1,
      },
    },
    {
      $unwind: '$user',
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      results: searchHistory,
    },
  });
});

exports.addFCM = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { fcmToken } = req.body;

  if (!fcmToken) return next(new AppError('Thiếu thông tin đăng ký thông báo', 400));

  await User.updateOne(
    {
      _id: userId,
    },
    {
      fcmToken,
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'Đã bật thông báo',
    fcmToken,
  });
});
