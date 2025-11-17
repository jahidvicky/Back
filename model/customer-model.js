const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date, required: true },
        mobilePhone: { type: String, required: true, unique: true },
        smsOptIn: { type: Boolean, default: false },
        profileImage: { type: String },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        twoFactorAuth: { type: String, enum: ["Email", "SMS"], default: "Email" },

        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            province: { type: String, required: false },
            postalCode: { type: String, required: true },
            country: { type: String, required: false },
        },

        communicationPreference: {
            email: { type: Boolean, default: false },
            sms: { type: Boolean, default: false },
            phone: { type: Boolean, default: false },
        },
        marketingOptIn: { type: Boolean, default: false },

        prescriptionFile: { type: String, required: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);
