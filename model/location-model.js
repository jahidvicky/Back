const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        mapQuery: { type: String, required: true, trim: true },
        image: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);