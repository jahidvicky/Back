const stripe = require("../config/stripe");
const Order = require("../model/order-model");

exports.handleStripeWebhook = (req, res) => {
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

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;

        Order.findOneAndUpdate(
            { transactionId: paymentIntent.id },
            { paymentStatus: "succeeded" }
        ).catch(console.error);
    }

    if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;

        Order.findOneAndUpdate(
            { transactionId: paymentIntent.id },
            { paymentStatus: "failed" }
        ).catch(console.error);
    }

    res.json({ received: true });
};
