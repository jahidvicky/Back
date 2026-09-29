const soap = require("soap");

async function createClient(wsdl, endpoint = null) {
    try {
        const client = await soap.createClientAsync(wsdl);

        if (endpoint) {
            client.setEndpoint(endpoint);
        }

        const wsSecurity = new soap.WSSecurity(
            process.env.LOOMIS_USERNAME,
            process.env.LOOMIS_PASSWORD
        );

        client.setSecurity(wsSecurity);

        // Never log SOAP XML in production.
        if (process.env.NODE_ENV !== "production") {
            client.on("request", (xml) => {
                console.log("SOAP REQUEST:\n", xml);
            });

            client.on("response", (xml) => {
                console.log("SOAP RESPONSE:\n", xml);
            });
        }

        return client;
    } catch (error) {
        console.error(
            "SOAP Client Error:",
            error.message
        );

        throw error;
    }
}

module.exports = createClient;