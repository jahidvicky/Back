const express = require("express");
const router = express.Router();
const vendorController = require("../controller/vendor-controller");
const upload = require("../middleware/multer");
const { authMiddleware } = require("../middleware/auth-middleware");

// Get vendors
router.get("/allvendor", vendorController.getVendors);

// Get single vendor
router.get("/getVendorById/:id", vendorController.getVendorById);

// Update vendor profile (authenticated user)
router.put(
  "/vendorProfile",
  authMiddleware(),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "certifications", maxCount: 5 },
    { name: "certificates", maxCount: 5 },
  ]),
  vendorController.updateProfile
);

//Delete vendor by ID
router.delete("/deleteVendor/:id", vendorController.deleteVendor);

module.exports = router;
