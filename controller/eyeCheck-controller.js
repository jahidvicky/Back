const Eyecheck = require("../model/eye-check-model")

const createEyecheck = async (req, res) => {
    try {
        const addEyecheck = req.body;

        if (!addEyecheck || !addEyecheck.heading || !addEyecheck.description) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the details",
            });
        }

        const newEyecheck = new Eyecheck(addEyecheck);

        await newEyecheck.save();

        return res.status(200).json({
            success: true,
            message: "Eyecheck details saved successfully",
            data: newEyecheck,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};



// GET Eyecheck Details

const getEyecheck = async (req, res) => {
    try {
        const eyeCheck = await Eyecheck.find()
        return res.status(200).json({
            success: true,
            message: "Eyecheck details fetched successfully",
            eyeCheck
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        })
    }
};


//DELETE EYECHECK

const deleteEyecheck = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEyecheck = await Eyecheck.findByIdAndDelete(id);


        if (!deletedEyecheck) {
            return res.status(404).json({ message: "Eyecheck not found" })
        }
        res.status(200).json({ message: "Eyecheck deleted sucessfully", deletedEyecheck })
    } catch (error) {
        console.error("Error deleting Eyecheck:", error);
        res.status(500).json({ message: "server error" })

    }
};


//UPDATE EYECHECK
const updateEyecheck = async (req, res) => {
    try {
        const { id } = req.params;
        const { heading, description } = req.body;

        const updatedEyecheck = await Eyecheck.findByIdAndUpdate(id,
            { heading, description },
            { new: true }
        );
        if (!updatedEyecheck) {
            return res.status(404).json({ message: "Eyecheck not found" })
        } res.status(200).json({ message: "Eyecheck updated successfully" })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "server error" })
    }
}


module.exports = {
    createEyecheck,
    getEyecheck,
    deleteEyecheck,
    updateEyecheck
}