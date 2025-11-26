const ChatSession = require("../model/chatSession");

// Create chat session
exports.startSupportChat = async (req, res) => {
    try {
        const { name, email, reason } = req.body;

        const chat = await ChatSession.create({
            name,
            email,
            reason,
            status: "active", // UPDATED
            messages: [
                {
                    sender: "system",
                    text: "Thank you for choosing ATAL Optical! Support will assist you shortly.",
                    createdAt: new Date()
                },
            ],
        });

        // Notify admin that new chat started
        try {
            const { getIO } = require("../middleware/chatSocket");
            getIO().emit("newChat", chat);
        } catch (e) {
            console.error("Socket emit newChat error:", e.message);
        }

        return res.status(201).json({ chatId: chat._id, chat });
    } catch (err) {
        console.error("startSupportChat error:", err.message);
        return res.status(500).json({ error: "Failed to start chat" });
    }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await ChatSession.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat not found" });

        return res.json({ chat });
    } catch (err) {
        console.error("getChatMessages error:", err.message);
        return res.status(500).json({ error: "Failed to load chat" });
    }
};

// Get all chats (admin)
exports.getAllChats = async (req, res) => {
    try {
        const chats = await ChatSession.find().sort({ updatedAt: -1 });
        return res.status(200).json({ chats });
    } catch (err) {
        console.error("getAllChats error:", err.message);
        return res.status(500).json({ error: "Failed to load chats" });
    }
};

// Close chat (user triggers)
exports.closeChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await ChatSession.findByIdAndUpdate(
            chatId,
            { status: "closed" },
            { new: true }
        );

        if (!chat) return res.status(404).json({ error: "Chat not found" });

        try {
            const { getIO } = require("../middleware/chatSocket");
            getIO().emit("chatClosed", chat);
        } catch (e) {
            console.error("Socket emit chatClosed error:", e.message);
        }

        return res.json({ message: "Chat closed", chat });
    } catch (err) {
        console.error("closeChat error:", err.message);
        return res.status(500).json({ error: "Failed to close chat" });
    }
};

// Submit rating
exports.submitRating = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { rating } = req.body;

        const chat = await ChatSession.findByIdAndUpdate(
            chatId,
            { rating },
            { new: true }
        );

        if (!chat) return res.status(404).json({ error: "Chat not found" });

        try {
            const { getIO } = require("../middleware/chatSocket");
            getIO().emit("ratingSubmitted", chat);
        } catch (e) {
            console.error("Socket emit ratingSubmitted error:", e.message);
        }

        return res.json({ message: "Rating submitted", chat });
    } catch (err) {
        console.error("submitRating error:", err.message);
        return res.status(500).json({ error: "Failed to submit rating" });
    }
};
