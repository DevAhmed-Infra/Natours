const asyncHandler = require("express-async-handler");
const crypto = require("node:crypto");

const httpStatus = require("../utils/httpStatus");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const filterObj = require("../utils/filterObj");
const factory = require("./factory");


const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

const updateMe = asyncHandler(async (req, res, next) => {
  // 1️ Block password updates
  if (req.body.password || req.body.passwordConfirm) {
    const errors = AppError.create(
      "This route is not for password updates. Please use /updateMyPassword.",
      400,
    );
    return next(errors);
  }

  // 2️ Get current user
  const user = await User.findById(req.user.id);
  if (!user) {
    const errors = AppError.create("user not found", 404);
    return next(errors);
  }

  // 3️ Filter allowed fields
  const filteredBody = filterObj(req.body, "name", "email");

  // 4️ Mutate document explicitly
  Object.keys(filteredBody).forEach((key) => {
    user[key] = filteredBody[key];
  });

  // 5️ Clear passwordConfirm so it doesn't trigger validation
  user.passwordConfirm = undefined;

  // 6️ Save (runs validators & hooks)
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      user,
    },
  });
});

const deleteMe = asyncHandler(async (req, res, next) => {
  const id = req.user.id;
  await User.findByIdAndUpdate(id, { active: false });

  res.status(204).json({
    status: httpStatus.SUCCESS,
    data: null,
  });
});

// Admin-only: Create a new user
const createUserByAdmin = asyncHandler(async (req, res, next) => {
  // 1️ Extract required fields from request body
  const { name, email, password, role } = req.body;

  // 2️ Validate required fields
  if (!name || !email || !password || !role) {
    const error = AppError.create(
      "Please provide name, email, password, and role",
      400
    );
    return next(error);
  }

  // 3️ Validate role is allowed
  const allowedRoles = ["user", "guide", "admin"];
  if (!allowedRoles.includes(role)) {
    const error = AppError.create(
      `Role must be one of: ${allowedRoles.join(", ")}`,
      400
    );
    return next(error);
  }

  // 4️ Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = AppError.create("Email already in use. Please use another.", 400);
    return next(error);
  }

  // 5️ Create the user with auto-hashing via pre-save hook
  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    passwordConfirm: password, 
    role,
  });

  // 6️ Remove password from response
  newUser.password = undefined;

  // 7️Return success response
  res.status(201).json({
    status: httpStatus.SUCCESS,
    message: `New ${role} created successfully`,
    data: {
      user: newUser,
    },
  });
});

const getUser = factory.getOne(User);
const getAllUsers = factory.getAll(User);
const updateUser = factory.updateOne(User);
const deleteUser = factory.deleteOne(User);

module.exports = {
  getAllUsers,
  deleteMe,
  updateMe,
  getUser,
  updateUser,
  deleteUser,
  getMe,
  createUserByAdmin
};
