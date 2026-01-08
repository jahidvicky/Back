// Back/config/squareClient.js
require("dotenv").config();

const {
    SquareClient,
    SquareEnvironment,
    SquareError,
} = require("square");

// create a single shared client instance
const squareClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: SquareEnvironment.Sandbox,
    // environment: SquareEnvironment.Production,
});

module.exports = {
    squareClient,
    SquareError,
};
