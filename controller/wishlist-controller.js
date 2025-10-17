const Wishlist = require("../model/wishlist-model");

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
    const { userId, productId } = req.body;
    try {
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [{ productId }] });
        } else {
            const exists = wishlist.products.some(p => p.productId.toString() === productId);
            if (!exists) wishlist.products.push({ productId });
        }

        await wishlist.save();
        res.status(200).json(wishlist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// GET /api/wishlist/:userId
exports.getWishlist = async (req, res) => {
    try {
        const { userId } = req.params;
        const wl = await Wishlist
            .findOne({ userId })
            .populate("products.productId");

        // Always return a consistent shape
        if (!wl) {
            return res.status(200).json({ userId, products: [] });
        }
        return res.status(200).json(wl);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

        wishlist.products = wishlist.products.filter(p => p.productId.toString() !== productId);
        await wishlist.save();
        res.status(200).json(wishlist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};