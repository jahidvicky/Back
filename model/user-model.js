//new user model vai auto generated pass

const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  profileImage: { type: String },
  photo: { type: String, default: "" },
  password: { type: String, required: true }, // will be hashed
  role: { type: String, enum: ["admin", "vendor", "company"], required: true },

  profile: {
    address: String,
    phone: String,
    website: String,
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
