const mongoose = require("mongoose");

const InquirySchema = new mongoose.Schema(
    {
        userType: {
            type: String,
            enum: ["customer", "vendor", "company"],
            required: true,
        },
        inquiryNumber: {
            type: String,
            required: true,
            unique: true, // prevent duplicates
        },
        inquiryStatus: {
            type: String,
            enum: ["open", "close"],
            default: "open",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        vendorType: {
            type: String,
            enum: ["lab", "brand", "supplier"],
        },
        businessNumber: {
            type: String,
        },
        registrationNumber: {
            type: String,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        uploadDocument: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

// Auto-generate unique inquiry number
InquirySchema.pre("save", function (next) {
    if (!this.inquiryNumber) {
        this.inquiryNumber = "INQ-" + Date.now().toString().slice(-6);
    }
    next();
});

module.exports = mongoose.model("Inquiry", InquirySchema);
