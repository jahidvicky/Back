module.exports = ({ name, doctorName, appointmentDate, examType, weekday, type, cancelledBy }) => {
  const isAdmin = type === "admin";
  const isReminder = type === "reminder";
  const isCancelledCustomer = type === "cancelled";
  const isCancelledAdmin = type === "cancelled-admin";

  const headerColor = (isCancelledCustomer || isCancelledAdmin) ? "#6b7280" : "#dc2626";

  return `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
    <div style="background-color: ${headerColor}; color: white; text-align: center; padding: 15px 0;">
        <h2>${isCancelledCustomer
      ? "Appointment Cancelled"
      : isCancelledAdmin
        ? "Appointment Cancelled"
        : isAdmin
          ? "New Appointment Booked"
          : isReminder
            ? "Appointment Reminder"
            : "Appointment Confirmation"
    }</h2>
      </div>
      <div style="padding: 25px; color: #333;">
        <p style="font-size: 16px;">Hello ${(isAdmin || isCancelledAdmin) ? "Admin" : name},</p>

    <p style="font-size: 15px; line-height: 1.6;">
          ${isCancelledCustomer
      ? (cancelledBy === "admin"
        ? `Your eye exam appointment was cancelled by our clinic. Please rebook at your convenience, or use the reschedule option in your account.`
        : `Your eye exam appointment has been cancelled as requested.`)
      : isCancelledAdmin
        ? `An eye exam appointment for <strong>${name}</strong> has been cancelled.`
        : isAdmin
          ? `A new eye exam appointment has been booked by <strong>${name}</strong>.`
          : isReminder
            ? `This is a friendly reminder about your upcoming eye exam appointment.`
            : `Your eye exam appointment has been successfully booked.`
    }
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
          ${isCancelledCustomer
      ? `If this was a mistake or you'd like to rebook, please contact us or book a new appointment anytime.`
      : isCancelledAdmin
        ? `Please log in to your admin panel to view updated appointment records.`
        : isAdmin
          ? `Please log in to your admin panel to review the appointment details.`
          : `We look forward to seeing you soon. To cancel or reschedule, please call or email us — this cannot be done online.`
    }
        </p>

     ${(!isAdmin && !isCancelledAdmin) ? `
        <div style="margin-top: 20px; padding: 12px 15px; background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            <strong>Cancellation Policy:</strong> A $50 fee applies to cancelled appointments.
            To cancel or reschedule, please call us at <strong>1866-242-3545</strong> or email
            <strong>info.ataloptical@gmail.com</strong> — online cancellation is not available.
          </p>
        </div>
        ` : ``}

        <p style="margin-top: 20px; font-size: 15px;">Thank you,<br><strong>Atal Opticals</strong></p>
      </div>
    </div>
  </div>
  `;
};
