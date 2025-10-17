const express = require("express");
const { updateProfile, getProfile } = require("../controller/user-controller");
const { authMiddleware } = require("../middleware/auth-middleware");

const router = express.Router();


const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.get(
  "/profile",
  authMiddleware(["vendor", "company", "admin"]),
  getProfile
);

router.put("/profile", authMiddleware(["vendor", "company", "admin"]), upload.single("photo"), updateProfile);


// router.put("/profile", authMiddleware(["vendor", "company", "admin"]), updateProfile);

module.exports = router;
