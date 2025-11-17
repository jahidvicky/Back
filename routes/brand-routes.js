const express = require("express")
const router = new express.Router()
const upload = require("../middleware/multer")
const { getBrands, addBrand, updateBrands, deleteBrand } = require("../controller/brand-controller")

router.get("/getBrand", getBrands)
router.post("/addBrand", upload.single("image"), addBrand)
router.put("/updateBrand/:id", upload.single("image"), updateBrands)
router.delete("/deleteBrand/:id", deleteBrand)

module.exports = router