const mongoose = require("mongoose");

const inventoryHistorySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ["stock_added", "moved_processing", "moved_finished", "order_placed"],
            required: true,
        },

        location: { type: String, required: true },

        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

        quantity: { type: Number, default: 0 },

        performedBy: { type: String, default: "system" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("InventoryHistory", inventoryHistorySchema);
