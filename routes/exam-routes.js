const express = require("express");
const router = express.Router();
const examController = require("../controller/exam-controller");

router.post("/createExam", examController.createExam);
router.get("/getExam", examController.getExams);
router.put("/updateExam/:id", examController.updateExam);
router.delete("/deleteExam/:id", examController.deleteExam);

module.exports = router;
