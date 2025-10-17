const express = require("express");
const router = express.Router();
const { register, login, loginNew, sendOtp, verifyOtp, resetPassword, } = require("../controller/auth-Controller");

router.post("/register", register);
router.post("/login", login);

//new login route vai auto generated pass
router.post("/loginNew", loginNew);

router.post("/auth/send-otp", sendOtp);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/reset-password", resetPassword);

module.exports = router;
