const express = require("express")
const router = express.Router()
const upload = require("../middleware/multer")
const { createEyewearTips, getEyewearTips, updateEyewearTips, deleteEyewearTips } = require("../controller/eyewearTips-controller")


router.get("/getEyewearTips", getEyewearTips)
router.post("/addEyewearTips", upload.single("image"), createEyewearTips)
router.put("/updateEyewearTips/:id", upload.single("image"), updateEyewearTips)
router.delete("/deleteEyewearTips/:id", deleteEyewearTips)

module.exports = router