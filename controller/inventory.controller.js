const InventoryService = require("../services/inventory.service");
const Inventory = require("../model/inventory-model");
const Product = require("../model/product-model");
const InventoryHistory = require("../model/inventoryHistory-model");
/* ============================
   ADD STOCK
============================ */
exports.addStock = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.body.vendorId || "admin"
    };

    const inventory = await InventoryService.addRawStock(payload);

    res.json({ success: true, inventory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* ============================
   GET INVENTORY LIST
============================ */
exports.getInventoryList = async (req, res) => {
  try {
    const { vendorId, createdBy } = req.query;

    const filter = {};

    // Vendor inventory
    if (vendorId) {
      filter.vendorId = vendorId;
    }

    // Admin-only inventory
    if (createdBy === "admin") {
      filter.createdBy = "admin";
    }

    const inventory = await Inventory.find(filter)
      .populate("productId", "product_name product_variants createdBy")
      .sort({ createdAt: -1 });

    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};



/* ============================
   MOVE TO PROCESSING
============================ */
exports.moveToProcessing = async (req, res) => {
  try {
    const { inventoryId, quantity, vendorId } = req.body;

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory)
      return res.status(404).json({ success: false, message: "Inventory not found" });

    if (vendorId && inventory.createdBy !== vendorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (inventory.orderedStock < quantity)
      return res.status(400).json({
        success: false,
        message: "Not enough ordered stock"
      });

    inventory.orderedStock -= quantity;
    inventory.inProcessing += quantity;

    await inventory.save();

    await InventoryHistory.create({
      action: "moved_processing",
      location: inventory.location,
      productId: inventory.productId,
      quantity,
      performedBy: vendorId || "admin"
    });

    res.json({ success: true, message: "Moved to processing", inventory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* ============================
   MOVE TO FINISHED
============================ */
exports.moveToFinished = async (req, res) => {
  try {
    const { inventoryId, quantity, location, vendorId } = req.body;

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory)
      return res.status(404).json({ success: false, message: "Inventory not found" });

    if (vendorId && inventory.createdBy !== vendorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (inventory.inProcessing < quantity)
      return res.status(400).json({
        success: false,
        message: "Not enough processing stock"
      });

    inventory.inProcessing -= quantity;
    inventory.finishedStock += quantity;

    await inventory.save();

    await InventoryHistory.create({
      action: "moved_finished",
      location: inventory.location,
      productId: inventory.productId,
      quantity,
      performedBy: vendorId || "admin"
    });

    const normalizedLocation = (location || "").toLowerCase();
    const product = await Product.findById(inventory.productId);

    if (product) {
      let locs = Array.isArray(product.productLocation)
        ? product.productLocation
        : product.productLocation
          ? [product.productLocation.toLowerCase()]
          : [];

      if (!locs.includes(normalizedLocation)) locs.push(normalizedLocation);

      await Product.findByIdAndUpdate(inventory.productId, {
        $set: { inStock: true, productLocation: locs }
      });
    }

    res.json({
      success: true,
      message: "Moved to finished stock and product updated",
      inventory
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================
   MOVE FINISHED TO ORDERED
============================ */
exports.moveFinishedToOrdered = async (req, res) => {
  try {
    const { productId, location, quantity, vendorId } = req.body;

    const inventory = await Inventory.findOne({
      productId,
      location,
      finishedStock: { $gte: quantity }
    });

    if (!inventory)
      return res.status(404).json({
        success: false,
        message: "No finished stock available"
      });

    if (vendorId && inventory.createdBy !== vendorId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    inventory.finishedStock -= quantity;
    inventory.orderedStock += quantity;

    await inventory.save();

    await InventoryHistory.create({
      action: "order_placed",
      productId,
      location,
      quantity,
      performedBy: vendorId || "admin"
    });

    res.json({ success: true, message: "Moved to ordered stock" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



exports.getAvailableProducts = async (req, res) => {
  try {
    const { location } = req.params;
    const { scope } = req.query;

    //  GLOBAL for PLP, LOCATION for checkout
    const inventoryRows =
      scope === "global"
        ? await Inventory.find().populate("productId")
        : await Inventory.find({ location }).populate("productId");

    const grouped = {};

    inventoryRows.forEach((i) => {
      if (!i.productId || i.productId.productStatus !== "Approved") return;

      const productId = String(i.productId._id);

      if (!grouped[productId]) {
        grouped[productId] = {
          product: i.productId,
          rawAvailable: 0,
          finishedAvailable: 0,
        };
      }

      const raw = i.rawStock || 0;
      const finished = i.finishedStock || 0;

      grouped[productId].rawAvailable += raw;
      grouped[productId].finishedAvailable += finished;
    });

    const products = Object.values(grouped)
      .filter((g) => {
        const category = String(g.product.cat_sec).toLowerCase();

        //  GLASSES → RAW ONLY
        if (category === "glasses") {
          return g.rawAvailable > 0;
        }

        //  SUNGLASSES & CONTACT LENS → FINISHED ONLY
        return g.finishedAvailable > 0;
      })
      .map((g) => {
        const category = String(g.product.cat_sec).toLowerCase();

        const availableQty =
          category === "glasses" ? g.rawAvailable : g.finishedAvailable;

        return {
          ...g.product.toObject(),
          availableQty,
          inStock: availableQty > 0,
        };
      });

    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available products",
    });
  }
};

exports.resyncProductStock = async (req, res) => {
  try {
    const inventories = await Inventory.find();

    const grouped = {};

    inventories.forEach((i) => {
      const pid = String(i.productId);

      if (!grouped[pid]) grouped[pid] = [];

      const available =
        (i.rawStock || 0) +
        (i.inProcessing || 0) +
        (i.finishedStock || 0) -
        (i.orderedStock || 0);

      grouped[pid].push({
        location: i.location,
        available,
      });
    });

    for (const productId of Object.keys(grouped)) {
      // Inside consumeForOrder
      const inventories = await Inventory.find({ productId });
      const activeLocations = inventories
        .filter((i) => {
          const isGlasses = i.category === "glasses";

          const available = isGlasses
            ? (i.rawStock || 0) +
            (i.inProcessing || 0) +
            (i.finishedStock || 0) -
            (i.orderedStock || 0)
            : i.finishedStock || 0;
          return available > 0;
        })
        .map((i) => i.location.toLowerCase().trim());

      await Product.findByIdAndUpdate(productId, {
        $set: {
          productLocation: activeLocations,
          inStock: activeLocations.length > 0,
        },
      });
    }

    res.json({ success: true, message: "Products resynced." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
