const InventoryHistory = require("../model/inventoryHistory-model");


// GET /inventory/history/:productId?location=east|west
exports.getInventoryHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { location } = req.query;

    const filter = { productId };

    if (location) {
      filter.location = location;
    }

    const history = await InventoryHistory.find(filter)
      .populate("productId", "product_name")
      .sort({ createdAt: -1 });

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load history",
    });
  }
};


