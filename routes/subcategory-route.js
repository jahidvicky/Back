const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const {
  addsubcategory,
  getsubCategories,
  deletesubCategory,
  updateSubcategory,
  getSubcategoriesByCatId,
} = require("../controller/subcategory-controller");

router.post("/addsubcategory", upload.single("image"), addsubcategory);
router.get("/getallsubcategory", getsubCategories);
router.delete("/deletesubcategory/:id", deletesubCategory);
router.put("/updatesubcategory/:id", upload.single("image"), updateSubcategory);
router.get("/getSubCatByCatId/:cat_id", getSubcategoriesByCatId);


module.exports = router;
