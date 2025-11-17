const express = require("express");
const { getAllInquiry, addInquiry, sendResponse, sendResponseAndRegister, getVedorById } = require("../controller/inquiry-controller");
const router = express.Router();
const upload = require("../middleware/multer")

router.get("/getAllInquiry", getAllInquiry);
router.post("/addInquiry", upload.single("uploadDocument"), addInquiry);
router.post("/sendResponse", sendResponse);
router.post("/sendResponseAndRegister", sendResponseAndRegister);

module.exports = router;