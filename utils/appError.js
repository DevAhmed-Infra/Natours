const httpStatus = require("./httpStatus");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.statusText = `${statusCode}`.startsWith("4")
      ? httpStatus.FAIL
      : httpStatus.ERROR;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static create(message, statusCode) {
    return new AppError(message, statusCode);
  }
}

module.exports = AppError;
