require("dotenv").config();
const mongoose = require("mongoose");
const PolicyPage = require("./model/policy-page-model");

const pages = [
  {
    slug: "terms-and-conditions",
    pageTitle: "Terms & Conditions",
    intro: `<p><strong>Welcome to Atal Optical Corp.</strong> These Terms & Conditions explain the rules that apply when you access or use our website and when you purchase or inquire about our optical products and services.</p><p>By using this website, you agree to comply with these Terms & Conditions.</p>`,
    sections: [
      { heading: "Website Use", body: "<p>Our website provides information about Atal Optical Corp., our eyewear, optical products, services, promotions and locations. You agree to use the website lawfully and responsibly.</p>" },
      { heading: "Products & Pricing", body: "<p>We make reasonable efforts to ensure that product descriptions, images, prices and availability are accurate. Information, pricing and availability may change without notice.</p>" },
      { heading: "Prescription Products", body: "<p>Prescription eyewear and contact lenses are subject to applicable Ontario laws and professional requirements. Customers are responsible for providing accurate prescription information.</p>" },
      { heading: "Professional Advice", body: "<p>Information on this website is for general information only and does not replace an eye examination, diagnosis, treatment or professional eye-care advice.</p>" },
      { heading: "Orders & Payments", body: "<p>Customers must provide accurate information when placing an order. Orders are subject to product availability, prescription requirements and payment confirmation.</p>" },
      { heading: "Returns & Refunds", body: "<p>Returns, exchanges and refunds are subject to Atal Optical Corp.'s applicable policies. Customized and prescription products may have specific conditions.</p>" },
      { heading: "Customer Reviews & Submissions", body: "<p>Reviews, feedback, photographs and other voluntary submissions may be used by Atal Optical Corp. for legitimate business and promotional purposes, subject to applicable privacy requirements and our Privacy Policy.</p>" },
      { heading: "Copyright & Intellectual Property", body: "<p>Website content, including our logo, photographs, graphics, text, designs and other materials, is protected by applicable intellectual-property laws and may not be used without authorization.</p>" },
      { heading: "Third-Party Links", body: "<p>Our website may contain links to third-party websites. Atal Optical Corp. is not responsible for the content or practices of those websites.</p>" },
      { heading: "Website Availability", body: "<p>We make reasonable efforts to maintain the website, but we do not guarantee that it will always be available, uninterrupted or error-free.</p>" },
      { heading: "Applicable Law", body: "<p>These Terms & Conditions are governed by the laws of Ontario and applicable Canadian law.</p>" },
      { heading: "Privacy", body: `<p>We respect your privacy. Personal information and information collected in connection with our services will be handled in accordance with our <a href="/privacy-policy">Privacy Policy</a> and applicable privacy laws.</p>` },
      { heading: "Your Privacy and Prescription Information", body: `<p>Please do not submit confidential medical or personal health information through general website forms unless the form specifically requests that information or you have been instructed to do so by Atal Optical Corp.</p><p>For information about how we collect, use, protect and retain personal information, please see our <a href="/privacy-policy">Privacy Policy</a>.</p>` },
      { heading: "Read the Complete Terms", body: `<p>This page provides a convenient summary of our Terms & Conditions. <strong>The complete Terms & Conditions</strong> contain additional details and should be read together with our Privacy Policy and applicable store policies.</p><p><a href="/full-terms-and-conditions">Read Full Terms & Conditions</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/return-exchange">Return & Refund Policy</a> · <a href="/contact-us">Contact Us</a></p>` },
    ],
  },
  {
    slug: "full-terms-and-conditions",
    pageTitle: "Full Terms & Conditions",
    intro: `<p>This is the complete version of our Terms & Conditions. For a quick summary, see our <a href="/terms-and-conditions">Terms & Conditions summary</a>.</p>`,
    sections: [
      { heading: "1. Business Overview", body: "<p>Atal Optical is a retail optical business operating in Ontario, Canada, providing prescription eyewear, frames, lenses, sunglasses, contact lenses, and related optical services. By using our website or purchasing our products or services, you agree to these Terms & Conditions.</p>" },
      { heading: "2. Eligibility", body: "<p>By using our website or services, you confirm that:</p><ul><li>You are at least <strong>18 years of age</strong>, or</li><li>You have permission from a legal guardian</li></ul>" },
      { heading: "3. Prescription Accuracy & Customer Responsibility", body: "<p>Customers are responsible for providing:</p><ul><li>A valid and current prescription</li><li>Accurate personal information</li><li>Correct pupillary distance (PD) if required</li></ul><p>Atal Optical is <strong>not responsible</strong> for vision issues caused by incorrect information supplied by the customer.</p>" },
      { heading: "4. Orders & Acceptance", body: "<p>All orders placed are subject to:</p><ul><li>Product availability</li><li>Price confirmation</li><li>Prescription validation</li></ul><p>We reserve the right to refuse service, cancel suspicious or fraudulent orders, and limit quantities per customer.</p>" },
      { heading: "5. Pricing & Payments", body: "<p>Prices are listed in Canadian Dollars (CAD). We accept debit, credit cards, and approved financing options. Prices may change without prior notice. Full payment is required before order processing.</p>" },
      { heading: "6. Refund, Return & Exchange Policy Reference", body: `<ul><li>Prescription eyewear and frames are final sale</li><li>No refunds on custom products</li><li>Only eligible non-prescription sunglasses may qualify for exchange (as per separate policy)</li></ul><p>Please refer to our separate Returns & Exchange Policy for full details. You can view it <a href="/return-exchange">here</a>.</p>` },
      { heading: "7. Warranty Policy", body: "<p>Manufacturer warranties apply only to manufacturing defects and material faults. Warranties do not cover scratches, accidental breakage, normal wear and tear, or improper use or storage.</p>" },
      { heading: "8. Shipping & Delivery Terms", body: "<p>Delivery timelines are estimated only. We are not liable for courier delays, weather delays, or incorrect address details provided by the customer. Risk of loss transfers to the customer once the product is shipped.</p>" },
      { heading: "9. Product Measurements & Fittings", body: "<p>Customers are responsible for frame size selection and fit preferences. In-store adjustments are provided as a courtesy and are not guaranteed.</p>" },
      { heading: "10. Privacy & Data Protection", body: `<p>Customer information is collected and protected in accordance with PIPEDA (Canada) and Ontario privacy regulations. Refer to our separate <a href="/privacy-policy">Privacy Policy</a> for full details.</p>` },
      { heading: "11. Promotions, Discounts & Gift Cards", body: "<p>Promotional offers are time-limited and cannot be combined unless stated. Final sale items are excluded from additional promotions. Gift cards are non-refundable, have no cash value, and cannot be replaced if lost or stolen.</p>" },
      { heading: "12. Limitation of Liability", body: "<p>Atal Optical is not responsible for indirect damages, loss of income or profits, or vision discomfort resulting from customer-provided prescription errors. Liability is limited to the purchase price of the product.</p>" },
      { heading: "13. Governing Law", body: "<p>All transactions and disputes are governed by the laws of the <strong>Province of Ontario, Canada</strong>, and federal laws of Canada.</p>" },
      { heading: "14. Changes to Terms & Conditions", body: "<p>Atal Optical reserves the right to modify these Terms & Conditions at any time. Updates will be published on the website without prior notice.</p>" },
      { heading: "15. Termination of Use", body: "<p>We reserve the right to suspend website access, terminate service, or refuse transactions if misuse, abuse, or fraudulent activity is detected.</p>" },
    ],
  },
  {
    slug: "privacy-policy",
    pageTitle: "Privacy Policy",
    sections: [
      { heading: "Introduction", body: "<p>At Atal Optical, we are committed to protecting your personal information and respecting your privacy. This policy explains how we collect, use, disclose, and safeguard your information in accordance with Canadian privacy laws.</p><p>This policy applies when you visit our website, make a purchase, or use any of our optical services.</p>" },
      { heading: "Information We Collect", body: `<p>We may collect the following information:</p><ul><li><strong>Personal Information</strong><ul><li>Full name</li><li>Address</li><li>Phone number</li><li>Email address</li></ul></li><li><strong>Medical / Optical Information</strong><ul><li>Prescription details</li><li>Pupillary distance (PD)</li><li>Basic eye health information</li></ul></li><li><strong>Payment Information</strong><ul><li>Billing address</li><li>Transaction details</li><li>We do not store full credit/debit card numbers.</li></ul></li><li><strong>Website Usage Information</strong><ul><li>IP address</li><li>Browser type</li><li>Cookies and usage analytics</li></ul></li></ul>` },
      { heading: "How We Use Your Information", body: "<p>We use your information to:</p><ul><li>Process orders and services</li><li>Prepare custom optical products</li><li>Contact you about your order</li><li>Process payments</li><li>Improve customer service and website performance</li><li>Comply with legal obligations</li></ul>" },
      { heading: "Sharing of Information", body: "<p>We do not sell or rent your personal information. We may share limited information with:</p><ul><li>Lens and frame manufacturers</li><li>Insurance providers (with customer consent)</li><li>Payment processors</li><li>Legal and regulatory authorities when required by law</li></ul>" },
      { heading: "Cookies & Website Tracking", body: "<p>Our website uses cookies to:</p><ul><li>Improve site functionality</li><li>Track website performance</li><li>Enhance user experience</li></ul><p>You may disable cookies through your browser settings.</p>" },
      { heading: "Data Security", body: "<p>We protect your information using:</p><ul><li>Secure servers</li><li>Encryption technologies</li><li>Restricted access controls</li><li>Industry-standard security practices</li></ul>" },
      { heading: "Data Retention", body: "<p>We retain personal information only as long as necessary to:</p><ul><li>Fulfill business services</li><li>Meet legal and regulatory requirements</li></ul>" },
      { heading: "Your Rights", body: "<p>You have the right to:</p><ul><li>Request access to your personal data</li><li>Request correction of inaccurate information</li><li>Withdraw consent (where applicable)</li></ul>" },
      { heading: "Policy Updates & Legal Compliance", body: "<p>We may update this Privacy Policy from time to time. Any changes will be posted on our website.</p><p>This policy is designed to comply with:<br/>• PIPEDA (Personal Information Protection and Electronic Documents Act)<br/>• Ontario privacy regulations<br/>• Applicable Canadian healthcare privacy standards</p>" },
    ],
  },
  {
    slug: "return-exchange",
    pageTitle: "Return, Exchange & Consumer Policy",
    sections: [
      { heading: "Custom & Prescription Products – Final Sale", body: "<p>All prescription eyeglasses, prescription sunglasses, custom lenses, and medical optical devices are custom-made and personalized.</p><p>As per Ontario Consumer Protection Act – Custom Goods Exemption, these products are final sale.</p><p>Orders cannot be cancelled, refunded, or changed once production has started.</p>" },
      { heading: "Non-Custom / Non-Prescription Products", body: "<p>Non-prescription frames, sunglasses, contact lens accessories, cleaning kits, and cases may be returned within 7 days of purchase.</p><p>Products must be unused, in original packaging, in resalable condition, and accompanied by the original receipt.</p>" },
      { heading: "Defective or Incorrect Products", body: "<p>If Atal Optical makes an error or supplies a defective product, repair, replacement, or remake will be provided at no additional charge.</p><p>Claims must be reported within 7 calendar days of delivery/pickup and customers should provide proof of defect (photos or in-store inspection).</p>" },
      { heading: "Legal Cooling-Off Rights (Ontario Law)", body: "<p>For in-store purchases, Ontario law does not provide automatic refund or cooling-off rights except where required by law.</p><p>For online or remote sales, customers may cancel within 7 days only if the product has not entered production.</p>" },
      { heading: "Deposits and Special Orders", body: "<p>Deposits for special orders are non-refundable once the manufacturing process has started.</p><p>Any balance must be paid before product collection or delivery.</p>" },
      { heading: "Sale, Clearance & Promotional Items", body: "<p>All discounted, clearance, promotional, and warehouse sale items are considered final sale and are not eligible for return, exchange, or refund.</p>" },
      { heading: "Return Approval Conditions", body: "<p>Returned items must be in original packaging with a valid receipt.</p><p>Items must show no scratches, marks, damage, or wear and must include all accessories.</p><p>Items failing inspection will be refused.</p>" },
      { heading: "Refunds (Where Applicable)", body: "<p>Approved refunds are issued only to the original payment method.</p><p>Refund processing time: 7–10 business days.</p><p>Shipping charges are non-refundable.</p>" },
      { heading: "Shipping, Delivery & Risk of Loss", body: "<p>Responsibility transfers to the customer once the order is collected, shipped, or delivered.</p><p>Atal Optical is not responsible for delays caused by third-party couriers.</p>" },
      { heading: "Warranty Coverage", body: "<p>Manufacturer warranties apply to frames and lenses for manufacturing defects only.</p><p>Warranties do NOT cover scratches, accidents, misuse, or normal wear and tear.</p>" },
      { heading: "Order Refusal Rights", body: "<p>Atal Optical reserves the right to refuse service, cancel orders, limit quantities, or protect against fraud or misuse.</p>" },
      { heading: "Legal Compliance Statement", body: "<p>This policy follows the Ontario Consumer Protection Act (CPA), Canadian Custom Goods Regulations, and industry standards for healthcare and optical devices.</p>" },
    ],
  },
  {
    slug: "disclaimer",
    pageTitle: "Disclaimer Policy",
    sections: [
      { heading: "1. General Information", body: "<p>The content on the Atal Optical website is for informational purposes only. While we strive to provide accurate and up-to-date information, we make no guarantees regarding the completeness, accuracy, or reliability of any content, products, or services listed on the website.</p>" },
      { heading: "2. Medical & Optical Advice", body: "<ul><li>Prescription glasses, lenses, and other optical products are customized medical devices.</li><li>The information provided on this website does not replace professional eye care advice.</li><li>Customers should consult a qualified eye care professional for any vision or eye health concerns.</li></ul>" },
      { heading: "3. Product Information", body: "<p>Product images, descriptions, and specifications are provided for reference only. Actual product appearance, colour, or dimensions may vary slightly from website images. Availability and pricing are subject to change without notice.</p>" },
      { heading: "4. Limitation of Liability", body: "<p>Atal Optical and its affiliates are not liable for any damages, losses, or injuries resulting from the use or misuse of our products, indirect or consequential damages, or errors and omissions on the website. The maximum liability is limited to the purchase price of the product in question.</p>" },
      { heading: "5. Third-Party Links", body: "<p>The website may include links to third-party websites. We do not control or endorse the content of these sites and are not responsible for any loss or damage from using third-party websites.</p>" },
      { heading: "6. Website Use", body: "<p>By using the Atal Optical website, users agree to use the website lawfully, not to copy or reproduce content without permission, and not to use the website for fraudulent purposes.</p>" },
      { heading: "7. Policy Updates", body: "<p>Atal Optical reserves the right to update this Disclaimer Policy at any time. Changes will be posted on the website; users are encouraged to review it regularly.</p>" },
    ],
  },
  {
    slug: "cookies-policy",
    pageTitle: "Cookies Policy",
    sections: [
      { heading: "1. What Are Cookies?", body: "<p>Cookies are small text files stored on your device when you visit a website. They help us improve your browsing experience and website functionality.</p>" },
      { heading: "2. Types of Cookies We Use", body: "<ul><li><strong>Essential Cookies</strong> — Required for website security, login sessions, and shopping cart functionality.</li><li><strong>Performance Cookies</strong> — Used to analyze website traffic and improve website speed and performance.</li><li><strong>Functional Cookies</strong> — Used to remember user preferences, language and location settings.</li><li><strong>Marketing Cookies</strong> — Used to display relevant promotions and track engagement with marketing content.</li></ul>" },
      { heading: "3. Purpose of Cookies", body: "<p>We use cookies to:</p><ul><li>Improve website functionality</li><li>Enhance user experience</li><li>Monitor website performance</li><li>Support marketing activities</li></ul>" },
      { heading: "4. Managing Cookies", body: "<p>You have full control over cookies. You can enable or disable cookies through your browser settings and delete stored cookies at any time. Please note disabling cookies may affect some website functions.</p>" },
      { heading: "5. Third-Party Cookies", body: "<p>We may allow trusted third-party services to place cookies, including analytics tools, advertising partners, and security monitoring services. All partners are required to follow strict privacy standards.</p>" },
      { heading: "6. Updates to This Policy", body: "<p>Atal Optical reserves the right to update this Cookies Policy at any time. Updates will be posted directly on the website.</p>" },
      { heading: "7. Legal Compliance", body: "<p>This Cookies Policy complies with Canadian PIPEDA regulations, Ontario privacy guidelines, and digital privacy best practices.</p>" },
    ],
  },
  {
    slug: "exchange-policy",
    pageTitle: "Exchange Policy",
    sections: [
      { heading: "Prescription Glasses — No Exchange / No Refund", body: "<ul><li>All prescription glasses are custom-made medical optical products.</li><li>These items are final sale and not eligible for exchange or refund under any circumstances.</li></ul>" },
      { heading: "Frames — No Exchange / No Refund", body: "<p>All frames, once sold and adjusted, are final sale and are not eligible for exchange or refund.</p>" },
      { heading: "Sunglasses — Exchange Only", body: "<p>Only sunglasses (non-prescription) are eligible for exchange.</p><ul><li>Exchange requests must be made within <strong>48 hours (1–2 days)</strong> of purchase or delivery.</li><li>Items must be: Unused, In original packaging, With original receipt.</li></ul>" },
      { heading: "No Refunds Policy", body: "<p>Atal Optical does not offer refunds for any products. Only exchanges are permitted for eligible sunglasses.</p>" },
      { heading: "Final Inspection Condition", body: "<p>Atal Optical reserves the right to refuse exchange if products show signs of wear, scratches, damage, or tampering.</p>" },
      { heading: "Legal Compliance", body: "<p>This policy follows Ontario Consumer Protection Act guidelines for medical and non-medical optical products.</p>" },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected. Seeding policy pages...");

  for (const p of pages) {
    await PolicyPage.findOneAndUpdate(
      { slug: p.slug },
      { ...p, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    console.log(`✔ Seeded: ${p.slug}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});