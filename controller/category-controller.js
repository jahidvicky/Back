const Category = require("../model/category-model");
const SubCategory = require("../model/subcategory-model");
const path = require("path");
const fs = require("fs");

const getImagePath = (file) => {
  if (!file) return "";
  return `${file.filename}`;
}

// Add Category with Image
exports.addCategory = async (req, res) => {
  try {
    const { categoryName, subCategoryNames } = req.body;

    const categoryImage = getImagePath(req.file);

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const name = categoryName.trim();

    // CASE-INSENSITIVE CHECK
    const existingCategory = await Category.findOne({
      categoryName: { $regex: `^${name}$`, $options: "i" }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const normalizedSubCategoryNames = subCategoryNames
      ? (Array.isArray(subCategoryNames)
        ? subCategoryNames
        : subCategoryNames.split(","))
        .map(s => s.trim())
        .filter(Boolean)
      : [];

    const newCategory = new Category({
      categoryName: name,
      categoryImage,
      subCategoryNames: normalizedSubCategoryNames,
      subCategories: [],
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      category: newCategory,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




// Fetch all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("subCategories")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Optional: Delete associated subcategories
    await SubCategory.deleteMany({ category: id });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

// Update category (all fields)

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      categoryName,
      subCategoryNames,
      oldImage,   // "" when user clicks remove button
    } = req.body;

    // Validate MongoDB ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    // Find category
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // -------------------------------
    //  UPDATE BASIC FIELDS
    // -------------------------------
    if (categoryName) category.categoryName = categoryName.trim();

    if (subCategoryNames) {
      category.subCategoryNames = Array.isArray(subCategoryNames)
        ? subCategoryNames
        : subCategoryNames.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // -------------------------------
    //  IMAGE HANDLING (3 CASES)
    // -------------------------------

    // CASE 1: If user clicked remove → delete image
    if (oldImage === "" && !req.file) {
      if (category.categoryImage) {
        const filePath = path.join("uploads", category.categoryImage);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      category.categoryImage = "";
    }

    // CASE 2: User uploaded a NEW image
    else if (req.file) {
      if (category.categoryImage) {
        const filePath = path.join("uploads", category.categoryImage);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      category.categoryImage = getImagePath(req.file);
    }

    // CASE 3: User kept old image → KEEP the old one
    else {
      category.categoryImage = category.categoryImage;
    }


    // Save changes
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// Get all categories with subcategories (populated)
exports.getAllCategoriesWithSub = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("subCategories")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories with subcategories",
      error: err.message,
    });
  }
};

// Get category by ID with populated subcategories
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(id).populate("subCategories");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};






// Fetch all categories with subcategories (alphabetically sorted)
exports.getCategoriesWithSub = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate({
        path: "subCategories",
        model: "SubCategory",
        options: { sort: { name: 1 } }  // Sort subcategories A → Z
      })
      .sort({ categoryName: 1 }); // Sort categories A → Z

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories with subcategories",
      error: error.message,
    });
  }
};


