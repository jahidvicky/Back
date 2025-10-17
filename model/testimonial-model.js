const mongoose = require("mongoose")

const testimonialSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    heading: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    rating: { type: Number, required: true }
});

module.exports = mongoose.model("Testimonial", testimonialSchema)