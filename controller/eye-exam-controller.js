const EyeExam = require("../model/eye-exam-model")
const mongoose = require("mongoose");

const addEyeExam = async (req, res) => {
    try {
        const {
            custId,
            appointmentDate,
            examType,
            doctorName,
            firstName,
            lastName,
            gender,
            dob,
            phone,
            email,
            weekday,
        } = req.body;

        // Basic validation
        if (!appointmentDate || !examType || !doctorName || !firstName || !gender || !phone) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: appointmentDate, examType, doctorName, firstName, gender, phone",
            });
        }

        // Validate custId if provided
        if (custId && !mongoose.Types.ObjectId.isValid(custId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid custId provided",
            });
        }

        // Create new EyeExam
        const newBookExam = new EyeExam({
            custId,
            appointmentDate,
            examType,
            doctorName,
            firstName,
            lastName,
            gender,
            dob,
            phone,
            email,
            weekday,
        });

        await newBookExam.save();

        res.status(200).json({
            success: true,
            message: "Eye Exam booked successfully",
            data: newBookExam,
        });
    } catch (error) {
        console.error("Error in addEyeExam:", error); // DEBUG
        res.status(500).json({
            success: false,
            message: "Eye Exam not conducted",
            error: error.message, // Include actual Mongoose error for debugging
        });
    }
};

//get API
const getEyeExam = async (req, res) => {
    try {
        const eyeExam = await EyeExam.find()
        return res.status(200).json({
            success: true,
            message: "EyeExam Fetched",
            eyeExam
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error
        })
    }
}


// Get all Eye Exams
const getAllEyeExam = async (req, res) => {
    try {
        const eyeExams = await EyeExam.find().sort({ createdAt: -1 }); // optional: latest first

        return res.status(200).json({
            success: true,
            message: "All Eye Exams fetched successfully",
            data: eyeExams,
        });
    } catch (error) {
        console.error("Error fetching eye exams:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch eye exams",
            error: error.message,
        });
    }
};

module.exports = { getAllEyeExam };


module.exports = {
    addEyeExam,
    getEyeExam,
    getAllEyeExam
}