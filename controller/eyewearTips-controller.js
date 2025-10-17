const eyewearTips = require("../model/eyewearTips-model");

// Create API
const createEyewearTips = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: "Please fill all the details" });
        }

        const image = req.file ? req.file.filename : null;

        const newEyewearTips = new eyewearTips({
            title,
            description,
            image,
        });

        await newEyewearTips.save();

        res.status(201).json({
            success: true,
            message: "EyewearTips saved successfully",
            data: newEyewearTips,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get API
const getEyewearTips = async (req, res) => {
    try {
        const tips = await eyewearTips.find();

        res.status(200).json({
            success: true,
            message: "Eyewear fetched successfully",
            EyewearTips: tips,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update API
const updateEyewearTips = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        const updateFields = { title, description };
        if (req.file) updateFields.image = req.file.filename;

        const updated = await eyewearTips.findByIdAndUpdate(id, updateFields, {
            new: true,
            runValidators: true,
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: "EyewearTips not found" });
        }

        res.status(200).json({
            success: true,
            message: "EyewearTips updated successfully",
            data: updated,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete API
const deleteEyewearTips = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await eyewearTips.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "EyewearTips not found" });
        }

        res.status(200).json({ success: true, message: "EyewearTips deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createEyewearTips,
    getEyewearTips,
    updateEyewearTips,
    deleteEyewearTips,
};
