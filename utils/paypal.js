const axios = require("axios");

const getPayPalAccessToken = async () => {
    const auth = Buffer.from(
        `${process.env.VITE_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const { data } = await axios.post(
        `${process.env.PAYPAL_API}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return data.access_token;
};

const verifyPayPalPayment = async (orderId) => {
    const token = await getPayPalAccessToken();
    const { data } = await axios.get(
        `${process.env.PAYPAL_API}/v2/checkout/orders/${orderId}`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return data;
};

module.exports = { getPayPalAccessToken, verifyPayPalPayment };
