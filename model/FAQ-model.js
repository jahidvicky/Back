const mongoose = require("mongoose");

const FAQ = new mongoose.Schema({
    category: {
        type: String,
        default:"",
    },
    title: {
        type: String
    },
    description: {
        type: String
    }
},
    { timestamps: true }
);

module.exports = mongoose.model('FAQ', FAQ)
