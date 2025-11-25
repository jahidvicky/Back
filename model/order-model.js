const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    email: { type: String, required: true },

    //  Updated cartItems structure with color variant support
    cartItems: [
      {
        productId: String,
        name: String,

        //  Images
        image: String,           // Primary image (first image of selected color)
        variantImages: [String], // All images of that selected color variant

        price: Number,
        subCategoryName: String,
        quantity: { type: Number, default: 1 },
        createdBy: { type: String },
        vendorID: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vendor",
        },
        categoryId: {
          type: String
        },

        //  Per-item selections
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

        //  Policy (insurance) data
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

        //  Stores old policies if renewed
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

    //  Addresses
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

    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number,
    discount: { type: Number, default: 0 },

    //  Payment
    paymentMethod: { type: String, default: "COD" },
    paymentStatus: { type: String, default: "Pending" },
    transactionId: String,

    //  Order Status
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
    deliveryDate: Date,

    //  Tracking History
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
        updatedBy: { type: String },
        actorName: { type: String },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
