const express = require("express")
const upload = require("../middleware/multer")
const router = express.Router()
const { createEyeService, getEyeService, updateEyeService, deleteEyeService } = require("../controller/our-eye-services-controller")

router.get("/getEyeService", getEyeService)
router.post("/addEyeService", upload.single("image"), createEyeService)
router.put("/updateEyeService/:id", upload.single("image"), updateEyeService)
router.delete("/deleteEyeService/:id", deleteEyeService)

module.exports = router