const router = require("express").Router();
const controller = require("../controller/inventory.controller");

/* =========================
   STOCK MANAGEMENT
========================= */
router.post("/add-stock", controller.addStock);
router.post("/move-to-processing", controller.moveToProcessing);
router.post("/move-to-finished", controller.moveToFinished);
router.post("/move-to-ordered", controller.moveFinishedToOrdered);

/* =========================
   INVENTORY
========================= */
router.get("/get-inventory", controller.getInventoryList);

/* =========================
   AVAILABLE PRODUCTS
========================= */
//  PLP (global stock)
router.get(
  "/available-products",
  controller.getAvailableProducts
);

//  Checkout (location stock)
router.get(
  "/available-products/:location",
  controller.getAvailableProducts
);

/* =========================
   RESYNC
========================= */
router.get("/resync-products", controller.resyncProductStock);

module.exports = router;
