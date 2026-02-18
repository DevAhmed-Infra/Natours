const asyncHandler = require("express-async-handler");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const httpStatus = require('../utils/httpStatus');

const deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
        const errors = AppError.create("No document found with that ID", 404);
        return next(errors)
    }

    res.status(204).json({
      status: httpStatus.SUCCESS,
      data: null,
    });
  });

const updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      const errors = AppError.create("No document found with that ID", 404);
      return next(errors);
    }

    res.status(200).json({
      status: httpStatus.SUCCESS,
      data: {
        data: doc,
      },
    });
  });

const createOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: httpStatus.SUCCESS,
      data: {
        data: doc,
      },
    });
  });

const getOne = (Model, popOptions) =>
  asyncHandler(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      const errors = AppError.create(`there is no doc`, 404);
      return next(errors);
    }

    res.status(200).json({
      status: httpStatus.SUCCESS,
      data: {
        data: doc,
      },
    });
  });

const getAll = (Model) =>
  asyncHandler(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query, {
      limit: req.aliasLimit,
      sort: req.aliasSort,
      fields: req.aliasFields,
    })
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;

    if (!doc || doc.length === 0) {
      const error = AppError.create(`there is no docs`, 404);
      return next(error);
    }

    res.status(200).json({
      status: httpStatus.SUCCESS,
      results: doc.length,
      data: { doc },
    });
  });

module.exports = {
  deleteOne,
  updateOne,
  getOne,
  getAll,
  createOne,
};
