const FreeEyeCheckup = require("../model/freeEyeCheckup-model");
const sendEmail = require("../utils/sendEmail");
const EyeCheckupSettings = require("../model/eyeCheckupSettings-model");
const { eyeCheckupUserTemplate, eyeCheckupAdminTemplate } = require("../utils/emailTemplates");


// Calculate age from a DOB string (server-side, tamper-proof)
const calculateAgeFromDob = (dobStr) => {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

// Shared helper — determines eligibility + reason, checked against the
// customer's PREFERRED VISIT DATE (not "today"), so a booking made now
// for a date after the festival ends is correctly rejected.
const checkEligibility = (age, settings, preferredDate) => {
    const visitDate = new Date(preferredDate);

    const festivalCoversVisit =
        settings.festivalActive &&
        settings.startDate &&
        settings.endDate &&
        visitDate >= new Date(settings.startDate) &&
        visitDate <= new Date(settings.endDate);

    if (festivalCoversVisit) {
        return { eligible: true, reason: "festival", festivalName: settings.festivalName };
    }

    if (age < settings.ageMin || age > settings.ageMax) {
        return { eligible: true, reason: "age" };
    }

    return { eligible: false, reason: null };
};



// GET ALL BOOKINGS
const getEyeCheckup = async (req, res) => {
    try {
        const eyeCheckup = await FreeEyeCheckup.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: eyeCheckup,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// CREATE BOOKING
const createEyeCheckup = async (req, res) => {
    try {
        const { name, email, phone, dob, date, message } = req.body;

        // Required fields
        if (!name || !phone || !date || !dob) {
            return res.status(400).json({
                success: false,
                message: "Name, Phone, Date of Birth and Date are required.",
            });
        }

        if (isNaN(new Date(dob))) {
            return res.status(400).json({
                success: false,
                message: "Invalid date of birth.",
            });
        }

        if (new Date(dob) > new Date()) {
            return res.status(400).json({
                success: false,
                message: "Date of birth cannot be in the future.",
            });
        }

        const parsedAge = calculateAgeFromDob(dob);
        if (parsedAge < 0 || parsedAge > 120) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid date of birth.",
            });
        }

        // Eligibility check — based on the customer's PREFERRED VISIT DATE,
        // so a booking made today for a date after the festival ends is
        // correctly rejected (unless they qualify by age anyway).
        const settings = await EyeCheckupSettings.getSingleton();
        const eligibility = checkEligibility(parsedAge, settings, date);

        if (!eligibility.eligible) {
            const festivalNote = settings.festivalActive
                ? ` Note: our current festival offer (${settings.festivalName}) runs from ${new Date(settings.startDate).toLocaleDateString()} to ${new Date(settings.endDate).toLocaleDateString()} — your preferred date falls outside this window.`
                : "";
            return res.status(403).json({
                success: false,
                message: `Sorry, free eye checkups on your preferred date are available only for ages under ${settings.ageMin} or over ${settings.ageMax}.${festivalNote}`,
            });
        }

        // Phone validation
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits",
            });
        }

        // Email validation (optional)
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
        }

        // Date validation
        if (isNaN(new Date(date))) {
            return res.status(400).json({
                success: false,
                message: "Invalid date",
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestedVisitDate = new Date(date);
        requestedVisitDate.setHours(0, 0, 0, 0);

        if (requestedVisitDate < today) {
            return res.status(400).json({
                success: false,
                message: "Preferred date cannot be in the past.",
            });
        }

        const newBooking = await FreeEyeCheckup.create({
            name,
            email,
            phone,
            dob,
            age: parsedAge,
            date,
            message,
            eligibilityReason: eligibility.reason,
        });

        // Send confirmation email to user (only if email provided)
        if (email) {
            try {
                await sendEmail({
                    to: email.trim(),
                    subject: "Free Eye Checkup Appointment Confirmed",
                    html: eyeCheckupUserTemplate(newBooking),
                });
                console.log(`Confirmation email sent to user: ${email}`);
            } catch (err) {
                console.error(`User confirmation email FAILED for ${email}:`, err.message);
            }
        } else {
            console.log("No email provided for this booking — skipping user confirmation email.");
        }

        // Send notification email to admin
        try {
            await sendEmail({
                to: process.env.ADMIN_EMAIL,
                subject: "New Free Eye Checkup Booking Received",
                html: eyeCheckupAdminTemplate(newBooking),
            });
        } catch (err) {
            console.error("Admin notification email FAILED:", err.message);
        }

        return res.status(201).json({
            success: true,
            message: "Free Eye Checkup Appointment Booked.",
            data: newBooking,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// GET current settings (used by admin toggle UI AND public frontend banner)
const getEyeCheckupSettings = async (req, res) => {
    try {
        const settings = await EyeCheckupSettings.getSingleton();
        return res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// UPDATE settings — admin toggles festival on/off, sets dates + reason
const updateEyeCheckupSettings = async (req, res) => {
    try {
        const { festivalActive, festivalName, startDate, endDate, ageMin, ageMax } = req.body;

        if (festivalActive) {
            if (!festivalName || !startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: "Festival name, start date, and end date are required when enabling festival offer.",
                });
            }
            if (new Date(startDate) > new Date(endDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Start date must be before end date.",
                });
            }
        }

        const settings = await EyeCheckupSettings.getSingleton();

        settings.festivalActive = !!festivalActive;
        settings.festivalName = festivalName || "";
        settings.startDate = startDate || null;
        settings.endDate = endDate || null;
        if (ageMin !== undefined) settings.ageMin = ageMin;
        if (ageMax !== undefined) settings.ageMax = ageMax;

        await settings.save();

        return res.status(200).json({ success: true, message: "Settings updated.", data: settings });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getEyeCheckup,
    createEyeCheckup,
    getEyeCheckupSettings,
    updateEyeCheckupSettings,
};