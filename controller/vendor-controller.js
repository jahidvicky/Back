const Vendor = require("../model/vendor-model");
const User = require("../model/user-model")
const bcrypt = require("bcryptjs");

// Update Vendor Profile
exports.updateProfile = async (req, res) => {
  try {
    // find vendor by userId from JWT
    const vendor = await Vendor.findOne({ userId: req.user.id });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const updateData = { ...req.body };

    // Prevent updating restricted fields
    const restrictedFields = [
      "status",
      "adminResponse",
      "ip",
      "termsAccepted",
      "createdAt",
      "updatedAt",
    ];
    restrictedFields.forEach((field) => delete updateData[field]);

    // Handle password update (update User model, not Vendor)
    if (req.body.vendorPassword) {
      const hashedPassword = await bcrypt.hash(req.body.vendorPassword, 10);
      await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });
      delete updateData.password; // remove from vendor update
    }

    // Handle uploaded files
    if (req.files) {
      if (req.files.certifications) {
        updateData.certifications = req.files.certifications.map(
          (file) => file.filename
        );
      }
      if (req.files.certificates) {
        updateData.certificates = req.files.certificates.map(
          (file) => file.filename
        );
      }
    }

    if (req.files?.profileImage) {
      updateData.profileImage = req.files.profileImage[0].filename;
    }
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendor._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      vendor: updatedVendor,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    let vendor = await Vendor.findOne({ userId: req.params.id });
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching vendor" });
  }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!deletedVendor)
      return res.status(404).json({ message: "Vendor not found" });

    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
