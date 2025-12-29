const express = require("express");
const router = express.Router();
const { getInventoryHistory } = require("../controller/inventoryHistory.controller");
router.get("/inventory/history", getInventoryHistory);

module.exports = router;