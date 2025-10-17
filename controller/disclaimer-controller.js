const disclaimer = require("../model/disclaimer-model")


//Create API
const createDisclaimer = async (req, res) => {
    try {
        const { description } = req.body
        if (!description) {
            return res.status(400).json({ success: false, message: "Please fill all details" })
        }
        const image = req.file ? req.file.filename : null;
        const newDisclaimer = new disclaimer({
            description,
            image
        })

        await newDisclaimer.save()

        res.status(200).json({
            success: true,
            message: "Disclaimer Data created successfully",
            data: newDisclaimer
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Disclaimer Data not created"
        })
    }
}


//Get API
const getDisclaimer = async (req, res) => {
    try {
        const disclaimerData = await disclaimer.find()
        return res.status(200).json({
            success: true,
            message: "Disclaimer Data fetched successfully",
            disclaimerData
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Disclaimer Data not fetched"
        })
    }
}


//Update API
const updateDisclaimer = async (req, res) => {
    try {
        const { id } = req.params
        const { description } = req.body
        const updateFields = {
            description: description
        }
        if (req.file) {
            updateFields.image = req.file.filename
        }
        const updatedDisclaimer = await disclaimer.findByIdAndUpdate(id, updateFields)
        if (!updatedDisclaimer) {
            return res.status(400).json({
                success: false,
                message: "Disclaimer Data not found"
            })
        } res.status(200).json({
            success: true,
            message: "Disclaimer Data update Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "server error"
        })
    }
}


//delete API
const deleteDisclaimer = async (req, res) => {
    try {
        const { id } = req.params
        const deletedDisclaimer = await disclaimer.findByIdAndDelete(id)
        if (!deletedDisclaimer) {
            return res.status(400).json({
                success: false,
                message: "Disclaimer Data not found"
            })
        } res.status(200).json({
            success: true,
            message: "Disclaimer Data Deleted successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "server error"
        })
    }
}

module.exports = {
    createDisclaimer,
    getDisclaimer,
    updateDisclaimer,
    deleteDisclaimer
}