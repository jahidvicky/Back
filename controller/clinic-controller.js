const Clinic = require("../model/clinic-model");
const Doctor = require("../model/doctor-model");

// Create Clinic
exports.createClinic = async (req, res) => {
    try {
        const { clinicName, address, days, startTime, endTime, slotDurationMinutes } = req.body;

        if (!clinicName) {
            return res.status(400).json({ success: false, message: "Clinic name is required" });
        }

        const clinic = new Clinic({ clinicName, address, days, startTime, endTime, slotDurationMinutes });
        await clinic.save();

        res.json({ success: true, data: clinic, message: "Clinic created successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all Clinics
exports.getClinics = async (req, res) => {
    try {
        const clinics = await Clinic.find();
        res.json({ success: true, data: clinics });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Clinic
exports.updateClinic = async (req, res) => {
    try {
        const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: clinic });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Clinic
exports.deleteClinic = async (req, res) => {
    try {
        await Clinic.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Clinic deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Assign a doctor to a clinic
exports.assignDoctorToClinic = async (req, res) => {
    try {
        const { doctorId, clinicId, workingDays } = req.body;

        if (!doctorId || !clinicId) {
            return res.status(400).json({ success: false, message: "doctorId and clinicId are required" });
        }

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { clinic: clinicId, workingDays: workingDays || [] },
            { new: true }
        ).populate("clinic");

        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        res.json({ success: true, data: doctor, message: "Doctor assigned to clinic successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};