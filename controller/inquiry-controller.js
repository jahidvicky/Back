const InquiryModel = require("../model/inquiry-model");
const userModel = require("../model/user-model");
const vendorModel = require("../model/vendor-model");
const companyModel = require("../model/compnay-model");
const {
  inquiryRegisterTemplate,
  inquiryResponseTemplate,
  adminNotificationTemplate,
} = require("../utils/emailTemplates");
const transporter = require("../utils/mailer");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const generatePassword = (userType) => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";

  const pick = (charset, n) =>
    Array.from(crypto.randomBytes(n))
      .map(b => charset[b % charset.length])
      .join("");

  const prefix = userType === "vendor" ? "ven" : "comp";
  return `${prefix}-${pick(upper, 3)}${pick(lower, 2)}${pick(digits, 3)}${pick(special, 1)}`;
};

const getNextInquiryNumber = async () => {
  const last = await InquiryModel.findOne(
    { inquiryNumber: { $exists: true } },
    { inquiryNumber: 1 },
    { sort: { createdAt: -1 } }
  );
  const lastNum = last?.inquiryNumber
    ? parseInt(last.inquiryNumber.replace("INC-", ""), 10)
    : 0;
  const next = isNaN(lastNum) ? 1 : lastNum + 1;
  return `INC-${String(next).padStart(4, "0")}`;
};

/* ─── Get all inquiries (admin) ──────────────────────────────────────────── */

const getAllInquiry = async (req, res) => {
  try {
    const inquiries = await InquiryModel
      .find()
      .sort({ createdAt: -1 })
      .select("-__v");
    return res.status(200).json({ success: true, inquiry: inquiries });
  } catch (err) {
    console.error("getAllInquiry error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch inquiries." });
  }
};

/* ─── Add inquiry ────────────────────────────────────────────────────────── */

const addInquiry = async (req, res) => {
  try {
    const {
      userType,
      name,
      email,
      businessNumber,
      vendorType,
      registrationNumber,
      message,
    } = req.body;

    if (!userType || !name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and user type are required.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }

    if (!["vendor", "company"].includes(userType)) {
      return res.status(400).json({ success: false, message: "Invalid user type." });
    }

    if (userType === "vendor") {
      if (!businessNumber?.trim() || !vendorType) {
        return res.status(400).json({
          success: false,
          message: "Vendors must provide a business number and vendor type.",
        });
      }
      if (!["lab", "brand", "supplier"].includes(vendorType)) {
        return res.status(400).json({ success: false, message: "Invalid vendor type." });
      }
    }

    if (userType === "company" && !registrationNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Companies must provide a registration number.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "A PDF document is required." });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ success: false, message: "Only PDF files are allowed." });
    }

    const duplicateQuery =
      userType === "vendor"
        ? { userType: "vendor", $or: [{ email }, { businessNumber }] }
        : { userType: "company", $or: [{ email }, { registrationNumber }] };

    const duplicate = await InquiryModel.findOne(duplicateQuery);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          userType === "vendor"
            ? "An inquiry already exists for this email or business number."
            : "An inquiry already exists for this email or registration number.",
      });
    }

    const inquiryNumber = await getNextInquiryNumber();

    const newInquiry = new InquiryModel({
      userType,
      inquiryNumber,
      inquiryStatus: "open",
      name: name.trim(),
      email: email.toLowerCase().trim(),
      businessNumber: userType === "vendor" ? businessNumber.trim() : undefined,
      vendorType: userType === "vendor" ? vendorType : undefined,
      registrationNumber: userType === "company" ? registrationNumber.trim() : undefined,
      message: message?.trim() || "",
      uploadDocument: req.file.filename,
    });

    await newInquiry.save();

    /* ── Notify admin ── */
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New ${newInquiry.userType} Inquiry — ${newInquiry.inquiryNumber}`,
        html: adminNotificationTemplate(newInquiry),
      });
    } catch (emailErr) {
      console.error("Admin notification email failed:", emailErr.message);
    }

    /* ── NEW: Acknowledgement email to applicant ── */
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: newInquiry.email,
        subject: `We received your inquiry — ${newInquiry.inquiryNumber}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
            <h2 style="color:#dc2626;margin-bottom:8px">Thank you, ${newInquiry.name}!</h2>
            <p style="color:#374151">We've received your <strong>${newInquiry.userType}</strong> application.</p>
            <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px">
              <p style="margin:0;color:#374151">Your reference number: <strong>${newInquiry.inquiryNumber}</strong></p>
            </div>
            <p style="color:#374151">Our team will review your application and get back to you within <strong>2–3 business days</strong>.</p>
            <p style="color:#374151">If you have any questions, feel free to reply to this email.</p>
            <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px">ATAL Optical · sales.ataloptical@gmail.com · +1 1866-242-3545</p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Non-fatal — applicant acknowledgement failing should not block the submission
      console.error("Applicant acknowledgement email failed:", emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully.",
      data: {
        inquiryNumber: newInquiry.inquiryNumber,
        name: newInquiry.name,
        email: newInquiry.email,
        userType: newInquiry.userType,
        inquiryStatus: newInquiry.inquiryStatus,
      },
    });
  } catch (err) {
    console.error("addInquiry error:", err);
    return res.status(500).json({ success: false, message: "Internal server error.", error: err.message });
  }
};

/* ─── Send response only (no registration) ───────────────────────────────── */

const sendResponse = async (req, res) => {
  try {
    const { inquiryId, message } = req.body;

    if (!inquiryId || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Inquiry ID and message are required." });
    }

    const inquiry = await InquiryModel.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    if (inquiry.inquiryStatus !== "open") {
      return res.status(400).json({
        success: false,
        message: `This inquiry is already ${inquiry.inquiryStatus}. Only open inquiries can be responded to.`,
      });
    }

    inquiry.response = message.trim();
    inquiry.inquiryStatus = "close";
    await inquiry.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        subject: `Response to Your Inquiry — ${inquiry.inquiryNumber}`,
        html: inquiryResponseTemplate(inquiry.name, message),
      });
    } catch (emailErr) {
      console.error("Response email failed:", emailErr.message);
      return res.status(500).json({
        success: false,
        message: "Inquiry closed but response email could not be delivered.",
        error: emailErr.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Response sent and inquiry closed.",
      inquiry,
    });
  } catch (error) {
    console.error("sendResponse error:", error);
    return res.status(500).json({ success: false, message: "Error sending response.", error: error.message });
  }
};

/* ─── Send response + register user account ─────────────────────────────── */

const sendResponseAndRegister = async (req, res) => {
  try {
    const { inquiryId, message } = req.body;

    if (!inquiryId || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Inquiry ID and message are required." });
    }

    const inquiry = await InquiryModel.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    if (inquiry.inquiryStatus !== "open") {
      return res.status(400).json({
        success: false,
        message: `This inquiry is already ${inquiry.inquiryStatus}. Only open inquiries can be approved.`,
      });
    }

    const plainPassword = generatePassword(inquiry.userType);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let user = await userModel.findOne({ email: inquiry.email });
    if (!user) {
      user = new userModel({
        name: inquiry.name,
        email: inquiry.email,
        password: hashedPassword,
        role: inquiry.userType,
      });
    } else {
      user.password = hashedPassword;
    }
    await user.save();

    if (inquiry.userType === "vendor") {
      const exists = await vendorModel.findOne({ email: inquiry.email });
      if (!exists) {
        await new vendorModel({
          vendorType: inquiry.vendorType,
          businessNumber: inquiry.businessNumber,
          contactEmail: inquiry.email,
          contactName: inquiry.name,
          userId: user._id,
        }).save();
      }
    } else if (inquiry.userType === "company") {
      const exists = await companyModel.findOne({ email: inquiry.email });
      if (!exists) {
        await new companyModel({
          companyName: inquiry.name,
          companyEmail: inquiry.email,
          registrationNumber: inquiry.registrationNumber,
          userId: user._id,
        }).save();
      }
    }

    inquiry.response = message.trim();
    inquiry.inquiryStatus = "close";

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        subject: `Welcome to ATAL Optical — Your ${inquiry.userType === "vendor" ? "Vendor" : "Company"} Account`,
        html: inquiryRegisterTemplate(
          inquiry.name,
          inquiry.email,
          plainPassword,
          message.trim()
        ),
      });
      await inquiry.save();
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message);
      return res.status(500).json({
        success: false,
        message: "Account created but welcome email could not be delivered. Please resend credentials manually.",
        error: emailErr.message,
        user: { id: user._id, email: user.email },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inquiry closed, account created, and welcome email delivered.",
      inquiry: {
        id: inquiry._id,
        inquiryNumber: inquiry.inquiryNumber,
        inquiryStatus: inquiry.inquiryStatus,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("sendResponseAndRegister error:", error);
    return res.status(500).json({
      success: false,
      message: "Error in send & register.",
      error: error.message,
    });
  }
};

/* ─── NEW: Reject inquiry ────────────────────────────────────────────────── */

const rejectInquiry = async (req, res) => {
  try {
    const { inquiryId, reason } = req.body;

    if (!inquiryId || !reason?.trim()) {
      return res.status(400).json({ success: false, message: "Inquiry ID and reason are required." });
    }

    const inquiry = await InquiryModel.findById(inquiryId);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    if (inquiry.inquiryStatus !== "open") {
      return res.status(400).json({
        success: false,
        message: `This inquiry is already ${inquiry.inquiryStatus}. Only open inquiries can be rejected.`,
      });
    }

    inquiry.response = reason.trim();
    inquiry.inquiryStatus = "rejected";
    await inquiry.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: inquiry.email,
        subject: `Update on your ${inquiry.userType} application — ${inquiry.inquiryNumber}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
            <h2 style="color:#dc2626;margin-bottom:8px">Application Update</h2>
            <p style="color:#374151">Dear ${inquiry.name},</p>
            <p style="color:#374151">Thank you for your interest in partnering with ATAL Optical as a <strong>${inquiry.userType}</strong>.</p>
            <p style="color:#374151">After reviewing your application, we are unable to proceed at this time.</p>
            <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px">
              <p style="margin:0;color:#374151"><strong>Reason:</strong> ${reason}</p>
            </div>
            <p style="color:#374151">You are welcome to re-apply in the future with updated documentation.</p>
            <p style="color:#374151">If you believe this decision was made in error, please contact us directly.</p>
            <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px">ATAL Optical · sales.ataloptical@gmail.com · +1 1866-242-3545</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Rejection email failed:", emailErr.message);
      // Inquiry is already saved as rejected — log but inform admin
      return res.status(500).json({
        success: false,
        message: "Inquiry rejected but notification email could not be delivered.",
        error: emailErr.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inquiry rejected and applicant notified.",
      inquiry: {
        id: inquiry._id,
        inquiryNumber: inquiry.inquiryNumber,
        inquiryStatus: inquiry.inquiryStatus,
      },
    });
  } catch (error) {
    console.error("rejectInquiry error:", error);
    return res.status(500).json({ success: false, message: "Error rejecting inquiry.", error: error.message });
  }
};

module.exports = {
  getAllInquiry,
  addInquiry,
  sendResponse,
  sendResponseAndRegister,
  rejectInquiry,   // NEW — add to your router: router.post("/inquiry/reject", ctrl.rejectInquiry)
};