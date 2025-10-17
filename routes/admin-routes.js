const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin-controller");
const multer = require("multer");
const { authMiddleware } = require("../middleware/auth-middleware");



const upload = multer({ dest: "uploads/" });

// Get single admin by ID (role-based access)
router.get(
  "/getAdminById/:id",
  authMiddleware(["admin"]), // only admin can access
  adminController.getAdminById
);

router.put(
  "/adminProfile",
  authMiddleware(),
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  adminController.updateProfile
);

module.exports = router;
