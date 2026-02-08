const { validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

const httpStatus = require("../utils/httpStatus");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const User = require("../models/userModel");
const filterObj = require('../utils/filterObj')




const getAllUsers = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

    const users = await features.query;

    if(!users){
      const errors = AppError.create('No users found' , 404);
      next(errors);
    }

    return res.status(200).json({
      status : httpStatus.SUCCESS,
      userNumber : users.length,
      data : {
        users : users
      }
    })
});


const updateMe = asyncHandler(async (req, res, next) => {
  // 1️⃣ Block password updates
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2️⃣ Get current user
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // 3️⃣ Filter allowed fields
  const filteredBody = filterObj(req.body, 'name', 'email');

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
      user
    }
  });
});

const deleteMe = asyncHandler(async (req, res, next) => {
  const id = req.user.id;
  await User.findByIdAndUpdate(id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});


module.exports = {
  getAllUsers,
  deleteMe,
  updateMe,
}



