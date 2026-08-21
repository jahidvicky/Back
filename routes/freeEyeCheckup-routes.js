const express = require("express")

const {
    getEyeCheckup,
    createEyeCheckup,
    getEyeCheckupSettings,
    updateEyeCheckupSettings,
} = require("../controller/freeEyeCheckup-controller")
const router = express.Router()

router.get("/getEyeCheckup", getEyeCheckup)
router.post("/addEyeCheckup", createEyeCheckup)

// Settings (public GET for frontend banner, PUT for admin toggle)
router.get("/getEyeCheckupSettings", getEyeCheckupSettings)
router.put("/updateEyeCheckupSettings", updateEyeCheckupSettings)


module.exports = router