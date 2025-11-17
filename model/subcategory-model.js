const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
    {
        // 🔹 Link to Parent Category
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        // 🔹 Name of Subcategory
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // 🔹 Slug for SEO-friendly URL (e.g. "round-frame")
        slug: {
            type: String,
            lowercase: true,
            trim: true,
        },

        // 🔹 Optional Description
        description: {
            type: String,
            trim: true,
        },

        // 🔹 Subcategory Image (icon or thumbnail)
        image: {
            type: String,
        },

        // 🔹 Status
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SubCategory", subCategorySchema);
