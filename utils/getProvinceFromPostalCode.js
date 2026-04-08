function getProvinceFromPostalCode(postalCode) {

    if (!postalCode) return null;

    const firstLetter = postalCode.trim().toUpperCase()[0];

    const provinceMap = {
        A: "NL",
        B: "NS",
        C: "PE",
        E: "NB",
        G: "QC",
        H: "QC",
        J: "QC",
        K: "ON",
        L: "ON",
        M: "ON",
        N: "ON",
        P: "ON",
        R: "MB",
        S: "SK",
        T: "AB",
        V: "BC",
        X: "NT",
        Y: "YT"
    };

    return provinceMap[firstLetter] || null;
}

module.exports = getProvinceFromPostalCode;