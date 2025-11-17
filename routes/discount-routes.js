const express = require("express");
const { sendDiscountEmail } = require("../controller/discount-controller");

const router = express.Router();

// POST route to send discount email
router.post("/save-discount-email", sendDiscountEmail);

module.exports = router;
