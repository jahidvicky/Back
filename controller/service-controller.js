const Service = require("../model/service-model");

// Create Service
exports.createService = async (req, res) => {
  try {
    const { title, description } = req.body;

    const service = new Service({ title, description });
    await service.save();

    res.status(201).json({ success: true, service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create service" });
  }
};

// Get All Services
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch services" });
  }
};
