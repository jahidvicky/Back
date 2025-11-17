const mongoose = require("mongoose")
const eyewearTipsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String }

})

module.exports = mongoose.model("eyewearTips", eyewearTipsSchema)