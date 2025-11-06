const Brand = require("../model/brand-model");

// ADD BRAND 
const addBrand = async (req, res) => {
    try {
        const { category, brand } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!category || !brand) {
            return res
                .status(400)
                .json({ success: false, message: "Please provide Category and Brand name" });
        }

        const newBrand = new Brand({
            category,
            brand,
            image,
        });

        await newBrand.save();
        res.status(201).json({
            success: true,
            message: "Brand added successfully",
            data: newBrand,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

//GET ALL BRANDS 
const getBrands = async (req, res) => {
    try {
        const brands = await Brand.find().sort({ _id: -1 });
        res.status(200).json({ success: true, data: brands });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


const updateBrands = async (req, res) => {
    try {
        const { id } = req.params;
        const { category, brand } = req.body;
        const image = req.file ? req.file.filename : undefined;

        const updatedBrand = await Brand.findByIdAndUpdate(
            id,
            { category, brand, ...(image && { image }) },
            { new: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        res.status(200).json({
            success: true,
            message: "Brand updated successfully",
            data: updatedBrand,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// DELETE BRAND
const deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedBrand = await Brand.findByIdAndDelete(id);
        if (!deletedBrand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        res.status(200).json({
            success: true,
            message: "Brand deleted successfully",
            data: deletedBrand,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

module.exports = {
    addBrand,
    getBrands,
    updateBrands,
    deleteBrand
}
