const asyncHandler = require("express-async-handler");

const Tour = require("../models/tourModel");
const httpStatus = require("../utils/httpStatus");
const AppError = require("../utils/appError");
const factory = require("./factory");

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

const getAllTours = factory.getAll(Tour);

const getTour = factory.getOne(Tour, { path: "reviews" });

const createTour = factory.createOne(Tour);

const updateTour = factory.updateOne(Tour);

const deleteTour = factory.deleteOne(Tour);

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

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
const getToursWithin = asyncHandler(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    const errors = AppError.create(
      "Please provide latitutr and longitude in the format lat,lng.",
      400,
    );
    return next(errors);
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: httpStatus.SUCCESS,
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

const getDistances = asyncHandler(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    const errors = AppError.create(
      "Please provide latitutr and longitude in the format lat,lng.",
      400,
    );
    return next(errors);
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      data: distances,
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
  getDistances,
  getToursWithin,
};
