const httpStatus = require('../utils/httpStatus')

const globalErrorHandler = (err, req, res, next) => {


  err.statusCode = err.statusCode || 500;
  err.status = err.status || httpStatus.ERROR;

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

module.exports = globalErrorHandler;
