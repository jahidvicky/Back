const soap = require("soap");

async function createClient(wsdl, endpoint = null) {
    try {
        const client = await soap.createClientAsync(wsdl);

        // Override endpoint for production — sandbox doesn't need this
        if (endpoint) {
            client.setEndpoint(endpoint);
        }

        // Read credentials fresh every call — safe for rotation without restart
        const wsSecurity = new soap.WSSecurity(
            process.env.LOOMIS_USERNAME,
            process.env.LOOMIS_PASSWORD
        );

        client.setSecurity(wsSecurity);

        // Only log SOAP envelopes in development — they contain credentials
        if (process.env.NODE_ENV !== "production") {
            client.on("request", (xml) => console.log("SOAP REQUEST:\n", xml));
            client.on("response", (xml) => console.log("SOAP RESPONSE:\n", xml));
        }

        return client;

    } catch (error) {
        console.error("SOAP Client Error:", error.message);
        throw error;
    }
}

module.exports = createClient;