const Product = require("../model/product-model");

const searchProducts = async (query) => {
    try {
        const products = await Product.find({
            name: { $regex: query, $options: "i" },
        }).limit(5);

        return products;
    } catch (error) {
        console.error("Product Search Error:", error);
        return [];
    }
};

module.exports = { searchProducts };
