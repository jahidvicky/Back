const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        itemCode: {
            type: String,
            required: true,
        },

        category: {
            type: String,
            enum: ["sunglasses", "glasses", "contact_lenses"],
            required: true,
        },
        createdBy: { type: String },
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        location: {
            type: String,
            enum: ["east", "west"],
            required: true,
        },

        rawStock: {
            type: Number,
            default: 0,
        },

        inProcessing: {
            type: Number,
            default: 0,
        },

        finishedStock: {
            type: Number,
            default: 0,
        },
        orderedStock: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
