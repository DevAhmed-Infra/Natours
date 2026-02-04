const httpStatus = require('../utils/httpStatus');
const AppError = require('../utils/appError');

// ============================================
// ERROR HANDLER: MongoDB Duplicate Key Error
// ============================================
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  const message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" already exists. Please use another value!`;
  return AppError.create(message, 400);
};

// ============================================
// ERROR HANDLER: Mongoose Validation Error
// ============================================
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return AppError.create(message, 400);
};

// ============================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================
const globalErrorHandler = (err, req, res, next) => {
  // Set default status code
  err.statusCode = err.statusCode || 500;

  // Handle MongoDB E11000 duplicate key error
  if (err.code === 11000) {
    err = handleDuplicateKeyError(err);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    err = handleValidationError(err);
  }

  // Set status text based on status code or use provided status
  if (err.statusText) {
    err.status = err.statusText;
  } else if (err.status) {
    err.status = err.status;
  } else {
    err.status = `${err.statusCode}`.startsWith('4') 
      ? httpStatus.FAIL 
      : httpStatus.ERROR;
  }

  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = globalErrorHandler;
