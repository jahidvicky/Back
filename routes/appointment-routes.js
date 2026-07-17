const express = require("express");
const router = express.Router();
const appointmentController = require("../controller/appointment-controller");

router.post("/bookAppointment", appointmentController.bookAppointment);
router.put("/cancelAppointment/:id", appointmentController.cancelAppointment);
router.put("/rescheduleAppointment/:id", appointmentController.rescheduleAppointment);
router.get("/getAllAppointments", appointmentController.getAllAppointments);
router.get("/myAppointments/:custId", appointmentController.getMyAppointments);

module.exports = router;