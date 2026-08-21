const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendFrameDonationMail = async ({ name, email, phone, address, frameType, frameQuantity, frameImages }) => {

  await transporter.sendMail({
    from: `"Atal Optical" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "Frame Donation Request | Atal Optical",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <div style="background-color: #f00000; color: #ffffff; padding: 16px 20px;">
            <h2 style="margin: 0; font-size: 20px;">Frame Donation Received</h2>
            <p style="margin: 4px 0 0; font-size: 13px;">
              Frame Dontion – Atal Optical
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 20px; color: #333333;">
            <p style="font-size: 14px; margin-bottom: 16px;">
              A frame donation request has been submitted through the
              <b>Frame Donation</b> section.
            </p>

                       <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
              ${[
                { label: "Name", value: name },
                { label: "Email", value: email },
                { label: "Phone", value: phone },
                { label: "Address", value: address },
                { label: "Frame Type", value: frameType },
                { label: "Frame Quantity", value: frameQuantity },
                {
                  label: "Frame Images",
                  value:
                    frameImages && frameImages.length > 0
                      ? frameImages
                          .map(
                            (img) => `
                          <img 
                          src="https://api.ataloptical.org/uploads/${img}" 
                          alt="frame" 
                          style="width: 120px; height: 120px; object-fit: cover; border-radius: 6px; margin-right: 8px; margin-bottom: 8px; border: 1px solid #ddd;"
                         />`
                          )
                          .join("")
                      : null,
                },
              ]
                .filter((field) => field.value !== undefined && field.value !== null && field.value !== "")
                .map(
                  (field) => `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px; vertical-align: top;">${field.label}: </td>
                <td style="padding: 8px 0;">${field.value}</td>
              </tr>`
                )
                .join("")}
            </table>

            <div style="margin-top: 20px; padding: 12px; background-color: #f9fafb; border-left: 4px solid #f00000;">
              <p style="margin: 0; font-size: 13px;">
                Please log in to the admin panel to view full details and manage
                this frame donation.
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
