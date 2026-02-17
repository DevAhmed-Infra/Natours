const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("../controllers/authController");
const reviewController = require("../controllers/reviewController");
const verifyToken = require("../middlewares/authMiddleware");


const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.patch("/updateMyPassword", verifyToken, authController.updatePassword);
router.patch("/updateMe", verifyToken, userController.updateMe);
router.delete("/deleteMe", verifyToken, userController.deleteMe);

router.route("/").get(userController.getAllUsers);
//   .post(userController.createUser);

// router
//   .route('/:id')
//   .get(userController.getUser)
//   .patch(userController.updateUser)
//   .delete(userController.deleteUser);



module.exports = router;
