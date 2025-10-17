const express = require("express");
const upload = require("../middleware/multer")
const router = express.Router();
const { createTestimonial, getTestimonial, updateTestimonial, deleteTestimonial } = require("../controller/testimonial-controller")

router.get("/getTestimonial", getTestimonial)
router.post("/addTesimonial", upload.single("image"), createTestimonial)
router.put("/updateTestimonial/:id", upload.single("image"), updateTestimonial);
router.delete("/deleteTestimonial/:id", deleteTestimonial)

module.exports = router;