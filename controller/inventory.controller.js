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

    const productId = inventory.productId?._id || inventory.productId;

    const allInventories = await Inventory.find({ productId });

    const totalAvailable = allInventories.reduce((sum, i) => {
      return sum + (i.rawStock || 0) + (i.inProcessing || 0) + (i.finishedStock || 0) - (i.orderedStock || 0);
    }, 0);

    await Product.findByIdAndUpdate(productId, {
      $set: { stockAvailability: Math.max(0, totalAvailable) }
    });

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

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (createdBy === "admin") {
      filter.createdBy = "admin";
    }
    const inventory = await Inventory.find(filter)
      .populate("productId", "product_name product_variants createdBy cat_sec")
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

    if (inventory.orderedStock >= quantity) {
      inventory.orderedStock -= quantity;
    } else if (inventory.rawStock >= quantity) {
      inventory.rawStock -= quantity;
    } else {
      return res.status(400).json({
        success: false,
        message: "Not enough stock to send to lab"
      });
    }
    inventory.inProcessing += quantity;

    await inventory.save();

    await InventoryHistory.create({
      action: "moved_processing",
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
    const { inventoryId, quantity, vendorId } = req.body;

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
      productId: inventory.productId,
      quantity,
      performedBy: vendorId || "admin"
    });

    const product = await Product.findById(inventory.productId);

    if (product) {

      await Product.findByIdAndUpdate(inventory.productId, {
        $set: {
          inStock: true,
        }
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
    const { productId, quantity, vendorId } = req.body;

    const inventory = await Inventory.findOne({
      productId,
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
      quantity,
      performedBy: vendorId || "admin"
    });

    res.json({ success: true, message: "Moved to ordered stock" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================
   GET AVAILABLE PRODUCTS
============================ */
exports.getAvailableProducts = async (req, res) => {
  try {
    const { scope } = req.query;

    const inventoryRows = await Inventory.find().populate("productId");

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

      grouped[productId].rawAvailable += i.rawStock || 0;
      grouped[productId].finishedAvailable += i.finishedStock || 0;
    });

    const products = Object.values(grouped)
      .filter((g) => {
        const itemCode = String(g.product.itemCode || "").toLowerCase();
        const isGlasses = itemCode.endsWith("-glasses");

        if (isGlasses) {
          return g.finishedAvailable > 0;  // glasses are available after finishing
        }

        return g.finishedAvailable > 0;
      })
      .map((g) => {
        return {
          ...g.product.toObject(),
          availableQty: g.finishedAvailable,
          inStock: g.finishedAvailable > 0,
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

/* ============================
   RESYNC PRODUCT STOCK
============================ */
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
        available,
      });
    });

    for (const productId of Object.keys(grouped)) {
      const inventories = await Inventory.find({ productId });

      const hasStock = inventories.some((i) => {
        const isGlasses = String(i.itemCode || "").toLowerCase().endsWith("-glasses");

        const available = isGlasses
          ? (i.finishedStock || 0) - (i.orderedStock || 0)
          : (i.finishedStock || 0) - (i.orderedStock || 0);

        return available > 0;
      });

      await Product.findByIdAndUpdate(productId, {
        $set: {
          // productLocation: activeLocations,
          inStock: hasStock,
        },
      });
    }

    res.json({ success: true, message: "Products resynced." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};