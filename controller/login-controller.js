const Customer = require("../model/customer-model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//  LOGIN FUNCTION
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: customer._id, email: customer.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        mobilePhone: customer.mobilePhone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

//  SEND OTP FUNCTION
const sendResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    //  Save to DB instead of memory
    customer.otpCode = otp;
    customer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await customer.save();

    //  Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Atal Optical" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Password Reset OTP",
      html: `
                <p>Hello ${customer.firstName || "Customer"},</p>
                <p>Your OTP for password reset is:</p>
                <h2 style="letter-spacing: 4px;">${otp}</h2>
                <p>This OTP is valid for <strong>5 minutes</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br/>
                <p style="color:#999;font-size:12px;">— Atal Optical Team</p>
            `,
    });

    res.status(200).json({ message: "OTP sent successfully to your email" });

  } catch (error) {
    console.error("OTP error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

//  VERIFY OTP AND RESET PASSWORD
const verifyAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    //  Password strength check
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    //  Read from DB
    const customer = await Customer.findOne({ email });
    if (!customer || !customer.otpCode) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    if (customer.otpCode !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > customer.otpExpiresAt) {
      customer.otpCode = null;
      customer.otpExpiresAt = null;
      await customer.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    //  Reset password and clear OTP
    customer.password = await bcrypt.hash(newPassword, 10);
    customer.otpCode = null;
    customer.otpExpiresAt = null;
    await customer.save();

    res.status(200).json({ message: "Password reset successful" });

  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};

module.exports = {
  loginCustomer,
  sendResetOTP,
  verifyAndResetPassword,
};