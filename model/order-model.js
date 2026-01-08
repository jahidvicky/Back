const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    email: { type: String, required: true },

    location: {
      type: String,
      enum: ["east", "west"],
      required: true,
    },

    // =========================
    // CART ITEMS
    // =========================
    cartItems: [
      {
        productId: String,
        name: String,

        // Images
        image: String,
        variantImages: [String],

        price: Number,
        subCategoryName: String,
        quantity: { type: Number, default: 1 },

        createdBy: { type: String },

        vendorID: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vendor",
        },

        categoryId: String,

        // Selections
        product_size: [String],
        product_color: [String],
        lens: Object,
        enhancement: Object,
        thickness: Object,
        tint: Object,

        status: {
          type: String,
          enum: ["Active", "Cancelled"],
          default: "Active",
        },

        // =========================
        // 🔁 EXCHANGE LOGIC (NEW)
        // =========================
        isPrescription: {
          type: Boolean,
          default: false, // important for sunglasses
        },
        exchangeImages: [String],

        exchangeStatus: {
          type: String,
          enum: ["None", "Requested", "Approved", "Rejected", "Completed"],
          default: "None",
        },

        exchangeReason: String,
        exchangeRequestedAt: Date,
        exchangeApprovedAt: Date,
        exchangeCompletedAt: Date,

        // =========================
        // POLICY (INSURANCE)
        // =========================
        policy: {
          policyId: { type: String },
          name: String,
          price: Number,
          companyId: String,
          companyName: String,
          coverage: String,
          purchasedAt: Date,
          durationDays: Number,
          deductibleRules: [String],
          pricePaid: Number,
          active: Boolean,
          status: {
            type: String,
            enum: ["Active", "Expired"],
            default: "Active",
          },
          expiryDate: Date,
          paymentStatus: {
            type: String,
            enum: ["Pending", "Paid"],
            default: "Pending",
          },
        },

        // Previous policies
        previousPolicies: [
          {
            name: String,
            price: Number,
            companyId: String,
            companyName: String,
            coverage: String,
            purchasedAt: Date,
            expiryDate: Date,
            durationDays: Number,
            status: String,
            active: Boolean,
            deductibleRules: [Object],
            renewedAt: Date,
          },
        ],
      },
    ],

    // =========================
    // ADDRESSES
    // =========================
    shippingAddress: {
      fullName: String,
      address: String,
      city: String,
      province: String,
      postalCode: String,
      country: String,
      phone: String,
    },

    billingAddress: {
      fullName: String,
      address: String,
      city: String,
      province: String,
      postalCode: String,
      country: String,
      phone: String,
    },

    // =========================
    // PRICING
    // =========================
    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number,
    discount: { type: Number, default: 0 },

    // =========================
    // PAYMENT
    // =========================
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: { type: String, default: "Pending" },
    transactionId: String,

    // =========================
    // ORDER STATUS
    // =========================
    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
        "Failed",
      ],
      default: "Placed",
    },

    trackingNumber: String,

    // Used for exchange 48h window
    deliveryDate: Date,

    // =========================
    // TRACKING HISTORY
    // =========================
    trackingHistory: [
      {
        status: {
          type: String,
          enum: [
            "Placed",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Returned",
            "Failed",
          ],
        },
        message: String,
        updatedBy: String,
        actorName: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
