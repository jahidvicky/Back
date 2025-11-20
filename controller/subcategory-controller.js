const SubCategory = require("../model/subcategory-model");
const Category = require("../model/category-model");
const fs = require("fs");
const path = require("path");
// Helper: Convert uploaded image path to correct relative path
const getImagePath = (file) => {
  if (!file) return "";
  return `${file.filename}`;
};

// Add subcategory
exports.addsubcategory = async (req, res) => {
  try {
    const { category, name, slug, description } = req.body;

    if (!category || !name) {
      return res.status(400).json({
        success: false,
        message: "Category ID and subcategory name are required",
      });
    }

    if (!category.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    const image = getImagePath(req.file); // FIX

    const subCategoryData = {
      category,
      name: name.trim(),
      slug: slug ? slug.trim().toLowerCase() : name.trim().toLowerCase(),
      description: description ? description.trim() : "",
      image,
      isActive: true,
    };

    const subcategory = new SubCategory(subCategoryData);
    const savedSubcategory = await subcategory.save();

    await Category.findByIdAndUpdate(
      category,
      { $push: { subCategories: savedSubcategory._id } },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: "SubCategory added successfully",
      data: savedSubcategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while adding subcategory",
      error: error.message,
    });
  }
};

// Get all subcategories
exports.getsubCategories = async (req, res) => {
  try {
    const subcategories = await SubCategory.find()
      .populate("category")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      subcategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
    });
  }
};

// Get subcategories by category ID
exports.getSubcategoriesByCatId = async (req, res) => {
  try {
    const { cat_id } = req.params;

    if (!cat_id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const subcategories = await SubCategory.find({ category: cat_id })
      .populate("category")
      .sort({ createdAt: -1 });

    if (!subcategories.length) {
      return res.status(404).json({
        success: false,
        message: "No subcategories found for this category",
      });
    }

    res.status(200).json({
      success: true,
      subcategories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategories",
      error: err.message,
    });
  }
};

// Get single subcategory by ID
exports.getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID format",
      });
    }

    const subcategory = await SubCategory.findById(id).populate("category");

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found",
      });
    }

    res.status(200).json({
      success: true,
      data: subcategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subcategory",
      error: error.message,
    });
  }
};

// Update subcategory
exports.updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      categoryName,
      subCategoryName,
      description,
      oldImage, // "" when user clicks remove icon
    } = req.body;

    // Validate ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID format",
      });
    }

    const subcategory = await SubCategory.findById(id);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found",
      });
    }

    // Find category
    const categoryDoc = await Category.findOne({
      categoryName: categoryName,
    });

    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    // -------------------------------
    //  UPDATE BASIC FIELDS
    // -------------------------------
    subcategory.category = categoryDoc._id;
    subcategory.name = subCategoryName;
    subcategory.description = description;

    // -------------------------------
    //  IMAGE HANDLING
    // -------------------------------

    // CASE 1: User removed old image and no new image uploaded
    if (oldImage === "" && !req.file) {
      // delete old file from server
      if (subcategory.image) {
        const filePath = path.join("uploads", subcategory.image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      subcategory.image = "";
    }

    // CASE 2: User uploaded a new image
    if (req.file) {
      // delete old file
      if (subcategory.image) {
        const filePath = path.join("uploads", subcategory.image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      // save new file
      subcategory.image = getImagePath(req.file);
    }

    // CASE 3: User kept the old image → do nothing

    await subcategory.save();

    return res.status(200).json({
      success: true,
      message: "SubCategory updated successfully",
      data: subcategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating SubCategory",
      error: error.message,
    });
  }
};


// Delete subcategory
exports.deletesubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID format",
      });
    }

    const subcategory = await SubCategory.findByIdAndDelete(id);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found",
      });
    }

    await Category.findByIdAndUpdate(
      subcategory.category,
      { $pull: { subCategories: id } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "SubCategory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete subcategory",
      error: error.message,
    });
  }
};
