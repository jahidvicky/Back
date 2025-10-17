const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
    },
    subCategoryNames: {
      type: [String],
      required: true,
      default: []
    },
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],

  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
