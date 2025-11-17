const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { createFrameShapes, getFrameShapes, updateFrameShapes, deleteFrameShapes } = require("../controller/frame-shapes-controller");

router.post("/addFrameShapes", upload.single("image"), createFrameShapes);
router.get("/getFrameShapes", getFrameShapes);
router.put("/updateFrameShapes/:id", upload.single("image"), updateFrameShapes);
router.delete("/deleteFrameShapes/:id", deleteFrameShapes);

module.exports = router;
