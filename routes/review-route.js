const express = require("express");
const upload = require("../middleware/multer");
const { getReviews, createReview, updateReview } = require("../controller/review-controller");
const router = express.Router();
const { protect, allowRoles } = require("../middleware/auth-middleware");

router.post("/createreviews", protect, allowRoles("admin"), upload.single("image"), createReview);
router.get('/getreview', getReviews);
router.put("/updatereviews/:id", protect, allowRoles("admin"), upload.single("image"), updateReview);
module.exports = router;
