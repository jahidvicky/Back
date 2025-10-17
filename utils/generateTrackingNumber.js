// utils/generateTrackingNumber.js
const crypto = require("crypto"); // Node built-in

function generateTrackingNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();   // 3 bytes -> 6 hex chars
    return `ORD-${datePart}-${randomPart}`;
}

module.exports = generateTrackingNumber;
