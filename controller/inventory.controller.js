const InventoryService = require("../services/inventory.service");
const Inventory = require("../model/inventory-model");
const Product = require("../model/product-model");

/* ============================
   ADD STOCK
============================ */
exports.addStock = async (req, res) => {
    try {
        const inventory = await InventoryService.addRawStock(req.body);
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
        const inventory = await Inventory.find()
            .populate("productId", "product_name")
            .sort({ createdAt: -1 });

        res.json({ success: true, inventory });
    } catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch inventory" });
    }
};

/* ============================
   MOVE TO PROCESSING
============================ */
exports.moveToProcessing = async (req, res) => {
    try {
        const { inventoryId, quantity } = req.body;

        const inventory = await Inventory.findById(inventoryId);
        if (!inventory)
            return res
                .status(404)
                .json({ success: false, message: "Inventory not found" });

        if (inventory.rawStock < quantity)
            return res.status(400).json({
                success: false,
                message: "Not enough raw stock",
            });

        inventory.rawStock -= quantity;
        inventory.inProcessing += quantity;
        inventory.status = "Processing";

        await inventory.save();

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
        const { inventoryId, quantity, location } = req.body;

        const inventory = await Inventory.findById(inventoryId);
        if (!inventory)
            return res
                .status(404)
                .json({ success: false, message: "Inventory not found" });

        if (inventory.inProcessing < quantity)
            return res.status(400).json({
                success: false,
                message: "Not enough processing stock",
            });

        inventory.inProcessing -= quantity;
        inventory.finishedStock += quantity;

        if (inventory.rawStock === 0 && inventory.inProcessing === 0)
            inventory.status = "Finished";

        await inventory.save();

        /* 🔥 UPDATE PRODUCT LOCATIONS (MERGE, NEVER OVERWRITE) */
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
                $inc: { availableStock: quantity },
                $set: { inStock: true, productLocation: locs },
            });
        }

        res.json({
            success: true,
            message: "Moved to finished stock and product updated",
            inventory,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message || "Server error",
        });
    }
};

/* ============================
   MOVE FINISHED TO ORDERED
============================ */
exports.moveFinishedToOrdered = async (req, res) => {
    try {
        const { productId, location, quantity } = req.body;

        const inventory = await Inventory.findOne({
            productId,
            location,
            finishedStock: { $gte: quantity },
        });

        if (!inventory)
            return res.status(404).json({
                success: false,
                message: "No finished stock available",
            });

        inventory.finishedStock -= quantity;
        inventory.orderedStock += quantity;

        await inventory.save();

        /* 🔁 SYNC PRODUCT LOCATIONS (remove empty branches) */
        const inventories = await Inventory.find({
            productId,
            finishedStock: { $gt: 0 },
        });

        const activeLocations = inventories.map((i) => i.location);

        await Product.findByIdAndUpdate(productId, {
            productLocation: activeLocations,
            inStock: activeLocations.length > 0,
        });

        res.json({
            success: true,
            message: "Moved to ordered stock",
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/* ============================
   AVAILABLE PRODUCTS BY LOCATION
============================ */
exports.getAvailableProducts = async (req, res) => {
    try {
        const { location } = req.params;

        if (!location)
            return res
                .status(400)
                .json({ success: false, message: "Location is required" });

        const inventory = await Inventory.find({
            location,
            finishedStock: { $gt: 0 },
        }).populate("productId");

        const products = inventory
            .filter(
                (i) =>
                    i.productId &&
                    i.productId.productStatus === "Approved"
            )
            .map((i) => ({
                ...i.productId.toObject(),
                availableQty: i.finishedStock,
            }));

        res.json({ success: true, products });
    } catch (err) {
        console.error("getAvailableProducts error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available products",
        });
    }
};
