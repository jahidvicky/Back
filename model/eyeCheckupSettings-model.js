const mongoose = require("mongoose");

const EyeCheckupSettingsSchema = new mongoose.Schema(
  {
    festivalActive: { type: Boolean, default: false },
    festivalName: { type: String, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    ageMin: { type: Number, default: 19 },
    ageMax: { type: Number, default: 64 },
  },
  { timestamps: true }
);

// Ensure only ONE settings document ever exists
EyeCheckupSettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("EyeCheckupSettings", EyeCheckupSettingsSchema);