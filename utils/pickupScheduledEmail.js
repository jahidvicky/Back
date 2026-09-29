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
    d ? dayjs(String(d), "YYYYMMDD").format("dddd, MMM D, YYYY") : "-";

const fmtTime = (t) =>
    t && String(t).length === 4
        ? dayjs(String(t), "HHmm").format("h:mm A")
        : t || "-";

const pickupScheduledEmail = ({
    name,
    pickupDate,
    readyTime,
    closeTime,
    confirmationId,
    pickupUrl,
}) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pickup Scheduled</title>
</head>

<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:30px;">

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
            Your Frame Pickup Has Been Scheduled
        </h3>

        <p>
            Hello ${esc(name)},
        </p>

        <p>
            Your donated frames are scheduled for free
            doorstep pickup through Loomis Express.
        </p>

        <hr>

        <p>
            <strong>Pickup Date:</strong>
            ${esc(fmtDate(pickupDate))}
        </p>

        <p>
            <strong>Pickup Time:</strong>
            ${esc(fmtTime(readyTime))} - ${esc(fmtTime(closeTime))}
        </p>

        <p>
            <strong>Loomis Confirmation ID:</strong>
            ${esc(confirmationId || "-")}
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
            You can use the button above to check whether
            your frames have been picked up.
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