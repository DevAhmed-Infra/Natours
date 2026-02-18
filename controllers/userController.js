const asyncHandler = require("express-async-handler");

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
  // 1️⃣ Block password updates
  if (req.body.password || req.body.passwordConfirm) {
    const errors = AppError.create(
      "This route is not for password updates. Please use /updateMyPassword.",
      400,
    );
    return next(errors);
  }

  // 2️⃣ Get current user
  const user = await User.findById(req.user.id);
  if (!user) {
    const errors = AppError.create("user not found", 404);
    return next(errors);
  }

  // 3️⃣ Filter allowed fields
  const filteredBody = filterObj(req.body, "name", "email");

  // 4️⃣ Mutate document explicitly
  Object.keys(filteredBody).forEach((key) => {
    user[key] = filteredBody[key];
  });

  // 5️⃣ Clear passwordConfirm so it doesn't trigger validation
  user.passwordConfirm = undefined;

  // 6️⃣ Save (runs validators & hooks)
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
    status: "success",
    data: null,
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
  getAllUsers,
  updateUser,
  deleteUser,
  getMe
};
