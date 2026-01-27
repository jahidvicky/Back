const express = require("express");
const router = express.Router();
const { handleStripeWebhook } = require("../controller/stripeWebhook");

router.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
);

module.exports = router;