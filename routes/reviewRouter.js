const express = require("express");

const reviewController = require("../controllers/reviewController");
const verifyToken = require("../middlewares/authMiddleware");
const restrictedTo = require("../middlewares/restrictedTo");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(verifyToken, restrictedTo("user"), reviewController.createReview);

module.exports = router;
