const express = require("express");
const router = express.Router();
const productController = require("../controller/product-controller");
const upload = require("../middleware/multer");
const { protect, allowRoles, authMiddleware } = require("../middleware/auth-middleware");

//  ADD PRODUCT (supports dynamic color uploads)
router.post(
  "/addProduct",
  upload.any(), // dynamic: supports unlimited color fields like "red", "black", "blue"
  authMiddleware(),
  productController.addProduct
);

//  UPDATE PRODUCT (Admin)
router.put(
  "/updateProduct/:id",
  upload.any(),
  protect,
  allowRoles("admin"),
  productController.updateProduct
);

//  UPDATE PRODUCT (Vendor)
router.put(
  "/updateVendorProduct/:id",
  upload.any(),
  protect,
  allowRoles("vendor"),
  productController.updateVendorProduct
);

//  DELETE PRODUCT
router.delete(
  "/deleteProduct/:id",
  authMiddleware(),
  allowRoles("vendor", "admin"),
  productController.deleteProduct
);

//  GET PRODUCT BY ID
router.get("/getproductbyId/:id", productController.getProductById);

//  GET ALL PRODUCTS
router.get("/getAllProduct", productController.getAllProducts);

//  GET PRODUCTS BY CATEGORY & SUBCATEGORY NAME
router.get(
  "/getProducts/:cat_sec/:subCategoryName",
  productController.getProdcutByCategoryname
);

//  GET PRODUCTS BY SUBCATEGORY ID
router.get(
  "/getProductBySubCatId/:subCatId",
  productController.getProductBySubCatId
);

//  GET PRODUCTS BY CATEGORY AND SUBCATEGORY ID
router.get(
  "/products/:categoryId/:subCategoryId",
  productController.getProductsByCategoryAndSub
);

//  SEARCH PRODUCTS
router.get("/products/search", productController.searchProducts);

//  VENDOR-SPECIFIC PRODUCTS
router.get(
  "/getVendorProduct",
  authMiddleware(["vendor"]),
  productController.getVendorProducts
);

//  PRODUCTS SENT FOR APPROVAL (Admin Dashboard)
router.get("/getVendorApprovalProduct", productController.getVendorApprovalProducts);

router.get("/brand/:brandId", productController.getProductsByBrand);

//  SEND PRODUCT FOR APPROVAL (Vendor → Admin)
router.put(
  "/products/send-for-approval/:productId",
  productController.sendProductForApproval
);

//  APPROVE PRODUCT (Admin)
router.put(
  "/products/send-approved-product/:productId",
  productController.sendApprovedProduct
);

//  REJECT PRODUCT (Admin)
router.put("/products/reject/:id", productController.rejectProduct);

//  APPLY DISCOUNT (Vendor)
router.put(
  "/vendor-products/:productId/discount",
  productController.applyVendorDiscount
);

module.exports = router;
