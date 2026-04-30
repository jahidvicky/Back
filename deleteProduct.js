const Product = require("./model/product-model");

const deleteOldProducts = async () => {
    try {
        // Target date: 27 April 2026
        const start = new Date("2026-04-27T00:00:00.000Z");
        const end = new Date("2026-04-28T00:00:00.000Z");

        // Delete products NOT created on this date
        const result = await Product.deleteMany({
            $or: [
                { createdAt: { $lt: start } },
                { createdAt: { $gte: end } }
            ]
        });

        console.log(`Deleted ${result.deletedCount} products`);
    } catch (error) {
        console.error("Error deleting products:", error);
    }
};

deleteOldProducts();