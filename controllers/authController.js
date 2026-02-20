const { validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const AppError = require("../utils/appError");
const httpStatus = require("../utils/httpStatus");
const sendEmail = require("../utils/sendEmail");
const cookieOptions = require("../utils/cookieOptions");

const register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = AppError.create(
      errors
        .array()
        .map((err) => err.msg)
        .join(", "),
      400,
    );
    return next(error);
  }

  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  const token = user.createJWT();

  user.password = undefined;

  res.cookie("jwt", token, cookieOptions);

  return res.status(201).json({
    status: httpStatus.SUCCESS,
    token: token,
    data: {
      newUser: user,
    },
  });
});

const login = asyncHandler(async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    const errors = AppError.create("Identifier and password are required", 400);
    return next(errors);
  }
  const user = await User.findOne({
    $or: [{ name: identifier }, { email: identifier.toLowerCase() }],
  }).select("+password");

  if (!user) {
    const errors = AppError.create("No user found", 404);
    return next(errors);
  }

  const isMatched = await user.comparePassword(password);

  if (!isMatched) {
    const errors = AppError.create("Invalid email or password", 401);
    return next(errors);
  }

  const token = await user.createJWT();

  user.password = undefined;

  res.cookie("jwt", token, cookieOptions);

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    token: token,
    data: {
      user: user,
    },
  });
});

const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

const forgotPassword = asyncHandler(async (req, res, next) => {
  // 1) Validate email is provided
  if (!req.body.email) {
    const errors = AppError.create("Please provide an email address.", 400);
    return next(errors);
  }

  // 2) Get user based on POSTed email (with lowercase for case-insensitive matching)
  const user = await User.findOne({ email: req.body.email.toLowerCase() });

  if (!user) {
    const errors = AppError.create("There is no user with email address.", 404);
    return next(errors);
  }

  // 3) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 4) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  await sendEmail({
    email: user.email,
    subject: "Your password reset token (valid for 10 min)",
    message,
  });

  res.status(200).json({
    status: httpStatus.SUCCESS,
    message: "Token sent to email!",
  });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  // 1) Get use based on token

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) check if there is no user or token is expired , if not set a new password

  if (!user) {
    const errors = AppError.create("Token has expired", 400);
    return next(errors);
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  const token = await user.createJWT();

  res.cookie("jwt", token, cookieOptions);

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    token: token,
    data: {
      user: user,
    },
  });
});

// for logged in Users
const updatePassword = asyncHandler(async (req, res, next) => {
  // get user from collection
  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    const errors = AppError.create("User not found", 400);
    return next(errors);
  }

  // check if posted current password is correct
  const isMatched = await user.comparePassword(req.body.passwordCurrent);

  if (!isMatched) {
    const errors = AppError.create("Current password is not correct", 400);
    return next(errors);
  }

  // if so update user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  const token = await user.createJWT();

  res.cookie("jwt", token, cookieOptions);

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    token: token,
  });
});

const isLoggedIn = asyncHandler(async (req, res, next) => {
  console.log('[isLoggedIn] Middleware started');
  if (req.cookies.jwt) {
    console.log('[isLoggedIn] JWT cookie found, verifying...');
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      console.log('[isLoggedIn] JWT verified successfully');

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      console.log(`[isLoggedIn] User lookup completed: ${currentUser ? currentUser.name : 'Not found'}`);
      if (!currentUser) {
        console.log('[isLoggedIn] User not found, proceeding without auth');
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        console.log('[isLoggedIn] User changed password, proceeding without auth');
        return next();
      }

      // THERE IS A LOGGED IN USER
      console.log(`[isLoggedIn] Setting res.locals.user to ${currentUser.name}`);
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      console.log('[isLoggedIn] JWT verification error:', err.message);
      return next();
    }
  }
  console.log('[isLoggedIn] No JWT cookie found, proceeding');
  next();
});

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  isLoggedIn,
  logout
};
