const mongoose = require("mongoose");


const shippingInfoSchema = new mongoose.Schema({
  courier: {
    type: String,
    default: "Loomis",
  },

  trackingNumber: String,

  shipmentId: String,

  shipmentNumber: String,

  labelId: String,

  shippingLabel: String,

  manifestNum: { type: String, default: null },

  serviceCode: { type: String, default: null },       // ← WAS MISSING
  serviceType: { type: String, default: "DD" },
  serviceName: { type: String, default: null },       // ← WAS MISSING
  rateCharged: { type: Number, default: null },

  originPostalCode: String,
  originProvince: String,

  destinationPostalCode: String,
  destinationProvince: String,

  weight: Number,
  length: Number,
  width: Number,
  height: Number,

  rate: Number,

  expectedDeliveryDate: {
    type: Date,
    default: null,
  },
  initialExpectedDeliveryDate: { type: Date, default: null },  // ← WAS MISSING
  finalExpectedDeliveryDate: { type: Date, default: null },

  voided: { type: Boolean, default: false },          // ← WAS MISSING (was never saving!)
  voidedAt: { type: Date, default: null },

  cachedLabelBase64: { type: String, default: null },

  rawResponse: Object

}, { _id: false });


const pickupInfoSchema = new mongoose.Schema({
  confirmationNumber: { type: String, default: null },
  pickupDate: { type: String, default: null },  // "YYYYMMDD"
  readyTime: { type: String, default: null },  // "09:00"
  closeTime: { type: String, default: null },  // "17:00"
  scheduledAt: { type: Date, default: null },
  rawResponse: { type: Object, default: null },
}, { _id: false });


const returnInfoSchema = new mongoose.Schema({
  trackingNumber: { type: String, default: null },
  eReturnId: { type: String, default: null },
  rmaNumber: { type: String, default: null },
  shippingDate: { type: String, default: null },
  createdAt: { type: Date, default: null },
  rawResponse: { type: Object, default: null },
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Requested", "Approved", "Rejected"],
    default: "Requested",
  },
  reason: { type: String, required: true },
  images: [{ type: String }],
  requestedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
}, { _id: false });


const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    email: { type: String, required: true },

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

        weight: { type: Number, default: 1 },
        length: { type: Number, default: 10 },
        width: { type: Number, default: 8 },
        height: { type: Number, default: 6 },

        // =========================
        //  EXCHANGE LOGIC (NEW)
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
    paymentStatus: { type: String, default: "Pending" },
    transactionId: String,

    // =========================
    // ORDER STATUS
    // =========================
    orderStatus: {
      type: String,
      enum: [
        "Payment Pending",
        "Placed",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
        "Failed",
      ],
      default: "Payment Pending",
    },
    // Used for exchange 48h window
    deliveryDate: Date,
    shippedAt: Date,

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
            "Pickup Scheduled",
            "Shipment Voided",
          ],
        },
        message: String,
        updatedBy: String,
        actorName: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // =========================
    // SHIPPING / COURIER DATA
    // =========================

    shippingInfo: shippingInfoSchema,
    pickupInfo: pickupInfoSchema,
    returnInfo: returnInfoSchema,
    returnRequest: returnRequestSchema,

    orderNumber: {
      type: String,
      unique: true,
    },


  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
