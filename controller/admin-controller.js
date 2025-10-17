const User = require("../model/user-model");

exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({ _id: id, role: "admin" }).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profileImage: admin.profileImage,
        createdAt: admin.createdAt,
      },
    });
  } catch (err) {
    console.error("Get Admin Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Update admin profile
exports.updateProfile = async (req, res) => {
  try {
    //  Get admin by userId from JWT (same as vendor)
    const admin = await User.findOne({ _id: req.user.id, role: "admin" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const updateData = { ...req.body };

    //  Handle password update
    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      updateData.password = hashedPassword;
    }

    //  Handle profile image upload
    if (req.files?.profileImage) {
      updateData.profileImage = req.files.profileImage[0].filename;
    }

    //  Update admin data
    const updatedAdmin = await User.findByIdAndUpdate(
      admin._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      message: "Admin profile updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Update Admin Profile Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
