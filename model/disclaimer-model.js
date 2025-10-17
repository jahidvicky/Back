const mongoose = require("mongoose")
const disclaimerSchema = new mongoose.Schema({
    description: { type: String, required: true },
    image: { type: String }
})

module.exports = mongoose.model("Disclaimer", disclaimerSchema)