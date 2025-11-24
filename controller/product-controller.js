const Product = require("../model/product-model");
const Category = require("../model/category-model");
const SubCategory = require("../model/subcategory-model");
const Brand = require("../model/brand-model");
const mongoose = require("mongoose");

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    // const product = await Product.findById({ id: id, productStatus: "Approved" });
    const product = await Product.findOne({
      _id: id,
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } }, // handles case when productStatus key doesn't exist
      ],
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// Get products by category + subcategory name
const getProdcutByCategoryname = async (req, res) => {
  try {
    let { cat_sec, subCategoryName } = req.params;
    cat_sec = decodeURIComponent(cat_sec);
    subCategoryName = decodeURIComponent(subCategoryName);

    const products = await Product.find({
      cat_sec: { $regex: `^${cat_sec}$`, $options: "i" },
      subCategoryName: { $regex: `^${subCategoryName}$`, $options: "i" },
      // productStatus: "Approved"
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } },
      ],
    })
      .populate("brand_id", "brand image type")
      .lean();

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ----------------------------
// Add Product (FIXED VERSION)
// ----------------------------
const addProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    /* ---------------- CONTACT LENS PACKS ---------------- */
    if (productData.contactLens_packs) {
      try {
        productData.contactLens_packs = JSON.parse(
          productData.contactLens_packs
        );
      } catch (e) {
        console.error("PACK PARSE ERROR:", e);
        productData.contactLens_packs = [];
      }
    }

    /* ---------------- STOCK ---------------- */
    productData.stockAvailability =
      Number(productData.stockAvailability) || 0;

    /* ---------------- CATEGORY ---------------- */
    const category = await Category.findById(productData.cat_id);
    if (!category)
      return res
        .status(400)
        .json({ success: false, message: "Category not found" });

    productData.cat_sec = category.categoryName;

    /* ---------------- SUB CATEGORY ---------------- */
    if (productData.subCat_id) {
      const sub = await SubCategory.findById(productData.subCat_id);
      if (!sub)
        return res
          .status(400)
          .json({ success: false, message: "Invalid subcategory" });

      productData.subCategoryName = sub.name;
    } else {
      productData.subCategoryName = "";
    }

    /* ---------------- COLOR VARIANTS ---------------- */
    productData.product_variants = [];

    if (productData.colorData) {
      const colorArray = JSON.parse(productData.colorData);

      productData.product_variants = colorArray.map((cv) => ({
        colorName: cv.colorName.trim().toLowerCase(),
        images: cv.images || [],
      }));
    }

    /* ---------------- FILE UPLOADS ---------------- */
    const lensFields = ["product_lens_image1", "product_lens_image2"];
    const grouped = {};

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fieldName = file.fieldname.trim().toLowerCase();

        if (lensFields.includes(fieldName)) return;
        if (!fieldName || !isNaN(fieldName)) return;

        if (!grouped[fieldName]) grouped[fieldName] = [];
        grouped[fieldName].push(file.filename);
      });
    }

    /* ---------------- MERGE VARIANTS ---------------- */
    Object.entries(grouped).forEach(([color, images]) => {
      const existing = productData.product_variants.find(
        (v) => v.colorName === color
      );

      if (existing) {
        existing.images.push(...images);
      } else {
        productData.product_variants.push({ colorName: color, images });
      }
    });

    /* ---------------- LENS IMAGES ---------------- */
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "product_lens_image1") {
          productData.product_lens_image1 = file.filename;
        }
        if (file.fieldname === "product_lens_image2") {
          productData.product_lens_image2 = file.filename;
        }
      });
    }

    /* ---------------- ROLE HANDLING ---------------- */
    const now = new Date();

    if (req.user.role === "admin") {
      productData.productStatus = "Approved";
      productData.isSentForApproval = true;
      productData.approvedBy = req.user.name;
      productData.approvedDate = now;
      productData.createdBy = "admin";
    } else {
      productData.vendorID = req.user.id;
      productData.productStatus = "Pending";
      productData.isSentForApproval = false;
      productData.createdBy = "vendor";
      productData.isResubmitted = false;
    }

    /* ---------------- SAVE ---------------- */
    const saved = await new Product(productData).save();

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: saved,
    });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Error while adding product",
      error: err.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { search, category, subCategory } = req.query;
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { product_description: { $regex: search, $options: "i" } },
        { frame_material: { $regex: search, $options: "i" } },
      ];
    }

    // Category filters
    if (category) query.cat_sec = category;
    if (subCategory) query.subCategoryName = subCategory;

    // Status filter (AND with others)
    const statusFilter = {
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } },
      ],
    };

    // Combine search/category filters and status filter
    if (Object.keys(query).length > 0) {
      query = { $and: [query, statusFilter] };
    } else {
      query = statusFilter;
    }

    // Final query
    const products = await Product.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while fetching products",
      error: error.message,
    });
  }
};

const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user.id; // from token

    const products = await Product.find({
      vendorID: vendorId,
      productStatus: { $in: ["Approved", "Pending", "Rejected"] },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("Error fetching vendor products:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor products",
    });
  }
};

// Controller to fetch all products based on filter
const getVendorApprovalProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isSentForApproval: true,
      productStatus: "Pending",
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// Controller to send product for approval
const sendProductForApproval = async (req, res) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // If already approved, no need to send again
    if (product.productStatus === "Approved") {
      return res.status(400).json({
        success: false,
        message: "Product is already approved.",
      });
    }

    // If already sent and not rejected, do nothing
    if (product.isSentForApproval && product.productStatus !== "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Product is already sent for approval.",
      });
    }

    // If rejected → treat as resubmission
    if (product.productStatus === "Rejected") {
      product.isResubmitted = true;
      product.rejectionReason = undefined;
    }

    product.productStatus = "Pending";
    product.isSentForApproval = true;
    product.sentApprovalDate = new Date();

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product sent for approval",
      product,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to send product for approval",
    });
  }
};

const sendApprovedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.productStatus = "Approved";
    product.isSentForApproval = false;
    product.isResubmitted = false;
    product.approvedBy = req.user?.name;
    product.approvedDate = new Date();

    // Push approval history
    product.approvalHistory.push({
      status: "Approved",
      updatedAt: new Date(),
      reason: "Approved by admin"
    });

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product approved successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: err.message,
    });
  }
};


const rejectProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.productStatus = "Rejected";
    product.rejectionReason = req.body.message;
    product.isSentForApproval = false;

    // Push rejection history
    product.approvalHistory.push({
      status: "Rejected",
      updatedAt: new Date(),
      reason: req.body.message,
    });

    await product.save();

    res.json({ success: true, message: "Product rejected", product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};


// ----------------------------
// Update Product (Admin) - FIXED VERSION
// ----------------------------
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    /* ---------------- CONTACT LENS PACKS ---------------- */
    if (updateData.contactLens_packs) {
      try {
        updateData.contactLens_packs = JSON.parse(
          updateData.contactLens_packs
        );
      } catch (e) {
        updateData.contactLens_packs = [];
      }
    }

    /* -------- COLOR DATA -------- */
    let variants = [];

    if (updateData.colorData) {
      const colorArray = JSON.parse(updateData.colorData);

      variants = colorArray.map((cv) => ({
        colorName: cv.colorName.trim().toLowerCase(),
        images: cv.images || [],
      }));
    }

    /* -------- GROUP FILES -------- */
    const lensFields = ["product_lens_image1", "product_lens_image2"];
    const grouped = {};

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fieldName = file.fieldname.trim().toLowerCase();

        if (lensFields.includes(fieldName)) return;
        if (!fieldName || !isNaN(fieldName)) return;

        if (!grouped[fieldName]) grouped[fieldName] = [];
        grouped[fieldName].push(file.filename);
      });
    }

    /* -------- MERGE NEW IMAGES -------- */
    Object.entries(grouped).forEach(([color, images]) => {
      const existing = variants.find((v) => v.colorName === color);

      if (existing) {
        existing.images.push(...images);
      } else {
        variants.push({ colorName: color, images });
      }
    });

    updateData.product_variants = variants;

    /* -------- LENS IMAGES -------- */
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "product_lens_image1") {
          updateData.product_lens_image1 = file.filename;
        }
        if (file.fieldname === "product_lens_image2") {
          updateData.product_lens_image2 = file.filename;
        }
      });
    }

    // numeric stock
    if (updateData.stockAvailability !== undefined) {
      updateData.stockAvailability = Number(updateData.stockAvailability) || 0;
    }

    /* -------- UPDATE PRODUCT -------- */
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error while updating product",
      error: error.message,
    });
  }
};

// ----------------------------
// Update Product (Vendor) - FULL + RESTRICTED
// ----------------------------
const updateVendorProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Product.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Only owner vendor can update (if you want this)
    if (
      req.user.role === "vendor" &&
      existing.vendorID?.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    let updateData = { ...req.body };
    const status = existing.productStatus;

    /* ------------------------------------------------
      Restrict editing when product is sent for approval
    ------------------------------------------------ */
    if (existing.isSentForApproval && status !== "Rejected") {
      return res.status(403).json({
        success: false,
        message:
          "Cannot edit product while it is sent for approval. Wait for admin to approve or reject.",
      });
    }

    /* ------------------------------------------------
      CONTACT LENS PACKS
    ------------------------------------------------ */
    if (updateData.contactLens_packs) {
      try {
        updateData.contactLens_packs = JSON.parse(
          updateData.contactLens_packs
        );
      } catch (e) {
        updateData.contactLens_packs = [];
      }
    }

    /* ------------------------------------------------
      COLOR DATA & VARIANTS
    ------------------------------------------------ */
    let variants = [];

    if (updateData.colorData) {
      const colorArray = JSON.parse(updateData.colorData);

      variants = colorArray.map((cv) => ({
        colorName: cv.colorName.trim().toLowerCase(),
        images: cv.images || [],
      }));
    }

    const lensFields = ["product_lens_image1", "product_lens_image2"];
    const grouped = {};

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const fieldName = file.fieldname.trim().toLowerCase();

        if (lensFields.includes(fieldName)) return;
        if (!fieldName || !isNaN(fieldName)) return;

        if (!grouped[fieldName]) grouped[fieldName] = [];
        grouped[fieldName].push(file.filename);
      });
    }

    // Merge new images into variants
    Object.entries(grouped).forEach(([color, images]) => {
      const existingVariant = variants.find((v) => v.colorName === color);

      if (existingVariant) {
        existingVariant.images.push(...images);
      } else {
        variants.push({ colorName: color, images });
      }
    });

    updateData.product_variants = variants;

    /* ------------------------------------------------
      LENS IMAGES
    ------------------------------------------------ */
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "product_lens_image1") {
          updateData.product_lens_image1 = file.filename;
        }
        if (file.fieldname === "product_lens_image2") {
          updateData.product_lens_image2 = file.filename;
        }
      });
    }

    /* ------------------------------------------------
      Restrict Fields When Approved
    ------------------------------------------------ */
    if (status === "Approved") {
      // Vendor can only change: price, sale price, discount, stock, images & packs
      const allowedApprovedFields = [
        "product_price",
        "product_sale_price",
        "discountValue",
        "discountType",
        "stockAvailability",
        "product_variants",
        "product_lens_image1",
        "product_lens_image2",
        "contactLens_packs",
        "colorData",
      ];

      const disallowedFields = Object.keys(updateData).filter(
        (key) => !allowedApprovedFields.includes(key)
      );

      if (disallowedFields.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Cannot modify these fields after approval: ${disallowedFields.join(
            ", "
          )}`,
        });
      }

      // Product goes back to Pending and vendor must send for approval again
      updateData.productStatus = "Pending";
      updateData.isResubmitted = true;
      updateData.isSentForApproval = false;
      updateData.rejectionReason = undefined;
    }

    /* ------------------------------------------------
      Rejected → Vendor can edit everything (but stays Rejected until re-sent)
    ------------------------------------------------ */
    if (status === "Rejected") {
      updateData.productStatus = "Rejected";
      // keep rejectionReason until they re-send via sendProductForApproval
    }

    /* ------------------------------------------------
      Pending → Vendor can edit everything, but not if already sent (handled above)
    ------------------------------------------------ */
    if (status === "Pending" && !existing.isSentForApproval) {
      updateData.productStatus = "Pending";
    }

    // Force numeric stock
    if (updateData.stockAvailability !== undefined) {
      updateData.stockAvailability =
        Number(updateData.stockAvailability) || 0;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Vendor product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("UPDATE VENDOR PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error while updating vendor product",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find product
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Vendor can delete only their own products
    if (
      userRole === "vendor" &&
      product.vendorID.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this product",
      });
    }

    // Delete product
    await Product.findByIdAndDelete(id);

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductsByCategoryAndSub = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid categoryId" });
    }
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({ message: "Invalid subCategoryId" });
    }

    // Query products by ObjectId
    const products = await Product.find({
      cat_id: new mongoose.Types.ObjectId(categoryId),
      subCat_id: new mongoose.Types.ObjectId(subCategoryId),
      // productStatus: "Approved"
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } },
      ],
    });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) query.product_name = { $regex: search, $options: "i" };

    const products = await Product.find(query).limit(20);
    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while searching products",
      error: error.message,
    });
  }
};

// Get products by SubCategory ID
const getProductBySubCatId = async (req, res) => {
  try {
    const { subCatId } = req.params;
    if (!subCatId)
      return res.status(400).json({
        success: false,
        message: "SubCategory ID is required",
      });

    const products = await Product.find({
      subCat_id: subCatId,
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } },
      ],
    })
      .populate("cat_id", "categoryName")
      .populate("subCat_id", "subCategoryName");

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: "No products found for this SubCategory",
      });
    }

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products",
      error: error.message,
    });
  }
};

const getProductByCatId = async (req, res) => {
  try {
    const { catId } = req.params;

    if (!catId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const products = await Product.find({
      cat_id: catId,
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } },
      ],
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products",
      error: error.message,
    });
  }
};

const applyVendorDiscount = async (req, res) => {
  try {
    const { productId } = req.params;
    const { discountType, discountValue, discountedPrice } = req.body;

    if (!discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: "Both discount type and value are required.",
      });
    }

    if (!["percentage", "flat"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Discount type must be 'percentage' or 'flat'.",
      });
    }

    const numericDiscount = parseFloat(discountValue);
    if (isNaN(numericDiscount) || numericDiscount < 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value must be a valid positive number.",
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Update only discount info (do NOT overwrite sale price)
    product.discountType = discountType;
    product.discountValue = numericDiscount;
    product.discountedPrice = discountedPrice;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Discount added successfully.",
      discountType: product.discountType,
      discountValue: product.discountValue,
      discountedPrice: product.discountedPrice,
    });
  } catch (error) {
    console.error("Error in applyVendorDiscount:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding discount.",
    });
  }
};

const getBestSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ isBestSeller: true });

    res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch best seller products",
    });
  }
};

const getTrendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ isTrending: true });

    res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch best seller products",
    });
  }
};

const getProductsByBrandId = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Validate brandId
    if (!brandId || !mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID",
      });
    }

    // Check if brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Fetch all approved (or missing-status) products for this brand
    const products = await Product.find({
      brand_id: brandId,
      $or: [
        { productStatus: "Approved" },
        { productStatus: { $exists: false } }, // in case older products don't have the field
      ],
    })
      .populate("cat_id", "categoryName categoryImage")
      .populate("subCat_id", "name image")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      brand,
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching products by brand:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products by brand",
      error: error.message,
    });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProdcutByCategoryname,
  getProductsByCategoryAndSub,
  getProductBySubCatId,
  searchProducts,
  getVendorProducts,
  getVendorApprovalProducts,
  sendProductForApproval,
  sendApprovedProduct,
  rejectProduct,
  updateVendorProduct,
  applyVendorDiscount,
  getProductsByBrandId,
  getBestSellerProducts,
  getTrendingProducts,
  getProductByCatId,
};
