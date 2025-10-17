const InquiryModel = require("../model/inquiry-model");
const userModel = require("../model/user-model");
const vendorModel = require("../model/vendor-model");
const companyModel = require("../model/compnay-model");
const { inquiryRegisterTemplate, inquiryResponseTemplate, adminNotificationTemplate } = require("../utils/emailTemplates");
const transporter = require("../utils/mailer");
const bcrypt = require("bcryptjs");


const getAllInquiry = async (req, res) => {
    try {
        const inquiry = await InquiryModel.find().sort({ createdAt: -1 })
        res.status(200).json({ inquiry })
    } catch (err) {
        console.log(err);
    }
}

const addInquiry = async (req, res) => {
    try {
        const {
            userType,
            name,
            email,
            businessNumber,
            vendorType,
            registrationNumber,
            message
        } = req.body;

        const uploadDocument = req.file ? req.file.filename : null;

        // 1. Basic required field validation
        if (!userType || !name || !email) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the required fields",
            });
        }

        // 2. Vendor specific validation
        if (userType === "vendor") {
            if (!businessNumber || !vendorType) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Vendors must provide business number and vendor type (lab, brand, supplier)",
                });
            }
        }

        //  3. Company specific validation
        if (userType === "company") {
            if (!registrationNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Companies must provide registration number",
                });
            }
        }

        //  4. Upload document validation
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a document",
            });
        }

        // 5. Allow only PDF
        const allowedMimeTypes = ["application/pdf"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Images are not allowed. Please upload a PDF file only.",
            });
        }

        // 6. Generate next inquiry number
        const lastInquiry = await InquiryModel.findOne().sort({ createdAt: -1 });

        let nextNumber = 1;
        if (lastInquiry) {
            const lastNum = parseInt(lastInquiry.inquiryNumber.replace("INC-", ""));
            if (!isNaN(lastNum)) {
                nextNumber = lastNum + 1;
            }
        }

        const inquiryNumber = `INC-${String(nextNumber).padStart(4, "0")}`;

        // 7. Save new inquiry
        const newInquiry = new InquiryModel({
            userType,
            inquiryNumber,
            inquiryStatus: "open",
            name,
            email,
            businessNumber: userType === "vendor" ? businessNumber : undefined,
            vendorType: userType === "vendor" ? vendorType : undefined,
            registrationNumber: userType === "company" ? registrationNumber : undefined,
            message,
            uploadDocument,
        });

        await newInquiry.save();

        // 8. Send email to admin
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `New ${newInquiry.userType} Inquiry - ${newInquiry.inquiryNumber}`,
            html: adminNotificationTemplate(newInquiry),
        };
        await transporter.sendMail(mailOptions);

        return res.status(201).json({
            success: true,
            message: "Inquiry Added Successfully & Sent to Admin",
            data: newInquiry,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};


const generatePassword = (userType) => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";

    // Pick 3 random letters
    let randomLetters = "";
    for (let i = 0; i < 3; i++) {
        randomLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Pick 3 random digits
    let randomDigits = "";
    for (let i = 0; i < 3; i++) {
        randomDigits += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Add prefix based on user type
    const prefix = userType === "vendor" ? "ven" : "comp";

    return `${prefix}${randomLetters}${randomDigits}`;
};




// Send Response
const sendResponse = async (req, res) => {
    try {
        const { inquiryId, message } = req.body;
        const inquiry = await InquiryModel.findById(inquiryId);

        if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

        inquiry.response = message;
        inquiry.inquiryStatus = "close";
        await inquiry.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: inquiry.email,
            subject: "Response to Your Inquiry",
            html: inquiryResponseTemplate(inquiry.name, message),
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Response sent successfully and email delivered", inquiry });
    } catch (error) {
        res.status(500).json({ message: "Error sending response", error: error.message });
    }
};

const sendResponseAndRegister = async (req, res) => {
    try {
        const { inquiryId, message } = req.body;

        // 1. Find inquiry
        const inquiry = await InquiryModel.findById(inquiryId);
        if (!inquiry) {
            return res.status(404).json({ success: false, message: "Inquiry not found" });
        }

        // 2. Prevent re-closing
        if (inquiry.inquiryStatus === "close") {
            return res.status(400).json({ success: false, message: "Inquiry already closed" });
        }

        // 3. Update inquiry with response
        inquiry.response = message;
        inquiry.inquiryStatus = "close";

        // 4. Always generate auto password
        const plainPassword = generatePassword(inquiry.userType);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // 5. Find or create user
        let user = await userModel.findOne({ email: inquiry.email });

        if (!user) {
            user = new userModel({
                name: inquiry.name,
                email: inquiry.email,
                password: hashedPassword,
                role: inquiry.userType
            });
        } else {
            // If user exists, reset password
            user.password = hashedPassword;
        }
        await user.save();

        // 6. Vendor/Company profile
        if (inquiry.userType === "vendor") {
            let vendor = await vendorModel.findOne({ email: inquiry.email });
            if (!vendor) {
                vendor = new vendorModel({
                    vendorType: inquiry.vendorType,
                    businessNumber: inquiry.businessNumber,
                    contactEmail: inquiry.email,
                    contactName: inquiry.name,
                    userId: user._id,
                    operatingName: "",
                    vendorPassword: "",
                    contactTitle: "",
                    cantactPhone: "",
                    address1: "",
                    address2: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: "",
                    website: "",
                    categories: [],
                    brands: "",
                    shippingTerms: "",
                    leadTimes: "",
                    moq: "",
                    returnPolicy: "",
                    accountHolder: "",
                    bankName: "",
                    accountNumber: "",
                    transitNumber: "",
                    institutionNumber: "",
                    swift: "",
                    iban: "",
                    remittanceEmail: "",

                });
                await vendor.save();
            }
        } else if (inquiry.userType === "company") {
            let company = await companyModel.findOne({ email: inquiry.email });
            if (!company) {
                company = new companyModel({
                    companyName: inquiry.name,
                    companyEmail: inquiry.email,
                    registrationNumber: inquiry.registrationNumber,
                    userId: user._id,
                    companyPassword: "",
                    legalEntity: "",
                    networkPayerId: "",
                    efRemittance: "",
                    providerName: "",
                    providerNumber: "",
                    providerEmail: "",
                    claim: [],
                    signedAgreement: "",
                    licenseProof: "",
                    voidCheque: "",
                    serviceStandards: "",
                    agreementAccepted: false
                })
                await company.save();
            }
        }

        // 7. Send email with auto-generated password
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: inquiry.email,
            subject: `Welcome ${inquiry.userType} - Registration Successful`,
            html: inquiryRegisterTemplate(
                inquiry.name,
                inquiry.email,
                plainPassword, //always defined
                message
            ),
        };

        try {
            await transporter.sendMail(mailOptions);
            await inquiry.save(); // save inquiry only after email success
        } catch (emailErr) {
            return res.status(500).json({
                success: false,
                message: "User created/updated but failed to send email",
                error: emailErr.message,
            });
        }

        // 8. Success response
        res.status(200).json({
            success: true,
            message: "Response sent, user registered/reset with auto password, and email sent successfully",
            inquiry,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error in Send & Register",
            error: error.message,
        });
    }
};

module.exports = { getAllInquiry, addInquiry, sendResponse, sendResponseAndRegister };