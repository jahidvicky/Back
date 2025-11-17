const mongoose = require("mongoose");

const Company = new mongoose.Schema(
  {
    companyName: {
      type: String,
    },
    profileImage: { type: String },
    companyEmail: {
      type: String,
    },
    companyPassword: String,
    registrationNumber: {
      type: String,
    },
    userId: { type: String },
    legalEntity: {
      type: String,
    },
    networkPayerId: {
      type: String,
    },
    efRemittance: {
      type: String,
    },
    providerName: {
      type: String,
    },
    providerNumber: {
      type: String,
    },
    providerEmail: {
      type: String,
    },
    claim: {
      type: [String],
      enum: ["EDI", "Portal", "Email", "Fax"],
    },
    signedAgreement: {
      type: String,
    },
    licenseProof: {
      type: String,
    },
    voidCheque: {
      type: String,
    },
    serviceStandards: {
      type: String,
    },
    agreementAccepted: {
      type: Boolean,
      default: false,
    },
    province: {
      type: String,
    },
    city: {
      type: String,
    },
    postalCode: {
      type: String,
    },
    address1: { type: String },
    address2: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", Company);
