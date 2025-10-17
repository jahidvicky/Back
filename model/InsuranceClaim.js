const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // <-- selected product reference
    productDetails: { type: Object }, // <-- store the whole product info at claim time
    claimDate: { type: Date, default: Date.now },
    description: String,
    photos: [String],
    claimAmount: Number,
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedReplacementOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    notes: String,
    rejectionReason: {
        type: String,
        trim: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Claim", claimSchema);
