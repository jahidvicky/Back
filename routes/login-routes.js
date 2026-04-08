const express = require("express");
const {
  loginCustomer,
  sendResetOTP,
  verifyAndResetPassword,
} = require("../controller/login-controller");

const router = express.Router();

const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many OTP requests. Please wait 15 minutes.",
});

//  Customer login
router.post("/customer-login", loginCustomer);

//  Send OTP to email for password reset
router.post("/customer-forgot-password", otpLimiter, sendResetOTP);

// Verify OTP and reset password
router.post("/customer-verify-otp", verifyAndResetPassword);

module.exports = router;
