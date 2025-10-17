const mongoose = require("mongoose");

const deductibleRuleSchema = new mongoose.Schema({
    fromDay: Number,
    toDay: Number,
    type: { type: String, enum: ["percent", "flat"], default: "percent" },
    value: Number,
}, { _id: false });

const policySchema = new mongoose.Schema({
    name: { type: String, required: true },
    coverage: String,
    price: { type: Number, default: 199 },
    durationDays: { type: Number, default: 365 },
    deductibleRules: [deductibleRuleSchema],
    active: { type: Boolean, default: true },

    // Company info
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    companyName: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("InsurancePolicy", policySchema);

