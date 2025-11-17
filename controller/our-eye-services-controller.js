const eyeService = require("../model/our-eye-service-model")

//Create API
const createEyeService = async (req, res) => {
    try {
        const { heading, description } = req.body
        if (!heading || !description) {
            return res.status(400).json({ success: false, message: "Please fill all the details" })
        }
        const image = req.file ? req.file.filename : null;
        const newEyeService = new eyeService({
            heading,
            description,
            image
        });

        await newEyeService.save();

        res.status(200).json({
            success: true,
            message: "Eye Service saved successfully",
            data: newEyeService
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Eye Service not created"
        })
    }
}


//Get API
const getEyeService = async (req, res) => {
    try {
        const EyeServiceData = await eyeService.find()

        return res.status(200).json({
            success: true,
            message: "Eye Service fetched successfully",
            EyeServiceData
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "EyeService not fetched"
        })
    }
}


//Update API
const updateEyeService = async (req, res) => {
    try {
        const { id } = req.params
        const { heading, description } = req.body
        const updateFields = {
            heading: heading,
            description: description
        }
        if (req.file) {
            updateFields.image = req.file.filename
        }

        const updatedEyeService = await eyeService.findByIdAndUpdate(id, updateFields,
            { new: true, runValidators: true })
        if (!updatedEyeService) {
            res.status(400).json({
                success: false,
                message: "Eye Service not found"
            })
        } res.status(200).json({ success: true, message: "Eye Service updated successfully" })
    } catch (error) {
        res.status(500).json({ message: "Servor Error" })
    }
}

//Delete API
const deleteEyeService = async (req, res) => {
    try {
        const { id } = req.params
        const deletedEyeService = await eyeService.findByIdAndDelete(id)
        if (!deletedEyeService) {
            return res.status(400).json({
                success: false, message: "Eye Service not found"
            })
        } res.status(200).json({ success: true, message: "Eye Service deleted successfully" })
    } catch (error) {
        res.status(500).json({ message: "Servor error" })
    }
}


module.exports = {
    createEyeService,
    getEyeService,
    updateEyeService,
    deleteEyeService
}