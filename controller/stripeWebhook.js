const stripe = require("../config/stripe");
const Order = require("../model/order-model");


exports.handleStripeWebhook = async (req, res) => {   //  async
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Stripe Webhook Signature Error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "payment_intent.succeeded") {
            await Order.findOneAndUpdate(       //  awaited
                { transactionId: event.data.object.id },
                { paymentStatus: "succeeded" }
            );
        } else if (event.type === "payment_intent.payment_failed") {
            await Order.findOneAndUpdate(       //  awaited
                { transactionId: event.data.object.id },
                { paymentStatus: "failed" }
            );
        }
    } catch (dbErr) {
        //  log but still return 200 — Stripe retries on non-200, causing duplicates
        console.error("Webhook DB update failed:", dbErr.message);
    }

    res.json({ received: true });
};