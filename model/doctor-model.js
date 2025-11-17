const mongoose = require("mongoose");

// Schedule per day (with time as array)
const scheduleSchema = new mongoose.Schema({
    day: { type: String, required: true },
    times: [{ type: String, required: true }],  // multiple times in one day
    status: { type: String, enum: ["Available", "Booked"], default: "Available" }
}, { _id: false });

const doctorSchema = new mongoose.Schema({
    doctor_name: { type: String, required: true },
    image: { type: String },
    specialization: { type: String },
    exam_section: { type: String },
    exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],
    schedule: [scheduleSchema]
}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);
