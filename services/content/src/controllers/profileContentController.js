const { visibilityFilter } = require('../utils/postAccess');
const User = require('../models/userModel');
const Reaction = require('../models/reactionModel');

const Post = require('../models/postModel');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const APIFeatures = require('@ptitsocial/service-kit/apiFeatures');
const { getImages, uploadImage } = require('../storage/mediaStorage');

exports.getPhotos = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) {
    return next(new AppError('Không tìm thấy tài khoản này', 404));
  }

  const path = `${process.env.APP_NAME}/users/${user.id}/public/*`;
  const photos = await getImages(path, 100, 'desc');
  const resources = photos.resources.map((photo) => {
    return { url: photo.secure_url, id: photo.asset_id };
  });
  const profilePhotos = photos.resources
    .filter(
      (photo) => photo.folder === `${process.env.APP_NAME}/users/${user.id}/public/profile_photos`
    )
    .map((photo) => {
      return { url: photo.secure_url, id: photo.asset_id };
    });

  const profileCovers = photos.resources
    .filter(
      (photo) => photo.folder === `${process.env.APP_NAME}/users/${user.id}/public/profile_covers`
    )
    .map((photo) => {
      return { url: photo.secure_url, id: photo.asset_id };
    });

  res.status(200).json({
    status: 'success',
    data: {
      total_count: photos.total_count,
      resources,
      profilePhotos,
      profileCovers,
    },
  });
});

exports.getUserPosts = catchAsync(async (req, res, next) => {
  const { username } = req.params;
  const userID = req.user.id;

  const user = await User.findOne({ username });
  if (!user) {
    return next(new AppError('Không tìm thấy tài khoản này', 404));
  }

  let filter = { user: user.id };
  const features = new APIFeatures(Post.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // const doc = await features.query.explain();
  features.query.and([visibilityFilter(userID, req.friendIds)]);
  const posts = await features.query;
  const ids = posts.map((el) => el._id.toString());

  const reactions = await Reaction.find({
    user: userID,
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
