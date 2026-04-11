const cron = require('node-cron');
const Appointment = require('../modal/Appointment');
const { sendMail } = require('./emailService');
const { reminderTemplate } = require('./emailTemplates');

const startReminderScheduler = () => {
  // Har minute check karo
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    // Helper: window check
    const inWindow = (slotTime, minutesBefore) => {
      const target = new Date(slotTime);
      const diff = (target - now) / 1000 / 60; // minutes
      return diff >= minutesBefore - 1 && diff < minutesBefore + 1;
    };

    try {
      const upcomingAppointments = await Appointment.find({
        status: 'Scheduled',
        $or: [
          { reminder60Sent: false },
          { reminder30Sent: false },
        ],
      })
        .populate('patientId', 'name email')
        .populate('doctorId', 'name specialization');

      for (const appt of upcomingAppointments) {
        const email = appt.patientId?.email;
        if (!email) continue;

        // 1 hour reminder
        if (!appt.reminder60Sent && inWindow(appt.slotStartIso, 60)) {
          const { subject, html } = reminderTemplate(appt, 60);
          await sendMail({ to: email, subject, html });
          appt.reminder60Sent = true;
          await appt.save();
          console.log(`60-min reminder sent for appointment ${appt._id}`);
        }

        // 30 min reminder
        if (!appt.reminder30Sent && inWindow(appt.slotStartIso, 30)) {
          const { subject, html } = reminderTemplate(appt, 30);
          await sendMail({ to: email, subject, html });
          appt.reminder30Sent = true;
          await appt.save();
          console.log(`30-min reminder sent for appointment ${appt._id}`);
        }
      }
    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    }
  });

  console.log('✅ Reminder scheduler started');
};

module.exports = { startReminderScheduler };