const generateItemCode = ({ category = "GEN" } = {}) => {
    const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

    return `ATAL-${randomSixDigit}-${category}`;
};

module.exports = generateItemCode;