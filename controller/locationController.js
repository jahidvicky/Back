const fs = require("fs");
const path = require("path");
const Location = require("../model/location-model");

// Files are saved flat into /uploads by multer, so the stored path is /uploads/<filename>
const buildImagePath = (filename) => filename;

// GET /api/location
exports.getLocations = async (req, res) => {
    try {
        const locations = await Location.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: locations });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch locations" });
    }
};

// GET /api/location/:id
exports.getLocationById = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            return res.status(404).json({ success: false, message: "Location not found" });
        }
        res.status(200).json({ success: true, data: location });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch location" });
    }
};

// POST /api/location
exports.createLocation = async (req, res) => {
    try {
        const { title, address, mapQuery } = req.body;

        if (!title || !address || !mapQuery) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Image is required" });
        }

        const location = await Location.create({
            title,
            address,
            mapQuery,
            image: buildImagePath(req.file.filename),
        });

        res.status(201).json({ success: true, data: location });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to create location" });
    }
};

// PUT /api/location/:id
exports.updateLocation = async (req, res) => {
    try {
        const { title, address, mapQuery } = req.body;
        const location = await Location.findById(req.params.id);

        if (!location) {
            return res.status(404).json({ success: false, message: "Location not found" });
        }

        location.title = title || location.title;
        location.address = address || location.address;
        location.mapQuery = mapQuery || location.mapQuery;

        if (req.file) {
            const oldImagePath = path.join(__dirname, "..", "uploads", location.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlink(oldImagePath, () => { });
            }
            location.image = buildImagePath(req.file.filename);
        }

        await location.save();
        res.status(200).json({ success: true, data: location });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update location" });
    }
};

// DELETE /api/location/:id
exports.deleteLocation = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) {
            return res.status(404).json({ success: false, message: "Location not found" });
        }

        const imagePath = path.join(__dirname, "..", "uploads", location.image);
        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, () => { });
        }

        await location.deleteOne();
        res.status(200).json({ success: true, message: "Location deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete location" });
    }
};