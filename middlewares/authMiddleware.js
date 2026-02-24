const { promisify } = require("node:util");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const AppError = require("../utils/appError");
const User = require("../models/userModel");

const verifyToken = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Get token from Authorization header (for API calls)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2) If no header token, check for cookie (for web requests)
  if (!token && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    const errors = AppError.create("No token is provided", 401);
    return next(errors);
  }

  // 3) verify that token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 4) check if user is still existed or not
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    const errors = AppError.create("User is no longer exists ", 401);
    return next(errors);
  }

  // 5) check whether user changed their password or not
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    const errors = AppError.create("User changed the password", 401);
    return next(errors);
  }

  // 6) Grant access to protected route
  req.user = currentUser;
  console.log(
    "[verifyToken] User authenticated:",
    currentUser.name,
    "Role:",
    currentUser.role,
  );
  next();
});

module.exports = verifyToken;
