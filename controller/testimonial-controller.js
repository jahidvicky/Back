const Testimonial = require("../model/testimonial-model")



//Create Testimonial
const createTestimonial = async (req, res) => {
    try {
        const { fullName, description, heading, rating } = req.body;

        if (!fullName || !heading || !description || !rating) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the details"
            });
        }

        // Rating validation
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const image = req.file ? req.file.filename : null;

        const newTestimonial = new Testimonial({
            fullName,
            heading,
            description,
            rating,
            image
        });

        await newTestimonial.save();

        return res.status(200).json({
            success: true,
            message: "Testimonial details saved successfully",
            data: newTestimonial,
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


//Add testimonial
const getTestimonial = async (req, res) => {
    try {
        const testimonial = await Testimonial.find()
        return res.status(200).json({
            success: true,
            message: "Testimonial fetched successfully",
            testimonial
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error,
        })
    }

}


//Update testimonial
const updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, heading, description, rating } = req.body;

        // Rating validation
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const updateFields = {
            fullName,
            heading,
            description,
            rating,
        };

        if (req.file) {
            updateFields.image = req.file.filename;
        }

        const updatedTestimonial = await Testimonial.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!updatedTestimonial) {
            return res.status(400).json({ message: "Testimonial not found" });
        }

        res.status(200).json({ message: "Testimonial updated successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};



//delete testimonial
const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params
        const deletedTestimonial = await Testimonial.findByIdAndDelete(id);

        if (!deletedTestimonial) {
            return res.status(400).json({ message: "Testimonial not found" })
        } res.status(200).json({ message: "Testimonial deleted successfully" })
    } catch (error) {
        console.log("Testimonial deleting error", error)
        res.status(500).json({ message: "server error" })
    }
}


module.exports = {
    createTestimonial,
    getTestimonial,
    updateTestimonial,
    deleteTestimonial
}