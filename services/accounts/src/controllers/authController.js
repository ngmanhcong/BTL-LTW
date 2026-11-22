const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const Friend = require('../models/friendsModel');
const catchAsync = require('@ptitsocial/service-kit/catchAsync');
const AppError = require('@ptitsocial/service-kit/appError');
const Email = require('../utils/email');
const messagingStats = require('../clients/messagingClient');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = ({ user, statusCode, res, recivedRequestsCount }) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax',
  });

  user.password = undefined;
  user.verificationEmailToken = undefined;
  user.recivedRequestsCount = recivedRequestsCount;

  res.status(statusCode).json({
    status: 'success',
    data: {
      user,
      token,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const {
    first_name,
    last_name,
    username,
    email,
    password,
    passwordConfirm,
    gender,
    birth_Year,
    birth_Month,
    birth_Day,
  } = req.body;

  const newUser = await User.create({
    first_name,
    last_name,
    username,
    email,
    password,
    passwordConfirm,
    gender,
    birth_Year,
    birth_Month,
    birth_Day,
  });

  const verificationEmailToken = newUser.createVerificationEmailToken();
  await newUser.save({ validateBeforeSave: false });
  const url = `${process.env.FRONTEND_URL}/activate/${verificationEmailToken}`;
  await new Email(newUser, url).sendVerificationEmail();

  createSendToken({ user: newUser, statusCode: 200, res: res });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // check if email and password exist
  if (!email || !password) return next(new AppError('Vui lòng nhập email và mật khẩu', 400));

  // check if user exist and password is correct
  const user = await User.findOne({ email }).select(
    'first_name last_name username photo verified password confirmed recivedRequestsCount unseenMessages unseenNotification'
  );

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Email hoặc mật khẩu không đúng', 401));

  const recivedRequestsCount = await Friend.countDocuments({
    recipient: user.id,
    status: 'pending',
  });

  Object.assign(user, await messagingStats(user.id));

  // is everything okay , send jwt to the client
  createSendToken({
    user: user,
    statusCode: 201,
    res: res,
    recivedRequestsCount,
  });
});

exports.ping = catchAsync(async (req, res, next) => {
  const userId = req.user.id.toString();
  const recivedRequestsCount = await Friend.countDocuments({
    recipient: userId,
    status: 'pending',
  });

  const counters = await messagingStats(userId);
  res.status(200).json({
    status: 'success',
    recivedRequestsCount,
    unseenMessages: counters.unseenMessages,
    unseenNotification: counters.unseenNotification,
    userId,
  });
});

exports.logOut = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'expired', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax',
  });
  res.status(200).json({ status: 'success' });
});

exports.activateAccount = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');

  const user = await User.findOne({
    verificationEmailToken: hashedToken,
  });

  if (!user) return next(new AppError('Liên kết không hợp lệ hoặc đã hết hạn', 400));

  if (user.id !== req.user.id)
    return next(new AppError('Mã xác nhận không hợp lệ. Vui lòng thử lại', 400));

  user.verified = true;
  user.verificationEmailToken = undefined;
  await user.save({ validateBeforeSave: false });

  createSendToken({ user: user, statusCode: 201, res: res });
});

exports.resendEmailVerification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (user.verified)
    return next(new AppError('Tài khoản đã được xác minh. Vui lòng đăng nhập lại.', 400));

  const verificationEmailToken = user.createVerificationEmailToken();
  await user.save({ validateBeforeSave: false });
  const url = `${process.env.FRONTEND_URL}/activate/${verificationEmailToken}`;

  await new Email(user, url).sendVerificationEmail();
  res.status(200).json({ status: 'success' });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) check if token exist
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('Vui lòng đăng nhập để tiếp tục', 401));

  // 2) verifcation token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) check if user still exist
  const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
  if (!currentUser) return next(new AppError('Phiên đăng nhập không còn tồn tại', 401));

  // 4) if user change password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(new AppError('Mật khẩu đã thay đổi. Vui lòng đăng nhập lại', 401));

  // GRANT ACCESS
  req.user = currentUser;
  next();
});

exports.requireVerified = (req, res, next) => {
  if (!req.user.verified) {
    return next(new AppError('Vui lòng xác minh email trước khi sử dụng PTITSocial', 403));
  }
  next();
};

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      req.user = currentUser;

      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.findUser = catchAsync(async (req, res, next) => {
  const { email } = req.query;

  // check if email and password exist
  if (!email) return next(new AppError('Vui lòng nhập email', 400));

  // check if user exist and password is correct
  const user = await User.findOne({ email });

  if (!user) return next(new AppError('Không tìm thấy tài khoản. Vui lòng thử lại', 401));

  // is everything okay , send jwt to the client
  res.status(200).json({
    status: 'success',
    data: {
      email: user.email,
      photo: user.photo,
      first_name: user.first_name,
    },
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('Không tìm thấy tài khoản với email này', 404));

  const resetCode = user.createPasswordResetCode();
  await user.save({ validateBeforeSave: false });

  // const resetURL = `${req.protocol}://${req.get(
  //   'host'
  // )}/api/v1/users/resetPassword/${resetCode}`;

  try {
    await new Email(user, resetCode).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Đã gửi mã xác nhận qua email',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(error);

    return next(new AppError('Không thể gửi email. Vui lòng thử lại sau! ', 500));
  }
});

exports.validateResetCode = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  // check if email and password exist
  if (!email || !code) return next(new AppError('Vui lòng nhập email và mã khôi phục', 400));

  // check if user exist and password is correct
  const user = await User.findOne({
    email,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  }).select('passwordResetToken');

  if (!user)
    return next(new AppError('Không tìm thấy tài khoản hoặc mã đã hết hạn. Vui lòng thử lại', 401));

  const hashedCode = crypto.createHash('sha256').update(code.toString()).digest('hex');

  if (user.passwordResetToken !== hashedCode)
    return next(new AppError('Mã xác nhận không đúng. Vui lòng thử lại.', 401));

  // create token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // is everything okay , send jwt to the client
  res.status(200).json({
    status: 'success',
    data: {
      token: resetToken,
    },
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, email, password, passwordConfirm } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    email,
    passwordResetToken: hashedToken,
    passwordResetExpires: {
      $gt: Date.now(),
    },
  });

  if (!user) return next(new AppError('Mã xác nhận không hợp lệ hoặc đã hết hạn', 400));

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken({ user: user, statusCode: 201, res: res });
});
