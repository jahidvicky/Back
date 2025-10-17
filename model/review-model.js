const mongoose = require("mongoose");

const Review = new mongoose.Schema({
    description: {
        type: String,
        required:true
    },
    followers:{
        type:Number,
        required:true,
    },
    frames:{
        type:Number,
        required:true,
    },
    customer:{
        type:Number,
        required:true,
    },
    image:{
        type:String,
    }
},
    { timestamps: true }
);

module.exports = mongoose.model('Review', Review)
