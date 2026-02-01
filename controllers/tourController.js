const asyncHandler = require("express-async-handler");

const Tour = require("../models/tourModel");
const httpStatus = require("../utils/httpStatus");

const getAllTours = asyncHandler(async (req, res) => {

  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  const tours = await Tour.find(queryObj);

  return res.status(200).json({
    status: httpStatus.SUCCESS,
    data: {
      tours: tours,
    },
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
