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
                "BOOKING",
                "ARRANGED",
                "PICKED_UP",
                "DELIVERED",
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
        // =====================================
        // LOOMIS E-RETURN INFORMATION
        // =====================================

        // E-Return ID returned by processPickUpTag
        loomisEReturnId: {
            type: String,
            default: null,
        },

        // Shipment Identification Number (SIN)
        loomisShipmentNumber: {
            type: String,
            default: null,
        },

        // Package Identification Number (PIN)
        // This is the Loomis tracking number.
        loomisTrackingNumber: {
            type: String,
            default: null,
        },

        loomisReference: {
            type: String,
            default: null,
        },

        // Keep this only for old donations
        // created using schedulePickup.
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
            default: undefined,
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