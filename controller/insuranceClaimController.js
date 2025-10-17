const Claim = require("../model/InsuranceClaim");

//  Get all claim requests
exports.getAllClaims = async (req, res) => {
  try {
    const claims = await Claim.find()
      .sort({ createdAt: -1 }) // <-- Sort by newest first
      .populate("userId", "name email")
      .populate("orderId");
    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch claims", error });
  }
};

//  Update claim status (Approve / Reject)
exports.updateClaimStatus = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status, notes, claimAmount, rejectionReason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData = { status };

    if (notes !== undefined) updateData.notes = notes;

    if (status === "Approved") {
      if (claimAmount !== undefined) updateData.claimAmount = claimAmount;
      updateData.rejectionReason = "";
    }

    if (status === "Rejected") {
      if (!rejectionReason || rejectionReason.trim() === "") {
        return res
          .status(400)
          .json({ message: "Rejection reason is required" });
      }
      updateData.rejectionReason = rejectionReason;
      updateData.claimAmount = undefined;
      updateData.notes = "";
    }

    const updated = await Claim.findByIdAndUpdate(claimId, updateData, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Claim not found" });
    }

    res.status(200).json({ message: `Claim ${status}`, claim: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update claim status", error });
  }
};

//  Create a new claim
exports.createClaim = async (req, res) => {
  try {
    const { orderId, description, userId, productId, productDetails } =
      req.body;

    // Handle uploaded photos
    const photos = req.files?.photos?.map((file) => `/${file.filename}`) || [];

    const newClaim = new Claim({
      orderId,
      userId,
      productId,
      productDetails: productDetails ? JSON.parse(productDetails) : {},
      description,
      photos,
      claimDate: new Date(),
    });

    await newClaim.save();

    res.status(201).json({
      success: true,
      message: "Claim submitted successfully",
      claim: newClaim,
    });
  } catch (error) {
    console.error("Claim creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit claim",
      error: error.message,
    });
  }
};

// GET /getClaimStatus?orderId=...&userId=...
exports.getClaimByCustOrder = async (req, res) => {
  const { orderId, userId } = req.query;
  const claim = await Claim.findOne({ orderId, userId });
  if (!claim) return res.status(404).json({ message: "No claim found" });
  res.json({ claim });
};

exports.getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.claimId)
      .populate("orderId")
      .populate("userId");

    if (!claim) {
      return res.status(500).json({ message: "Claim not found" });
    }

    res.status(200).json(claim);
  } catch (error) {
    console.error("Error fetching claim:", error);
    res.status(500).json({ message: "Server error" });
  }
};
