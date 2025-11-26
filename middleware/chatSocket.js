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
        console.log("Client connected:", socket.id);

        // USER joins room
        socket.on("user:join", ({ chatId }) => {
            socket.join(chatId);
        });

        // ADMIN joins room
        socket.on("admin:join", ({ chatId }) => {
            socket.join(chatId);
        });

        // Admin typing event
        socket.on("admin:typing", ({ chatId }) => {
            socket.to(chatId).emit("typing");
        });

        // USER SEND MESSAGE
        socket.on("sendMessage", async ({ chatId, text }) => {
            try {
                if (!text?.trim()) return;

                const userMsg = {
                    chatId,
                    sender: "user",
                    text,
                    createdAt: new Date()
                };

                await ChatSession.findByIdAndUpdate(
                    chatId,
                    {
                        $push: { messages: userMsg },
                        status: "active",
                        updatedAt: new Date()
                    }
                );

                io.to(chatId).emit("newMessage", userMsg);

                // AI AUTO REPLY IF NO ADMIN
                const chat = await ChatSession.findById(chatId);
                if (!chat.assignedTo && chat.status !== "closed") {
                    const prompt = `Assistant for ATAL Optical:
                    Reason: ${chat.reason}
                    User: ${text}`;

                    try {
                        const aiText = await generateResponse(prompt);

                        const aiMsg = {
                            chatId,
                            sender: "ai",
                            text: aiText,
                            createdAt: new Date()
                        };

                        await ChatSession.findByIdAndUpdate(chatId, {
                            $push: { messages: aiMsg },
                            updatedAt: new Date()
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

        // ADMIN SEND MESSAGE
        socket.on("admin:sendMessage", async ({ chatId, text }) => {
            try {
                if (!text?.trim()) return;

                const adminMsg = {
                    chatId,
                    sender: "admin",
                    text,
                    createdAt: new Date()
                };

                await ChatSession.findByIdAndUpdate(
                    chatId,
                    {
                        $push: { messages: adminMsg },
                        status: "active",
                        updatedAt: new Date()
                    }
                );

                io.to(chatId).emit("newMessage", adminMsg);
            } catch (err) {
                console.error("admin:sendMessage error:", err.message);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
}

function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

module.exports = { initChatSocket, getIO };
