// routes/wishlistRoutes.js
const express = require("express");
const router = express.Router();
const wishlistController = require("../controller/wishlist-controller");

router.post("/addWishlist", wishlistController.addToWishlist);
router.get("/getWishlist/:userId", wishlistController.getWishlist);
router.delete("/removeWishlist", wishlistController.removeFromWishlist);

module.exports = router;