const express = require("express");
const router = express.Router();
const { getAllClaims, updateClaimStatus, createClaim, getClaimByCustOrder, getClaimById } = require("../controller/insuranceClaimController");
const { authMiddleware } = require("../middleware/auth-middleware");
const upload = require("../middleware/multer");


// Insurance company admin routes
router.get("/claims", getAllClaims);
router.get("/getClaimByOrder", getClaimByCustOrder);
router.get("/claims/:claimId", getClaimById);
router.post(
    "/submitClaim",
    upload.fields([{ name: "photos", maxCount: 5 }]),
    createClaim
);
router.put("/claims/:claimId", updateClaimStatus);


module.exports = router;
