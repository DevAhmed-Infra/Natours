const asyncHandler = require("express-async-handler");

const Tour = require("../models/tourModel");
const httpStatus = require("../utils/httpStatus");

const getAllTours = asyncHandler(async (req, res) => {
  const queryObj = { ...req.query };

  // filtering
  const excludedFields = ["sort", "page", "limit", "fields"];
  excludedFields.forEach((field) => delete queryObj[field]);

  // Advanced filreting
  const mongoQuery = {};

  Object.keys(queryObj).forEach((key) => {
    const operatorMatch = key.match(/(.+)\[(gte|gt|lte|lt)\]/);
    if (operatorMatch) {
      const field = operatorMatch[1];
      const operator = operatorMatch[2];
      mongoQuery[field] = { [`$${operator}`]: Number(queryObj[key]) };
    } else {
      mongoQuery[key] = queryObj[key];
    }
  });

  let query = Tour.find(mongoQuery);

  // sorting

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    console.log(sortBy);
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // field limiting

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  const tours = await query;

  res.status(200).json({
    status: httpStatus.SUCCESS,
    results: tours.length,
    data: { tours },
  });
});

const getTour = asyncHandler(async (req, res) => {
  const tour = await Tour.findById(req.params.id);

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      tour: tour,
    },
  });
});

const createTour = asyncHandler(async (req, res) => {
  const newTour = await Tour.create(req.body);
  return res.status(201).json({
    status: httpStatus.SUCCESS,
    data: {
      tour: newTour,
    },
  });
});

const updateTour = asyncHandler(async (req, res) => {
  const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      tour: updatedTour,
    },
  });
});

const deleteTour = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await Tour.findByIdAndDelete(id);

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {},
  });
});

module.exports = {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
};
