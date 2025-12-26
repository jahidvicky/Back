const Inventory = require("../model/inventory-model");
const Product = require("../model/product-model");
const generateItemCode = require("../utils/generateItemCode");

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

    /*  Sync product for non-lab items */
    if (!requiresLab) {
        await Product.findByIdAndUpdate(productId, {
            $inc: { availableStock: quantity },
            $set: { inStock: true },
            $set: { productLocation: location }
        });
    }

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
 * FINISHED → SOLD
 */
exports.sellItem = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory || inventory.finishedStock < quantity) {
        throw new Error(
            `Out of stock for ${location}. Available: ${inventory?.finishedStock || 0}`
        );
    }

    inventory.finishedStock -= quantity;
    await inventory.save();
};

/**
 * VALIDATE BEFORE ORDER
 */
exports.validateFinishedStock = async ({ productId, location, quantity }) => {
    const inventory = await Inventory.findOne({ productId, location });

    if (!inventory || inventory.finishedStock < quantity) {
        throw new Error(
            `Out of stock for ${location}. Available: ${inventory?.finishedStock || 0}`
        );
    }

    return true;
};
