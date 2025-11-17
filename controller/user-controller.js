const User = require("../model/user-model");

// Get logged-in user profile
exports.getProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const user = req.user;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.user; // from auth middleware
    const { name, email, password } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : undefined;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.email = email || user.email;

    if (password && password.trim() !== "") {
      user.password = password; // raw password sent from frontend
      // this will trigger pre-save hook and hash it
    }

    if (photo) user.photo = photo;

    await user.save(); // triggers the pre-save hook

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
