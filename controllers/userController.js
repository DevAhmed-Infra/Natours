const asyncHandler = require("express-async-handler");
const crypto = require("node:crypto");
const multer = require("multer");
const sharp = require("sharp");

const httpStatus = require("../utils/httpStatus");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const filterObj = require("../utils/filterObj");
const factory = require("./factory");

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users");
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split("/")[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(AppError.create("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
const uploadUserPhoto = upload.single("photo");

const resizeUserPhoto = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

const updateMe = asyncHandler(async (req, res, next) => {
  console.log("[updateMe] ===== REQUEST START =====");
  console.log("[updateMe] req.file:", req.file);
  console.log("[updateMe] req.body:", req.body);

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
  if (req.file) filteredBody.photo = req.file.filename;

  // 4️ Mutate document explicitly
  Object.keys(filteredBody).forEach((key) => {
    user[key] = filteredBody[key];
  });

  // 5️ Clear passwordConfirm so it doesn't trigger validation
  user.passwordConfirm = undefined;

  // 6️ Save (runs validators & hooks)
  await user.save({ validateBeforeSave: false });

  console.log("[updateMe] User photo after save:", user.photo);
  console.log("[updateMe] ===== REQUEST END =====");

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      user: user,
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
      400,
    );
    return next(error);
  }

  // 3️ Validate role is allowed
  const allowedRoles = ["user", "guide", "admin"];
  if (!allowedRoles.includes(role)) {
    const error = AppError.create(
      `Role must be one of: ${allowedRoles.join(", ")}`,
      400,
    );
    return next(error);
  }

  // 4️ Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = AppError.create(
      "Email already in use. Please use another.",
      400,
    );
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
  createUserByAdmin,
  uploadUserPhoto,
  resizeUserPhoto,
};
