const Inventory = require("../model/inventory-model");
const Product = require("../model/product-model");
const generateItemCode = require("../utils/generateItemCode");
const InventoryHistory = require("../model/inventoryHistory-model")

/**
 * ADD STOCK
 * - Glasses → RAW
 * - Sunglasses / Contact Lens → FINISHED
 */
exports.addRawStock = async ({ productId, location, quantity }) => {
    if (!productId || !location || quantity <= 0) {
        throw new Error("Invalid inventory input");
    }

    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    const requiresLab = product.cat_sec === "glasses";

    let inventory = await Inventory.findOne({ productId, location });

    if (!inventory) {
        inventory = await Inventory.create({
            productId,
            location,
            category: product.cat_sec,
            rawStock: requiresLab ? quantity : 0,
            inProcessing: 0,
            finishedStock: requiresLab ? 0 : quantity,
            itemCode: generateItemCode({ location, category: product.cat_sec })
        });
    } else {
        if (requiresLab) {
            inventory.rawStock += quantity;
        } else {
            inventory.finishedStock += quantity;
        }

        await inventory.save();
    }

    const normalizedLocation = location.toLowerCase();

    let locs = Array.isArray(product.productLocation)
        ? product.productLocation
        : product.productLocation
            ? [product.productLocation]
            : [];

    if (!locs.includes(normalizedLocation)) locs.push(normalizedLocation);

    await Product.findByIdAndUpdate(productId, {
        $inc: { availableStock: quantity },
        $set: {
            inStock: true,
            productLocation: locs
        }
    });


    await InventoryHistory.create({
        action: "stock_added",
        location,
        productId,
        quantity,
        performedBy: "admin"
    });

    return inventory;

};

/**
 * RAW → PROCESSING (Send to Lab)
 */
exports.sendToLab = async ({ productId, location, quantity, session }) => {
    const inventory = await Inventory.findOne({ productId, location }).session(session);

    if (!inventory || inventory.rawStock < quantity) {
        throw new Error("Insufficient RAW stock");
    }

    inventory.rawStock -= quantity;
    inventory.inProcessing += quantity;

    await inventory.save({ session });
};


/**
 * PROCESSING → FINISHED (Receive from Lab)
 */
exports.receiveFromLab = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory || inventory.inProcessing < quantity) {
        throw new Error("Invalid processing quantity");
    }

    inventory.inProcessing -= quantity;
    inventory.finishedStock += quantity;

    await inventory.save();
};


/**
 * When user orders:
 * 1) use finished if available
 * 2) otherwise consume raw
 */
exports.consumeForOrder = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory) throw new Error("Inventory not found");

    const totalAvailable =
        inventory.rawStock + inventory.inProcessing + inventory.finishedStock - inventory.orderedStock;

    if (totalAvailable < quantity) throw new Error("Out of stock");

    // prefer finished first
    let remaining = quantity;

    if (inventory.finishedStock >= remaining) {
        inventory.finishedStock -= remaining;
        remaining = 0;
    } else {
        remaining -= inventory.finishedStock;
        inventory.finishedStock = 0;
    }

    // fallback to raw
    if (remaining > 0) {
        inventory.rawStock -= remaining;
        remaining = 0;
    }

    inventory.orderedStock += quantity;

    await inventory.save();
};


/**
 * FINISHED → SOLD
 */
exports.sellItem = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory) {
        throw new Error("Inventory not found");
    }

    const totalAvailable =
        (inventory.rawStock || 0) +
        (inventory.inProcessing || 0) +
        (inventory.finishedStock || 0) -
        (inventory.orderedStock || 0);

    if (totalAvailable < quantity) {
        throw new Error("Out of stock");
    }

    // Reserve inventory
    inventory.orderedStock += quantity;

    await inventory.save();
};

/**
 * VALIDATE BEFORE ORDER
 */
exports.validateFinishedStock = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory) throw new Error("Inventory not found");

    const totalAvailable =
        (inventory.rawStock || 0) +
        (inventory.inProcessing || 0) +
        (inventory.finishedStock || 0) -
        (inventory.orderedStock || 0);

    if (totalAvailable < quantity) {
        throw new Error("Out of stock");
    }

    return true;
};


exports.rollbackStock = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory) return;

    // Undo reservation
    inventory.orderedStock -= quantity;
    if (inventory.orderedStock < 0) inventory.orderedStock = 0;

    // Cancelled orders go back to RAW stage
    inventory.rawStock += quantity;

    await inventory.save();
};



