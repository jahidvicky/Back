const express = require("express");
const router = express.Router();
const orderController = require("../controller/order-controller");
const { protect, allowRoles } = require("../middleware/auth-middleware");
const uploadExchangeImages = require("../middleware/exchangeUpload")

router.post("/order", orderController.createOrder);

router.get("/order/:id", orderController.getOrderById);

router.get(
  "/order/track/:trackingNumber",
  orderController.trackOrderByTrackingNumber
);

router.put(
  "/order/updateOrderStatus/:orderId/status",
  orderController.updateOrderStatus
);

router.put("/cancleOrder/:orderId", orderController.cancleOrder);

router.get(
  "/order/getOrderTracking/:orderId/tracking",
  orderController.getOrderTracking
);

router.get("/allOrder", orderController.getAllOrders);

router.get(
  "/vendor-orders",
  protect,
  allowRoles("vendor"),
  orderController.getAllVendorOrders
);

router.get("/order/history/:userId", orderController.getOrderHistory);

router.put("/renewPolicy/:orderId", orderController.renewPolicy);

router.put("/payPolicy/:orderId", orderController.payPolicy);

// ===============================
// 🔁 EXCHANGE ROUTES (NO AUTH)
// ===============================

// Customer requests exchange

router.get(
  "/admin/exchange-requests",
  orderController.getExchangeRequests
);

router.post(
  "/order/exchange/:orderId",
  uploadExchangeImages.array("exchangeImages", 5),
  orderController.requestExchange
);

// Admin approves exchange
router.put(
  "/order/exchange/approve/:orderId/:productId",
  orderController.approveExchange
);

// Admin rejects exchange
router.put(
  "/order/exchange/reject/:orderId/:productId",
  orderController.rejectExchange
);

// Admin marks exchange completed
router.put(
  "/order/exchange/complete/:orderId/:productId",
  orderController.completeExchange
);

module.exports = router;
