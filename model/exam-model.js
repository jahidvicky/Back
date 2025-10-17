const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
    examName: { type: String, required: true },
    description: { type: String },
    price: { type: String }, // "$95" or "Covered by OHIP"
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("Exam", examSchema);
