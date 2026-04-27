const mongoose = require("mongoose")
const FreeEyeCheckupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    message: { type: String, },
})

module.exports = mongoose.model("FreeEyeCheckup", FreeEyeCheckupSchema)