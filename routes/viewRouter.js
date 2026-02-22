const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me',verifyToken, viewsController.getAccount);


router.get(
  '/my-tours',
  bookingController.createBookingCheckout,
  verifyToken,
  viewsController.getMyTours
);

router.post(
  '/submit-user-data',
  verifyToken,
  viewsController.updateUserData
);

module.exports = router;