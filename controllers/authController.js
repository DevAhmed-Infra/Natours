const { validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

const User = require("../models/userModel");
const AppError = require("../utils/appError");
const httpStatus = require("../utils/httpStatus");

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

module.exports = {
  register,
  login,
};
