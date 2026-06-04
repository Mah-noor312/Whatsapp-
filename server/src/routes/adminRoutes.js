const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createUserByAdmin,
  getAllUsers,
  resendSetupEmail,
} = require("../controllers/adminController");

router.get(
  "/users",
  authMiddleware,
  roleMiddleware("admin"),
  getAllUsers
);

router.post(
  "/users",
  authMiddleware,
  roleMiddleware("admin"),
  createUserByAdmin
);

router.post(
  "/users/resend-email/:userId",
  authMiddleware,
  roleMiddleware("admin"),
  resendSetupEmail
);

module.exports = router;