const express = require("express");

const tourController = require("../controllers/tourController");
const verifyToken = require("../middlewares/authMiddleware");
const restrictedTo = require("../middlewares/restrictedTo");
const reviewRouter = require("./reviewRouter");

const router = express.Router();

// router.param('id', tourController.checkID);

router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route("/tour-stats").get(tourController.getTourStats);
router.route("/monthly-plan/:year").get(tourController.getMonthlyPlan);

// Nested route for reviews - must be before /:id for proper precedence
router.use("/:tourId/reviews", reviewRouter);

router
  .route("/")
  .get(verifyToken, tourController.getAllTours)
  .post(tourController.createTour);

router
  .route("/:id")
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(verifyToken, restrictedTo('admin' , 'lead-guide') ,tourController.deleteTour);



module.exports = router;
