const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    custId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    clinic: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true },
    date: { type: String, required: true },      // "YYYY-MM-DD"
    weekday: { type: String, required: true },   // "Monday" etc, for display
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true },   // "10:30"
    examType: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    gender: { type: String, required: true },
    dob: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    status: {
        type: String,
        enum: ["booked", "cancelled", "rescheduled"],
        default: "booked"
    },
    cancelledBy: {
        type: String,
        enum: ["user", "admin", null],
        default: null
    },
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
    reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

// Prevents double-booking the same doctor/date/time at the DB level
appointmentSchema.index(
    { doctor: 1, date: 1, startTime: 1 },
    { unique: true, partialFilterExpression: { status: "booked" } }
);

module.exports = mongoose.model("Appointment", appointmentSchema);