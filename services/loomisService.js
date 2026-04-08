const createClient = require("../utils/soapClient");
const dayjs = require("dayjs")
const getProvinceFromPostalCode = require("../utils/getProvinceFromPostalCode");

const ratingURL = process.env.LOOMIS_RATING_WSDL;
const shippingURL = process.env.LOOMIS_SHIPPING_WSDL;
const trackingURL = process.env.LOOMIS_TRACKING_WSDL;

const WAREHOUSE = {
    name: "ATAL OPTICAL",
    address: "34 Shining Willow Crescent",
    city: "Brampton",
    province: "ON",
    postalCode: "L6P2A2",
    country: "CA",
    phone: "9056661212",
};

exports.getRates = async (data) => {
    const client = await createClient(ratingURL);

    const cleanDestination = (data.destination || "").replace(/\s/g, "");
    const derivedProvince = getProvinceFromPostalCode(cleanDestination) || "ON"; // always from postal

    const shipmentInfoStr = [];
    const shipmentInfoNum = [];

    if (data.declaredValue && Number(data.declaredValue) > 0) {
        shipmentInfoNum.push({
            name: "DECLARED_VALUE",
            value: Math.min(Number(data.declaredValue), 2499.99),
        });
    }
    if (data.fragile) {
        shipmentInfoStr.push({ name: "FRAGILE", value: "TRUE" });
    }
    if (data.signature) {
        shipmentInfoStr.push({ name: "SIGNATURE", value: data.signature });
    }

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,

            shipment: {
                shipper_num: process.env.LOOMIS_ACCOUNT,
                service_type: data.serviceType || "DD",
                shipping_date: dayjs().format("YYYYMMDD"),
                dimension_unit: "I",
                reported_weight_unit: "L",

                pickup_name: WAREHOUSE.name,
                pickup_address_line_1: WAREHOUSE.address,
                pickup_city: WAREHOUSE.city,
                pickup_postal_code: WAREHOUSE.postalCode,
                pickup_province: WAREHOUSE.province,
                pickup_phone: WAREHOUSE.phone,

                delivery_name: data.receiverName || "CUSTOMER",
                delivery_address_line_1: data.deliveryAddress || "1 Main St",
                delivery_city: data.deliveryCity || "Toronto",
                delivery_postal_code: cleanDestination,
                delivery_province: derivedProvince,  // ← always derived, never trusted from caller
                delivery_country: "CA",

                // Optional arrays
                ...(shipmentInfoNum.length && { shipment_info_num: shipmentInfoNum }),
                ...(shipmentInfoStr.length && { shipment_info_str: shipmentInfoStr }),

                packages: [
                    {
                        reported_weight: Math.max(data.weight || 1, 0.1),
                        //  Correct package_info_num array format per docs
                        package_info_num: [
                            { name: "LENGTH", value: data.length || 10 },
                            { name: "WIDTH", value: data.width || 8 },
                            { name: "HEIGHT", value: data.height || 6 },
                        ],
                    },
                ],
            },
        },
    };

    const [result] = await client.getRatesAsync(args);

    const loomisError = result?.return?.error;
    if (loomisError && String(loomisError).toLowerCase() !== "null") {
        throw new Error(`Loomis getRates error: ${loomisError}`);
    }

    const getRatesResult = result?.return?.getRatesResult;
    const shipment = Array.isArray(getRatesResult)
        ? getRatesResult[0]?.shipment
        : getRatesResult?.shipment;

    // Safe charge extraction
    const charges = shipment?.shipment_info_num || [];
    const chargesArr = Array.isArray(charges) ? charges : [charges];
    const totalCharge = Number(chargesArr.find((c) => c?.name === "TOTAL_CHARGE")?.value) || 0;

    // Delivery date
    const rawDate = shipment?.estimated_delivery_date || null;
    let expectedDeliveryDate = null;
    if (rawDate && /^\d{8}$/.test(String(rawDate))) {
        const s = String(rawDate);
        expectedDeliveryDate = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), 17, 0, 0);
    }

    return {
        rawResult: result,
        expectedDeliveryDate,
        totalCharge,  // ← expose directly so callers don't re-parse
    };
};


exports.createShipment = async (data) => {
    const client = await createClient(shippingURL);

    // Build shipment_info_str array
    const shipmentInfoStr = [
        { name: "REFERENCE", value: data.reference || `ORDER-${Date.now()}` },
        { name: "INSTRUCTION", value: data.instruction || "" },
        { name: "SIGNATURE", value: data.signature || "" },
        { name: "FRAGILE", value: "FALSE" },
        { name: "DANGEROUS_GOODS", value: "FALSE" },
        { name: "SAT_DELIVERY", value: "FALSE" },
        { name: "CHAIN_OF_SIG", value: "FALSE" },
        { name: "RC", value: "FALSE" },
    ];

    // Build shipment_info_num array (declared value)
    const shipmentInfoNum = [];
    if (data.declaredValue && Number(data.declaredValue) > 0) {
        shipmentInfoNum.push({
            name: "declared_value",
            value: Math.min(Number(data.declaredValue), 2499.99),
        });
    }

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,

            shipment: {
                shipper_num: process.env.LOOMIS_ACCOUNT,
                shipping_date: dayjs().format("YYYYMMDD"),
                service_type: data.serviceType || "DD",
                dimension_unit: "I",
                reported_weight_unit: "L",

                // Pickup (warehouse)
                pickup_name: WAREHOUSE.name,
                pickup_address_line_1: WAREHOUSE.address,
                pickup_city: WAREHOUSE.city,
                pickup_country: WAREHOUSE.country,
                pickup_province: WAREHOUSE.province,
                pickup_postal_code: WAREHOUSE.postalCode,
                pickup_phone: WAREHOUSE.phone,

                // Delivery (customer)
                delivery_name: data.receiverName,
                delivery_address_line_1: data.deliveryAddress || "Customer Address",
                delivery_city: data.deliveryCity || "Toronto",
                delivery_province: data.province,
                delivery_postal_code: data.destination,
                delivery_country: "CA",
                delivery_phone: data.phone || "0000000000",

                // Optional arrays
                ...(shipmentInfoStr.length && { shipment_info_str: shipmentInfoStr }),
                ...(shipmentInfoNum.length && { shipment_info_num: shipmentInfoNum }),

                packages: [
                    {
                        reported_weight: Math.max(data.weight || 1, 0.1),
                        package_info_num: [
                            { name: "LENGTH", value: data.length || 10 },
                            { name: "WIDTH", value: data.width || 8 },
                            { name: "HEIGHT", value: data.height || 6 },
                        ],
                    },
                ],
            },
        },
    };

    const [result] = await client.processShipmentAsync(args);
    const shipment = result?.return?.processShipmentResult?.shipment;

    if (!shipment) {
        throw new Error("Invalid Loomis response — no shipment in result");
    }

    const rawDate = shipment?.estimated_delivery_date;
    let finalDeliveryDate = null;
    if (rawDate && /^\d{8}$/.test(String(rawDate))) {
        const s = String(rawDate);
        finalDeliveryDate = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), 17, 0, 0);
    }

    const sinData = shipment?.shipment_info_str || [];
    const sin = (Array.isArray(sinData) ? sinData : [sinData])
        .find((x) => x.name === "SIN")?.value || null;

    const pinData = shipment?.packages?.[0]?.package_info_str || [];
    const pin = (Array.isArray(pinData) ? pinData : [pinData])
        .find((x) => x.name === "PIN")?.value || null;

    if (!pin) {
        throw new Error("Loomis did not return a PIN. Check SOAP response.");
    }

    return {
        trackingNumber: pin,
        shipmentNumber: sin,
        shipmentId: shipment.id,
        labelId: shipment.id,
        finalDeliveryDate,
        rawResponse: result,
    };
};

exports.trackShipment = async (trackingNumber) => {
    const client = await createClient(trackingURL);
    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            barcode: trackingNumber,
            track_shipment: false,
        },
    };
    const [result] = await client.trackByBarcodeAsync(args);
    const shipment = result?.return?.result;
    if (!shipment) {
        return { success: false, message: "Tracking not found" };
    }
    return {
        trackingNumber: shipment.pin,
        delivered: shipment.delivered,
        trackingUrl: shipment.tracking_url_en,
        signedBy: shipment.signed_by || null,
        events: (shipment.events || []).map((e) => ({
            code: e.code,
            description: e.code_description_en,
            city: e.city,
            province: e.province,
            dateTime: e.local_date_time,
        })),
    };
};

exports.getLabel = async (labelId, format = "PNG") => {
    const numericId = Number(labelId);
    if (!labelId || isNaN(numericId) || numericId <= 0) {
        throw new Error(`Invalid labelId: "${labelId}"`);
    }

    const client = await createClient(shippingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            id: numericId,
            format,
        },
    };

    const [result] = await client.getLabelsAdvancedV2Async(args);

    const loomisError = result?.return?.error;
    if (loomisError && String(loomisError).toLowerCase() !== "null") {
        const errStr = String(loomisError).toLowerCase();
        if (errStr.includes("manifested")) {
            const err = new Error("Label already manifested");
            err.code = "ALREADY_MANIFESTED";
            throw err;
        }
        throw new Error(`Loomis label error: ${loomisError}`);
    }

    // ── Loomis returns result[].label, NOT labels ────────────────────
    const resultArr = result?.return?.result;
    if (!resultArr) throw new Error("Label not returned from Loomis");

    const resultsNormalized = Array.isArray(resultArr) ? resultArr : [resultArr];

    // Each result entry has a .label field containing the base64 string
    const labelsArr = resultsNormalized
        .map((r) => r?.label)
        .filter(Boolean);

    if (!labelsArr.length) throw new Error("Label not returned from Loomis");

    if (format === "PNG") {
        return labelsArr.map((b64) => Buffer.from(b64, "base64"));
    }

    return labelsArr;
};



//=====================================
// Schedule Pickup 
//=====================================
exports.schedulePickup = async (data, attempt = 1) => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

    // ── Validate required env var early ───────────────────────────────────
    const pickupEmail = process.env.ADMIN_EMAIL;
    if (!pickupEmail) {
        throw new Error("LOOMIS_PICKUP_EMAIL env var is not set — required by Loomis API");
    }

    // ── Format time: "09:00" → "0900" ──────────────────────────────────
    const fmt = (t) => (t || "").replace(":", "");

    try {
        const client = await createClient(trackingURL);

        const args = {
            request: {
                user_id: process.env.LOOMIS_USERNAME,
                password: process.env.LOOMIS_PASSWORD,

                pickup: {
                    shipper_num: process.env.LOOMIS_ACCOUNT,
                    courier: "L",
                    pickup_date: data.pickupDate,
                    ready_time: fmt(data.readyTime),
                    closing_time: fmt(data.closeTime),

                    pickup_name: WAREHOUSE.name,
                    pickup_address_line_1: WAREHOUSE.address,
                    pickup_city: WAREHOUSE.city,
                    pickup_province: WAREHOUSE.province,
                    pickup_postal_code: WAREHOUSE.postalCode,
                    pickup_phone: WAREHOUSE.phone,
                    pickup_email: pickupEmail,
                    pickup_attention: data.attention || "",
                    pickup_location: data.location || "",
                    pickup_address_line_2: "",
                    pickup_extension: "",
                    comments: data.comments || "",
                    collect: false,

                    //  Sum quantities, not line item count
                    number_of_parcels: Math.min(
                        Math.max(data.totalPieces || 1, 1),
                        99
                    ),
                    weight: Math.max(data.totalWeight || 1, 0.1),
                    unit_of_measure: "L",
                },
            },
        };

        const [result] = await client.schedulePickupAsync(args);

        const loomisError = result?.return?.error;
        if (loomisError && String(loomisError).toLowerCase() !== "null") {
            throw new Error(`Loomis schedulePickup error: ${loomisError}`);
        }

        const pickup = result?.return?.pickup;
        if (!pickup) {
            throw new Error("Invalid Loomis pickup response — no pickup object returned");
        }

        //  Validate confirmation number before returning
        const confirmationNumber = pickup?.id ? String(pickup.id) : null;
        if (!confirmationNumber) {
            throw new Error("Loomis did not return a pickup confirmation ID");
        }

        return {
            confirmationNumber,
            pickupDate: data.pickupDate,
            readyTime: data.readyTime,
            closeTime: data.closeTime,
            rawResponse: result,
        };

    } catch (err) {
        const isSocketError =
            err.message?.toLowerCase().includes("socket hang up") ||
            err.message?.toLowerCase().includes("econnreset") ||
            err.message?.toLowerCase().includes("socket");

        if (isSocketError && attempt < 3) {
            console.warn(`[schedulePickup] Socket error on attempt ${attempt}, retrying in 2s...`);
            await sleep(2000);
            return exports.schedulePickup(data, attempt + 1);
        }

        throw err;
    }
};




/*
================================
VOID SHIPMENT
================================
*/
exports.voidShipment = async (labelId) => {
    const client = await createClient(shippingURL);
    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            id: Number(labelId),
        },
    };
    const [result] = await client.voidShipmentAsync(args);
    const error = result?.return?.error;
    if (error && error !== null && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis void failed: ${JSON.stringify(error)}`);
    }
    return { success: true, rawResponse: result };
};


/*
================================
VALIDATE ADDRESS
================================
*/
exports.validateAddress = async (postalCode) => {
    const normalized = postalCode.replace(/\s/g, "").toUpperCase();

    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalized)) {
        return { valid: false, message: "Invalid Canadian postal code format. Expected: A1A1A1" };
    }
    try {
        const client = await createClient(ratingURL);

        const args = {
            request: {
                user_id: process.env.LOOMIS_USERNAME,
                password: process.env.LOOMIS_PASSWORD,
                shipper_num: process.env.LOOMIS_ACCOUNT,
                delivery_country: "CA",
                delivery_postal_code: normalized,
                pickup_postal_code: WAREHOUSE.postalCode,
                shipping_date: dayjs().format("YYYYMMDD"),
            },
        };
        const [result] = await client.getAvailableServicesAsync(args);
        const services = result?.return?.getAvailableServicesResult;
        if (services && (Array.isArray(services) ? services.length > 0 : true)) {
            return { valid: true, postalCode: normalized, message: "Address is valid and serviceable" };
        }
        return { valid: false, postalCode: normalized, message: "Postal code not serviceable by Loomis" };
    } catch (err) {
        console.error("Address validation error:", err.message);
        return { valid: true, warning: "Could not verify address with Loomis — proceeding anyway" };
    }
};
/*
================================
CREATE RETURN SHIPMENT
================================
*/

const cleanPhone = (phone) =>
    (phone || "0000000000").replace(/\D/g, "").slice(0, 11);

const cleanPostal = (pc) =>
    (pc || "").toUpperCase().replace(/\s/g, "");

exports.createReturnShipment = async (data) => {
    const client = await createClient(trackingURL);

    const getNextBusinessDay = () => {
        let d = dayjs().add(1, "day");
        while (d.day() === 0 || d.day() === 6) {
            d = d.add(1, "day");
        }
        return d.format("YYYYMMDD");
    };

    const shippingDate = getNextBusinessDay();

    //  Normalize values BEFORE API
    const pickupPostal = cleanPostal(data.customerPostalCode);
    const deliveryPostal = cleanPostal(WAREHOUSE.postalCode);

    const pickupProvince = getProvinceFromPostalCode(pickupPostal);
    const deliveryProvince = getProvinceFromPostalCode(deliveryPostal);

    if (!pickupProvince) {
        throw new Error("Invalid pickup postal code");
    }

    if (!deliveryProvince) {
        throw new Error("Invalid delivery postal code");
    }

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,

            pickup_tag: {
                user_id: process.env.LOOMIS_USERNAME,
                password: process.env.LOOMIS_PASSWORD,

                courier: "L",
                shipper_num: process.env.LOOMIS_ACCOUNT,
                shipping_date: shippingDate,
                service_type: data.serviceType || "DD",
                reported_weight_unit: "L",
                dimension_unit: "I",

                //  Pickup (customer)
                pickup_name: data.customerName?.slice(0, 40),
                pickup_address_line_1: data.customerAddress?.slice(0, 40),
                pickup_city: data.customerCity?.slice(0, 40),
                pickup_province: pickupProvince,
                pickup_postal_code: pickupPostal,
                pickup_phone: cleanPhone(data.customerPhone),
                pickup_email: data.customerEmail || "",

                //  Delivery (warehouse)
                delivery_name: WAREHOUSE.name?.slice(0, 40),
                delivery_address_line_1: WAREHOUSE.address?.slice(0, 40),
                delivery_city: WAREHOUSE.city?.slice(0, 40),
                delivery_province: deliveryProvince,
                delivery_postal_code: deliveryPostal,
                delivery_country: "CA",
                delivery_phone: cleanPhone(WAREHOUSE.phone),

                packages: [{
                    reported_weight: Math.max(data.weight || 1, 0.1),
                }],

                shipment_info_str: [
                    {
                        name: "REFERENCE",
                        value: String(data.rmaNumber).slice(0, 30),
                    },
                ],
            }
        },
    };

    const [result] = await client.processPickUpTagAsync(args);
    //  HANDLE ERROR PROPERLY
    if (result?.return?.error) {
        console.error("Loomis Error:", result.return.error);
        throw new Error(result.return.error);
    }

    //  CORRECT PATH
    const shipment =
        result?.return?.processPickUpTagResult?.shipment ||
        result?.return?.processShipmentResult?.shipment ||
        result?.return?.shipment;

    if (!shipment) {
        throw new Error("Invalid Loomis return response — no shipment in result");
    }

    //  Normalize shipment_info_str (SIN)
    const shipmentInfo = Array.isArray(shipment.shipment_info_str)
        ? shipment.shipment_info_str
        : shipment.shipment_info_str
            ? [shipment.shipment_info_str]
            : [];

    const sin = shipmentInfo.find(x => x.name === "SIN")?.value || null;

    //  Normalize packages + PIN
    const packages = Array.isArray(shipment.packages)
        ? shipment.packages
        : shipment.packages
            ? [shipment.packages]
            : [];

    const packageInfo = Array.isArray(packages[0]?.package_info_str)
        ? packages[0].package_info_str
        : packages[0]?.package_info_str
            ? [packages[0].package_info_str]
            : [];

    const pin = packageInfo.find(x => x.name === "PIN")?.value || null;

    if (!pin) {
        throw new Error("Loomis did not return a PIN (tracking number)");
    }

    const eReturnId = shipment?.id || null;

    return {
        trackingNumber: pin,
        shipmentNumber: sin,
        eReturnId,
        rmaNumber: data.rmaNumber,
        shippingDate,
        rawResponse: result,
    };
};



/*
================================
END OF DAY
================================
*/
exports.endOfDay = async () => {
    const client = await createClient(shippingURL);

    const today = dayjs().format("YYYYMMDD");

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            shipper_num: process.env.LOOMIS_ACCOUNT,
            date: today,
        },
    };

    const [result] = await client.endOfDayAsync(args);

    const error = result?.return?.error;
    if (error && error !== null && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis endOfDay failed: ${JSON.stringify(error)}`);
    }

    const manifestNum = result?.return?.manifest_num || null;

    if (!manifestNum) {
        return { success: true, manifestNum: null, message: "No shipments to manifest" };
    }
    return { success: true, manifestNum, date: today, rawResponse: result };
};


/*
================================
GET MANIFEST
================================
*/
exports.getManifest = async (manifestNum) => {
    const client = await createClient(shippingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            shipper_num: process.env.LOOMIS_ACCOUNT,
            manifest_num: manifestNum,
            type: "S", // S = Summary
        },
    };

    const [result] = await client.getManifestAsync(args);
    const manifestBase64 = result?.return?.manifest;
    if (!manifestBase64) throw new Error("Manifest not returned from Loomis");

    return Buffer.from(manifestBase64, "base64");
};


// ================================
// GET AVAILABLE SERVICES
// ================================
exports.getAvailableServices = async (data) => {
    const client = await createClient(ratingURL);

    const cleanDestination = (data.destination || "").replace(/\s/g, "");
    // Always derive province from postal code — never trust caller's string

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            shipper_num: process.env.LOOMIS_ACCOUNT,
            delivery_country: "CA",
            delivery_postal_code: cleanDestination,
            pickup_postal_code: WAREHOUSE.postalCode,
            shipping_date: dayjs().format("YYYYMMDD"),
        },
    };

    const [result] = await client.getAvailableServicesAsync(args);

    const raw = result?.return?.getAvailableServicesResult || [];
    const serviceList = Array.isArray(raw) ? raw : [raw];
    if (!serviceList.length) return [];

    const servicesWithPrices = await Promise.all(
        serviceList.map(async (svc) => {
            let price = 0;
            let estimatedDeliveryDate = null; // will be YYYYMMDD string

            try {
                const rateResult = await exports.getRates({
                    destination: cleanDestination,
                    serviceType: svc.type,
                    receiverName: data.receiverName,
                    deliveryAddress: data.deliveryAddress,
                    deliveryCity: data.deliveryCity,
                    weight: data.weight,
                    // province intentionally omitted — getRates derives it internally
                });

                price = rateResult.totalCharge || 0;
                if (rateResult.expectedDeliveryDate instanceof Date &&
                    !isNaN(rateResult.expectedDeliveryDate.getTime())) {
                    const d = rateResult.expectedDeliveryDate;
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    estimatedDeliveryDate = `${y}${m}${day}`;
                }

            } catch (err) {
                console.warn(
                    `[getAvailableServices] getRates failed for ${svc.type}:`,
                    err.message
                );
            }

            // ── FIX 2: Fallback to getAvailableServices date only if getRates failed ──
            // svc.estimated_delivery_date is already YYYYMMDD from Loomis
            if (!estimatedDeliveryDate) {
                const rawDate = svc.estimated_delivery_date || null;
                if (rawDate && /^\d{8}$/.test(String(rawDate))) {
                    estimatedDeliveryDate = String(rawDate); // keep as YYYYMMDD
                }
            }

            return {
                type: svc.type,
                transitDays: Number(svc.transit_time) || null,
                guaranteed:
                    svc.transit_time_guaranteed === true ||
                    svc.transit_time_guaranteed === "true",
                estimatedDeliveryDate,
                price,
            };
        })
    );

    return servicesWithPrices;
};

// ================================
// CANCEL PICKUP
// ================================
exports.cancelPickup = async (confirmationNumber) => {
    const client = await createClient(trackingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            id: Number(confirmationNumber),
        },
    };

    const [result] = await client.cancelPickupAsync(args);

    const error = result?.return?.error;
    if (error && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis cancelPickup error: ${error}`);
    }

    return { success: true };
};


// ================================
// GET PICKUP DAY
// ================================
exports.getPickupDay = async ({ fromDate, numOfDays = 7 }) => {
    const client = await createClient(trackingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            shipper_num: process.env.LOOMIS_ACCOUNT,
            from_date: fromDate || dayjs().format("YYYYMMDD"),
            num_of_days: Math.min(Math.max(Number(numOfDays), 1), 7),
            postal_code: WAREHOUSE.postalCode,
        },
    };

    const [result] = await client.getPickupDayAsync(args);

    const error = result?.return?.error;
    if (error && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis getPickupDay error: ${error}`);
    }

    // Normalize: Loomis returns single value or array
    const raw = result?.return?.day || [];
    const days = Array.isArray(raw) ? raw : [raw];

    // Return as formatted objects matching frontend expectations
    return days
        .filter(Boolean)
        .map((d) => {
            const s = String(d);
            if (!/^\d{8}$/.test(s)) return null;
            const date = new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
            return {
                value: s,
                label: date.toLocaleDateString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                }),
            };
        })
        .filter(Boolean);
};


// ================================
// SEARCH PICKUP BY ID
// ================================
exports.searchPickupById = async (confirmationId) => {
    const client = await createClient(trackingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            shipper_num: process.env.LOOMIS_ACCOUNT,
            id: Number(confirmationId),
        },
    };

    const [result] = await client.searchPickupByIdAsync(args);

    const error = result?.return?.error;
    if (error && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis searchPickupById error: ${error}`);
    }

    const pickup = result?.return?.pickup;
    if (!pickup) throw new Error("No pickup found for this confirmation ID");

    return {
        confirmationId: String(pickup.id),
        pickupDate: pickup.pickup_date,
        readyTime: pickup.ready_time,
        closingTime: pickup.closing_time,
        numberOfParcels: pickup.number_of_parcels,
        weight: pickup.weight,
        cancelledBy: pickup.canceled_by || null,
        cancelledOn: pickup.canceled_on || null,
        pickedUpOn: pickup.picked_up_on || null,
        comments: pickup.comments || null,
        rawResponse: result,
    };
};


// ================================
// SEARCH PICKUPS BY DATE RANGE
// ================================
exports.searchPickupByPickupDate = async ({ fromDate, toDate }) => {
    const client = await createClient(trackingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            shipper_num: process.env.LOOMIS_ACCOUNT,
            from_pickup_date: fromDate,
            to_pickup_date: toDate,
        },
    };

    const [result] = await client.searchPickupByPickupDateAsync(args);

    const error = result?.return?.error;
    if (error && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis searchPickupByPickupDate error: ${error}`);
    }

    const raw = result?.return?.pickup || [];
    const pickups = Array.isArray(raw) ? raw : [raw];

    return pickups.map((p) => ({
        confirmationId: String(p.id),
        pickupDate: p.pickup_date,
        readyTime: p.ready_time,
        closingTime: p.closing_time,
        numberOfParcels: p.number_of_parcels,
        weight: p.weight,
        cancelledBy: p.canceled_by || null,
        cancelledOn: p.canceled_on || null,
        pickedUpOn: p.picked_up_on || null,
        comments: p.comments || null,
    }));
};


// ================================
// TRACK BY REFERENCE
// ================================
exports.trackByReference = async ({ reference, days, postalCode, shipperNum }) => {
    const client = await createClient(trackingURL);

    const args = {
        request: {
            user_id: process.env.LOOMIS_USERNAME,
            password: process.env.LOOMIS_PASSWORD,
            reference,
            ...(days && { days: Number(days) }),
            ...(postalCode && { postal_code: postalCode.replace(/\s/g, "").toUpperCase() }),
            ...(shipperNum && { shipper_num: shipperNum }),
        },
    };

    const [result] = await client.trackByReferenceAsync(args);

    const error = result?.return?.error;
    if (error && String(error).toLowerCase() !== "null") {
        throw new Error(`Loomis trackByReference error: ${error}`);
    }

    const shipment = result?.return?.result;
    if (!shipment) return { success: false, message: "No shipment found for this reference" };

    return {
        trackingNumber: shipment.pin,
        sin: shipment.sin,
        delivered: shipment.delivered,
        trackingUrl: shipment.tracking_url_en,
        signedBy: shipment.signed_by || null,
        reference1: shipment.reference_1 || null,
        reference2: shipment.reference_2 || null,
        events: (shipment.events || []).map((e) => ({
            code: e.code,
            description: e.code_description_en,
            city: e.city,
            province: e.province,
            dateTime: e.local_date_time,
            imageUrl: e.image_url || null,
        })),
    };
};