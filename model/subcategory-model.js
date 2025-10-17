const mongoose = require("mongoose");

const SubcategorySchema = new mongoose.Schema(
    {
        cat_sec: { type: String }, // e.g. "Sunglasses"
        cat_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        subCategoryName: { type: String }, // e.g. "Round Frame"
        description: { type: String },
        image: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SubCategory", SubcategorySchema);
