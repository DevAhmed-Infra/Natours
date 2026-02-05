const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const httpStatus = require("../utils/httpStatus");

const verifyToken = (req, res, next) => {
  const authHeader =
    req.headers["Authorization"] || req.headers["authorization"];

  if (!authHeader) {
    const errors = AppError.create("unauthorized user", 401);
    next(errors);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const errors = AppError.create(err.message, 401);
    return next(errors);
  }
};

module.exports = verifyToken;