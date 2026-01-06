const express = require("express");
const router = express.Router();
const { getInventoryHistory } = require("../controller/inventoryHistory.controller");
router.get("/inventory/history/:productId", getInventoryHistory);

module.exports = router;