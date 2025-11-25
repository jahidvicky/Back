const generateResponse = async (message) => {
    const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama3.1",
            prompt: message,
            stream: false,
        }),
    });

    const data = await response.json();
    return data.response;
};

module.exports = { generateResponse };
