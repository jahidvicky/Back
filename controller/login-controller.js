const Customer = require("../model/customer-model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Temporary in-memory OTP store (replace with DB or Redis for production)
let otpStore = {};

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
      { expiresIn: "1d" }
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

    // Store OTP with expiry (5 minutes)
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Insurance Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Password Reset OTP",
      html: `
        <p>Hello ${customer.firstName || "Customer"},</p>
        <p>Your OTP for password reset is:</p>
        <h2>${otp}</h2>
        <p>This OTP is valid for 5 minutes.</p>
        <p>If you didn’t request this, please ignore this email.</p>
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

    const record = otpStore[email];
    if (!record) {
      return res.status(400).json({ message: "No OTP found for this email" });
    }

    // Check OTP validity
    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Customer.findOneAndUpdate({ email }, { password: hashedPassword });

    delete otpStore[email];

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

