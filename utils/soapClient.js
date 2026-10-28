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

        // Never log raw SOAP requests or responses.
        return client;
    } catch (error) {
        console.error("SOAP Client Error:", error.message);
        throw error;
    }
}

module.exports = createClient;
