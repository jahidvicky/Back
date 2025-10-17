const SubCategory = require("../model/subcategory-model")
const Category = require("../model/category-model");

exports.updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // If a new image is uploaded, save it
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updatedSubcategory = await SubCategory.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedSubcategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SubCategory updated successfully",
      data: updatedSubcategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while updating subcategory",
      error: error.message,
    });
  }
};


exports.deletesubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await SubCategory.findByIdAndDelete(id);
    if (!category) {
      return res.status(400).json({
        message: "SubCategory Not Found"
      })
    }
    res.status(200).json({ message: "SubCategory deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete subcategory",
      error: error.message,
    });
  }
};


exports.addsubcategory = async (req, res) => {
  try {
    let subCategoryData = { ...req.body };

    // Allow either cat_id or cat_sec (categoryName)
    let category;
    if (subCategoryData.cat_id) {
      category = await Category.findById(subCategoryData.cat_id);
    } else if (subCategoryData.cat_sec) {
      category = await Category.findOne({ categoryName: subCategoryData.cat_sec });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid category (ID or Name)",
      });
    }

    // Assign cat_id reference
    subCategoryData.cat_id = category._id;

    // handle file upload (multer)
    if (req.file) {
      subCategoryData.image = req.file.filename;
    }

    // Save Subcategory
    const subcategory = new SubCategory(subCategoryData);
    const savedsubcategory = await subcategory.save();

    return res.status(201).json({
      success: true,
      message: "SubCategory added successfully",
      data: savedsubcategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while adding subcategory",
      error: error.message,
    });
  }
};



exports.getsubCategories = async (req, res) => {
  try {
    const subcategory = await SubCategory.find().sort({ createdAt: -1 });
    res.status(200).json({ subcategory });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};




exports.getSubcategoriesByCatId = async (req, res) => {
  try {
    const { cat_id } = req.params; // e.g. "Shop By Category"
    const subcategories = await SubCategory.find({ cat_id });

    if (!subcategories) {
      return res.status(400).json({ message: "No subcategories found" });
    }
    res.status(200).json({
      success: true,
      subcategories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};