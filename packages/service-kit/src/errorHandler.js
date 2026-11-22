const AppError = require('./appError');

const handleCastErrorDB = (err) => {
  const message = 'Thông tin định danh không hợp lệ.';
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = Object.values(err.keyValue || {}).join(', ');

  const message = `Thông tin đã được sử dụng: ${value}. Vui lòng chọn thông tin khác!`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Dữ liệu không hợp lệ. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJwtError = () =>
  new AppError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại', 401);

const handleJwtExpiredError = () =>
  new AppError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại', 401);

const handleMulterError = () =>
  new AppError('Không thể tải ảnh lên. Chỉ được chọn tối đa 5 ảnh', 401);

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  return res.status(err.statusCode).render('error', {
    title: 'Đã có lỗi xảy ra',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      // Programming or other unknown error: don't leak error details
    }
    // 1) Log error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Đã có lỗi xảy ra. Vui lòng thử lại!',
    });
  }

  ////////

  if (err.isOperational) {
    res.status(err.statusCode).render('error', {
      title: 'Đã có lỗi xảy ra',
      msg: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    res.status(err.statusCode).render('error', {
      title: 'Vui lòng thử lại sau',
      msg: err.message,
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.name === 'CastError') err = handleCastErrorDB(err);
  if (err.code === 11000) err = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') err = handleValidationErrorDB(err);
  if (process.env.NODE_ENV !== 'production') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.assign(err);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJwtError();
    if (error.name === 'TokenExpiredError') error = handleJwtExpiredError();
    if (error.name === 'MulterError') error = handleMulterError();
    sendErrorProd(error, req, res);
  }
};
