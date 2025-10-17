const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer"); // your multer config

const { authMiddleware } = require("../middleware/auth-middleware");
const { updateCompProfile, getCompanyById, getAllCompany } = require("../controller/company-controller");


//get All company
router.get("/getAllCompany", getAllCompany);

// Get single company
router.get("/getCompanyById/:id", getCompanyById);

// Update company profile (authenticated user)
router.put(
  "/companyProfile/:id",
  authMiddleware(),
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "signedAgreement", maxCount: 1 },
    { name: "licenseProof", maxCount: 1 },
    { name: "voidCheque", maxCount: 1 }
  ]),
  updateCompProfile
);









module.exports = router;
