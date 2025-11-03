const express = require("express");
const router = express.Router();
const productController = require("../controller/product-controller");

const upload = require("../middleware/multer"); // make sure multer.js is in middleware folder
const { protect, allowRoles, authMiddleware } = require("../middleware/auth-middleware");


router.post("/addProduct",
  upload.fields([
    { name: "product_image_collection", maxCount: 10 },
    { name: "product_lens_image1", maxCount: 1 },
    { name: "product_lens_image2", maxCount: 1 },
  ]),
  authMiddleware(), productController.addProduct);

// Search products (by name, category, subcategory)
router.get("/products/search", productController.searchProducts);

router.get(
  "/getProducts/:cat_sec/:subCategoryName",
  productController.getProdcutByCategoryname
);

router.get("/getproductbyId/:id", productController.getProductById);

router.get(
  "/getProductBySubCatId/:subCatId",
  productController.getProductBySubCatId
);
router.get("/getAllProduct", productController.getAllProducts);

router.put(
  "/updateProduct/:id",
  upload.fields([
    { name: "product_image_collection", maxCount: 10 },
    { name: "product_lens_image1", maxCount: 1 },
    { name: "product_lens_image2", maxCount: 1 },
  ]),
  protect,
  allowRoles("admin"),
  productController.updateProduct
);

router.put(
  "/updateVendorProduct/:id",
  upload.fields([
    { name: "product_image_collection", maxCount: 10 },
    { name: "product_lens_image1", maxCount: 1 },
    { name: "product_lens_image2", maxCount: 1 },
  ]),
  protect,
  allowRoles("vendor"),
  productController.updateVendorProduct
);

router.delete(
  "/deleteProduct/:id",
  authMiddleware(),
  allowRoles("vendor", "admin"),
  productController.deleteProduct
);

router.get(
  "/getVendorProduct",
  authMiddleware(["vendor"]),
  productController.getVendorProducts
);

router.get("/getVendorApprovalProduct", productController.getVendorApprovalProducts);


router.get("/products/:categoryId/:subCategoryId", productController.getProductsByCategoryAndSub)

router.put('/products/send-for-approval/:productId', productController.sendProductForApproval);

router.put('/products/send-approved-product/:productId', productController.sendApprovedProduct);

router.put("/products/reject/:id", productController.rejectProduct);


// New route: apply discount
router.put("/vendor-products/:productId/discount", productController.applyVendorDiscount);


module.exports = router;
