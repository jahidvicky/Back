const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const {
    addCategory,
    getCategories,
    deleteCategory,
    updateCategory,
    getCategoryById,
    getAllCategoriesWithSub,
    getCategoriesWithSub,
} = require("../controller/category-controller");
const { protect, allowRoles } = require("../middleware/auth-middleware");

// Add category with image upload
router.post(
    "/addcategory",
    protect,
    allowRoles("admin"),
    upload.single("categoryImage"),
    addCategory
);

// Get all categories
router.get("/getcategories", getCategories);

// Get all categories with subcategories populated
router.get("/all-with-sub", getAllCategoriesWithSub);

// Get category by ID
router.get("/getCategoryById/:id", getCategoryById);

// Update category with optional image upload
router.put(
    "/updatecategory/:id",
    protect,
    allowRoles("admin"),
    upload.single("categoryImage"),
    updateCategory
);

// Delete category
router.delete(
    "/deletecategory/:id",
    protect,
    allowRoles("admin"),
    deleteCategory
);


router.get("/categories-with-sub", getCategoriesWithSub);


module.exports = router;
