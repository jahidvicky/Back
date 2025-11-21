const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    // Category
    cat_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    cat_sec: { type: String, required: true },

    // Subcategory
    subCat_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
    subCategoryName: { type: String },

    // Product info
    product_name: { type: String, required: true },
    product_size: {
        type: [String],
    },

    /* ----------------------------------------------------------
        NEW STRUCTURE: Color-based image collection
    -----------------------------------------------------------*/
    product_variants: [
        {
            colorName: { type: String, required: true }, // e.g. "Red", "Black", "Blue"
            images: [String], // All image URLs for that color
        },
    ],

    product_price: { type: Number, required: true },
    product_sale_price: { type: Number },
    product_description: { type: String },
    gender: { type: String },

    // Discount fields (vendor controlled)
    discountType: {
        type: String,
        enum: ["percentage", "flat"],
        default: "percentage",
    },
    discountedPrice: {
        type: Number
    },
    discountValue: {
        type: Number,
        default: 0,
    },

    stockAvailability: { type: Number, default: 0, min: 0 },

    // Sunglasses
    frame_material: String,
    frame_shape: String,
    frame_color: String,
    frame_fit: String,
    face_shape: String,

    // Lens details
    product_lens_title1: String,
    product_lens_description1: String,
    product_lens_title2: String,
    product_lens_description2: String,
    product_lens_image1: String,
    product_lens_image2: String,

    // Contact lens
    lens_type: String,
    material: String,
    manufacturer: String,
    water_content: String,
    contactLens_packs: [
        {
            packSize: { type: Number, required: true },
            oldPrice: { type: Number, required: true },
            salePrice: { type: Number, required: true },
            isBestValue: { type: Boolean, default: false }
        }
    ],


    // Vendor reference
    vendorID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

    // Approval workflow
    productStatus: { type: String, enum: ["Pending", "Approved", "Rejected"] },
    isSentForApproval: { type: Boolean },
    sentApprovalDate: { type: Date },
    isBestSeller: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },

    approvedBy: { type: String },
    approvedDate: { type: Date },

    rejectedBy: { type: String },
    rejectedDate: { type: Date },
    rejectionReason: { type: String },

    // Audit fields
    createdBy: { type: String },
    createdDate: { type: Date, default: Date.now },
    modifiedBy: { type: String },
    modifiedDate: { type: Date },

    // Brand field
    brand_id: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },

}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);