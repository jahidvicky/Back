const Product = require("../model/product-model");
const Category = require("../model/category-model");
const SubCategory = require("../model/subcategory-model");
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
    res
      .status(500)
      .json({
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
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ----------------------------
// Add Product (with color variants)
const addProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    // Convert stock to number
    productData.stockAvailability = Number(productData.stockAvailability) || 0;

    // 🧩 Handle Category
    const category = await Category.findOne({ categoryName: productData.cat_sec });
    if (!category) {
      return res.status(400).json({ success: false, message: "Category not found" });
    }
    productData.cat_id = category._id;

    // 🧩 Handle SubCategory
    if (productData.subCategoryName) {
      let subCategory = await SubCategory.findOne({
        subCategoryName: productData.subCategoryName.trim(),
        cat_id: category._id,
      });
      if (!subCategory) {
        subCategory = new SubCategory({
          subCategoryName: productData.subCategoryName.trim(),
          cat_id: category._id,
        });
        await subCategory.save();
      }
      productData.subCat_id = subCategory._id;
    }

    // 🧠 Initialize product_variants
    productData.product_variants = [];

    // Parse existing colorData (from JSON string or array)
    if (productData.colorData) {
      const colorArray =
        typeof productData.colorData === "string"
          ? JSON.parse(productData.colorData)
          : productData.colorData;

      productData.product_variants = colorArray.map((variant) => ({
        colorName: variant.colorName.trim().toLowerCase(),
        images: variant.images || [],
      }));
    }

    // ✅ Group uploaded files by color fieldname
    if (req.files && req.files.length > 0) {
      const fileGroups = {};

      req.files.forEach((file) => {
        const color = file.fieldname.trim().toLowerCase();
        if (!color || !isNaN(color)) return; // skip empty or numeric keys

        if (!fileGroups[color]) fileGroups[color] = [];
        fileGroups[color].push(file.filename);
      });

      // Merge grouped files into product_variants
      Object.entries(fileGroups).forEach(([color, imageFiles]) => {
        const existingVariant = productData.product_variants.find(
          (v) => v.colorName === color
        );

        if (existingVariant) {
          existingVariant.images = [
            ...(existingVariant.images || []),
            ...imageFiles,
          ];
        } else {
          productData.product_variants.push({
            colorName: color,
            images: imageFiles,
          });
        }
      });
    }

    // Role-based logic
    const now = new Date();
    if (req.user.role === "admin") {
      productData.productStatus = "Approved";
      productData.isSentForApproval = true;
      productData.approvedBy = req.user.name;
      productData.approvedDate = now;
      productData.createdBy = req.user.role;
      productData.createdDate = now;
    } else if (req.user.role === "vendor") {
      productData.vendorID = req.user.id;
      productData.productStatus = "Pending";
      productData.isSentForApproval = false;
      productData.createdBy = req.user.role;
      productData.createdDate = now;
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    const product = new Product(productData);
    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      message: "✅ Product added successfully with color variants",
      data: savedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error while adding product",
      error: error.message,
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
        { product_frame_material: { $regex: search, $options: "i" } },
      ];
    }

    // Category filters
    if (category) query.cat_sec = category;
    if (subCategory) query.subCategoryName = subCategory;

    // Status filter (merge with query)
    query.$or = query.$or
      ? [
        ...query.$or,
        { productStatus: "Approved" },
        { productStatus: { $exists: false } },
      ]
      : [{ productStatus: "Approved" }, { productStatus: { $exists: false } }];

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
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isSentForApproval: true },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product sent for approval",
      product: updatedProduct,
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
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { productStatus: "Approved" }, //  use the correct field name
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

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
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        productStatus: "Rejected",
        rejectionReason: req.body.message,
      },
      { new: true }
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product rejected", product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// ----------------------------
// Update Product (Admin)
// ----------------------------
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Parse colorData
    let updatedVariants = [];
    if (updateData.colorData) {
      const colorArray =
        typeof updateData.colorData === "string"
          ? JSON.parse(updateData.colorData)
          : updateData.colorData;

      updatedVariants = colorArray.map((variant) => ({
        colorName: variant.colorName.trim().toLowerCase(),
        images: variant.images || [],
      }));
    }

    // ✅ Merge new uploads
    if (req.files && req.files.length > 0) {
      const fileGroups = {};

      req.files.forEach((file) => {
        const color = file.fieldname.trim().toLowerCase();
        if (!color || !isNaN(color)) return;

        if (!fileGroups[color]) fileGroups[color] = [];
        fileGroups[color].push(file.filename);
      });

      Object.entries(fileGroups).forEach(([color, imageFiles]) => {
        const existingVariant = updatedVariants.find(
          (v) => v.colorName === color
        );

        if (existingVariant) {
          existingVariant.images = [
            ...(existingVariant.images || []),
            ...imageFiles,
          ];
        } else {
          updatedVariants.push({
            colorName: color,
            images: imageFiles,
          });
        }
      });
    }

    updateData.product_variants = updatedVariants;

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({
      success: true,
      message: "✅ Product updated successfully with color variants",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error while updating product",
      error: error.message,
    });
  }
};



// ----------------------------
// Update Product (Vendor)
// ----------------------------
const updateVendorProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let updateData = { ...req.body };

    // ✅ Handle color variant updates
    if (updateData.colorData) {
      const colorArray =
        typeof updateData.colorData === "string"
          ? JSON.parse(updateData.colorData)
          : updateData.colorData;

      updateData.product_variants = colorArray.map((variant) => ({
        colorName: variant.colorName,
        images: variant.images || [],
      }));
    }

    // ✅ Handle grouped color uploads (merge all same-color images)
    if (req.files && Object.keys(req.files).length > 0) {
      Object.entries(req.files).forEach(([color, files]) => {
        // Skip if colorName is missing or numeric (like "0", "1")
        if (!color.trim() || !isNaN(color)) return;

        const safeFiles = Array.isArray(files) ? files : [files];
        const newImages = safeFiles.map((f) => f.filename);

        // Find if this color already exists
        const existingVariant = productData.product_variants.find(
          (v) => v.colorName.toLowerCase() === color.toLowerCase()
        );

        if (existingVariant) {
          // Merge existing + new images
          existingVariant.images = [...(existingVariant.images || []), ...newImages];
        } else {
          // Add new color variant
          productData.product_variants.push({
            colorName: color.trim(),
            images: newImages,
          });
        }
      });
    }


    // Stock normalization
    if (
      updateData.stockAvailability !== undefined &&
      updateData.stockAvailability !== null
    ) {
      const val = Array.isArray(updateData.stockAvailability)
        ? updateData.stockAvailability[0]
        : updateData.stockAvailability;
      updateData.stockAvailability = Number(val);
    } else {
      updateData.stockAvailability = existingProduct.stockAvailability;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Vendor product updated successfully with color variants",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while updating vendor product",
      error: error.message,
    });
  }
};



const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params; // product ID from URL
    const userId = req.user.id; // logged-in user ID
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
      return res
        .status(403)
        .json({
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
    return res
      .status(200)
      .json({ success: true, count: products.length, products });
  } catch (error) {
    return res
      .status(500)
      .json({
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
      return res
        .status(400)
        .json({ success: false, message: "SubCategory ID is required" });

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
      return res
        .status(404)
        .json({
          success: false,
          message: "No products found for this SubCategory",
        });
    }

    return res
      .status(200)
      .json({ success: true, count: products.length, data: products });
  } catch (error) {
    return res
      .status(500)
      .json({
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
};
