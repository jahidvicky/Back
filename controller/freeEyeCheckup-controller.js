const FreeEyeCheckup = require("../model/freeEyeCheckup-model");

// GET ALL BOOKINGS
const getEyeCheckup = async (req, res) => {
    try {
        const eyeCheckup = await FreeEyeCheckup.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: eyeCheckup,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// CREATE BOOKING
const createEyeCheckup = async (req, res) => {
    try {
        const { name, email, phone, date, message } = req.body;

        // Required fields
        if (!name || !phone || !date) {
            return res.status(400).json({
                success: false,
                message: "Name, Phone and Date are required.",
            });
        }

        // Phone validation
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits",
            });
        }

        // Email validation (optional)
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
        }

        // Date validation
        if (isNaN(new Date(date))) {
            return res.status(400).json({
                success: false,
                message: "Invalid date",
            });
        }

        const newBooking = await FreeEyeCheckup.create({
            name,
            email,
            phone,
            date,
            message,
        });

        return res.status(201).json({
            success: true,
            message: "Free Eye Checkup Appointment Booked.",
            data: newBooking,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

module.exports = { getEyeCheckup, createEyeCheckup };