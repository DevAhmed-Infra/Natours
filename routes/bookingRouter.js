const express = require("express");

const bookingController = require('../controllers/bookingController');
const verifyToken = require("../middlewares/authMiddleware");
const restrictedTo = require('../middlewares/restrictedTo');

const router = express.Router();

router.use(verifyToken);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(restrictedTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);


module.exports = router;
