// const Stripe = require("stripe");

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//     apiVersion: "2023-10-16",
// });

// module.exports = stripe;




const Stripe = require("stripe");

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is missing");
    process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
});

module.exports = stripe;
