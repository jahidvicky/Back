const express = require("express");
const router = express.Router();

const loomisController = require("../controller/loomisController");

router.post("/rate", loomisController.getRates);
router.post("/available-services", loomisController.getAvailableServices);
router.get("/rates/:orderId", loomisController.getRatesForOrder);

router.post("/create/:orderId", loomisController.createShipment);
router.post("/void/:orderId", loomisController.voidShipment);
router.post("/return/:orderId", loomisController.createReturnShipment);

router.get("/track/:tracking", loomisController.trackShipment);
router.get("/track-by-reference/:reference", loomisController.trackByReference);

router.get("/label/:id", loomisController.getLabel);

router.post("/pickup/:orderId", loomisController.schedulePickup);
router.delete("/cancel-pickup/:orderId", loomisController.cancelPickup);
router.get("/pickup-days", loomisController.getPickupDay);
router.get("/pickup-search/:confirmationId", loomisController.searchPickupById);
router.get("/pickup-history", loomisController.searchPickupByDate);
router.post("/delivery-estimate", loomisController.getDeliveryEstimate);

router.post("/validate-address", loomisController.validateAddress);
router.post("/end-of-day", loomisController.endOfDay);
router.get("/manifest/:manifestNum", loomisController.getManifestPdf);

module.exports = router;