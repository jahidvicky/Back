const express = require("express");
const router = express.Router();
const {
    createStripePaymentIntent,
} = require("../controller/paymentController");

router.post("/payment/create-payment-intent", createStripePaymentIntent);

module.exports = router;
