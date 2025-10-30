const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer"); // your multer config

//  POST /uploads — handle single file upload
router.post("/uploads", upload.single("file"), (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    // Create absolute file URL with protocol (http/https)
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    //Respond with detailed file info
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      fileName: req.file.filename,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileURL: fileUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading file.",
      error: error.message || error,
    });
  }
});

module.exports = router;
