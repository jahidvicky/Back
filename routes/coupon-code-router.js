const express = require("express");
const router = express.Router();
const {
  createCouponCode,
  getCouponCodes,
  updateCouponCode,
  deleteCouponCode,
  validateCouponCode,
} = require("../controller/coupon-code-controller");

router.post("/addCouponCode", createCouponCode);
router.get("/getCouponCode", getCouponCodes);
router.put("/updateCouponCode/:id", updateCouponCode);
router.delete("/deleteCouponCode/:id", deleteCouponCode);
router.get("/validateCoupon/:code", validateCouponCode);

module.exports = router;
