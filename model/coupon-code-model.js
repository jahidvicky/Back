const mongoose = require("mongoose");

const couponCodeSchema = new mongoose.Schema(
  {
    coupon: { type: String, required: true, unique: true, uppercase: true },
    applicableFor: { type: String, required: true }, // coupon name or label
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    discountValue: { type: Number, required: true },
    minPurchase: { type: Number, default: 0 },
    startDate: { type: Date, required: true }, //NEW: coupon start date
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CouponCode", couponCodeSchema);
