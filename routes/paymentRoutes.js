// Back/routes/paymentRoutes.js
const express = require("express");
const { createSquarePayment } = require("../controller/paymentController");

const router = express.Router();

router.post("/pay", createSquarePayment);

module.exports = router;
