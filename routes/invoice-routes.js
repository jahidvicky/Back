const express = require("express");
const { getInvoice } = require("../controller/invoice-controller");


const router = express.Router();

router.get("/:id/invoice", getInvoice);

module.exports = router;
