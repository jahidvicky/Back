const express = require("express");
const router = express.Router();
const doctorController = require("../controller/doctor-controller");
const upload = require("../middleware/multer")

router.post("/addDoctor", upload.single("image"), doctorController.createDoctor);
router.get("/getDoctor", doctorController.getDoctors);
router.put("/updateDoctor/:id", upload.single("image"), doctorController.updateDoctor);
router.delete("/deleteDoctor/:id", doctorController.deleteDoctor);

// Schedule / Availability routes
router.get("/getSchedule/:id/schedule", doctorController.getSchedule);
router.put("/updateSchedule/:id/schedule", doctorController.updateSchedule);
router.post("addSlot/:id/schedule/slot", doctorController.addSlot);
router.put("/updateSlotStatus/:id/schedule/slot", doctorController.updateSlotStatus);
router.delete("/deleteSlot/:id/schedule/slot", doctorController.deleteSlot);

module.exports = router;
