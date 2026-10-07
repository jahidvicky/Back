const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(customParseFormat);

const esc = (s = "") =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const fmtDate = (d) =>
    d
        ? dayjs(String(d), "YYYYMMDD").format(
            "dddd, MMM D, YYYY"
        )
        : "-";

const fmtTime = (t) =>
    t && String(t).length === 4
        ? dayjs(String(t), "HHmm").format("h:mm A")
        : t || "-";

const pickupScheduledEmail = ({
    name,
    pickupDate,
    eReturnId,
    shipmentNumber,
    trackingNumber,
    reference,
    pickupUrl,
}) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Frame Donation Pickup Arranged</title>
</head>

<body style="
    font-family: Arial, sans-serif;
    background:#f5f5f5;
    padding:30px;
">

    <div style="
        max-width:600px;
        margin:auto;
        background:#ffffff;
        padding:30px;
        border-radius:10px;
    ">

        <h2 style="color:#c60001;">
            ATAL Optical
        </h2>

        <h3>
            Your Frame Donation Pickup Has Been Arranged
        </h3>

        <p>
            Hello ${esc(name)},
        </p>

        <p>
            Your frame donation has been successfully arranged
            through Loomis Express. The E-Return has been created
            and your donation is ready for the next pickup step.
        </p>

        <hr>

        <p>
            <strong>E-Return Date:</strong>
            ${esc(fmtDate(pickupDate))}
        </p>

        <p>
            <strong>Loomis E-Return ID:</strong>
            ${esc(eReturnId || "-")}
        </p>

        <p>
            <strong>Loomis Shipment Number:</strong>
            ${esc(shipmentNumber || "-")}
        </p>

        <p>
            <strong>Loomis Tracking / PIN:</strong>
            ${esc(trackingNumber || "-")}
        </p>

        <p>
            <strong>Reference:</strong>
            ${esc(reference || "-")}
        </p>

        <br>

        <a
            href="${esc(pickupUrl)}"
            style="
                display:inline-block;
                background:#c60001;
                color:white;
                padding:12px 20px;
                text-decoration:none;
                border-radius:6px;
            "
        >
            View Pickup Status
        </a>

        <br><br>

        <p>
            You can use the button above to view the current
            status of your frame donation.
        </p>

        <p>
            Thank you for supporting ATAL Optical's
            frame donation initiative.
        </p>

    </div>

</body>
</html>
`;
};

module.exports = pickupScheduledEmail;