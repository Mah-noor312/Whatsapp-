const express = require("express");
const router = express.Router();

const { loginUser, setPassword } = require("../controllers/authController");

router.post("/login", loginUser);
router.post("/set-password/:token", setPassword);

module.exports = router;