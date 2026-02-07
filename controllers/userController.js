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
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }


  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
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



