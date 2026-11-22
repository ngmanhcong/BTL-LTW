const mongoose = require('mongoose');
const { visibilityFilter, assertView, parseAudience } = require('../utils/postAccess');
const multer = require('multer');
const sharp = require('sharp');
const Post = require('../models/postModel');
const Follow = require('../models/followModel');
const Reaction = require('../models/reactionModel');
const User = require('../models/userModel');
const Comment = require('../models/commentModel');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const APIFeatures = require('@ptitsocial/service-kit/apiFeatures');
const { uploadImage } = require('../storage/mediaStorage');
const Notification = require('@ptitsocial/service-kit/notificationClient');
const { request } = require('@ptitsocial/service-kit/http');

exports.prepareAudience = catchAsync(async (req, res, next) => {
  req.postAudience = parseAudience(req.body, req.user.id);
  if (req.postAudience.audience === 'selected') {
    const { valid } = await request('accounts', '/internal/friends/validate', {
      method: 'POST',
      body: { userId: req.user.id, friendIds: req.postAudience.allowedViewers },
    });
    if (!valid) throw new AppError('Chỉ có thể chọn những người đã kết bạn', 400);
  }
  req.newPostId = new mongoose.Types.ObjectId();
  if (req.body.type === 'share') {
    const original = assertView(await Post.findById(req.body.sharedID), req.user.id, req.friendIds);
    if ((original.audience && original.audience !== 'public') || original.type === 'share')
      throw new AppError('Không thể chia sẻ lại bài viết giới hạn người xem', 403);
  }
  next();
});

exports.checkAccess = catchAsync(async (req, res, next) => {
  let postId = req.params.postID;
  if (req.params.commentID) {
    const comment = await Comment.findById(req.params.commentID);
    if (!comment) throw new AppError('Không tìm thấy bình luận', 404);
    postId = comment.post;
  }
  req.accessPost = assertView(await Post.findById(postId), req.user.id, req.friendIds);
  next();
});

const filterObj = (obj, ...allowed) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowed.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Vui lòng chọn tệp ảnh', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadPostImages = upload.fields([{ name: 'images', maxCount: 5 }]);

exports.resizePostImages = catchAsync(async (req, res, next) => {
  if (
    !req.files ||
    !req.files.images ||
    req.files.images?.length < 1 ||
    req.files.images === undefined
  ) {
    req.body.images = [];
    return next();
  }

  if (req.files.images.length > 5) return next(new AppError('Chỉ được tải lên tối đa 5 ảnh', 400));

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const restricted = req.postAudience.audience !== 'public';
      const path = restricted
        ? `restricted/posts/${req.newPostId}/`
        : `${process.env.APP_NAME}/users/${req.user.id}/public/posts/`;

      const processedImage = await sharp(file.buffer)
        .toFormat('webp')
        .webp({ quality: 70 })
        .toBuffer();

      const filePath = await (restricted ? require('../storage/localMedia').upload : uploadImage)(
        processedImage,
        path
      );

      req.body.images.push(filePath.url);
    })
  );

  next();
});

exports.uploadCommentPhoto = upload.single('photo');

exports.resizeCommentPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const restricted = req.accessPost?.audience && req.accessPost.audience !== 'public';
  const path = restricted
    ? `restricted/posts/${req.accessPost.id}/comments/`
    : `${process.env.APP_NAME}/users/${req.user.id}/sec/comments/`;

  const processedImage = await sharp(req.file.buffer)
    .toFormat('webp')
    .webp({ quality: 30 })
    .toBuffer();

  const filePath = await (restricted ? require('../storage/localMedia').upload : uploadImage)(
    processedImage,
    path
  );

  req.body.photo = filePath.url;

  next();
});

exports.createPost = catchAsync(async (req, res, next) => {
  const { type, text, images, background, sharedID } = req.body;

  const user = req.user.id;
  const newPost = await Post.create({
    _id: req.newPostId,
    ...req.postAudience,
    user,
    type,
    text,
    images,
    background,
    sharedID: type === 'share' ? sharedID : undefined,
  });

  await newPost.save();
  if (type === 'share')
    await newPost.populate({
      path: 'sharedID',
      select: 'images user type text background sharesCount',
    });

  res.status(200).json({
    status: 'success',
    data: newPost,
  });
});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const user = req.user.id;
  // const posts = await Post.find().sort({ createdAt: -1 });
  const following = await Follow.find({ sender: user });
  const followingIds = following.map((el) => el.recipient.toString());

  let filter = {
    $or: [
      { user: { $in: [...followingIds, user] } },
      { audience: 'selected', allowedViewers: user },
      { audience: 'friends', user: { $in: req.friendIds } },
    ],
  };
  const features = new APIFeatures(Post.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // const doc = await features.query.explain();
  features.query.and([visibilityFilter(user, req.friendIds)]);
  const posts = await features.query;
  const ids = posts.map((el) => el._id);

  const reactions = await Reaction.find({
    user: user,
    post: { $in: ids },
  });
  const reactionsIds = reactions.map((el) => el.post.toString());

  const postsReactions = posts.map((post) => {
    post.reactions.isLiked = reactionsIds.includes(post._id.toString())
      ? reactions.find((o) => o.post.toString() === post._id.toString()).type
      : '';

    return post;
  });

  // console.log(reactions);
  res.status(200).json({
    status: 'success',
    length: posts.length,
    data: postsReactions,
  });
});

exports.getPost = catchAsync(async (req, res, next) => {
  const post = req.params.postID;
  const user = req.user.id;

  const checkPost = await Post.findById(post);
  if (!checkPost) return next(new AppError('Không tìm thấy bài viết', 404));

  const reaction = await Reaction.findOne({
    user: user,
    post: post,
  });

  checkPost.reactions.isLiked =
    reaction?.post.toString() === checkPost._id.toString() ? reaction?.type : '';

  // Send reponse
  res.status(200).json({
    status: 'success',
    data: { post: checkPost },
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = req.params.postID;
  const user = req.user.id;

  const checkPost = await Post.findById(post);
  if (!checkPost) return next(new AppError('Không tìm thấy bài viết', 404));

  if (checkPost.user.id !== user) return next(new AppError('Bạn không phải tác giả bài viết', 404));

  checkPost.deleted = true;
  await checkPost.save();

  // Send reponse
  res.status(200).json({
    status: 'success',
  });
});

exports.addReact = catchAsync(async (req, res, next) => {
  const { type } = req.body;
  const post = req.params.postID;
  const user = req.user.id;

  if (!post || !type) return next(new AppError('Vui lòng chọn bài viết và loại tương tác', 400));

  const checkPost = await Post.findById(post);
  if (!checkPost) return next(new AppError('Không tìm thấy bài viết', 400));

  const checkReact = await Reaction.findOne({
    post: post,
    user: mongoose.Types.ObjectId(user),
  });

  let newReaction = null;
  let newNotification = null;

  if (!checkReact) {
    const reaction = new Reaction({
      post,
      user,
      type,
    });
    await reaction.save();
    newReaction = reaction.reactionStats;

    const recipient = await User.findById(checkPost.user).select('fcmToken username');

    newNotification = await new Notification({
      recipient: recipient,
      sender: req.user,
      postId: post,
      postReact: type,
    }).sendPostReact();
  } else {
    if (checkReact.type == type) {
      await checkReact.remove();
    } else {
      checkReact.type = type;
      await checkReact.save();
    }
  }

  const postReactions = checkReact?.reactionStats || newReaction;

  res.status(200).json({
    status: 'success',
    data: {
      reactions: postReactions,
      newNotification: newNotification ? newNotification : null,
    },
  });
});

exports.getReacts = catchAsync(async (req, res, next) => {
  const post = req.params.postID;
  const user = req.user.id;

  if (!post) return next(new AppError('Vui lòng chọn bài viết và loại tương tác', 400));

  const checkPost = await Post.findById(post);
  if (!checkPost) return next(new AppError('Không tìm thấy bài viết', 400));

  const reacts = await Reaction.find({ post });
  const stats = await Reaction.calcReactions(mongoose.Types.ObjectId(post));

  res.status(200).json({
    status: 'success',
    data: { reacts, stats: stats },
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const post = req.params.postID;
  const user = req.user.id;

  if (!post) return next(new AppError('Vui lòng nhập bình luận và chọn bài viết', 400));

  const checkPost = await Post.findById(post);
  if (!checkPost) return next(new AppError('Không tìm thấy bài viết', 404));

  const filteredBody = filterObj(req.body, 'photo', 'text');

  if (filteredBody.text === undefined) filteredBody.text = '';
  if (typeof filteredBody.text !== 'string')
    return next(new AppError('Nội dung bình luận phải là văn bản', 400));
  filteredBody.text = filteredBody.text.trim();
  if (filteredBody.photo !== undefined && typeof filteredBody.photo !== 'string')
    return next(new AppError('Ảnh bình luận không hợp lệ', 400));
  if (!filteredBody.text && !filteredBody.photo?.trim())
    return next(new AppError('Vui lòng nhập bình luận hoặc chọn ảnh', 400));
  if (filteredBody.text.length > 250)
    return next(new AppError('Bình luận không được quá 250 ký tự', 400));

  const commendData = await Comment.create({
    user: user,
    post,
    text: filteredBody.text,
    photo: filteredBody.photo,
  });

  const commentsCount = commendData?.commentsCount;

  const recipient = await User.findById(checkPost.user).select('fcmToken username');

  const newNotification = await new Notification({
    recipient: recipient,
    sender: req.user,
    postId: post,
    postReact: filteredBody.text.slice(0, 10),
  }).sendPostComment();

  res.status(200).json({
    status: 'success',
    data: {
      commendData,
      commentsCount,
      newNotification: newNotification ? newNotification : null,
    },
  });
});

exports.commentLike = catchAsync(async (req, res, next) => {
  const comment = req.params.commentID;
  const user = req.user.id;

  const checkComment = await Comment.findById(comment);
  if (!checkComment) return next(new AppError('Không tìm thấy bình luận', 404));

  let newNotification = null;

  if (checkComment.likes.includes(user)) {
    checkComment.likes.pull(user);
    await checkComment.save();
  } else {
    checkComment.likes.push(user);
    await checkComment.save();
    const recipient = await User.findById(checkComment.user).select('fcmToken username');

    newNotification = await new Notification({
      recipient: recipient,
      sender: req.user,
      postId: checkComment.post,
      postReact: '',
    }).sendCommentLike();
  }

  res.status(200).json({
    status: 'success',
    data: {
      likes: checkComment.likes,
      newNotification: newNotification ? newNotification : null,
    },
  });
});

exports.addCommentReply = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  const comment = req.params.commentID;
  const user = req.user.id;

  if (!comment || typeof text !== 'string' || !text.trim())
    return next(new AppError('Vui lòng nhập nội dung bình luận', 400));

  const checkComment = await Comment.findById(comment);
  if (!checkComment) return next(new AppError('Không tìm thấy bình luận', 404));

  const filteredBody = filterObj(req.body, 'photo', 'text');

  checkComment.replies.push({
    user,
    text: filteredBody.text,
    photo: filteredBody.photo,
  });
  await checkComment.save();
  await checkComment.populate({
    path: 'replies.user',
    select: 'first_name last_name photo username confirmed',
  });

  const recipient = await User.findById(checkComment.user).select('fcmToken username');

  const newNotification = await new Notification({
    recipient: recipient,
    sender: req.user,
    postId: checkComment.post,
    postReact: filteredBody.text.slice(0, 10),
  }).sendCommentComment();

  res.status(200).json({
    status: 'success',
    data: {
      replies: checkComment.replies,
      newNotification: newNotification ? newNotification : null,
    },
  });
});

exports.getComments = catchAsync(async (req, res, next) => {
  const post = req.params.postID;
  const user = req.user.id;

  if (!post) return next(new AppError('Vui lòng chọn bài viết', 400));

  const checkPost = await Post.findById(post);
  if (!checkPost) return next(new AppError('Không tìm thấy bài viết', 404));

  let filter = { post: checkPost.id };

  const features = new APIFeatures(Comment.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // const doc = await features.query.explain();
  const comments = await features.query;

  res.status(200).json({
    status: 'success',
    datalength: comments?.length,
    data: { comments },
  });
});
