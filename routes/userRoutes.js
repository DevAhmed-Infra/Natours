const express = require("express");
const multer = require("multer");
const userController = require("./../controllers/userController");
const authController = require("../controllers/authController");
const verifyToken = require("../middlewares/authMiddleware");
const restrictedTo = require("../middlewares/restrictedTo");

const upload = multer({ dest: "public/img/users" });

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(verifyToken);

router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMe", upload.single("photo"), userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

router
  .route("/")
  .get(userController.getAllUsers)
  .post(verifyToken, restrictedTo("admin"), userController.createUserByAdmin);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
