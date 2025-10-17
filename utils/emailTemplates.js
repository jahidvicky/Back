const inquiryResponseTemplate = (name, message) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
      <h2 style="color: #333;">Hello ${name},</h2>
      <p>We have received your inquiry and here is our response:</p>
      <blockquote style="border-left: 4px solid #007bff; padding-left: 10px; margin: 10px 0;">
          ${message}
      </blockquote>
      <p>Thank you for reaching out to us.</p>
      <p style="color: #555;">Best Regards,<br/>Support Team</p>
  </div>
`;

const inquiryRegisterTemplate = (name, email, password, message) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
      <h2 style="color: #333;">Hello ${name},</h2>
      <p>We are pleased to inform you that your account has been successfully registered.</p>
      
      <p><b>Our Response:</b></p>
      <blockquote style="border-left: 4px solid #28a745; padding-left: 10px; margin: 10px 0;">
          ${message}
      </blockquote>

      <p><b>Your Login Details:</b></p>
      <ul style="list-style:none; padding:0;">
          <li><b>Email:</b> ${email}</li>
          <li><b>Password:</b> ${password}</li>
      </ul>

      <p>Please keep your login details safe.</p>
      <p style="color: #555;">Best Regards,<br/>Support Team</p>
  </div>
`;


// Admin Notification Template
const adminNotificationTemplate = (inquiry) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
    <h2 style="color:#d10000;">New Inquiry Received</h2>
    <p><b>Inquiry Number:</b> ${inquiry.inquiryNumber}</p>
    <p><b>User Type:</b> ${inquiry.userType}</p>
    <p><b>Name:</b> ${inquiry.name}</p>
    <p><b>Email:</b> ${inquiry.email}</p>
    ${inquiry.businessNumber ? `<p><b>Business Number:</b> ${inquiry.businessNumber}</p>` : ""}
    ${inquiry.vendorType ? `<p><b>Vendor Type:</b> ${inquiry.vendorType}</p>` : ""}
    ${inquiry.registrationNumber ? `<p><b>Registration Number:</b> ${inquiry.registrationNumber}</p>` : ""}
    <p><b>Message:</b></p>
    <blockquote style="border-left: 4px solid #007bff; padding-left: 10px;">
      ${inquiry.message}
    </blockquote>
    <p style="color:#555;">Login to the admin panel to respond.</p>
  </div>
`;

module.exports = {
    inquiryResponseTemplate,
    inquiryRegisterTemplate,
    adminNotificationTemplate
};
