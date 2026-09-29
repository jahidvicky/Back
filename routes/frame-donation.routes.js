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

// router.get("/community/:id", controller.getDonationById);

router.post(
    "/community/:id/arrange-pickup",
    controller.arrangePickup
);

router.get(
    "/community/:id/pickup-status",
    controller.checkPickupStatus
);

router.get(
    "/donate-frame/pickup/:token",
    controller.getCustomerPickupStatus
);

router.get(
    "/community/my-donations/:userId",
    controller.getMyDonations
);

module.exports = router;
