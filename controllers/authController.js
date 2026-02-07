const { validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

const User = require("../models/userModel");
const AppError = require("../utils/appError");
const httpStatus = require("../utils/httpStatus");
const sendEmail = require("../utils/sendEmail");

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

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    token: token,
    data: {
      user: user,
    },
  });
});

const forgotPassowrd = asyncHandler(async (req, res, next) => {
  // 1) Validate email is provided
  if (!req.body.email) {
    return next(new AppError("Please provide an email address.", 400));
  }

  // 2) Get user based on POSTed email (with lowercase for case-insensitive matching)
  const user = await User.findOne({ email: req.body.email.toLowerCase() });

  if (!user) {
    return next(new AppError("There is no user with email address.", 404));
  }

  // 3) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 4) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host",
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      AppError.create("There was an error sending the email. Try again later!", 500),
    );
  }
});

const resetPassword = (req, res, next) => {};

module.exports = {
  register,
  login,
  forgotPassowrd,
};
