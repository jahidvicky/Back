const express = require("express");
const router = express.Router();
const paypalController = require("../controller/paypal-controller");

router.post("/webhook", express.json({ type: "*/*" }), paypalController.handlePayPalWebhook);

module.exports = router;
