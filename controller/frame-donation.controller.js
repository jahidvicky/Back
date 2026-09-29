const crypto = require("crypto");
const mongoose = require("mongoose");
const FrameDonation = require("../model/frame-donation.model");
const User = require("../model/customer-model");
const sendEmail = require("../utils/sendEmail");
const sendFrameDonationMail = require("../utils/frameDonationMailer");
const thankYouDonation = require("../utils/thankYouDonation");
const pickupScheduledEmail = require("../utils/pickupScheduledEmail");

const loomisService = require("../services/loomisService");
const getProvinceFromPostalCode = require("../utils/getProvinceFromPostalCode");
const dayjs = require("dayjs");

const PROVINCE_CODES = {
  "ONTARIO": "ON",
  "ALBERTA": "AB",
  "BRITISH COLUMBIA": "BC",
  "QUEBEC": "QC",
  "MANITOBA": "MB",
  "SASKATCHEWAN": "SK",
  "NOVA SCOTIA": "NS",
  "NEW BRUNSWICK": "NB",
  "NEWFOUNDLAND": "NL",
  "NEWFOUNDLAND AND LABRADOR": "NL",
  "PRINCE EDWARD ISLAND": "PE",
  "NORTHWEST TERRITORIES": "NT",
  "YUKON": "YT",
  "NUNAVUT": "NU",
};


const parseProvinceFromAddress = (addr = "") => {
  const parts = String(addr).split(",").map((s) => s.trim());
  return parts.length >= 4 ? parts[2] : "";
};

// Address format from the form: "street, city, province, postal, Canada"
const parseStreetFromAddress = (addr = "") => {
  const parts = String(addr).split(",").map((s) => s.trim());
  return parts.length >= 4 ? parts[0] : String(addr);
};

// Address format from the form: "street, city, province, postal, Canada"
const parseCityFromAddress = (addr = "") => {
  const parts = String(addr).split(",").map((s) => s.trim());
  return parts.length >= 4 ? parts[1] : "";
};

const resolveProvinceCode = (province, postal) => {
  const p = String(province || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(p)) return p;          // already a code
  return PROVINCE_CODES[p] || getProvinceFromPostalCode(postal) || "";
};

exports.createDonation = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      street,
      postal,
      city,
      province,
      frameType,
      frameQuantity,
      frameImages,
      userId,
    } = req.body;

    //  Required fields check
    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !postal ||
      !frameType ||
      !frameQuantity
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!city || !province) {
      return res.status(400).json({
        success: false,
        message: "City and province are required for pickup",
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

    // Reject postal codes that don't map to a Canadian province (e.g. S2S2S2)
    const cleanPostal = postal.replace(/\s/g, "").toUpperCase();
    const postalProvince = getProvinceFromPostalCode(cleanPostal);

    if (!postalProvince) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Canadian postal code",
      });
    }

    // Reject a province that doesn't match the postal code (e.g. Alberta + L6P2A2)
    const enteredProvinceCode = resolveProvinceCode(province, cleanPostal);

    if (enteredProvinceCode !== postalProvince) {
      return res.status(400).json({
        success: false,
        message: `Postal code ${postal} belongs to ${postalProvince}, but you selected a different province. Please correct one of them.`,
      });
    }

    //  Collect images
    const imageFiles = req.files.map((file) => file.filename);

    const pickupAccessToken = crypto.randomBytes(32).toString("hex");

    // Only trust userId if it's a real, existing account — never trust it blindly
    let donorUserId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const exists = await User.exists({ _id: userId });
      if (exists) donorUserId = userId;
    }

    //  Save donation
    const donation = await FrameDonation.create({
      name,
      email: String(email).toLowerCase().trim(),
      phone,
      address,
      street: street || null,
      postal,
      city,
      province,
      frameType,
      frameQuantity,
      frameImages: imageFiles,
      pickupAccessToken,
      pickupStatus: "PENDING",
      donorUserId,
    });

    // Send response immediately
    res.status(201).json({
      success: true,
      message: "Thank you for donating your frames!",
      donation,
    });

    // Send emails in background
    (async () => {
      try {
        const results = await Promise.allSettled([
          sendFrameDonationMail({
            name,
            email,
            phone,
            address,
            frameType,
            frameQuantity,
            frameImages: imageFiles,
          }),

          sendEmail({
            to: email,
            subject: "Thank You for Your Frame Donation",
            html: thankYouDonation(name),
          }),
        ]);

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
          } else {
            console.error(
              index === 0
                ? "Admin email failed:"
                : "Thank-you email failed:",
              result.reason
            );
          }
        });
      } catch (err) {
        console.error("Background email error:", err);
      }
    })();

  } catch (error) {
    console.error("Frame Donation Error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

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

// ======================================================
// GET MY FRAME DONATIONS - CUSTOMER
// ======================================================

exports.getMyDonations = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Only donations submitted by this exact account while logged in.
    // Donations made without logging in (donorUserId = null) never appear here,
    // for anyone — the donor only learns details through email.
    const donations = await FrameDonation.find({ donorUserId: userId })
      .select(
        "frameType frameQuantity quantity frameImages pickupStatus pickupDate pickupReadyTime pickupCloseTime pickedUpOn createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const safe = donations.map(({ quantity, ...d }) => ({
      ...d,
      frameQuantity: d.frameQuantity ?? quantity ?? null,
      // FAILED is internal, so the customer sees it as "pending"
      pickupStatus:
        !d.pickupStatus || d.pickupStatus === "FAILED"
          ? "PENDING"
          : d.pickupStatus,
    }));

    return res.status(200).json({
      success: true,
      donations: safe,
    });
  } catch (error) {
    console.error("Get My Donations Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load donations",
    });
  }
};

// ======================================================
// ARRANGE FREE LOOMIS PICKUP
// ======================================================

exports.arrangePickup = async (req, res) => {
  try {
    const donation = await FrameDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    if (donation.pickupStatus === "PICKED_UP") {
      return res.status(400).json({
        success: false,
        message: "This donation has already been picked up",
      });
    }


    // ==========================================
    // DONOR ADDRESS FIELDS (needed for both the date lookup and the pickup call)
    // ==========================================

    const postal = String(donation.postal || "")
      .replace(/\s/g, "")
      .toUpperCase();

    const city =
      donation.city || parseCityFromAddress(donation.address);

    // ==========================================
    // PICKUP DATE / TIME
    // ==========================================

    const readyTime =
      req.body?.readyTime || "1000";

    const closeTime =
      req.body?.closeTime || "1700";

    let pickupDate = req.body?.pickupDate;

    if (!pickupDate) {
      // getPickupDay is postal-code specific (per Loomis docs) — must use the
      // donor's postal code, not the warehouse's, since donation pickups
      // happen at the donor's address
      const validDays = await loomisService.getPickupDay({
        fromDate: dayjs().format("YYYYMMDD"),
        numOfDays: 7,
        postalCode: postal,
      });

      if (!validDays.length) {
        return res.status(400).json({
          success: false,
          message:
            "Loomis has no available pickup days in the next 7 days. Please try again later or contact Loomis.",
        });
      }

      pickupDate = validDays[0].value;
    }

    // ==========================================
    // SCHEDULE LOOMIS PICKUP
    // ==========================================

    const provinceCode = resolveProvinceCode(
      donation.province || parseProvinceFromAddress(donation.address),
      postal
    );

    // Postal code must map to a real province (rejects e.g. S2S2S2)
    const postalProvince = getProvinceFromPostalCode(postal);

    if (!postalProvince) {
      return res.status(400).json({
        success: false,
        message: `Postal code "${donation.postal}" is not a valid Canadian postal code. Please correct it and try again.`,
      });
    }

    if (!city || !provinceCode) {
      return res.status(400).json({
        success: false,
        message: `Missing ${!city ? "city" : "province"} for this donation. Please update the donor details first.`,
      });
    }

    if (postalProvince !== provinceCode) {
      return res.status(400).json({
        success: false,
        message: `Postal code ${donation.postal} belongs to ${postalProvince}, but the donation says ${provinceCode}. Please correct one of them.`,
      });
    }

    const result =
      await loomisService.scheduleFrameDonationPickup({
        customerName: donation.name,

        customerAddress: donation.street || parseStreetFromAddress(donation.address),

        customerCity: city,

        customerProvince: provinceCode,

        customerPostal: postal,

        customerPhone:
          donation.phone,

        customerEmail:
          donation.email,

        totalPieces:
          donation.frameQuantity,

        totalWeight:
          Math.max(
            Number(donation.frameQuantity) || 1,
            1
          ),

        pickupDate,
        readyTime,
        closeTime,

        comments:
          `Frame donation pickup for donation ${donation._id}`,
      });

    // ==========================================
    // SAVE LOOMIS PICKUP DATA
    // ==========================================

    const updatedDonation =
      await FrameDonation.findByIdAndUpdate(
        donation._id,
        {
          pickupStatus: "ARRANGED",

          loomisConfirmationId:
            result.confirmationNumber || null,

          pickupDate:
            result.pickupDate ||
            pickupDate ||
            null,

          pickupReadyTime:
            result.readyTime ||
            readyTime ||
            null,

          pickupCloseTime:
            result.closeTime ||
            closeTime ||
            null,

          pickupTrackingUrl:
            result.trackingUrl ||
            null,

          pickupError: null,

          pickupLastCheckedAt: null,

          pickedUpOn: null,

          pickupEvents: [],
        },
        {
          new: true,
        }
      );


    // ============================================
    // SEND CUSTOMER PICKUP CONFIRMATION EMAIL
    // ============================================

    try {
      const frontendUrl = process.env.FRONTEND_URL || "https://ataloptical.org";

      let token = updatedDonation.pickupAccessToken;
      if (!token) {
        token = crypto.randomBytes(32).toString("hex");
        await FrameDonation.findByIdAndUpdate(updatedDonation._id, {
          pickupAccessToken: token,
        });
      }

      const pickupUrl = `${frontendUrl}/pickup-status/${token}`;

      await sendEmail({
        to: updatedDonation.email,

        subject:
          "Your ATAL Optical Frame Pickup Has Been Scheduled",

        html: pickupScheduledEmail({
          name: updatedDonation.name,

          pickupDate:
            updatedDonation.pickupDate,

          readyTime:
            updatedDonation.pickupReadyTime,

          closeTime:
            updatedDonation.pickupCloseTime,

          confirmationId:
            updatedDonation.loomisConfirmationId,

          pickupUrl,
        }),
      });

    } catch (emailError) {

      console.error(
        "Customer pickup email failed:",
        emailError
      );

    }

    return res.status(200).json({
      success: true,

      message:
        "Loomis pickup arranged successfully",

      pickup: result,

      donation: updatedDonation,
    });

  } catch (error) {

    console.error(
      "Arrange Loomis Pickup Error:",
      error
    );

    await FrameDonation.findByIdAndUpdate(
      req.params.id,
      {
        pickupStatus: "FAILED",

        pickupError:
          error.message,
      }
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to arrange pickup",
    });
  }
};



// ======================================================
// CHECK LOOMIS PICKUP STATUS
// ======================================================

exports.checkPickupStatus = async (req, res) => {
  try {
    const donation =
      await FrameDonation.findById(
        req.params.id
      );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message:
          "Donation not found",
      });
    }

    if (
      !donation.loomisConfirmationId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No Loomis pickup confirmation ID found",
      });
    }

    const pickup =
      await loomisService.searchPickupById(
        donation.loomisConfirmationId
      );

    const pickedUp =
      Boolean(pickup.pickedUpOn);

    const update = {
      pickupLastCheckedAt:
        new Date(),

      pickupEvents: [
        {
          confirmationId:
            pickup.confirmationId,

          pickupDate:
            pickup.pickupDate,

          readyTime:
            pickup.readyTime,

          closingTime:
            pickup.closingTime,

          numberOfParcels:
            pickup.numberOfParcels,

          weight:
            pickup.weight,

          cancelledBy:
            pickup.cancelledBy,

          cancelledOn:
            pickup.cancelledOn,

          pickedUpOn:
            pickup.pickedUpOn,

          checkedAt:
            new Date(),
        },
      ],
    };

    if (pickedUp) {
      update.pickupStatus =
        "PICKED_UP";

      update.pickedUpOn =
        new Date(
          pickup.pickedUpOn
        );
    }

    const updatedDonation =
      await FrameDonation.findByIdAndUpdate(
        donation._id,
        update,
        {
          new: true,
        }
      );

    return res.status(200).json({
      success: true,

      pickupStatus:
        updatedDonation.pickupStatus,

      pickedUp,

      pickedUpOn:
        updatedDonation.pickedUpOn,

      confirmationId:
        updatedDonation.loomisConfirmationId,

      pickup,
    });

  } catch (error) {

    console.error(
      "Check Loomis Pickup Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};



// ======================================================
// CUSTOMER - VIEW PICKUP STATUS
// ======================================================

exports.getCustomerPickupStatus = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Pickup access token is required",
      });
    }

    const donation = await FrameDonation.findOne({
      pickupAccessToken: token,
    }).select(
      "name address postal city province frameType frameQuantity pickupStatus pickupDate pickupReadyTime pickupCloseTime pickedUpOn createdAt"
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Pickup information not found",
      });
    }

    return res.status(200).json({
      success: true,
      pickup: {
        name: donation.name,

        address: donation.address,
        city: donation.city,
        province: donation.province,
        postal: donation.postal,

        frameType: donation.frameType,
        frameQuantity: donation.frameQuantity,

        // FAILED is internal, so the customer sees it as "pending"
        status:
          donation.pickupStatus === "FAILED"
            ? "PENDING"
            : donation.pickupStatus,

        pickupDate: donation.pickupDate,
        readyTime: donation.pickupReadyTime,
        closeTime: donation.pickupCloseTime,

        pickedUpOn: donation.pickedUpOn,
      },
    });

  } catch (error) {
    console.error(
      "Customer Pickup Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to get pickup status",
    });
  }
};