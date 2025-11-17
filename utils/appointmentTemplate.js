module.exports = ({ name, doctorName, appointmentDate, examType, weekday, type }) => {
  const isAdmin = type === "admin";

  return `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <div style="background-color: #dc2626; color: white; text-align: center; padding: 15px 0;">
        <h2>${isAdmin ? "New Appointment Booked" : "Appointment Confirmation"}</h2>
      </div>
      <div style="padding: 25px; color: #333;">
        <p style="font-size: 16px;">Hello ${isAdmin ? "Admin" : name},</p>

        <p style="font-size: 15px; line-height: 1.6;">
          ${isAdmin
            ? `A new eye exam appointment has been booked by <strong>${name}</strong>.`
            : `Your eye exam appointment has been successfully booked.`}
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Doctor</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${doctorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Exam Type</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${examType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Appointment Date</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${appointmentDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Weekday</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${weekday}</td>
          </tr>
        </table>

        <p style="margin-top: 20px; font-size: 15px; line-height: 1.5;">
          ${isAdmin
            ? `Please log in to your admin panel to review the appointment details.`
            : `We look forward to seeing you soon. If you need to reschedule, please contact us.`}
        </p>

        <p style="margin-top: 20px; font-size: 15px;">Thank you,<br><strong>Atal Opticals</strong></p>
      </div>
    </div>
  </div>
  `;
};
