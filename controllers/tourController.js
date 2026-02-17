const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");

const Tour = require("../models/tourModel");
const httpStatus = require("../utils/httpStatus");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");

const aliasTopTours = (req, res, next) => {
  req.aliasLimit = 5;
  req.aliasSort = "-ratingsAverage,price";
  req.aliasFields = "name,price,ratingsAverage,summary,difficulty";
  next();
};

// const getAllTours = asyncHandler(async (req, res) => {
//   const queryObj = { ...req.query };

//   // filtering
//   const excludedFields = ["sort", "page", "limit", "fields"];
//   excludedFields.forEach((field) => delete queryObj[field]);

//   // Advanced filreting
//   const mongoQuery = {};

//   Object.keys(queryObj).forEach((key) => {
//     const operatorMatch = key.match(/(.+)\[(gte|gt|lte|lt)\]/);
//     if (operatorMatch) {
//       const field = operatorMatch[1];
//       const operator = operatorMatch[2];
//       mongoQuery[field] = { [`$${operator}`]: Number(queryObj[key]) };
//     } else {
//       mongoQuery[key] = queryObj[key];
//     }
//   });

//   let query = Tour.find(mongoQuery);

//   // sorting
//   // Use alias sort from middleware if available, otherwise use req.query.sort
//   const sortValue = req.aliasSort || req.query.sort;
//   if (sortValue) {
//     const sortBy = sortValue.split(",").join(" ");
//     console.log(sortBy);
//     query = query.sort(sortBy);
//   } else {
//     query = query.sort("-createdAt");
//   }

//   // field limiting
//   const fieldsValue = req.aliasFields || req.query.fields;
//   if (fieldsValue) {
//     const fields = fieldsValue.split(",").join(" ");
//     query = query.select(fields);
//   } else {
//     query = query.select("-__v");
//   }

//   // pagination
//   const page = req.query.page * 1 || 1;
//   const limit = req.aliasLimit || (req.query.limit ? req.query.limit * 1 : 100);
//   const skip = (page - 1) * limit;

//   query = query.skip(skip).limit(limit);

//   const tours = await query;

//   res.status(200).json({
//     status: httpStatus.SUCCESS,
//     results: tours.length,
//     data: { tours },
//   });
// });

const getAllTours = asyncHandler(async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query, {
    limit: req.aliasLimit,
    sort: req.aliasSort,
    fields: req.aliasFields,
  })
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tours = await features.query;

  if (tours.length === 0) {
    const error = AppError.create("There are no tours", 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatus.SUCCESS,
    results: tours.length,
    data: { tours },
  });
});

const getTour = asyncHandler(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews')

  if (!tour) {
    const error = AppError.create("No tour found with that ID", 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      tour: tour,
    },
  });
});

const createTour = asyncHandler(async (req, res, next) => {
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

  const newTour = await Tour.create({
    name: req.body.name,
    duration: req.body.duration,
    maxGroupSize: req.body.maxGroupSize,
    difficulty: req.body.difficulty,
    price: req.body.price,
    priceDiscount: req.body.priceDiscount,
    summary: req.body.summary,
    description: req.body.description,
    imageCover: req.body.imageCover,
    images: req.body.images,
    startDates: req.body.startDates,
    guides: req.body.guides,
  });

  res.status(201).json({
    status: httpStatus.SUCCESS,
    data: {
      tour: newTour,
    },
  });
});

const updateTour = asyncHandler(async (req, res, next) => {
  const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedTour) {
    const error = AppError.create("No tour found with that ID", 404);
    return next(error);
  }

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      tour: updatedTour,
    },
  });
});

const deleteTour = asyncHandler(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    const error = AppError.create("No tour found with that ID", 404);
    return next(error);
  }

  res.status(204).json({
    status: httpStatus.SUCCESS,
    data: null,
  });
});

const getTourStats = asyncHandler(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      stats,
    },
  });
});

const getMonthlyPlan = asyncHandler(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates",
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" },
      },
    },
    {
      $addFields: { month: "$_id" },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      plan,
    },
  });
});

module.exports = {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
};
