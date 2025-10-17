const Category = require("../model/category-model");
const SubCategory = require("../model/subcategory-model");

exports.addCategory = async (req, res) => {
  try {
    let { categoryName, subCategoryNames } = req.body;

    // Normalize subCategoryNames → always an array
    if (typeof subCategoryNames === "string") {
      subCategoryNames = subCategoryNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const newCategory = new Category({
      categoryName,
      subCategoryNames: subCategoryNames || [], // ensure empty array if not provided
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      category: newCategory,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// Fetch all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

// Update category (all fields)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, subCategoryNames } = req.body;

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update fields
    category.categoryName = categoryName || category.categoryName;
    category.subCategoryNames = subCategoryNames || category.subCategoryNames;
    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update category",
      error: error.message,
    });
  }
};



exports.getAllCategoriesWithSub = async (req, res) => {
  try {
    const categories = await Category.find();

    const result = await Promise.all(
      categories.map(async (cat) => {
        const subs = await SubCategory.find({ categoryId: cat._id });
        return { ...cat.toObject(), subCategories: subs };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};