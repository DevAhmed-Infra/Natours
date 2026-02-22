const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const AppError = require("../utils/appError");

const getOverview = asyncHandler(async (req, res, next) => {
  console.log("[getOverview] ===== REQUEST START =====");
  console.log("[getOverview] Fetching tours from database...");

  let tours = [];
  try {
    tours = await Tour.find();
    console.log(
      `[getOverview] ✓ Query success: Found ${tours ? tours.length : 0} tours`,
    );
  } catch (err) {
    console.error("[getOverview] ✗ Query failed:", err.message);
    tours = [];
  }

  console.log("[getOverview] Rendering overview template with tours data...");
  console.log(
    `[getOverview] Data being passed: { title: 'All Tours', tours: Array(${tours.length}) }`,
  );

  try {
    res.status(200).render("overview", {
      title: "All Tours",
      tours: tours || [],
    });
    console.log("[getOverview] ✓ Template rendered successfully");
  } catch (err) {
    console.error("[getOverview] ✗ Render failed:", err.message);
    return next(err);
  }

  console.log("[getOverview] ===== REQUEST END =====\n");
});

const getTour = asyncHandler(async (req, res, next) => {
  console.log(`[getTour] ===== REQUEST START (slug: ${req.params.slug}) =====`);
  console.log(`[getTour] Fetching tour with slug: ${req.params.slug}...`);

  let tour = null;
  try {
    tour = await Tour.findOne({ slug: req.params.slug }).populate({
      path: "reviews",
      fields: "review rating user",
    });
    console.log(
      `[getTour] ✓ Query success: Tour found = ${tour ? tour.name : "Not found"}`,
    );
  } catch (err) {
    console.error("[getTour] ✗ Query failed:", err.message);
    return next(AppError.create("Error fetching tour", 500));
  }

  if (!tour) {
    console.log(`[getTour] ✗ Tour not found for slug: ${req.params.slug}`);
    return next(AppError.create("There is no tour with that name.", 404));
  }

  console.log(`[getTour] Rendering tour template for: ${tour.name}`);
  console.log(`[getTour] Data: { title: '${tour.name} Tour', tour: {...} }`);

  try {
    res.status(200).render("tour", {
      title: `${tour.name} Tour`,
      tour,
    });
    console.log("[getTour] ✓ Template rendered successfully");
  } catch (err) {
    console.error("[getTour] ✗ Render failed:", err.message);
    return next(err);
  }

  console.log("[getTour] ===== REQUEST END =====\n");
});

const getLoginForm = (req, res) => {
  console.log("[getLoginForm] ===== REQUEST START =====");
  console.log("[getLoginForm] Rendering login template...");

  try {
    res.status(200).render("login", {
      title: "Log into your account",
    });
    console.log("[getLoginForm] ✓ Template rendered successfully");
  } catch (err) {
    console.error("[getLoginForm] ✗ Render failed:", err.message);
    res
      .status(500)
      .json({ status: "error", message: "Failed to render login template" });
  }

  console.log("[getLoginForm] ===== REQUEST END =====\n");
};

const getAccount = (req, res) => {
  console.log("[getAccount] ===== REQUEST START =====");
  console.log(
    `[getAccount] User logged in: ${req.user ? req.user.name : "No user"}`,
  );
  console.log("[getAccount] Rendering account template...");

  try {
    res.status(200).render("account", {
      title: "Your account",
      user: req.user || null,
    });
    console.log("[getAccount] ✓ Template rendered successfully");
  } catch (err) {
    console.error("[getAccount] ✗ Render failed:", err.message);
    res
      .status(500)
      .json({ status: "error", message: "Failed to render account template" });
  }

  console.log("[getAccount] ===== REQUEST END =====\n");
};

const updateUserData = asyncHandler(async (req, res, next) => {
  console.log("[updateUserData] ===== REQUEST START =====");
  console.log(`[updateUserData] Updating user: ${req.user.id}`);
  console.log(
    `[updateUserData] Update data: { name: '${req.body.name}', email: '${req.body.email}' }`,
  );

  let updatedUser = null;
  try {
    updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: req.body.name,
        email: req.body.email,
      },
      {
        new: true,
        runValidators: true,
      },
    );
    console.log(
      `[updateUserData] ✓ Update success: ${updatedUser ? updatedUser.name : "Failed"}`,
    );
  } catch (err) {
    console.error("[updateUserData] ✗ Update failed:", err.message);
    return next(AppError.create("Failed to update user data", 500));
  }

  console.log("[updateUserData] Rendering account template...");
  console.log(`[updateUserData] Data: { title: 'Your account', user: {...} }`);

  try {
    res.status(200).render("account", {
      title: "Your account",
      user: updatedUser || null,
    });
    console.log("[updateUserData] ✓ Template rendered successfully");
  } catch (err) {
    console.error("[updateUserData] ✗ Render failed:", err.message);
    return next(err);
  }

  console.log("[updateUserData] ===== REQUEST END =====\n");
});

const getMyTours = asyncHandler(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render("overview", {
    title: "My Tours",
    tours,
  });
});

module.exports = {
  getMyTours,
  updateUserData,
  getAccount,
  getLoginForm,
  getTour,
  getOverview,
};
