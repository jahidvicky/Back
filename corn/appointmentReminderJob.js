const cron = require("node-cron");
const Appointment = require("../model/appointment-model");
const Doctor = require("../model/doctor-model");
const transporter = require("../utils/mailer");
const appointmentTemplate = require("../utils/appointmentTemplate");

function initAppointmentReminderJob() {
    // Runs every day at 8 AM server time
    cron.schedule("0 8 * * *", async () => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split("T")[0];

            const appointments = await Appointment.find({
                date: dateStr,
                status: "booked",
                reminderSent: false,
                email: { $exists: true, $ne: "" }
            }).populate("doctor", "doctor_name");

            for (const appt of appointments) {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: appt.email,
                    subject: "Reminder: Your Eye Exam Appointment Tomorrow",
                    html: appointmentTemplate({
                        name: `${appt.firstName} ${appt.lastName || ""}`,
                        doctorName: appt.doctor?.doctor_name,
                        appointmentDate: `${appt.date} ${appt.startTime}`,
                        examType: appt.examType,
                        weekday: appt.weekday,
                        type: "reminder"
                    })
                });

                appt.reminderSent = true;
                await appt.save();
            }

            console.log(`Reminder job: sent ${appointments.length} reminder email(s)`);
        } catch (err) {
            console.error("Appointment reminder job failed:", err.message);
        }
    });
}

module.exports = { initAppointmentReminderJob };