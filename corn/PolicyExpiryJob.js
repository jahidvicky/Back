const cron = require("node-cron");
const Order = require("../model/order-model");

cron.schedule("0 1 * * *", async () => {
    try {
        const now = new Date();

        const result = await Order.updateMany(
            { "cartItems.policy.expiryDate": { $lt: now } },
            {
                $set: {
                    "cartItems.$[item].policy.status": "Expired",
                    "cartItems.$[item].policy.active": false,
                },
            },
            {
                arrayFilters: [{ "item.policy.expiryDate": { $lt: now } }],
            }
        );
    } catch (err) {
        console.error("Policy expiry cron error:", err.message);
    }
});
