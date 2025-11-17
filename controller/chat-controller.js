const mongoose = require("mongoose");
const Message = require("../model/chat-model");

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    const senderId = req.user?.id;

    // Validate sender and receiver
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "Invalid sender ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    if (!receiverId || !text) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Get Messages With a User -----
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const senderId = req.user?.id;

    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: userId },
        { sender: userId, receiver: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteMessage = async (req, res) => {
  const msgId = req.params.id;
  const userId = req.user?.id;

  if (
    !mongoose.Types.ObjectId.isValid(msgId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  try {
    const message = await Message.findById(msgId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Optional: only allow sender to delete their own message
    if (req.user.id.toString() !== message.sender.toString()) {
      return res
        .status(403)
        .json({ message: "You can delete only your own messages" });
    }

    await message.deleteOne();

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
