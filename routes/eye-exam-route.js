const express = require("express")
const router = express.Router()

const { addEyeExam, getEyeExam, getAllEyeExam } = require("../controller/eye-exam-controller")

router.post("/addEyeExam", addEyeExam)
router.get("/getEyeExam", getEyeExam)
router.get("/getAllEyeExam", getAllEyeExam)


module.exports = router