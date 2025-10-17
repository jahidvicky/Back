const mongoose = require("mongoose")

const frameShapesSchema = new mongoose.Schema({
    image: { type: String },
    frameName: { type: String, require: true }
})

module.exports = mongoose.model("FrameShapes", frameShapesSchema)