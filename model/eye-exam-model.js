const mongoose = require("mongoose");

const EyeExamSchema = new mongoose.Schema({
    custId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    appointmentDate: { type: String, required: true },
    examType: { type: String, required: true },
    doctorName: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    gender: { type: String, required: true },
    dob: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    weekday: { type: String },
})

module.exports = mongoose.model("EyeExam", EyeExamSchema);
