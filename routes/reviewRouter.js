const express = require("express");

const reviewController = require("../controllers/reviewController");
const verifyToken = require("../middlewares/authMiddleware");
const restrictedTo = require("../middlewares/restrictedTo");

const router = express.Router({ mergeParams: true });

router.use(verifyToken);


router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    restrictedTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    restrictedTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    restrictedTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
