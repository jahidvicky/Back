const router = require("express").Router();
const controller = require("../controller/inventory.controller");

router.post("/add-stock", controller.addStock);
router.post("/move-to-processing", controller.moveToProcessing);
router.post("/move-to-finished", controller.moveToFinished);
router.get("/get-inventory", controller.getInventoryList);
router.post("/move-to-ordered", controller.moveFinishedToOrdered);
router.get(
    "/available-products/:location",
    controller.getAvailableProducts
);

module.exports = router;
