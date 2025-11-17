const bcrypt = require("bcryptjs");
const Customer = require("../model/customer-model");

const registerCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      mobilePhone,
      smsOptIn,
      email,
      password,
      twoFactorAuth,
      address,
      communicationPreference,
      marketingOptIn,
    } = req.body;

    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { mobilePhone }],
    });

    if (existingCustomer) {
      if (existingCustomer.email === email) {
        return res.status(409).json({ message: "Email already registered" });
      } else if (existingCustomer.mobilePhone === mobilePhone) {
        return res
          .status(409)
          .json({ message: "Mobile number already registered" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCustomer = new Customer({
      firstName,
      lastName,
      dateOfBirth,
      mobilePhone,
      smsOptIn,
      email,
      password: hashedPassword,
      twoFactorAuth,
      address,
      communicationPreference,
      marketingOptIn,
      prescriptionFile: req.file ? req.file.filename : null,
    });

    await newCustomer.save();

    res.status(201).json({
      message: "Customer registered successfully",
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const fetchCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      mobilePhone,
      email,
      address,
      password,
    } = req.body;
    const customerId = req.params.id;

    // Check if email already exists for another user
    const existingEmail = await Customer.findOne({
      email,
      _id: { $ne: customerId }, // use customerId, not undefined id
    });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    // Check if mobile number already exists for another user
    const existingMobile = await Customer.findOne({
      mobilePhone,
      _id: { $ne: customerId }, // use customerId
    });
    if (existingMobile) {
      return res.status(400).json({ message: "Mobile number already exists." });
    }

    const updateFields = {
      firstName,
      lastName,
      dateOfBirth,
      mobilePhone,
      email,
      address,
    };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    // Handle file uploads if any
    if (req.files?.profileImage)
      updateFields.profileImage = req.files.profileImage[0].filename;
    if (req.files?.prescriptionFile)
      updateFields.prescriptionFile = req.files.prescriptionFile[0].filename;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      updateFields,
      { new: true }
    );

    res.status(200).json({
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (err) {
    console.error("Error updating customer:", err);
    res
      .status(500)
      .json({ message: "Error updating customer", error: err.message });
  }
};

module.exports = {
  registerCustomer,
  fetchCustomerById,
  updateCustomer,
};
