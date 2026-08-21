const mongoose = require("mongoose")
const FreeEyeCheckupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, },
    phone: { type: String, required: true },
    dob: { type: String, required: true },
    age: { type: Number, required: true },
    date: { type: String, required: true },
    message: { type: String, },
    eligibilityReason: { type: String, default: "age" },
}, { timestamps: true })

module.exports = mongoose.model("FreeEyeCheckup", FreeEyeCheckupSchema)