const loomisService = require("../services/loomisService");
const getProvinceFromPostalCode = require("../utils/getProvinceFromPostalCode");
const Order = require("../model/order-model");
const Manifest = require("../model/manifest-model");
const { runEndOfDay } = require("../corn/loomisendofdayjob");

exports.getRates = async (req, res) => {
    try {
        const { rawResult, expectedDeliveryDate } = await loomisService.getRates(req.body);

        const getRatesResult = rawResult?.return?.getRatesResult;
        const shipment = Array.isArray(getRatesResult)
            ? getRatesResult[0]?.shipment
            : getRatesResult?.shipment;

        const charges = shipment?.shipment_info_num || [];
        const chargesArr = Array.isArray(charges) ? charges : [charges];
        const totalCharge =
            chargesArr.find((c) => c?.name === "TOTAL_CHARGE")?.value || 0;

        res.json({
            success: true,
            price: Number(totalCharge) || 0,
            expectedDeliveryDate: expectedDeliveryDate || null,
        });

    } catch (error) {
        console.error("RATE ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Rate calculation failed",
        });
    }
};



exports.createShipment = async (req, res) => {
    try {
        const { orderId } = req.params;

        // 1. Validate order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 2.  FIXED — allow re-creation if previous shipment was voided
        if (order.shippingInfo?.trackingNumber && !order.shippingInfo?.voided) {
            return res.status(400).json({
                success: false,
                message: "Shipment already created for this order",
            });
        }

        // 3.  If re-creating after void — clear all old shipment data first
        if (order.shippingInfo?.voided) {
            order.shippingInfo = {
                courier: order.shippingInfo.courier || "Loomis",
                originPostalCode: order.shippingInfo.originPostalCode,
                originProvince: order.shippingInfo.originProvince,
                destinationPostalCode: order.shippingInfo.destinationPostalCode,
                destinationProvince: order.shippingInfo.destinationProvince,
                weight: order.shippingInfo.weight,
                length: order.shippingInfo.length,
                width: order.shippingInfo.width,
                height: order.shippingInfo.height,
                //  clear all stale shipment fields
                shipmentId: null,
                shipmentNumber: null,
                labelId: null,
                trackingNumber: null,
                serviceCode: null,
                serviceName: null,
                rateCharged: null,
                shippingLabel: null,
                cachedLabelBase64: null,
                voided: false,
                voidedAt: null,
                expectedDeliveryDate: null,
                initialExpectedDeliveryDate: null,
                finalExpectedDeliveryDate: null,
                rawResponse: null,
            };
            order.markModified("shippingInfo");
        }

        // 4. Validate postal code
        const postalCode = (order.shippingAddress?.postalCode || "").replace(/\s/g, "");
        const province = getProvinceFromPostalCode(postalCode);
        if (!postalCode || !province) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing postal code in shipping address",
            });
        }

        // 5. Calculate total weight
        const totalWeight = order.cartItems.reduce(
            (w, item) => w + (item.weight || 1) * (item.quantity || 1),
            0
        );

        let expectedDeliveryDate = null;
        try {
            const rateResult = await loomisService.getRates({
                destination: postalCode,
                province,
                deliveryAddress: order.shippingAddress.address,
                deliveryCity: order.shippingAddress.city,
                weight: totalWeight,
                serviceType: order.shippingServiceType || "DD",
            });
            expectedDeliveryDate = rateResult.expectedDeliveryDate || null;
        } catch (rateErr) {
            console.warn("[createShipment] Could not fetch delivery date from getRates:", rateErr.message);
        }

        const largestItem = order.cartItems.reduce((max, item) =>
            (item.weight || 1) > (max.weight || 1) ? item : max,
            order.cartItems[0]
        );

        // 6. Create shipment via Loomis
        const shipment = await loomisService.createShipment({
            senderName: "ATAL OPTICAL",
            receiverName: order.shippingAddress.fullName,
            origin: "L6P2A2",
            originProvince: "ON",
            destination: postalCode,
            province,
            deliveryAddress: order.shippingAddress.address,
            deliveryCity: order.shippingAddress.city,
            phone: order.shippingAddress.phone,
            weight: totalWeight,
            length: largestItem.length || 10,
            width: largestItem.width || 8,
            height: largestItem.height || 6,
            serviceType: order.shippingServiceType || "DD",
            reference: order.orderNumber,
            declaredValue: order.subtotal || 0,
        });

        if (!shipment?.trackingNumber) {
            return res.status(400).json({
                success: false,
                message: "Loomis did not return a tracking number",
            });
        }

        // 7. Save shipment to DB
        try {
            let cachedLabelBase64 = null;
            try {
                const labelBuffers = await loomisService.getLabel(shipment.labelId);
                cachedLabelBase64 = labelBuffers[0].toString("base64");
            } catch (labelErr) {
                console.warn("[createShipment] Could not pre-cache label:", labelErr.message);
            }

            order.shippingInfo = {
                courier: "Loomis",
                trackingNumber: shipment.trackingNumber,
                serviceCode: req.body?.serviceCode || order.shippingServiceType || "DD",
                serviceName: req.body?.serviceName || "Standard Shipping",
                rateCharged: req.body?.totalCharge || null,
                initialExpectedDeliveryDate: expectedDeliveryDate,
                finalExpectedDeliveryDate: shipment.finalDeliveryDate,
                shipmentId: shipment.labelId,
                shipmentNumber: shipment.shipmentNumber || null,
                labelId: shipment.labelId,
                shippingLabel: `/label/${shipment.labelId}`,
                originPostalCode: "L6P2A2",
                originProvince: "ON",
                destinationPostalCode: postalCode,
                destinationProvince: province,
                weight: totalWeight,
                length: largestItem.length || 10,
                width: largestItem.width || 8,
                height: largestItem.height || 6,
                rawResponse: shipment,
                cachedLabelBase64,
                expectedDeliveryDate,
                voided: false,
                voidedAt: null,
            };

            order.orderStatus = "Shipped";
            order.shippedAt = new Date();
            order.markModified("orderStatus");
            order.markModified("shippedAt");

            const isReCreate = !!req.body?.serviceCode && order.trackingHistory?.some(
                t => t.status === "Shipment Voided"
            );

            order.trackingHistory.push({
                status: "Shipped",
                message: isReCreate
                    ? `Shipment re-created via Loomis. Tracking: ${shipment.trackingNumber}`
                    : `Shipment created via Loomis. Tracking: ${shipment.trackingNumber}`,
                updatedBy: "Admin",
                actorName: "Admin",
                updatedAt: new Date(),
            });

            await order.save();

        } catch (dbErr) {
            console.error(
                "CRITICAL: DB save failed after Loomis shipment created. RECOVER THIS DATA:",
                JSON.stringify(shipment, null, 2)
            );
            throw dbErr;
        }

        // 8. Respond
        res.status(200).json({
            success: true,
            message: "Shipment created successfully",
            trackingNumber: shipment.trackingNumber,
            labelUrl: `/label/${shipment.labelId}`,
            expectedDeliveryDate,
        });

    } catch (error) {
        console.error("LOOMIS SHIPMENT ERROR:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: "Shipment creation failed" });
    }
};



/*
================================
TRACK SHIPMENT
================================
*/

exports.trackShipment = async (req, res) => {
    try {
        const trackingNumber = req.params.tracking;

        if (!trackingNumber) {
            return res.status(400).json({
                success: false,
                message: "Tracking number is required",
            });
        }

        const tracking = await loomisService.trackShipment(trackingNumber);

        res.status(200).json({
            success: true,
            tracking,
        });

    } catch (error) {
        console.error("LOOMIS TRACKING ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Tracking failed",
            error: error.message,
        });
    }
};



/*
================================
GET SHIPPING LABEL
================================
*/
exports.getLabel = async (req, res) => {
    const { id } = req.params;
    const format = (req.query.format || "PNG").toUpperCase();
    try {
        const order = await Order.findOne({ "shippingInfo.labelId": id });

        // ── 1. Serve PNG from cache ──────────────────────────────────────────
        if (format === "PNG" && order?.shippingInfo?.cachedLabelBase64) {
            const buffer = Buffer.from(order.shippingInfo.cachedLabelBase64, "base64");
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Content-Disposition", `inline; filename=label-${id}.png`);
            return res.send(buffer);
        }

        // ── 2. Fetch from Loomis ─────────────────────────────────────────────
        const labels = await loomisService.getLabel(id, format);

        if (format === "PNG") {
            // Single package — send first buffer
            const buffer = labels[0];

            // Cache it
            if (order) {
                try {
                    order.shippingInfo.cachedLabelBase64 = buffer.toString("base64");
                    order.markModified("shippingInfo");
                    await order.save();
                } catch (saveErr) {
                    console.error("[getLabel] Cache save failed:");
                }
            }

            res.setHeader("Content-Type", "image/png");
            res.setHeader("Content-Disposition", `inline; filename=label-${id}.png`);
            return res.send(buffer);
        }

        // ZPL / TPCL — return raw string
        res.setHeader("Content-Type", "text/plain");
        return res.send(labels.join("\n"));

    } catch (error) {
        console.error("LOOMIS LABEL ERROR FULL:", {
            message: error.message,
            code: error.code,
            stack: error.stack,
            labelId: id,
            labelIdAsNumber: Number(id),
            isNaN: isNaN(Number(id)),
        });

        if (error.code === "ALREADY_MANIFESTED") {
            return res.status(410).json({
                success: false,
                code: "ALREADY_MANIFESTED",
                message: "Shipment is manifested. Download label from Loomis portal.",
            });
        }

        // Temporarily expose real error for debugging — remove before prod
        res.status(500).json({
            success: false,
            message: "Label generation failed",
        });
    }

}

/*
================================
SCHEDULE PICKUP
================================
*/
exports.schedulePickup = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { pickupDate, readyTime, closeTime } = req.body;

        // 1. Validate inputs
        if (!pickupDate || !readyTime || !closeTime) {
            return res.status(400).json({
                success: false,
                message: "pickupDate, readyTime, and closeTime are required",
            });
        }

        if (!/^\d{8}$/.test(pickupDate)) {
            return res.status(400).json({
                success: false,
                message: "pickupDate must be in YYYYMMDD format",
            });
        }

        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(readyTime) || !timeRegex.test(closeTime)) {
            return res.status(400).json({
                success: false,
                message: "readyTime and closeTime must be in HH:MM format (e.g. 09:00)",
            });
        }

        // 2. Load order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // 3. Must have a shipment first
        if (!order.shippingInfo?.trackingNumber) {
            return res.status(400).json({
                success: false,
                message: "Create a shipment first before scheduling a pickup",
            });
        }

        // 4. Prevent duplicate pickup
        if (order.pickupInfo?.confirmationNumber) {
            return res.status(400).json({
                success: false,
                message: `Pickup already scheduled. Confirmation: ${order.pickupInfo.confirmationNumber}`,
            });
        }

        // 5. Calculate total weight
        const totalWeight = order.cartItems.reduce(
            (w, item) => w + (item.weight || 1) * (item.quantity || 1),
            0
        );

        // 6. Call Loomis
        const pickup = await loomisService.schedulePickup({
            pickupDate,
            readyTime,
            closeTime,
            totalWeight,
            totalPieces: order.cartItems.reduce(
                (sum, item) => sum + (item.quantity || 1), 0
            ),
        });

        // 7. Save to order
        order.pickupInfo = {
            confirmationNumber: pickup.confirmationNumber,
            pickupDate,
            readyTime,
            closeTime,
            scheduledAt: new Date(),
            rawResponse: pickup.rawResponse,
        };

        order.trackingHistory.push({
            status: "Pickup Scheduled",
            message: `Pickup scheduled for ${pickupDate} between ${readyTime}–${closeTime}. Confirmation: ${pickup.confirmationNumber}`,
            updatedBy: "Admin",
            actorName: "Admin",
            updatedAt: new Date(),
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: "Pickup scheduled successfully",
            confirmationNumber: pickup.confirmationNumber,
            pickupDate,
            readyTime,
            closeTime,
        });

    } catch (error) {
        console.error("SCHEDULE PICKUP ERROR:", {
            message: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            success: false,
            message: "Failed to schedule pickup",
            error: error.message,
        });
    }
};



/*
================================
VOID SHIPMENT
================================
*/
exports.voidShipment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (!order.shippingInfo?.labelId) {
            return res.status(400).json({ success: false, message: "No shipment found for this order — nothing to void" });
        }
        if (order.shippingInfo?.voided) {
            return res.status(400).json({ success: false, message: "Shipment already voided" });
        }
        if (order.pickupInfo?.confirmationNumber) {
            return res.status(400).json({
                success: false,
                message: "Cannot void — pickup already scheduled. Cancel the pickup first.",
            });
        }

        if (order.shippingInfo?.manifestNum) {
            return res.status(400).json({
                success: false,
                message: "Cannot void — shipment already manifested. Contact Loomis directly.",
            });
        }

        await loomisService.voidShipment(order.shippingInfo.labelId);

        order.shippingInfo.voided = true;
        order.shippingInfo.voidedAt = new Date();
        order.markModified("shippingInfo");

        if (order.orderStatus !== "Shipped" && order.orderStatus !== "Delivered") {
            order.orderStatus = "Processing";
        }

        //  Admin-visible entry (full detail)
        order.trackingHistory.push({
            status: "Shipment Voided",
            message: `Shipment voided by admin. Label ID: ${order.shippingInfo.labelId}. New shipment required.`,
            updatedBy: "Admin",
            actorName: "Admin",
            updatedAt: new Date(),
        });

        await order.save();

        res.status(200).json({ success: true, message: "Shipment voided successfully" });

    } catch (error) {
        console.error("VOID SHIPMENT ERROR:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: "Failed to void shipment", error: error.message });
    }
};


/*
================================
VALIDATE ADDRESS
================================
*/
exports.validateAddress = async (req, res) => {
    try {
        const { postalCode } = req.body;


        if (!postalCode) {
            return res.status(400).json({ success: false, message: "postalCode is required" });
        }

        const result = await loomisService.validateAddress(postalCode);
        res.status(200).json({ success: true, ...result });

    } catch (error) {
        console.error("VALIDATE ADDRESS ERROR:", error.message);
        res.status(500).json({ success: false, message: "Address validation failed" });
    }
};




/*
================================
CREATE RETURN SHIPMENT (E-RETURN)
================================
*/
exports.createReturnShipment = async (req, res) => {
    try {
        const { orderId } = req.params;

        // 1. Find order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // 2. Only delivered orders allowed
        if (order.orderStatus !== "Delivered") {
            return res.status(400).json({
                success: false,
                message: "Return label can only be created for delivered orders",
            });
        }

        // 3. Prevent duplicate return
        if (order.returnInfo?.trackingNumber) {
            return res.status(400).json({
                success: false,
                message: `Return label already created. Tracking: ${order.returnInfo.trackingNumber}`,
            });
        }

        // 4. Calculate weight
        const totalWeight = order.cartItems.reduce(
            (w, item) => w + (item.weight || 1) * (item.quantity || 1),
            0
        );

        const rmaNumber = `ORDER-${order._id}`;

        // 5. Call Loomis
        const returnShipment = await loomisService.createReturnShipment({
            customerName: order.shippingAddress.fullName,
            customerAddress: order.shippingAddress.address,
            customerCity: order.shippingAddress.city,
            customerProvince: order.shippingAddress.province,
            customerPostalCode: order.shippingAddress.postalCode,
            customerPhone: order.shippingAddress.phone,
            customerEmail: order.email || "",
            weight: totalWeight,
            rmaNumber,
        });

        //  6. VALIDATE RESPONSE (CRITICAL FIX)
        if (!returnShipment || !returnShipment.trackingNumber) {
            console.error("❌ Invalid Loomis return response:", returnShipment);

            return res.status(500).json({
                success: false,
                message: "Invalid Loomis return response — no tracking number received",
            });
        }

        // 7. Save return info
        order.returnInfo = {
            trackingNumber: returnShipment.trackingNumber,
            eReturnId: returnShipment.eReturnId || null,
            rmaNumber,
            shippingDate: returnShipment.shippingDate || null,
            createdAt: new Date(),
            rawResponse: returnShipment.rawResponse || returnShipment,
        };

        //  BETTER STATUS (not fully returned yet)
        order.trackingHistory.push({
            status: "Return Initiated",
            message: `E-Return created. RMA: ${rmaNumber}. Tracking: ${returnShipment.trackingNumber}. Loomis will arrange pickup.`,
            updatedBy: "Admin",
            actorName: "Admin",
            updatedAt: new Date(),
        });

        await order.save();

        // 8. Response
        return res.status(200).json({
            success: true,
            message: "Return shipment created. Loomis will print the label and arrange pickup.",
            trackingNumber: returnShipment.trackingNumber,
            rmaNumber,
            shippingDate: returnShipment.shippingDate,
            note: "E-Return labels are printed at Loomis facility — no label URL is generated.",
        });

    } catch (error) {
        console.error("CREATE RETURN ERROR:", {
            message: error.message,
            stack: error.stack,
        });

        return res.status(500).json({
            success: false,
            message: "Failed to create return shipment",
            error: error.message,
        });
    }
};


exports.endOfDay = async (req, res) => {
    try {
        const result = await runEndOfDay(); // ← reuses exact same logic as cron

        if (!result.manifestNum) {
            return res.status(200).json({
                success: true,
                message: "End of day complete — no shipments to manifest today",
            });
        }

        res.status(200).json({
            success: true,
            message: `End of day complete. Manifest: ${result.manifestNum}`,
            manifestNum: result.manifestNum,
            date: result.date,
        });

    } catch (error) {
        console.error("END OF DAY ERROR:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: "End of day failed", error: error.message });
    }
};
/*
================================
GET MANIFEST PDF
================================
*/
exports.getManifestPdf = async (req, res) => {
    try {
        const { manifestNum } = req.params;

        //  Validate first
        if (!manifestNum) {
            return res.status(400).json({ success: false, message: "Manifest number is required" });
        }

        //  Check cache
        const saved = await Manifest.findOne({ manifestNum });
        if (saved) {
            const buffer = Buffer.from(saved.pdfBase64, "base64");
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename=manifest-${manifestNum}.pdf`);
            return res.send(buffer);
        }

        //  Fetch from Loomis
        const manifestBuffer = await loomisService.getManifest(manifestNum);

        //  Save to cache for future requests
        await Manifest.create({
            manifestNum,
            pdfBase64: manifestBuffer.toString("base64")
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=manifest-${manifestNum}.pdf`);
        res.send(manifestBuffer);

    } catch (error) {
        console.error("GET MANIFEST ERROR:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch manifest", error: error.message });
    }
};

// ================================
// GET AVAILABLE SERVICES (with prices)
// ================================

exports.getAvailableServices = async (req, res) => {
    try {
        const {
            destination,
            province,
            receiverName,
            deliveryAddress,
            deliveryCity,
            weight,
        } = req.body;

        if (!destination) {
            return res.status(400).json({
                success: false,
                message: "destination postal code is required",
            });
        }

        const services = await loomisService.getAvailableServices({
            destination: destination.replace(/\s/g, ""),
            province: province || "ON",
            receiverName: receiverName || "CUSTOMER",
            deliveryAddress: deliveryAddress || "1 Main St",
            deliveryCity: deliveryCity || "Toronto",
            weight: Math.max(Number(weight) || 1, 0.1),
        });

        return res.status(200).json({
            success: true,
            services,
        });

    } catch (error) {
        console.error("GET AVAILABLE SERVICES ERROR:", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({
            success: false,
            message: "Failed to fetch available services",
        });
    }
};



// ================================
// CANCEL PICKUP
// ================================
exports.cancelPickup = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const confirmationNumber = order.pickupInfo?.confirmationNumber;
        if (!confirmationNumber) {
            return res.status(400).json({ success: false, message: "No pickup scheduled for this order" });
        }

        await loomisService.cancelPickup(confirmationNumber);

        // Clear pickup info and log history
        order.pickupInfo = {
            confirmationNumber: null,
            pickupDate: null,
            readyTime: null,
            closeTime: null,
            scheduledAt: null,
            rawResponse: null,
        };

        order.trackingHistory.push({
            status: order.orderStatus,
            message: `Pickup cancelled. Previous confirmation: ${confirmationNumber}`,
            updatedBy: "Admin",
            actorName: "Admin",
            updatedAt: new Date(),
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: "Pickup cancelled successfully",
        });

    } catch (error) {
        console.error("CANCEL PICKUP ERROR:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: "Failed to cancel pickup", error: error.message });
    }
};


// ================================
// GET PICKUP DAYS
// ================================
exports.getPickupDay = async (req, res) => {
    try {
        const { fromDate, numOfDays } = req.query;

        const days = await loomisService.getPickupDay({
            fromDate: fromDate || null,
            numOfDays: numOfDays ? Number(numOfDays) : 7,
        });

        res.status(200).json({ success: true, days });

    } catch (error) {
        console.error("GET PICKUP DAY ERROR:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch pickup days", error: error.message });
    }
};


// ================================
// SEARCH PICKUP BY ID
// ================================
exports.searchPickupById = async (req, res) => {
    try {
        const { confirmationId } = req.params;

        if (!confirmationId) {
            return res.status(400).json({ success: false, message: "confirmationId is required" });
        }

        const pickup = await loomisService.searchPickupById(confirmationId);

        res.status(200).json({ success: true, pickup });

    } catch (error) {
        console.error("SEARCH PICKUP BY ID ERROR:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch pickup", error: error.message });
    }
};


// ================================
// SEARCH PICKUPS BY DATE RANGE
// ================================
exports.searchPickupByDate = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: "fromDate and toDate are required (YYYYMMDD)" });
        }

        if (!/^\d{8}$/.test(fromDate) || !/^\d{8}$/.test(toDate)) {
            return res.status(400).json({ success: false, message: "Dates must be in YYYYMMDD format" });
        }

        const pickups = await loomisService.searchPickupByPickupDate({ fromDate, toDate });

        res.status(200).json({ success: true, pickups });

    } catch (error) {
        console.error("SEARCH PICKUP BY DATE ERROR:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch pickups", error: error.message });
    }
};


// ================================
// TRACK BY REFERENCE
// ================================
exports.trackByReference = async (req, res) => {
    try {
        const { reference } = req.params;
        const { days, postalCode } = req.query;

        if (!reference) {
            return res.status(400).json({ success: false, message: "reference is required" });
        }

        const result = await loomisService.trackByReference({
            reference,
            days: days || 30,
            postalCode: postalCode || null,
            shipperNum: process.env.LOOMIS_ACCOUNT,
        });

        res.status(200).json({ success: true, tracking: result });

    } catch (error) {
        console.error("TRACK BY REFERENCE ERROR:", error.message);
        res.status(500).json({ success: false, message: "Tracking by reference failed", error: error.message });
    }
};


exports.getRatesForOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        // 1. Load order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 2. Validate postal code
        const postalCode = (order.shippingAddress?.postalCode || "").replace(/\s/g, "");
        const province = getProvinceFromPostalCode(postalCode);
        if (!postalCode || !province) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing postal code in order's shipping address",
            });
        }

        // 3. Calculate weight — same formula as checkout
        const totalWeight = Math.max(
            order.cartItems.reduce(
                (w, item) => w + (item.weight || 1) * (item.quantity || 1),
                0
            ),
            0.1
        );

        // 4. Call getAvailableServices — EXACTLY the same as checkout does
        //    so admin sees the same rates the customer saw
        const services = await loomisService.getAvailableServices({
            destination: postalCode,
            province,
            receiverName: order.shippingAddress.fullName || "CUSTOMER",
            deliveryAddress: order.shippingAddress.address || "1 Main St",
            deliveryCity: order.shippingAddress.city || "Toronto",
            weight: totalWeight,
        });

        // 5. Normalise into the shape the RatesModal expects
        //    (serviceCode, serviceName, totalCharge, transitDays, estimatedDelivery)
        const rates = services.map((svc) => ({
            serviceCode: svc.type,
            serviceName: svc.name || svc.type,
            baseCharge: svc.price || 0,
            totalCharge: svc.price || 0,
            currency: "CAD",
            transitDays: svc.transitDays ?? null,
            estimatedDelivery: svc.estimatedDeliveryDate
                ? new Date(
                    String(svc.estimatedDeliveryDate).replace(
                        /^(\d{4})(\d{2})(\d{2})$/,
                        "$1-$2-$3"
                    )
                ).toISOString()
                : null,
            guaranteed: svc.guaranteed || false,
            surcharges: svc.surcharges || [],
        }));

        return res.status(200).json({
            success: true,
            rates,
            // Tell the frontend which service the customer originally picked
            // so the RatesModal can auto-select + badge it
            customerServiceType: order.shippingServiceType || null,
            customerServiceName: order.shippingServiceName || null,
        });

    } catch (error) {
        console.error("GET RATES FOR ORDER ERROR:", {
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({
            success: false,
            message: "Failed to fetch rates for order",
        });
    }
};


// shippingController.js — new endpoint
exports.getDeliveryEstimate = async (req, res) => {
    try {
        const { destination } = req.body;
        if (!destination) {
            return res.status(400).json({ success: false, message: "destination required" });
        }

        const cleanDestination = destination.replace(/\s/g, "");
        const province = getProvinceFromPostalCode(cleanDestination);
        if (!province) {
            return res.status(400).json({ success: false, message: "Invalid postal code" });
        }

        // Use Standard (DD) as the base — it's the slowest, 
        // so it gives a conservative estimate to the customer
        const rateResult = await loomisService.getRates({
            destination: cleanDestination,
            serviceType: "DD",
            receiverName: "CUSTOMER",
            deliveryAddress: "1 Main St",
            deliveryCity: "Toronto",
            weight: 1, // default weight for estimate
        });

        // Return a date range: DD date to DD date + 1 day buffer
        let minDate = null;
        let maxDate = null;

        if (rateResult.expectedDeliveryDate instanceof Date) {
            const d = rateResult.expectedDeliveryDate;
            minDate = d.toLocaleDateString("en-CA", {
                month: "short", day: "numeric", year: "numeric"
            });
            // Add 1 day buffer for max
            const maxD = new Date(d);
            maxD.setDate(maxD.getDate() + 1);
            maxDate = maxD.toLocaleDateString("en-CA", {
                month: "short", day: "numeric", year: "numeric"
            });
        }

        return res.status(200).json({
            success: true,
            estimatedDelivery: minDate,
            estimatedDeliveryMax: maxDate,
            province,
        });

    } catch (error) {
        console.error("GET DELIVERY ESTIMATE ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Could not fetch delivery estimate" });
    }
};
