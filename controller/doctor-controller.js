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
            exam_section,
            clinic,
            workingDays
        } = req.body;

        if (!doctor_name || !specialization || !exam_section || !clinic) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the required details"
            });
        }

        // Optional: parse exams if used
        if (typeof exams === "string") {
            exams = JSON.parse(exams);
        }

        // Optional: parse workingDays if sent as a JSON string (FormData)
        if (typeof workingDays === "string") {
            try {
                workingDays = JSON.parse(workingDays);
            } catch {
                workingDays = [workingDays];
            }
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
            exam_section,
            clinic,
            workingDays: Array.isArray(workingDays) ? workingDays : []
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
        const doctors = await Doctor.find().populate("exams").populate("clinic");
        res.json({ success: true, data: doctors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



// Generate available slots for a doctor on a given date (or a date range)
exports.getDoctorAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, from, to } = req.query; // single date OR range

        const doctor = await Doctor.findById(id).populate("clinic");
        if (!doctor || !doctor.clinic) {
            return res.status(404).json({ success: false, message: "Doctor or clinic not found" });
        }

        const clinic = doctor.clinic;
        const workingDays = doctor.workingDays?.length ? doctor.workingDays : clinic.days;

        const startDate = date ? new Date(date) : new Date(from);
        const endDate = date ? new Date(date) : new Date(to);

        const Appointment = require("../model/appointment-model");
        const booked = await Appointment.find({
            doctor: id,
            status: "booked",
            date: {
                $gte: startDate.toISOString().split("T")[0],
                $lte: endDate.toISOString().split("T")[0]
            }
        });

        const bookedSet = new Set(booked.map(b => `${b.date}_${b.startTime}`));

        const result = [];
        const cursor = new Date(startDate);

        while (cursor <= endDate) {
            const weekday = cursor.toLocaleDateString("en-US", { weekday: "long" });

            if (workingDays.includes(weekday)) {
                const dayStr = cursor.toISOString().split("T")[0];
                const slots = generateDaySlots(clinic.startTime, clinic.endTime, clinic.slotDurationMinutes);

                const daySlots = slots.map(s => ({
                    startTime: s.startTime,
                    endTime: s.endTime,
                    available: !bookedSet.has(`${dayStr}_${s.startTime}`)
                }));

                result.push({ date: dayStr, weekday, slots: daySlots });
            }
            cursor.setDate(cursor.getDate() + 1);
        }

        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Helper: builds ["10:00-10:30", "10:30-11:00", ...] for a clinic day
function generateDaySlots(startTime, endTime, durationMinutes) {
    const slots = [];
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    let cursor = sh * 60 + sm;
    const end = eh * 60 + em;

    while (cursor + durationMinutes <= end) {
        const startH = String(Math.floor(cursor / 60)).padStart(2, "0");
        const startM = String(cursor % 60).padStart(2, "0");
        const nextCursor = cursor + durationMinutes;
        const endH = String(Math.floor(nextCursor / 60)).padStart(2, "0");
        const endM = String(nextCursor % 60).padStart(2, "0");

        slots.push({ startTime: `${startH}:${startM}`, endTime: `${endH}:${endM}` });
        cursor = nextCursor;
    }
    return slots;
}




exports.updateDoctor = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const existingDoctor = await Doctor.findById(doctorId);

        if (!existingDoctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        let {
            doctor_name,
            specialization,
            exam_section,
            exams,
            schedule,
            clinic,
            workingDays
        } = req.body;

        // Parse if sent as strings (from FormData)
        if (typeof schedule === "string") schedule = JSON.parse(schedule);
        if (typeof exams === "string") exams = JSON.parse(exams);
        if (typeof workingDays === "string") {
            try {
                workingDays = JSON.parse(workingDays);
            } catch {
                workingDays = [workingDays];
            }
        }

        const updatedFields = {
            doctor_name,
            specialization,
            exam_section,
            schedule,
        };

        // Only touch clinic/workingDays if actually sent, so a partial
        // update doesn't accidentally wipe an existing assignment
        if (clinic) {
            updatedFields.clinic = clinic;
        }
        if (Array.isArray(workingDays)) {
            updatedFields.workingDays = workingDays;
        }

        // Optional: Handle exams if used
        if (Array.isArray(exams)) {
            updatedFields.exams = exams.filter(e => mongoose.isValidObjectId(e));
        }

        // Handle image update
        if (req.file) {
            const newImage = req.file.filename;

            // Delete old image from storage
            if (existingDoctor.image) {
                const oldPath = path.join(__dirname, '../uploads', existingDoctor.image);
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
