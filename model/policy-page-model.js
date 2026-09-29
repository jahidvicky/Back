const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true },
    body: { type: String, required: true }, // stored as HTML
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const policyPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    pageTitle: { type: String, required: true },
    intro: { type: String, default: "" }, // optional intro paragraph, HTML
    sections: [sectionSchema],
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PolicyPage", policyPageSchema);