const mongoose = require("mongoose");
const Appointment = require("../model/appointment-model");
const Doctor = require("../model/doctor-model");
const transporter = require("../utils/mailer");
const appointmentTemplate = require("../utils/appointmentTemplate");

// Book Appointment
exports.bookAppointment = async (req, res) => {
    try {
        const {
            custId, doctorId, date, weekday, startTime, endTime,
            examType, firstName, lastName, gender, dob, phone, email
        } = req.body;

        if (!doctorId || !date || !startTime || !endTime || !examType || !firstName || !gender || !phone) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const doctor = await Doctor.findById(doctorId).populate("clinic");
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        // Unique index on (doctor, date, startTime, status:"booked") throws
        // a duplicate-key error automatically if the slot was just taken.
        const appointment = new Appointment({
            custId: custId && mongoose.isValidObjectId(custId) ? custId : undefined,
            doctor: doctorId,
            clinic: doctor.clinic._id,
            date, weekday, startTime, endTime, examType,
            firstName, lastName, gender, dob, phone, email
        });

        await appointment.save();

        if (email) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Your Eye Exam Appointment Confirmation",
                html: appointmentTemplate({
                    name: `${firstName} ${lastName || ""}`,
                    doctorName: doctor.doctor_name,
                    appointmentDate: `${date} ${startTime}`,
                    examType, weekday, type: "customer"
                })
            });
        }

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: "New Eye Exam Appointment Booked",
            html: appointmentTemplate({
                name: `${firstName} ${lastName || ""}`,
                doctorName: doctor.doctor_name,
                appointmentDate: `${date} ${startTime}`,
                examType, weekday, type: "admin"
            })
        });

        res.status(200).json({ success: true, message: "Appointment booked successfully", data: appointment });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "This slot was just booked by someone else. Please choose another." });
        }
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const { cancelledBy = "admin", custId } = req.body || {};

        const existing = await Appointment.findById(req.params.id);
        if (!existing) return res.status(404).json({ success: false, message: "Appointment not found" });

        // Customers are no longer allowed to self-cancel online.
        // Only admin/clinic staff can cancel an appointment.
        if (cancelledBy === "user") {
            return res.status(403).json({
                success: false,
                message: "Online cancellation isn't available. Please call or email us to cancel or reschedule your appointment."
            });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled", cancelledBy },
            { new: true }
        ).populate("doctor", "doctor_name");

        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

        const fullName = `${appointment.firstName} ${appointment.lastName || ""}`.trim();
        const doctorName = appointment.doctor?.doctor_name || "your doctor";
        const appointmentDateTime = `${appointment.date} ${appointment.startTime}`;

        // Notify customer, if an email was provided at booking time
        // Notify customer, if an email was provided at booking time
        if (appointment.email) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: appointment.email,
                    subject: cancelledBy === "admin"
                        ? "Your Eye Exam Appointment Was Cancelled By The Clinic"
                        : "Your Eye Exam Appointment Has Been Cancelled",
                    html: appointmentTemplate({
                        name: fullName,
                        doctorName,
                        appointmentDate: appointmentDateTime,
                        examType: appointment.examType,
                        weekday: appointment.weekday,
                        type: "cancelled",
                        cancelledBy
                    })
                });
            } catch (mailErr) {
                console.error("Failed to send cancellation email to customer:", mailErr);
            }
        }

        // Notify admin
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL,
                subject: "Appointment Cancelled",
                html: appointmentTemplate({
                    name: fullName,
                    doctorName,
                    appointmentDate: appointmentDateTime,
                    examType: appointment.examType,
                    weekday: appointment.weekday,
                    type: "cancelled-admin"
                })
            });
        } catch (mailErr) {
            console.error("Failed to send cancellation email to admin:", mailErr);
        }

        res.json({ success: true, data: appointment, message: "Appointment cancelled" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Reschedule Appointment
exports.rescheduleAppointment = async (req, res) => {
    try {
        const {
            date, weekday, startTime, endTime, custId,
            firstName, lastName, gender, dob, phone, email, examType
        } = req.body;

        const old = await Appointment.findById(req.params.id);
        if (!old) return res.status(404).json({ success: false, message: "Appointment not found" });

        // Customers cannot self-reschedule an active booking online — they must
        // call or email us for that. The one exception: if the CLINIC already
        // cancelled this appointment, the customer picking a new slot is treated
        // as a rebooking (not a self-service cancel/reschedule), so it's allowed.
        if (custId) {
            if (!old.custId || old.custId.toString() !== custId) {
                return res.status(403).json({ success: false, message: "You can only reschedule your own appointments" });
            }
            if (old.cancelledBy !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Online rescheduling isn't available. Please call or email us to reschedule your appointment."
                });
            }
        }

        old.status = "cancelled";
        if (!old.cancelledBy) old.cancelledBy = "admin";
        await old.save();

        const newAppointment = new Appointment({
            ...old.toObject(),
            _id: undefined,
            date, weekday, startTime, endTime,
            firstName: firstName || old.firstName,
            lastName: lastName ?? old.lastName,
            gender: gender || old.gender,
            dob: dob ?? old.dob,
            phone: phone || old.phone,
            email: email ?? old.email,
            examType: examType || old.examType,
            status: "booked",
            cancelledBy: null,
            rescheduledFrom: old._id,
            reminderSent: false
        });
        await newAppointment.save();

        // Look up the doctor's name for the email (old.doctor is just an ObjectId
        // on the plain object spread above, so populate it fresh here)
        const doctorForEmail = await Doctor.findById(newAppointment.doctor).select("doctor_name");
        const fullName = `${newAppointment.firstName} ${newAppointment.lastName || ""}`.trim();
        const newDateTime = `${newAppointment.date} ${newAppointment.startTime}`;

        if (newAppointment.email) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: newAppointment.email,
                    subject: "Your Eye Exam Appointment Has Been Rescheduled",
                    html: appointmentTemplate({
                        name: fullName,
                        doctorName: doctorForEmail?.doctor_name || "your doctor",
                        appointmentDate: newDateTime,
                        examType: newAppointment.examType,
                        weekday: newAppointment.weekday,
                        type: "customer"
                    })
                });
            } catch (mailErr) {
                console.error("Failed to send reschedule email to customer:", mailErr);
            }
        }

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL,
                subject: "Appointment Rescheduled",
                html: appointmentTemplate({
                    name: fullName,
                    doctorName: doctorForEmail?.doctor_name || "your doctor",
                    appointmentDate: newDateTime,
                    examType: newAppointment.examType,
                    weekday: newAppointment.weekday,
                    type: "admin"
                })
            });
        } catch (mailErr) {
            console.error("Failed to send reschedule email to admin:", mailErr);
        }

        res.json({ success: true, data: newAppointment, message: "Appointment rescheduled" });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "That slot is already taken." });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};



// Admin: get all appointments (calendar view)
// Admin: get all appointments (calendar view)
exports.getAllAppointments = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        const filter = {};
        if (doctorId) filter.doctor = doctorId;
        if (date) filter.date = date;

        const appointments = await Appointment.find(filter)
            .populate("doctor", "doctor_name specialization")
            .sort({ date: 1, startTime: 1 });

        res.json({ success: true, data: appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Customer: get only MY appointments (by their own custId)
exports.getMyAppointments = async (req, res) => {
    try {
        const { custId } = req.params;

        if (!custId || !mongoose.isValidObjectId(custId)) {
            return res.status(400).json({ success: false, message: "Invalid or missing customer id" });
        }

        const appointments = await Appointment.find({ custId })
            .populate("doctor", "doctor_name specialization image")
            .sort({ date: -1, startTime: 1 });

        res.json({ success: true, data: appointments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};