const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ["user", "admin", "ai", "system"], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema(
    {
        name: String,
        email: String,
        reason: String,
        status: { type: String, enum: ["pending", "active", "closed"], default: "pending" },
        rating: { type: Number, min: 1, max: 5, default: null },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
        messages: [messageSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
