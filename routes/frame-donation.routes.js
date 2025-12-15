const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const controller = require("../controller/frame-donation.controller");

router.post(
    "/donate-frame",
    upload.array("frameImages", 5),
    controller.createDonation
);

router.get("/community", controller.getAllDonations);
router.get("/community/:id", controller.getDonationById);

module.exports = router;
