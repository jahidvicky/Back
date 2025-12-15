const FrameDonation = require("../model/frame-donation.model");
const sendFrameDonationMail = require("../utils/frameDonationMailer");

exports.createDonation = async (req, res) => {
    try {
        const { name, email, phone, address, postal } = req.body;

        // 1️⃣ Required fields check
        if (!name || !email || !phone || !address || !postal) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // 2️⃣ Phone validation (exactly 10 digits)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits",
            });
        }

        // 3️⃣ Postal code validation (Canada: A1A1A1 or A1A 1A1)
        const postalRegex = /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/;
        if (!postalRegex.test(postal)) {
            return res.status(400).json({
                success: false,
                message: "Invalid postal code format. Use A1A1A1 or A1A 1A1",
            });
        }

        // 4️⃣ Image validation
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one frame image is required",
            });
        }

        // 5️⃣ Collect image filenames
        const imageFiles = req.files.map((file) => file.filename);

        // 6️⃣ Save donation
        const donation = await FrameDonation.create({
            name,
            email,
            phone,
            address,        // full combined address
            postal,         // optional: store separately if schema allows
            frameImages: imageFiles,
        });

        // 7️⃣ Send admin email
        await sendFrameDonationMail({
            name,
            email,
            phone,
            address,
        });

        return res.status(201).json({
            success: true,
            message: "Thank you for donating your frames!",
            donation,
        });

    } catch (error) {
        console.error("Frame Donation Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};




// GET ALL (Admin List)
exports.getAllDonations = async (req, res) => {
    try {
        const donations = await FrameDonation.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            donations,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// GET BY ID (Admin Popup)
exports.getDonationById = async (req, res) => {
    try {
        const donation = await FrameDonation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({
                success: false,
                message: "Donation not found",
            });
        }

        res.status(200).json({
            success: true,
            donation,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
