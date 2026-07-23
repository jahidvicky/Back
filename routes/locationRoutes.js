const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { protect, allowRoles } = require("../middleware/auth-middleware");
const {
    getLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
} = require("../controller/locationController");

// Public — used by the storefront AllLocations page
router.get("/", getLocations);
router.get("/:id", getLocationById);

// Admin only
router.post("/", protect, allowRoles("admin"), upload.single("image"), createLocation);
router.put("/:id", protect, allowRoles("admin"), upload.single("image"), updateLocation);
router.delete("/:id", protect, allowRoles("admin"), deleteLocation);

module.exports = router;