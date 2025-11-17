const express = require("express");
const {
  loginCustomer,
  sendResetOTP,
  verifyAndResetPassword,
} = require("../controller/login-controller");

const router = express.Router();

//  Customer login
router.post("/customer-login", loginCustomer);

//  Send OTP to email for password reset
router.post("/customer-forgot-password", sendResetOTP);

// Verify OTP and reset password
router.post("/customer-verify-otp", verifyAndResetPassword);

module.exports = router;
