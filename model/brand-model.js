const mongoose = require("mongoose")

const brandData = new mongoose.Schema({
    category: { type: String, required: true },
    brand: { type: String, required: true },
    image: { type: String }
})

module.exports = mongoose.model("Brand", brandData)