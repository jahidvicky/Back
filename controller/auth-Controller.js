const User = require("../model/user-model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer")

// Register customer
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "Email already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                email: user.email,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};




exports.loginNew = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Create JWT payload
        const payload = {
            id: user._id,
            role: user.role,
        };

        // Add role-specific data
        if (user.role === "company") {
            payload.companyId = user._id;
            payload.companyName = user.companyName;
        } else if (user.role === "vendor") {
            payload.vendorId = user._id;
            payload.vendorName = user.vendorName;
        }

        // Sign JWT
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ message: "Login successful", token, user });
    } catch (error) {
        res.status(500).json({ message: "Login error", error: error.message });
    }
};



//----------------------------------------------------------------------------------------


// In-memory OTP store (for testing). For production, use DB or Redis.
const otpStorage = {};

// SEND OTP
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "No user found with this email" });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStorage[email] = otp;

        // Setup Nodemailer (Gmail example)
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER, // your Gmail
                pass: process.env.EMAIL_PASS, // your App Password
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is ${otp}. It will expire in 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP sent successfully" });

        // Delete OTP after 5 minutes
        setTimeout(() => delete otpStorage[email], 5 * 60 * 1000);
    } catch (err) {
        console.error("Send OTP error:", err);
        res.status(500).json({ message: "Failed to send OTP" });
    }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!otpStorage[email])
            return res.status(400).json({ message: "OTP expired or not found" });

        if (otpStorage[email] !== otp)
            return res.status(400).json({ message: "Invalid OTP" });

        res.json({ message: "OTP verified successfully" });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ message: "OTP verification failed" });
    }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);
        user.password = hashed;
        await user.save();

        delete otpStorage[email]; // cleanup

        res.json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ message: "Failed to reset password" });
    }
};
