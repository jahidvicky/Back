const InventoryService = require("../services/inventory.service");
const Inventory = require("../model/inventory-model");
const Product = require("../model/product-model");
const InventoryHistory = require("../model/inventoryHistory-model");
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

        await InventoryHistory.create({
            action: "moved_processing",
            location: inventory.location,
            productId: inventory.productId,
            quantity,
            performedBy: "admin"
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
        await InventoryHistory.create({
            action: "moved_finished",
            location: inventory.location,
            productId: inventory.productId,
            quantity,
            performedBy: "admin"
        });

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
                $set: { inStock: true, productLocation: locs }
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

        /* 🔁 SYNC PRODUCT LOCATIONS (real available stock) */
        const inventories = await Inventory.find({ productId });

        const activeLocations = inventories
            .filter(i =>
                (i.rawStock || 0) +
                (i.inProcessing || 0) +
                (i.finishedStock || 0) -
                (i.orderedStock || 0) > 0
            )
            .map(i => i.location);

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

        // Pull inventory with product info
        const inventory = await Inventory.find({ location })
            .populate("productId");

        const filtered = inventory.filter(i => {
            if (!i.productId || i.productId.productStatus !== "Approved") return false;

            const isGlasses = i.productId.cat_sec === "glasses";

            const totalAvailable =
                (i.rawStock || 0) +
                (i.inProcessing || 0) +
                (i.finishedStock || 0) -
                (i.orderedStock || 0);

            if (isGlasses) {
                // glasses can use RAW
                return totalAvailable > 0;
            }

            // others must have finished
            const finishedAvailable =
                (i.finishedStock || 0) - (i.orderedStock || 0);

            return finishedAvailable > 0;
        });

        const products = filtered.map(i => {
            const productObj = i.productId.toObject();
            const isGlasses = productObj.cat_sec === "glasses";

            // Calculate exact availability based on business rules
            const totalAvailable = (i.rawStock || 0) + (i.inProcessing || 0) + (i.finishedStock || 0) - (i.orderedStock || 0);
            const finishedAvailable = (i.finishedStock || 0) - (i.orderedStock || 0);

            const availableQty = isGlasses ? totalAvailable : finishedAvailable;

            return {
                ...productObj,
                inventory: [i], // Pass the inventory row so Frontend hasStockAtLocation works
                availableQty: availableQty,
                inStock: availableQty > 0
            };
        });

        res.json({ success: true, products });

    } catch (err) {
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

        inventories.forEach(i => {
            const pid = String(i.productId);

            if (!grouped[pid]) grouped[pid] = [];

            const available =
                (i.rawStock || 0) +
                (i.inProcessing || 0) +
                (i.finishedStock || 0) -
                (i.orderedStock || 0);

            grouped[pid].push({
                location: i.location,
                available
            });
        });

        for (const productId of Object.keys(grouped)) {
            // Inside consumeForOrder
            const inventories = await Inventory.find({ productId });
            const activeLocations = inventories
                .filter(i => ((i.rawStock || 0) + (i.inProcessing || 0) + (i.finishedStock || 0) - (i.orderedStock || 0)) > 0)
                .map(i => i.location.toLowerCase().trim());

            await Product.findByIdAndUpdate(productId, {
                $set: {
                    productLocation: activeLocations,
                    inStock: activeLocations.length > 0
                }
            });
        }

        res.json({ success: true, message: "Products resynced." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
