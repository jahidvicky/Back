const Company = require("../model/compnay-model");
const User = require("../model/user-model")
const bcrypt = require("bcryptjs");
// Get all companies
exports.getAllCompany = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get company by ID
exports.getCompanyById = async (req, res) => {
  try {
    let company = await Company.findOne({ userId: req.params.id });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching vendor" });
  }
};

// Update company
exports.updateCompany = async (req, res) => {
  try {
    const updated = await Company.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        signedAgreement: req.files?.agreementFile?.[0]?.path || req.body.signedAgreement,
        licenseProof: req.files?.licenseProof?.[0]?.path || req.body.licenseProof,
        voidCheque: req.files?.voidCheque?.[0]?.path || req.body.voidCheque,
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, company: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete company
exports.deleteCompany = async (req, res) => {
  try {
    const deleted = await Company.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Company deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.updateCompProfile = async (req, res) => {
  try {
    // Find company by userId
    const company = await Company.findOne({ userId: req.params.id });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Copy request body
    const updateData = { ...req.body };

    // Restricted fields that cannot be updated
    const restrictedFields = [
      "status",
      "adminResponse",
      "agreementAccepted",
      "createdAt",
      "updatedAt",
      "userId",
    ];
    restrictedFields.forEach((field) => delete updateData[field]);

    // Force postalCode, city, province to be strings
    ["postalCode", "city", "province"].forEach((field) => {
      if (updateData[field]) {
        // If array, take first value; otherwise convert to string
        updateData[field] = Array.isArray(updateData[field])
          ? String(updateData[field][0])
          : String(updateData[field]);
      }
    });


    // Handle password update (update User model)
    if (req.body.companyPassword) {
      const hashedPassword = await bcrypt.hash(req.body.companyPassword, 10);
      await User.findByIdAndUpdate(company.userId, { password: hashedPassword });
      delete updateData.companyPassword;
    }

    // Handle profile image upload
    if (req.files?.profileImage?.[0]) {
      updateData.profileImage = req.files.profileImage[0].filename;
    }

    // Handle other uploaded files
    if (req.files) {
      if (req.files.licenseProof?.[0]) {
        updateData.licenseProof = req.files.licenseProof[0].filename;
      }
      if (req.files.signedAgreement?.[0]) {
        updateData.signedAgreement = req.files.signedAgreement[0].filename;
      }
      if (req.files.voidCheque?.[0]) {
        updateData.voidCheque = req.files.voidCheque[0].filename;
      }
    }

    // Update company document in database
    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
