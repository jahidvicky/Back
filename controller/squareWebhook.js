const crypto = require("crypto");
const Order = require("../model/order-model");

exports.handleSquareWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-square-hmacsha256-signature"];
        const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

        // RAW BODY
        const rawBody = req.body; // Buffer
        const bodyString = rawBody.toString(); // Convert to string for HMAC + parsing

        const computedHash = crypto
            .createHmac("sha256", signatureKey)
            .update(bodyString)
            .digest("base64");

        console.log("===== DEBUG START =====");
        console.log("➡ Signature Header:", signature);
        console.log("➡ Webhook Key:", signatureKey);
        console.log("➡ Raw Body String:", bodyString);
        console.log("➡ Computed Hash:", computedHash);
        console.log("===== DEBUG END =====");

        if (computedHash !== signature) {
            console.log("Invalid Webhook Signature");
            return res.status(400).send("Invalid signature");
        }

        // Parse the JSON only AFTER signature validation
        const event = JSON.parse(bodyString);

        console.log("Webhook Event Type:", event.type);

        // PAYMENT UPDATE EVENTS
        if (event.type === "payment.updated") {
            const payment = event.data.object.payment;

            await Order.findOneAndUpdate(
                { transactionId: payment.id },
                { paymentStatus: payment.status }
            );

            console.log("Order Updated:", payment.id, payment.status);
        }

        return res.sendStatus(200);

    } catch (err) {
        console.log("Webhook Error:", err);
        res.status(500).send("Error");
    }
};
