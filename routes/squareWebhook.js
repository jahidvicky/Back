const express = require("express");
const router = express.Router();
const { handleSquareWebhook } = require("../controller/squareWebhook");

// IMPORTANT: Webhooks need RAW BODY before express.json()
router.post(
    "/webhooks/square",
    express.raw({ type: "application/json" }),
    handleSquareWebhook
);

module.exports = router;
