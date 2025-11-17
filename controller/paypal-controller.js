const crypto = require("crypto");
const axios = require("axios");
const Order = require("../model/order-model");

//  Webhook endpoint
exports.handlePayPalWebhook = async (req, res) => {
    try {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID; // From PayPal Dashboard
        const transmissionId = req.header("paypal-transmission-id");
        const timestamp = req.header("paypal-transmission-time");
        const webhookEvent = req.body;
        const certUrl = req.header("paypal-cert-url");
        const authAlgo = req.header("paypal-auth-algo");
        const transmissionSig = req.header("paypal-transmission-sig");

        // 🔹 Verify webhook signature with PayPal API
        const { data } = await axios.post(
            `${process.env.PAYPAL_API}/v1/notifications/verify-webhook-signature`,
            {
                auth_algo: authAlgo,
                cert_url: certUrl,
                transmission_id: transmissionId,
                transmission_sig: transmissionSig,
                transmission_time: timestamp,
                webhook_id: webhookId,
                webhook_event: webhookEvent,
            },
            {
                auth: {
                    username: process.env.VITE_PAYPAL_CLIENT_ID,
                    password: process.env.PAYPAL_CLIENT_SECRET,
                },
            }
        );

        if (data.verification_status !== "SUCCESS") {
            console.log("Invalid webhook signature");
            return res.status(400).send("Invalid signature");
        }

        // Signature valid, process the event
        const eventType = webhookEvent.event_type;

        console.log("Verified PayPal Event:", eventType);

        if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const orderId = webhookEvent.resource.supplementary_data.related_ids.order_id;
            const paypalPaymentId = webhookEvent.resource.id;

            await Order.findOneAndUpdate(
                { paypalOrderId: orderId },
                {
                    $set: {
                        status: "Paid",
                        paypalPaymentId,
                    },
                }
            );
            console.log("Order marked as paid:", orderId);
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error("Webhook Error:", err);
        return res.status(500).send("Webhook processing failed");
    }
};
