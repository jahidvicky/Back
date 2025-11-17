const CouponCode = require("../model/coupon-code-model");


//  Create
const createCouponCode = async (req, res) => {
  try {
    const {
      coupon,
      applicableFor,
      discountType,
      discountValue,
      minPurchase,
      startDate,
      expiryDate,
    } = req.body;

    if (
      !coupon ||
      !applicableFor ||
      !discountType ||
      !discountValue ||
      !startDate ||
      !expiryDate
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const exists = await CouponCode.findOne({ coupon: coupon.toUpperCase() });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon already exists" });
    }

    const newCoupon = new CouponCode({
      coupon,
      applicableFor,
      discountType,
      discountValue,
      minPurchase,
      startDate,
      expiryDate,
    });

    await newCoupon.save();
    res
      .status(200)
      .json({ success: true, message: "Coupon created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get all
const getCouponCodes = async (req, res) => {
  try {
    const coupons = await CouponCode.find();
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
const updateCouponCode = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      coupon,
      applicableFor,
      discountType,
      discountValue,
      minPurchase,
      startDate,
      expiryDate,
      isActive,
    } = req.body;

    const updated = await CouponCode.findByIdAndUpdate(
      id,
      {
        coupon,
        applicableFor,
        discountType,
        discountValue,
        minPurchase,
        startDate,
        expiryDate,
        isActive,
      },
      { new: true }
    );

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });

    res
      .status(200)
      .json({ success: true, message: "Coupon updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
const deleteCouponCode = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CouponCode.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });

    res
      .status(200)
      .json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const validateCouponCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { cartTotal, category } = req.query; 
    const total = Number(cartTotal);

    // Find active coupon
    const coupon = await CouponCode.findOne({ coupon: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon" });
    }

    const now = new Date();

    // Check start and expiry dates
    if (new Date(coupon.startDate) > now) {
      return res.status(400).json({ success: false, message: "Coupon not active yet" });
    }
    if (new Date(coupon.expiryDate) < now) {
      return res.status(400).json({ success: false, message: "Coupon expired" });
    }

    // Check minimum purchase
    if (coupon.minPurchase && total < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase required is ${coupon.minPurchase}`,
      });
    }

    // Check category if applicable
    if (coupon.category && category && coupon.category !== category) {
      return res.status(400).json({
        success: false,
        message: `Coupon not applicable for this category`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (total * coupon.discountValue) / 100;
    } else if (coupon.discountType === "flat") {
      discountAmount = coupon.discountValue;
    }

    res.status(200).json({
      success: true,
      message: "Coupon is valid",
      data: {
        coupon: coupon.coupon,
        discountAmount,
        discountType: coupon.discountType,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createCouponCode,
  getCouponCodes,
  updateCouponCode,
  deleteCouponCode,
  validateCouponCode,
};
