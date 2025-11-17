const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorType: {
      type: String,
      enum: ["supplier", "lab", "brand"],
      required: true,
    },
    profileImage: { type: String },
    companyName: { type: String },
    operatingName: String,
    businessNumber: String,


    userId: { type: String },
    vendorPassword: String,

    contactName: String,
    contactTitle: String,
    contactEmail: { type: String, required: true, index: true },
    contactPhone: String,

    address1: String,
    address2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,

    website: String,
    categories: [String],
    brands: String,

    shippingTerms: String,
    leadTimes: String,
    moq: String,
    returnPolicy: String,

    accountHolder: String,
    bankName: String,
    accountNumber: String,
    transitNumber: String,
    institutionNumber: String,
    swift: String,
    iban: String,
    remittanceEmail: String,

    certifications: {
      type: [String],
      default: [],
    },
    certificates: {
      type: [String],
      default: [],
    },

    termsAccepted: { type: Boolean, default: false },

    //  Workflow fields
    status: {
      type: String,
      enum: ["open", "replied", "closed"],
      default: "open",
    },
    adminResponse: { type: String, default: "" },

    ip: String, // to track spammy users
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
