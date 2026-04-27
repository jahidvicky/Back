const express = require("express")

const { getEyeCheckup, createEyeCheckup } = require("../controller/freeEyeCheckup-controller")
const router = express.Router()

router.get("/getEyeCheckup", getEyeCheckup)
router.post("/addEyeCheckup", createEyeCheckup)


module.exports = router