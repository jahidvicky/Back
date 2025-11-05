const nodemailer = require("nodemailer");

const sendDiscountEmail = async (req, res) => {
    try {
        const { email, discountCode } = req.body;

        if (!email || !discountCode) {
            return res
                .status(400)
                .json({ success: false, message: "Email and discount code are required." });
        }

        // Configure transporter
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email content
        const mailOptions = {
            from: `"Atal Opticals" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Discount Code",
            html: `
        <div style="font-family:Arial, sans-serif; text-align:center; color:#333;">
          <h2>Thank you for choosing Atal Opticals!</h2>
          <p>Here’s your exclusive discount code:</p>
          <h1 style="background:#000; color:#fff; padding:10px 25px; display:inline-block; border-radius:6px; letter-spacing:2px;">
            ${discountCode}
          </h1>
          <p style="margin-top:15px;">Use this code at checkout to enjoy your discount.</p>
          <hr style="margin:20px 0;">
          <p>— The Atal Opticals Team.</p>
        </div>
      `,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: "Discount code sent successfully to the user's email.",
        });
    } catch (error) {
        console.error("Error sending discount email:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send discount email.",
        });
    }
};

module.exports = { sendDiscountEmail };
