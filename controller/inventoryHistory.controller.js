const InventoryHistory = require("../model/inventoryHistory-model");

exports.getInventoryHistory = async (req, res) => {
    try {
        const history = await InventoryHistory
            .find()
            .populate("productId", "product_name")
            .sort({ createdAt: -1 });

        res.json({ success: true, history });
    } catch {
        res.status(500).json({ success: false, message: "Failed to load history" });
    }
};
