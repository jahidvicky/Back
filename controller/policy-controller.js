const PolicyPage = require("../model/policy-page-model");

exports.getPolicyBySlug = async (req, res) => {
  try {
    const page = await PolicyPage.findOne({ slug: req.params.slug });
    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }
    res.status(200).json({ success: true, page });
  } catch (err) {
    console.error("getPolicyBySlug error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllPolicySlugs = async (req, res) => {
  try {
    const pages = await PolicyPage.find({}, "slug pageTitle lastUpdated").sort({ pageTitle: 1 });
    res.status(200).json({ success: true, pages });
  } catch (err) {
    console.error("getAllPolicySlugs error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePolicyBySlug = async (req, res) => {
  try {
    const { pageTitle, intro, sections } = req.body;

    if (!pageTitle || !Array.isArray(sections)) {
      return res.status(400).json({ success: false, message: "pageTitle and sections are required" });
    }

    const cleanedSections = sections
      .map((s) => ({
        heading: (s.heading || "").trim(),
        body: (s.body || "").trim(),
      }))
      .filter((s) => s.heading && s.body);

    if (cleanedSections.length !== sections.length) {
      return res.status(400).json({
        success: false,
        message: "One or more sections have an empty heading or body. Please fill them in or remove them.",
      });
    }

    const page = await PolicyPage.findOneAndUpdate(
      { slug: req.params.slug },
      { pageTitle, intro, sections: cleanedSections, lastUpdated: new Date() },
      { new: true, upsert: false }
    );
    if (!page) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.status(200).json({ success: true, page });
  } catch (err) {
    console.error("updatePolicyBySlug error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};