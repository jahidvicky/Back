const mongoose = require("mongoose");

const eyecheckSchema = new mongoose.Schema({
    heading: { type: String, required: true },
    description: { type: String, required: true }
});

module.exports = mongoose.model("Eyecheck", eyecheckSchema);
