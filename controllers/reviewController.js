const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");


const Review = require("../models/reviewModel");
const APIFeatures = require("../utils/apiFeatures");
const httpStatus = require("../utils/httpStatus");
const AppError = require("../utils/appError");

const getAllReviews = asyncHandler(async (req, res, next) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };

  const features = new APIFeatures(Review.find(filter), req.query, {
    limit: req.aliasLimit,
    sort: req.aliasSort,
    fields: req.aliasFields,
  })
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const reviews = await features.query;

  if (reviews.length === 0) {
    const error = AppError.create("There are no reviews", 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatus.SUCCESS,
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

const createReview = asyncHandler(async (req, res, next) => {
  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   const error = AppError.create(
  //     errors
  //       .array()
  //       .map((err) => err.msg)
  //       .join(", "),
  //     400,
  //   );
  //   return next(error);
  // }

  if(!req.body.tour) req.body.tour = req.params.tourId;
  if(!req.body.user) req.body.user = req.user._id;

  const newReview = await Review.create({
    review: req.body.review,
    rating: req.body.rating,
    tour: req.body.tour,
    user: req.body.user,
  });

  res.status(201).json({
    status: httpStatus.SUCCESS,
    data: {
      newReview,
    },
  });
});

const updateReview = asyncHandler(async (req,res,next) => {
    const updatedReview = await Review.findByIdAndUpdate(req.params.id ,req.body , {
        new : true ,
        runValidators : true
    });

    if(!updatedReview){
        const errors = AppError.create('No review with this id' , 404);
        return next(errors);
    }
    res.status(200).json({
        status : httpStatus.SUCCESS,
        data : {
            updatedReview
        }
    })
})

module.exports = {
  getAllReviews,
  createReview,
  updateReview
};
