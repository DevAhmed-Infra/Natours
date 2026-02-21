const express = require("express");

const bookingController = require('../controllers/bookingController');
const verifyToken = require("../middlewares/authMiddleware");

const router = express.Router({ mergeParams: true });

router.use(verifyToken);



module.exports = router;
