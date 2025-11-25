const { Server } = require("socket.io");
const ChatSession = require("../model/chatSession");
const { generateResponse } = require("../services/ollamaService");

let io;

function initChatSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        // User joins room
        socket.on("user:join", ({ chatId }) => {
            socket.join(chatId);
        });

        // Admin joins room
        socket.on("admin:join", ({ chatId }) => {
            socket.join(chatId);
        });

        // Generic typing event (used for admin typing → user)
        socket.on("admin:typing", ({ chatId }) => {
            socket.to(chatId).emit("typing");
        });

        // User sends message
        socket.on("sendMessage", async ({ chatId, text }) => {
            try {
                if (!text?.trim()) return;

                const userMsg = { sender: "user", text, createdAt: new Date() };

                const chat = await ChatSession.findByIdAndUpdate(
                    chatId,
                    {
                        $push: { messages: userMsg },
                        status: "active",
                    },
                    { new: true }
                );

                if (!chat) return;

                io.to(chatId).emit("newMessage", userMsg);

                // AI auto-reply if no admin assigned and chat not closed
                if (!chat.assignedTo && chat.status !== "closed") {
                    const prompt = `You are ATAL Optical AI Assistant. User reason: ${chat.reason}\nUser: ${text}`;

                    try {
                        const aiText = await generateResponse(prompt);
                        const aiMsg = { sender: "ai", text: aiText, createdAt: new Date() };

                        await ChatSession.findByIdAndUpdate(chatId, {
                            $push: { messages: aiMsg },
                        });

                        io.to(chatId).emit("newMessage", aiMsg);
                    } catch (err) {
                        console.error("AI reply error:", err.message);
                    }
                }
            } catch (err) {
                console.error("sendMessage error:", err.message);
            }
        });

        // Admin sends message
        socket.on("admin:sendMessage", async ({ chatId, text }) => {
            try {
                if (!text?.trim()) return;

                const adminMsg = { sender: "admin", text, createdAt: new Date() };

                await ChatSession.findByIdAndUpdate(
                    chatId,
                    {
                        $push: { messages: adminMsg },
                        status: "active",
                    },
                    { new: true }
                );

                io.to(chatId).emit("newMessage", adminMsg);
            } catch (err) {
                console.error("admin:sendMessage error:", err.message);
            }
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });
}

function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

module.exports = { initChatSocket, getIO };
