const transporter = require("./mailer");

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Atal Optical" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
