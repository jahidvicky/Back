// controller/paymentController.js
const crypto = require("crypto");
const { squareClient, SquareError } = require("../config/squareClient");

exports.createSquarePayment = async (req, res) => {
    try {
        const { nonce, amount } = req.body;

        // 1) Create payment – Square SDK expects bigint here
        const result = await squareClient.payments.create({
            sourceId: nonce,
            idempotencyKey: crypto.randomUUID(),
            amountMoney: {
                amount: BigInt(Math.round(Number(amount) * 100)), // 10 -> 1000n
                currency: "CAD",                                  // your merchant currency
            },
        });

        const payment = result.payment;

        // 2) Make a JSON-safe object (no BigInt in response)
        const safeAmount =
            payment.amountMoney && payment.amountMoney.amount != null
                ? Number(payment.amountMoney.amount) // BigInt -> Number
                : null;

        const responseData = {
            id: payment.id,
            status: payment.status,
            amount: safeAmount,
            currency: payment.amountMoney?.currency || "CAD",
            createdAt: payment.createdAt,
        };

        res.json({
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
