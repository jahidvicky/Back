const bcrypt = require("bcryptjs");
const Customer = require("../model/customer-model");

/* ─── Shared Validators ──────────────────────────────────────────────────── */

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidPhone = (phone) =>
  /^\+?[1-9]\d{6,14}$/.test(phone.trim());          // E.164-style, 7–15 digits

const isValidPostalCode = (code) =>
  /^[A-Za-z0-9\s\-]{3,10}$/.test(code.trim());

const isAdult = (dob) => {
  const birth = new Date(dob);
  if (isNaN(birth)) return false;
  const today = new Date();
  const age18 = new Date(birth.getFullYear() + 18, birth.getMonth(), birth.getDate());
  return today >= age18;
};

/* Password: min 8 chars, 1 uppercase, 1 digit, 1 special char */
const isStrongPassword = (pwd) =>
  /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);

/* ─── Register ───────────────────────────────────────────────────────────── */

const registerCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      mobilePhone,
      email,
      password,
      address,
    } = req.body;

    /* ── Field-level validation ── */
    const errors = [];

    if (!firstName?.trim()) errors.push("First name is required.");
    if (!lastName?.trim()) errors.push("Last name is required.");

    if (!dateOfBirth) {
      errors.push("Date of birth is required.");
    } else if (!isAdult(dateOfBirth)) {
      errors.push("You must be at least 18 years old to register.");
    }

    if (!mobilePhone) {
      errors.push("Mobile phone is required.");
    } else if (!isValidPhone(mobilePhone)) {
      errors.push("Enter a valid mobile phone number (7–15 digits, optional leading +).");
    }

    if (!email) {
      errors.push("Email is required.");
    } else if (!isValidEmail(email)) {
      errors.push("Enter a valid email address.");
    }

    if (!password) {
      errors.push("Password is required.");
    } else if (!isStrongPassword(password)) {
      errors.push(
        "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character."
      );
    }

    if (!address?.street?.trim()) errors.push("Street address is required.");
    if (!address?.city?.trim()) errors.push("City is required.");
    if (!address?.postalCode) {
      errors.push("Postal code is required.");
    } else if (!isValidPostalCode(address.postalCode)) {
      errors.push("Enter a valid postal code.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    /* ── Duplicate check ── */
    const existingCustomer = await Customer.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { mobilePhone: mobilePhone.trim() }],
    });

    if (existingCustomer) {
      const field =
        existingCustomer.email === email.toLowerCase().trim() ? "Email" : "Mobile number";
      return res.status(409).json({ message: `${field} is already registered.` });
    }

    /* ── Save ── */
    const hashedPassword = await bcrypt.hash(password, 10);

    const newCustomer = new Customer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      mobilePhone: mobilePhone.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      address: {
        street: address.street.trim(),
        city: address.city.trim(),
        province: address.province?.trim() || "",
        postalCode: address.postalCode.trim(),
        country: address.country?.trim() || "",
      },
      prescriptionFile: req.file ? req.file.filename : null,
    });

    await newCustomer.save();

    return res.status(201).json({
      message: "Customer registered successfully.",
      customer: {
        id: newCustomer._id,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        email: newCustomer.email,
        mobilePhone: newCustomer.mobilePhone,
      },
    });
  } catch (error) {
    console.error("Error in registerCustomer:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ─── Fetch by ID ────────────────────────────────────────────────────────── */

const fetchCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "null") {
      return res.status(400).json({ success: false, message: "Invalid customer ID." });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    return res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer.",
      error: error.message,
    });
  }
};

/* ─── Update ─────────────────────────────────────────────────────────────── */

const updateCustomer = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, mobilePhone, email, address, password } =
      req.body;
    const customerId = req.params.id;

    /* ── Validation ── */
    const errors = [];

    if (!firstName?.trim()) errors.push("First name is required.");
    if (!lastName?.trim()) errors.push("Last name is required.");

    if (!dateOfBirth) {
      errors.push("Date of birth is required.");
    } else if (!isAdult(dateOfBirth)) {
      errors.push("Customer must be at least 18 years old.");
    }

    if (!mobilePhone) {
      errors.push("Mobile phone is required.");
    } else if (!isValidPhone(mobilePhone)) {
      errors.push("Enter a valid mobile phone number.");
    }

    if (!email) {
      errors.push("Email is required.");
    } else if (!isValidEmail(email)) {
      errors.push("Enter a valid email address.");
    }

    if (password && !isStrongPassword(password)) {
      errors.push(
        "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character."
      );
    }

    if (!address?.postalCode || !isValidPostalCode(address.postalCode)) {
      errors.push("Enter a valid postal code.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    /* ── Duplicate checks ── */
    const existingEmail = await Customer.findOne({ email, _id: { $ne: customerId } });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const existingMobile = await Customer.findOne({ mobilePhone, _id: { $ne: customerId } });
    if (existingMobile) {
      return res.status(400).json({ message: "Mobile number already exists." });
    }

    /* ── Build update ── */
    const updateFields = { firstName, lastName, dateOfBirth, mobilePhone, email, address };

    if (password) {
      updateFields.password = await bcrypt.hash(password, 10);
    }

    if (req.files?.profileImage)
      updateFields.profileImage = req.files.profileImage[0].filename;
    if (req.files?.prescriptionFile)
      updateFields.prescriptionFile = req.files.prescriptionFile[0].filename;

    const updatedCustomer = await Customer.findByIdAndUpdate(customerId, updateFields, {
      new: true,
    });

    return res.status(200).json({
      message: "Customer updated successfully.",
      data: updatedCustomer,
    });
  } catch (err) {
    console.error("Error updating customer:", err);
    return res.status(500).json({ message: "Error updating customer", error: err.message });
  }
};

module.exports = { registerCustomer, fetchCustomerById, updateCustomer };