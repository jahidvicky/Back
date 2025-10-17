const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
        console.log("Email sent to", to);
    } catch (err) {
        console.error("Email error:", err.message);
    }
};

// Dummy SMS (replace with Twilio if needed)
const sendSMS = async (phone, message) => {
    console.log(`📱 SMS to ${phone}: ${message}`);
};

module.exports = { sendEmail, sendSMS };
