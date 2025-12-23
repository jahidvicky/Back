const thankYouDonation = (name) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Thank You</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5; font-family:Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden;">
            
            <!-- HEADER -->
            <tr>
              <td style="background:#f00000; padding:25px; text-align:center;">
                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                  Thank You for Your Donation
                </h1>
                <p style="color:#ffe5e5; margin:6px 0 0;">
                  Atal Optical – Our Community Initiative
                </p>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding:30px; color:#333;">
                <p style="font-size:16px;">Dear <strong>${name}</strong>,</p>

                <p style="font-size:15px; line-height:1.6;">
                  Thank you for donating your frames. Your generosity will help
                  someone see better and live with confidence.
                </p>

                <p style="font-size:15px; line-height:1.6;">
                  At <strong>Atal Optical</strong>, we believe vision care should be
                  accessible and sustainable. Your contribution supports both
                  community well-being and environmental responsibility.
                </p>

                <div style="background:#fff3f3; border-left:4px solid #f00000; padding:15px; margin:20px 0;">
                  <p style="margin:0; font-size:14px;">
                    <strong>What happens next?</strong><br/>
                    Our team will contact you soon to arrange a
                    <strong>free doorstep pickup</strong>.
                  </p>
                </div>

                <p style="font-size:15px;">
                  We truly appreciate your kindness and support.
                </p>

                <p style="margin-top:25px;">
                  With gratitude,<br/>
                  <strong>Team Atal Optical</strong>
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#fafafa; padding:15px; text-align:center; font-size:12px; color:#777;">
                Changing Lives. One Frame at a Time.<br/>
                © ${new Date().getFullYear()} Atal Optical
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};

module.exports = thankYouDonation;
