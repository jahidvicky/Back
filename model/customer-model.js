const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        dateOfBirth: { type: Date, required: true },
        mobilePhone: { type: String, required: true, unique: true },
        profileImage: { type: String },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },

        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            province: { type: String, required: false },
            postalCode: { type: String, required: true },
            country: { type: String, required: false },
        },

        otpCode: { type: String, default: null },
        otpExpiresAt: { type: Date, default: null },

        prescriptionFile: { type: String, required: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);