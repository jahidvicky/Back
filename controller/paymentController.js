// controller/paymentController.js
const crypto = require("crypto");
const { squareClient, SquareError } = require("../config/squareClient");

exports.createSquarePayment = async (req, res) => {
    try {
        const { nonce, amount } = req.body;

        // Create payment
        const result = await squareClient.payments.create({
            sourceId: nonce,
            idempotencyKey: crypto.randomUUID(),
            amountMoney: {
                amount: BigInt(Math.round(Number(amount) * 100)),
                currency: "CAD",
            },
        });

        const payment = result.payment;

        // Make JSON-safe version
        const safeAmount = payment.amountMoney?.amount
            ? Number(payment.amountMoney.amount)
            : null;

        const responseData = {
            id: payment.id,
            status: payment.status,
            amount: safeAmount,
            currency: payment.amountMoney?.currency || "CAD",
            createdAt: payment.createdAt,
        };

        // ❗ VALIDATE PAYMENT STATUS
        if (payment.status !== "COMPLETED") {
            return res.json({
                success: false,
                message: "Card declined or payment failed",
                payment: responseData,
            });
        }

        // SUCCESS
        return res.json({
            success: true,
            payment: responseData,
        });

    } catch (error) {
        console.error("Square Error:", error);

        if (error instanceof SquareError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || "Payment failed",
        });
    }
};
