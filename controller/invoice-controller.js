const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");
const orderModel = require("../model/order-model");

exports.getInvoice = async (req, res) => {
  try {
    console.log("➡️ Invoice request for ID:", req.params.id);

    const order = await orderModel.findById(req.params.id);
    console.log("✅ Order found:", !!order);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const templatePath = path.join(__dirname, "../views/invoice.ejs");
    console.log("📄 Template path:", templatePath);

    const html = await ejs.renderFile(templatePath, { order });
    console.log("✅ EJS rendered, length:", html.length);

    console.log("🚀 Launching puppeteer...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    console.log("🧭 Browser launched");

    const page = await browser.newPage();
    console.log("📄 New page created");

    await page.setContent(html, { waitUntil: "networkidle0" });
    console.log("✅ HTML set on page");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    console.log("✅ PDF generated, size:", pdfBuffer.length);

    await browser.close();
    console.log("🧹 Browser closed");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${order._id}.pdf`
    );
    res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ Invoice generation error:", error);
    res.status(500).send("Failed to generate invoice");
  }
};
