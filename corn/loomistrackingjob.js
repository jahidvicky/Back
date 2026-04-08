const cron = require("node-cron");
const Order = require("../model/order-model");
const loomisService = require("../services/loomisService");

/*
================================
LOOMIS TRACKING CRON JOB
================================
*/

const runTrackingUpdate = async () => {
    try {
        const shippedOrders = await Order.find({
            orderStatus: "Shipped",
            "shippingInfo.trackingNumber": { $exists: true, $ne: null },
            "shippingInfo.voided": { $ne: true },
        }).sort({ shippedAt: 1 });
        for (const order of shippedOrders) {
            try {
                const tracking = await loomisService.trackShipment(
                    order.shippingInfo.trackingNumber
                );

                if (!tracking || tracking.success === false) {
                    continue;
                }

                let updated = false;

                if (tracking.delivered === true && order.orderStatus !== "Delivered") {
                    order.orderStatus = "Delivered";
                    order.deliveryDate = new Date();

                    order.trackingHistory.push({
                        status: "Delivered",
                        message: `Package delivered${tracking.signedBy ? ` — signed by ${tracking.signedBy}` : ""}`,
                        updatedBy: "System",
                        actorName: "Loomis",
                        updatedAt: new Date(),
                    });

                    updated = true;
                }

                const existingMessages = new Set(
                    order.trackingHistory.map((h) => h.message)
                );

                for (const event of tracking.events || []) {
                    const msg = `[${event.code}] ${event.description}${event.city ? ` — ${event.city}, ${event.province}` : ""}`;

                    if (!existingMessages.has(msg)) {
                        order.trackingHistory.push({
                            status: "Shipped",
                            message: msg,
                            updatedBy: "System",
                            actorName: "Loomis",
                            updatedAt: event.dateTime
                                ? new Date(event.dateTime.replace(
                                    /(\d{4})(\d{2})(\d{2}) (\d{2})(\d{2})(\d{2})/,
                                    "$1-$2-$3T$4:$5:$6"
                                ))
                                : new Date(),
                        });

                        existingMessages.add(msg);
                        updated = true;
                    }
                }

                if (updated) {
                    await order.save();
                }

            } catch (orderErr) {
                console.error(`[TrackingJob] Failed for order ${order._id}:`, orderErr.message);
            }
        }
    } catch (err) {
        console.error("[TrackingJob] Fatal error:", err.message);
    }
};

const initTrackingJob = () => {
    cron.schedule("*/30 * * * *", runTrackingUpdate, {
        scheduled: true,
        timezone: "America/Toronto",
    });
};

module.exports = { initTrackingJob, runTrackingUpdate };