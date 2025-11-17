const express = require("express");
const router = express.Router();
const { protect, authMiddleware } = require("../middleware/auth-middleware");
const { sendMessage, getMessages, deleteMessage } = require("../controller/chat-controller");

router.post(
  "/send",
  protect,
  authMiddleware(["admin", "vendor", "company"]),
  sendMessage
);
router.get(
  "/chat/:userId",
  protect,
  authMiddleware(["admin", "vendor", "company"]),
  getMessages
);

router.delete(
  "/message/:id",
  protect,
  authMiddleware(["admin", "vendor", "company"]),
  deleteMessage
);

module.exports = router;
