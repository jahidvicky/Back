const Doctor = require("../model/doctor-model");
const mongoose = require("mongoose");
const fs = require('fs');
const path = require('path');


// Create Doctor
exports.createDoctor = async (req, res) => {
    try {
        let {
            doctor_name,
            specialization,
            exams,
            schedule,
            exam_section
        } = req.body;

        if (!doctor_name || !specialization || !schedule || !exam_section) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the required details"
            });
        }

        // Parse schedule if it's a string
        if (typeof schedule === "string") {
            schedule = JSON.parse(schedule);
        }

        // Optional: parse exams if used
        if (typeof exams === "string") {
            exams = JSON.parse(exams);
        }

        // Convert valid exam IDs
        let examIds = [];
        if (Array.isArray(exams)) {
            examIds = exams
                .filter(e => mongoose.isValidObjectId(e))
                .map(e => new mongoose.Types.ObjectId(e));
        }

        const image = req.file ? req.file.filename : null;

        const doctor = new Doctor({
            doctor_name,
            specialization,
            image,
            exams: examIds,
            schedule,
            exam_section
        });

        await doctor.save();

        res.json({ success: true, data: doctor, message: "Doctor created successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};




// Get All Doctors with Exams
exports.getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find().populate("exams");
        res.json({ success: true, data: doctors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};






exports.updateDoctor = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const existingDoctor = await Doctor.findByIdAndUpdate(doctorId);

        if (!existingDoctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        let {
            doctor_name,
            specialization,
            exam_section,
            exams,
            schedule
        } = req.body;

        // Parse if sent as strings (from FormData)
        if (typeof schedule === "string") schedule = JSON.parse(schedule);
        if (typeof exams === "string") exams = JSON.parse(exams);

        const updatedFields = {
            doctor_name,
            specialization,
            exam_section,
            schedule,
        };

        // Optional: Handle exams if used
        if (Array.isArray(exams)) {
            updatedFields.exams = exams.filter(e => mongoose.isValidObjectId(e));
        }

        // Handle image update
        if (req.file) {
            const newImage = req.file.filename;

            // Delete old image from storage
            if (existingDoctor.image) {
                const oldPath = path.join(__dirname, '../public/uploads', existingDoctor.image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            updatedFields.image = newImage;
        }

        const updatedDoctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { $set: updatedFields },
            { new: true }
        );

        res.json({ success: true, data: updatedDoctor, message: "Doctor updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};




// Delete Doctor
exports.deleteDoctor = async (req, res) => {
    try {
        await Doctor.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Doctor deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------- Availability / Schedule -----------------

// Get Doctor Schedule
exports.getSchedule = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select("name schedule");
        res.json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Replace full schedule
exports.updateSchedule = async (req, res) => {
    try {
        const { schedule } = req.body;
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { schedule },
            { new: true }
        );
        res.json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add slot to a day
exports.addSlot = async (req, res) => {
    try {
        const { day, slot } = req.body;
        const doctor = await Doctor.findById(req.params.id);

        let daySchedule = doctor.schedule.find(d => d.day === day);
        if (!daySchedule) {
            doctor.schedule.push({ day, slots: [slot] });
        } else {
            daySchedule.slots.push(slot);
        }

        await doctor.save();
        res.json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update slot status
exports.updateSlotStatus = async (req, res) => {
    try {
        const { day, time, status } = req.body;
        const doctor = await Doctor.findById(req.params.id);

        const daySchedule = doctor.schedule.find(d => d.day === day);
        if (!daySchedule) return res.status(404).json({ success: false, message: "Day not found" });

        const slot = daySchedule.slots.find(s => s.time === time);
        if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });

        slot.status = status;
        await doctor.save();
        res.json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete slot
exports.deleteSlot = async (req, res) => {
    try {
        const { day, time } = req.body;
        const doctor = await Doctor.findById(req.params.id);

        const daySchedule = doctor.schedule.find(d => d.day === day);
        if (!daySchedule) return res.status(404).json({ success: false, message: "Day not found" });

        daySchedule.slots = daySchedule.slots.filter(s => s.time !== time);
        await doctor.save();
        res.json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
