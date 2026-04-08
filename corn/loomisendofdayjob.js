const cron = require("node-cron");
const loomisService = require("../services/loomisService");
const Manifest = require("../model/manifest-model");
const Order = require("../model/order-model");

// ── Shared logic — used by BOTH cron and manual controller ──────────────────
const runEndOfDay = async () => {
    const result = await loomisService.endOfDay();

    if (!result.manifestNum) {
        return { manifestNum: null };
    }

    // ── Save PDF only if not already saved ──────────────────────────────
    const existing = await Manifest.findOne({ manifestNum: result.manifestNum });
    if (!existing) {
        const manifestBuffer = await loomisService.getManifest(result.manifestNum);
        await Manifest.create({
            manifestNum: result.manifestNum,
            date: result.date,
            pdfBase64: manifestBuffer.toString("base64"),
            createdAt: new Date(),
        });
    } else {
        console.log(`[EndOfDayJob] Manifest already in DB — skipping PDF save`);
    }

    // ── Always stamp orders — runs regardless of above ───────────────────
    const nowEST = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Toronto" }));
    const startOfDayEST = new Date(nowEST);
    startOfDayEST.setHours(0, 0, 0, 0);
    const endOfDayEST = new Date(nowEST);
    endOfDayEST.setHours(23, 59, 59, 999);

    const updateResult = await Order.updateMany(
        {
            "shippingInfo.shipmentId": { $exists: true },
            "shippingInfo.voided": { $ne: true },
            "shippingInfo.manifestNum": { $in: [null, undefined] },
            createdAt: { $gte: startOfDayEST, $lte: endOfDayEST },
        },
        { $set: { "shippingInfo.manifestNum": result.manifestNum } }
    );
    return { manifestNum: result.manifestNum, date: result.date };
};

// ── Cron — runs automatically at 6 PM EST every weekday ─────────────────────
const initEndOfDayJob = () => {
    cron.schedule("30 23 * * 1-5", async () => {
        try {
            await runEndOfDay();
        } catch (err) {
            console.error("[EndOfDayJob] Failed:", err.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata",
    });
};

module.exports = { initEndOfDayJob, runEndOfDay };
