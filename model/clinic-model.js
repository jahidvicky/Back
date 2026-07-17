const mongoose = require("mongoose");

const clinicSchema = new mongoose.Schema({
    clinicName: { type: String, required: true },
    address: { type: String },
    days: {
        type: [String],
        default: ["Monday", "Wednesday", "Friday", "Saturday", "Sunday"]
    },
    startTime: { type: String, default: "10:00" }, // 24h "HH:mm"
    endTime: { type: String, default: "18:00" },
    slotDurationMinutes: { type: Number, default: 30 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("Clinic", clinicSchema);