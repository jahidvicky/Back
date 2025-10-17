const express = require("express");
const router = express.Router();
const { getEyecheck, createEyecheck, deleteEyecheck, updateEyecheck } = require("../controller/eyeCheck-controller")

router.get('/getEyecheck', getEyecheck)
router.post('/addEyecheck', createEyecheck)
router.delete('/deleteEyecheck/:id', deleteEyecheck)
router.put('/updateEyecheck/:id', updateEyecheck)

module.exports = router;