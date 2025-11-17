const mongoose = require("mongoose")

const eyeServiseSchema = new mongoose.Schema({
    image: { type: String },
    heading: { type: String, require: true },
    description: { type: String, require: true }
})

module.exports = mongoose.model("EyeServiceSchema", eyeServiseSchema)