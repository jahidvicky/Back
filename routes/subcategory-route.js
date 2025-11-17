const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const {
  addsubcategory,
  getsubCategories,
  deletesubCategory,
  updateSubcategory,
  getSubcategoriesByCatId,
  getSubcategoryById,
} = require("../controller/subcategory-controller");
const { protect, allowRoles } = require("../middleware/auth-middleware");

// Add subcategory with image upload (admin only)
router.post(
  "/addsubcategory",
  protect,
  allowRoles("admin"),
  upload.single("image"),
  addsubcategory
);

// Get all subcategories
router.get("/getallsubcategory", getsubCategories);

// Get subcategories by category ID
router.get("/getSubCatByCatId/:cat_id", getSubcategoriesByCatId);

// Get subcategory by ID
router.get("/getsubcategory/:id", getSubcategoryById);

// Update subcategory with optional image upload (admin only)
router.put(
  "/updatesubcategory/:id",
  protect,
  allowRoles("admin"),
  upload.single("image"),
  updateSubcategory
);

// Delete subcategory (admin only)
router.delete(
  "/deletesubcategory/:id",
  protect,
  allowRoles("admin"),
  deletesubCategory
);

module.exports = router;
