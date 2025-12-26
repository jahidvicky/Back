const generateItemCode = ({ location, category }) => {
    const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
    const loc = location.toUpperCase(); // EAST / WEST

    return `ATAL-${loc}-${randomSixDigit} - ${category}`;
};

module.exports = generateItemCode;
