const express = require("express");

const tourController = require("../controllers/tourController");
const verifyToken = require("../middlewares/authMiddleware");
const restrictedTo = require("../middlewares/restrictedTo");
const reviewRouter = require("./reviewRouter");

const router = express.Router();

// router.param('id', tourController.checkID);
// Nested route for reviews - must be before /:id for proper precedence
router.use("/:tourId/reviews", reviewRouter);

router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route("/tour-stats").get(tourController.getTourStats);
router
  .route("/monthly-plan/:year")
  .get(
    verifyToken,
    restrictedTo("admin", "lead-guide", "guide"),
    tourController.getMonthlyPlan,
  );

router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

// Public routes (no authentication required)
router.route("/").get(tourController.getAllTours);
router.route("/:id").get(tourController.getTour);

// Protect all routes below this middleware
router.use(verifyToken);
router
  .route("/")
  .post(
    restrictedTo("admin", "lead-guide"),
    tourController.createTour,
  );

router
  .route("/:id")
  .patch(
    restrictedTo("admin", "lead-guide"),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    restrictedTo("admin", "lead-guide"),
    tourController.deleteTour,
  );

module.exports = router;
