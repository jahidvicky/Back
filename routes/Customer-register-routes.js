const express = require("express");
const router = express.Router();

const { registerCustomer, fetchCustomerById, updateCustomer } = require("../controller/Customer-Register-controller");
const upload = require("../middleware/multer");

// Register route (with prescription upload)
router.post(
    "/customer-register",
    upload.single("prescriptionFile"),
    registerCustomer
);
router.get("/customer/:id", fetchCustomerById);
router.put("/updateCustomer/:id", upload.fields([
    { name: "prescriptionFile", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
]), updateCustomer)


module.exports = router;
