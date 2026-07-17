const mongoose = require("mongoose");

const frameDonationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        frameType: { type: String, required: true },
        frameQuantity: { type: Number, required: true },
        frameImages: {
            type: [String],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("FrameDonation", frameDonationSchema);
