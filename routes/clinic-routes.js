const express = require("express");
const router = express.Router();
const clinicController = require("../controller/clinic-controller");

router.post("/createClinic", clinicController.createClinic);
router.get("/getClinics", clinicController.getClinics);
router.put("/updateClinic/:id", clinicController.updateClinic);
router.delete("/deleteClinic/:id", clinicController.deleteClinic);
router.post("/assignDoctorToClinic", clinicController.assignDoctorToClinic);

module.exports = router;