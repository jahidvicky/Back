const stripe = require("../config/stripe");

exports.createStripePaymentIntent = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount",
            });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // CAD cents
            currency: "cad",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                source: "atal-opticals",
            },
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        console.error("Stripe PaymentIntent Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to create payment intent",
        });
    }
};
