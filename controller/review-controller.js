const Review = require("../model/review-model");

// POST: Create Review with image
exports.createReview = async (req, res) => {
  try {
    const { description, followers, frames, customer } = req.body;
    const image = req.file ? req.file.filename : null; // multer handles file

    if (!description || !followers || !frames || !customer) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newReview = new Review({
      description,
      followers,
      frames,
      customer,
      image,
    });

    await newReview.save();
    res.status(201).json({ message: "Review created successfully", review: newReview });
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// GET: Fetch all reviews
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// UPDATE: Update review by ID
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;

    const { description, followers, frames, customer } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const updatedFields = {
      description,
      followers,
      frames,
      customer,
    };

    if (image) updatedFields.image = image; // only update image if new one uploaded

    const updatedReview = await Review.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });

    if (!updatedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review updated successfully", review: updatedReview });
  } catch (err) {
    console.error("Error updating review:", err);
    res.status(500).json({ message: "Server error" });
  }
};
