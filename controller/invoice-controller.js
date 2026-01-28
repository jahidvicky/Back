const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");
const orderModel = require("../model/order-model");

exports.getInvoice = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const templatePath = path.join(__dirname, "../views/invoice.ejs");
    const html = await ejs.renderFile(templatePath, { order });

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${order._id}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).send("Failed to generate invoice");
  }
};
