const Inventory = require("../model/inventory-model");
const Product = require("../model/product-model");
const generateItemCode = require("../utils/generateItemCode");
const InventoryHistory = require("../model/inventoryHistory-model");

/**
 * ADD STOCK
 */
exports.addRawStock = async ({ productId, quantity, createdBy, vendorId }) => {
  if (!productId || quantity <= 0) {
    throw new Error("Invalid inventory input");
  }

  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  const requiresLab = product.cat_sec === "glasses";

  let inventory = await Inventory.findOne({ productId });

  if (!inventory) {
    inventory = await Inventory.create({
      productId,
      category: product.cat_sec,
      rawStock: requiresLab ? quantity : 0,
      vendorId: vendorId || null,
      inProcessing: 0,
      finishedStock: requiresLab ? 0 : quantity,
      itemCode: generateItemCode({ category: product.cat_sec }),
      createdBy
    });
  } else {
    if (requiresLab) inventory.rawStock += quantity;
    else inventory.finishedStock += quantity;

    await inventory.save();
  }

  await InventoryHistory.create({
    action: "stock_added",
    productId,
    quantity,
    performedBy: createdBy || "admin"
  });

  return inventory;
};

/**
 * RAW → PROCESSING
 */
exports.sendToLab = async ({ productId, quantity, session }) => {
  const inventory = await Inventory.findOne({ productId }).session(session);

  if (!inventory || inventory.rawStock < quantity) {
    throw new Error("Insufficient RAW stock");
  }

  inventory.rawStock -= quantity;
  inventory.inProcessing += quantity;

  await inventory.save({ session });
};

/**
 * PROCESSING → FINISHED
 */
exports.receiveFromLab = async ({ productId, quantity }) => {
  const inventory = await Inventory.findOne({ productId });

  if (!inventory || inventory.inProcessing < quantity) {
    throw new Error("Invalid processing quantity");
  }

  inventory.inProcessing -= quantity;
  inventory.finishedStock += quantity;

  await inventory.save();
};

/**
 * CONSUME FOR ORDER
 */
exports.consumeForOrder = async ({ productId, quantity, vendorId }) => {
  const inventory = await Inventory.findOne({ productId });

  if (!inventory) throw new Error("Inventory not found");

  if (vendorId && inventory.createdBy !== vendorId) {
    throw new Error("Unauthorized inventory access");
  }

  const isGlasses = inventory.category === "glasses";

  const available = isGlasses
    ? (inventory.rawStock || 0) +
    (inventory.inProcessing || 0) +
    (inventory.finishedStock || 0)
    : inventory.finishedStock || 0;

  if (available < quantity) throw new Error("Out of stock");

  let remaining = quantity;

  if (inventory.finishedStock > 0) {
    const used = Math.min(inventory.finishedStock, remaining);
    inventory.finishedStock -= used;
    remaining -= used;
  }

  if (remaining > 0) {
    if (!isGlasses) throw new Error("Finished stock required");
    inventory.rawStock -= remaining;
  }

  inventory.orderedStock += quantity;
  await inventory.save();

  // 🔥 FIXED: removed location dependency safely
  const inventories = await Inventory.find({ productId });

  const hasStock = inventories.some(i => {
    const isGlasses = i.category === "glasses";

    const available = isGlasses
      ? (i.rawStock || 0) +
      (i.inProcessing || 0) +
      (i.finishedStock || 0) -
      (i.orderedStock || 0)
      : (i.finishedStock || 0);

    return available > 0;
  });

  await Product.findByIdAndUpdate(productId, {
    // productLocation: activeLocations,
    inStock: hasStock,
  });
};

/**
 * SELL ITEM
 */
exports.sellItem = async ({ productId, quantity, vendorId }) => {
  const inventory = await Inventory.findOne({ productId });

  if (!inventory) throw new Error("Inventory not found");

  if (vendorId && inventory.createdBy !== vendorId) {
    throw new Error("Unauthorized inventory access");
  }

  const totalAvailable =
    (inventory.rawStock || 0) +
    (inventory.inProcessing || 0) +
    (inventory.finishedStock || 0) -
    (inventory.orderedStock || 0);

  if (totalAvailable < quantity) {
    throw new Error("Out of stock");
  }

  inventory.orderedStock += quantity;
  await inventory.save();
};

/**
 * VALIDATE STOCK
 */
exports.validateFinishedStock = async ({ productId, quantity, vendorId }) => {
  const inventory = await Inventory.findOne({ productId });

  if (!inventory) throw new Error("Inventory not found");

  if (vendorId && inventory.createdBy !== vendorId) {
    throw new Error("Unauthorized inventory access");
  }

  const isGlasses = inventory.category === "glasses";

  const available = isGlasses
    ? (inventory.rawStock || 0) +
    (inventory.inProcessing || 0) +
    (inventory.finishedStock || 0)
    : inventory.finishedStock || 0;

  if (available < quantity) throw new Error("Out of stock");

  return true;
};

/**
 * ROLLBACK STOCK
 */
exports.rollbackStock = async ({ productId, quantity, vendorId }) => {
  const inventory = await Inventory.findOne({ productId });

  if (!inventory) return;

  if (vendorId && inventory.createdBy !== vendorId) {
    return;
  }

  inventory.orderedStock -= quantity;
  if (inventory.orderedStock < 0) inventory.orderedStock = 0;

  inventory.finishedStock += quantity;

  await inventory.save();
};