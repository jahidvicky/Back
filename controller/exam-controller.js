const Exam = require("../model/exam-model");

// Create Exam
exports.createExam = async (req, res) => {

    try {
        const addExam = req.body;
        if (!addExam) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the details",
            });
        }
        const exam = new Exam(addExam);
        await exam.save();
        res.status(200).json({ success: true, message: "exam conducted successfully", data: exam });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get All Exams
exports.getExams = async (req, res) => {
    try {
        const exams = await Exam.find();
        res.json({ success: true, data: exams });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Exam
exports.updateExam = async (req, res) => {
    try {
        const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: exam });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Exam
exports.deleteExam = async (req, res) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Exam deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
