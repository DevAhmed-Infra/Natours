const { validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

const httpStatus = require("../utils/httpStatus");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const User = require("../models/userModel");

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
  deleteMe
}



