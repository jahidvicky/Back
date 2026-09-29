// const mongoose = require("mongoose");

// const frameDonationSchema = new mongoose.Schema(
//     {
//         name: { type: String, required: true },
//         email: { type: String, required: true },
//         phone: { type: String, required: true },
//         address: { type: String, required: true },
//         frameType: { type: String, required: true },
//         frameQuantity: { type: Number, required: true },
//         frameImages: {
//             type: [String],
//         },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("FrameDonation", frameDonationSchema);










const mongoose = require("mongoose");

const frameDonationSchema = new mongoose.Schema(
    {
        // =====================================
        // DONOR INFORMATION
        // =====================================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        address: {
            type: String,
            required: true,
            trim: true,
        },

        street: {
            type: String,
            default: null,
            trim: true,
        },

        postal: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        // Optional but recommended.
        // If your frontend does not collect these yet,
        // they will remain null.
        city: {
            type: String,
            default: null,
            trim: true,
        },
        donorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },

        province: {
            type: String,
            default: null,
            trim: true,
            uppercase: true,
        },

        // =====================================
        // DONATION INFORMATION
        // =====================================

        frameType: {
            type: String,
            required: true,
            trim: true,
        },

        frameQuantity: {
            type: Number,
            required: true,
            min: 1,
        },

        frameImages: {
            type: [String],
            default: [],
        },

        // =====================================
        // LOOMIS PICKUP INFORMATION
        // =====================================

        pickupStatus: {
            type: String,
            enum: [
                "PENDING",
                "ARRANGED",
                "PICKED_UP",
                "CANCELLED",
                "FAILED",
            ],
            default: "PENDING",
        },

        pickupDate: {
            type: String,
            default: null,
        },

        pickupReadyTime: {
            type: String,
            default: null,
        },

        pickupCloseTime: {
            type: String,
            default: null,
        },

        // Loomis scheduled-pickup confirmation ID
        loomisConfirmationId: {
            type: String,
            default: null,
        },

        pickedUpOn: {
            type: Date,
            default: null,
        },

        pickupTrackingUrl: {
            type: String,
            default: null,
        },

        // =====================================
        // CUSTOMER PICKUP ACCESS
        // =====================================

        pickupAccessToken: {
            type: String,
            unique: true,
            sparse: true,
            default: null,
            index: true,
        },

        pickupEvents: {
            type: Array,
            default: [],
        },

        pickupLastCheckedAt: {
            type: Date,
            default: null,
        },

        pickupError: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "FrameDonation",
    frameDonationSchema
);