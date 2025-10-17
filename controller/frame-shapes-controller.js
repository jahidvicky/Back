const frameShapes = require("../model/frame-shapes-model")

// Create API
const createFrameShapes = async (req, res) => {
    try {
        const { frameName } = req.body;
        if (!frameName) {
            return res.status(400).json({ success: false, message: "Please fill all the details" });
        }

        const image = req.file ? req.file.filename : null;

        const newFrameShapes = new frameShapes({ frameName, image });
        await newFrameShapes.save();

        res.status(201).json({ success: true, message: "Frame Shape created successfully", data: newFrameShapes });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Frame Shape not created", error: error.message });
    }
};

// Get API
const getFrameShapes = async (req, res) => {
    try {
        const frameShapesData = await frameShapes.find();
        return res.status(200).json({
            success: true,
            message: "Frame Shapes fetched successfully",
            frameShapesData,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Frame Shapes not fetched",
        });
    }
};

// Update API
const updateFrameShapes = async (req, res) => {
    try {
        const { id } = req.params;
        const { frameName } = req.body;

        const updateFields = { frameName };
        if (req.file) {
            updateFields.image = req.file.filename;
        }

        const updatedFrameShapes = await frameShapes.findByIdAndUpdate(id, updateFields, {
            new: true,
            runValidators: true,
        });

        if (!updatedFrameShapes) {
            return res.status(404).json({
                success: false,
                message: "Frame Shape not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Frame Shape updated successfully",
            data: updatedFrameShapes,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// Delete API
const deleteFrameShapes = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFrameShapes = await frameShapes.findByIdAndDelete(id);

        if (!deletedFrameShapes) {
            return res.status(404).json({ success: false, message: "Frame Shape not found" });
        }

        res.status(200).json({ success: true, message: "Frame Shape deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = {
    createFrameShapes,
    getFrameShapes,
    updateFrameShapes,
    deleteFrameShapes,
};
