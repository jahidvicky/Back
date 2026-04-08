const mongoose = require("mongoose");

/*
================================
MANIFEST MODEL
================================
*/
const manifestSchema = new mongoose.Schema(
    {
        manifestNum: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        date: {
            type: String,  // "YYYYMMDD"
            required: true,
        },

        pdfBase64: {
            type: String,  // base64 PDF from Loomis
            required: true,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

module.exports = mongoose.model("Manifest", manifestSchema);