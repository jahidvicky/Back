const express = require("express");
const app = express();
const FAQ = require("../model/FAQ-model");
require("dotenv").config();

//create faq
exports.createFAQ = async (req, res) => {
  try {
    const { category, title, description } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the feilds",
      });
    }

    const newFAQ = new FAQ({
      category,
      title,
      description,
    });

    await newFAQ.save();
    return res.status(200).json({
      success: true,
      message: "FAQ created successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }
};

// GET - All FAQs
exports.getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "FAQs fetched successfully",
      faqs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error,
    });
  }
};

// delete faq
exports.deletefaq = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFaq = await FAQ.findByIdAndDelete(id);

    if (!deletedFaq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.status(200).json({ message: "FAQ deleted successfully", deletedFaq });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// update faq
exports.updatefaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const updatedFaq = await FAQ.findByIdAndUpdate(
      id,
      { title, description, category },
      { new: true }
    );

    if (!updatedFaq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.status(200).json({ message: "FAQ updated successfully", updatedFaq });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ message: "Server error" });
  }
};




exports.getPagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const data = await FAQ.find().skip(skip).limit(limit);
    const total = await FAQ.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      data, // this is your FAQ list
    });

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};
