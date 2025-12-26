const FrameDonation = require("../model/frame-donation.model");
const sendEmail = require("../utils/sendEmail");
const sendFrameDonationMail = require("../utils/frameDonationMailer");
const thankYouDonation = require("../utils/thankYouDonation");

exports.createDonation = async (req, res) => {
  try {
    const { name, email, phone, address, postal, frameType } = req.body;

    //  Required fields check
    if (!name || !email || !phone || !address || !postal || !frameType) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    //  Phone validation
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits",
      });
    }

    //  Postal validation
    if (!/^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/.test(postal)) {
      return res.status(400).json({
        success: false,
        message: "Invalid postal code format",
      });
    }

    //  Image validation
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one frame image is required",
      });
    }

    //  Collect images
    const imageFiles = req.files.map((file) => file.filename);

    //  Save donation
    const donation = await FrameDonation.create({
      name,
      email,
      phone,
      address,
      postal,
      frameType,
      frameImages: imageFiles,
    });

    //  Send admin email
    await sendFrameDonationMail({
      name,
      email,
      phone,
      address,
    });

    //  Send thank-you email to donor
    await sendEmail({
      to: email,
      subject: "Thank You for Your Frame Donation",
      html: thankYouDonation(name),
    });

    //  FINAL RESPONSE (must be LAST)
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
