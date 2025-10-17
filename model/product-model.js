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
    product_color: {
        type: [String],
        default: []
    },
    product_price: { type: Number, required: true },
    product_sale_price: { type: Number },
    product_description: { type: String },
    gender: { type: String },
    product_image_collection: [String],


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
        default: 0, // 10 means 10% or ₹10 depending on discountType
    },



    stockAvailability: { type: Number, default: 0, min: 0 },


    // Sunglasses
    frame_material: String,
    frame_shape: String,
    frame_color: String,
    frame_fit: String,

    // Lens details
    product_lens_title1: String,
    product_lens_description1: String,
    product_lens_title2: String,
    product_lens_description2: String,
    product_lens_image1: String,
    product_lens_image2: String,

    // Contact lens
    contact_type: String,
    material: String,
    manufacturer: String,
    water_content: String,

    // Vendor reference
    vendorID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

    // Approval workflow
    productStatus: { type: String, enum: ["Pending", "Approved", "Rejected"] },
    isSentForApproval: { type: Boolean },
    sentApprovalDate: { type: Date },

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
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);

