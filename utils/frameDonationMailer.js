const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendFrameDonationMail = async ({ name, email, phone, address }) => {
    await transporter.sendMail({
        from: `"Atal Optical" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: "New Frame Donation Request | Atal Optical",
        html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #f00000; color: #ffffff; padding: 16px 20px;">
            <h2 style="margin: 0; font-size: 20px;">New Frame Donation Received</h2>
            <p style="margin: 4px 0 0; font-size: 13px;">
              Our Community – Atal Optical
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333333;">
            <p style="font-size: 14px; margin-bottom: 16px;">
              A new frame donation request has been submitted through the
              <b>Our Community</b> section.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name: </td>
                <td style="padding: 8px 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Email: </td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Phone: </td>
                <td style="padding: 8px 0;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Address: </td>
                <td style="padding: 8px 0;">${address}</td>
              </tr>
            </table>

            <div style="margin-top: 20px; padding: 12px; background-color: #f9fafb; border-left: 4px solid #f00000;">
              <p style="margin: 0; font-size: 13px;">
                Please log in to the admin panel to view full details and manage
                this donation.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f4f6f8; padding: 12px 20px; font-size: 12px; color: #666666; text-align: center;">
            © ${new Date().getFullYear()} Atal Optical · All rights reserved
          </div>

        </div>
      </div>
    `,
    });
};


module.exports = sendFrameDonationMail;
