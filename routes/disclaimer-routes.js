const express = require("express")
const router = express.Router()
const upload = require("../middleware/multer")

const { createDisclaimer, getDisclaimer, updateDisclaimer, deleteDisclaimer } = require("../controller/disclaimer-controller")

router.post("/addDisclaimer", upload.single("image"), createDisclaimer)
router.get("/getDisclaimer", getDisclaimer)
router.put("/updateDisclaimer/:id", upload.single("image"), updateDisclaimer)
router.delete("/deleteDisclaimer/:id", deleteDisclaimer)


module.exports = router