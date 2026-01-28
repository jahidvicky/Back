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

console.log(
    "STRIPE SECRET KEY LOADED:",
    process.env.STRIPE_SECRET_KEY ? "YES" : "NO"
);
console.log("backend key", process.env.STRIPE_SECRET_KEY)


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
});

module.exports = stripe;
