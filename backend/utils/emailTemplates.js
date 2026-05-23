const formatDate = (isoStr) => {
  return new Date(isoStr).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
};

const bookingConfirmationTemplate = (appointment) => {
  const { patientId: patient, doctorId: doctor, slotStartIso, slotEndIso, consultationType, zegoRoomId, _id } = appointment;
  const appointmentLink = `${process.env.FRONTEND_URL}/appointments/${_id}`;

  return {
    subject: '✅ Booking Confirmed — UniCare',
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#0ea5e9;padding:24px;text-align:center;">
        <h1 style="color:white;margin:0;">UniCare</h1>
        <p style="color:#e0f2fe;margin:4px 0 0;">Your Health, Our Priority</p>
      </div>
      <div style="padding:28px;">
        <h2 style="color:#0f172a;">Appointment Confirmed! 🎉</h2>
        <p style="color:#475569;">Hi <strong>${patient.name}</strong>, your appointment has been successfully booked.</p>
        
        <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px;border-radius:4px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;width:140px;">👨‍⚕️ Doctor</td><td style="color:#0f172a;font-weight:bold;">Dr. ${doctor.name}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">🏥 Specialization</td><td style="color:#0f172a;">${doctor.specialization}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">📅 Date & Time</td><td style="color:#0f172a;">${formatDate(slotStartIso)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">⏱️ Duration</td><td style="color:#0f172a;">${formatDate(slotStartIso)} – ${new Date(slotEndIso).toLocaleTimeString('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">📞 Type</td><td style="color:#0f172a;">${consultationType}</td></tr>
          </table>
        </div>

        <div style="text-align:center;margin:28px 0;">
          <a href="${appointmentLink}" style="background:#0ea5e9;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">
            View Appointment
          </a>
        </div>

        <p style="color:#64748b;font-size:14px;">You will receive reminder emails 1 hour and 30 minutes before your appointment.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">If you did not book this appointment, please contact us immediately.</p>
      </div>
    </div>`,
  };
};

const reminderTemplate = (appointment, minutesBefore) => {
  const { patientId: patient, doctorId: doctor, slotStartIso, consultationType, _id } = appointment;
  const appointmentLink = `${process.env.FRONTEND_URL}/appointments/${_id}`;
  const timeLabel = minutesBefore === 60 ? '1 Hour' : '30 Minutes';
  const emoji = minutesBefore === 60 ? '⏰' : '🚨';

  return {
    subject: `${emoji} Reminder: Appointment in ${timeLabel} — UniCare`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#0ea5e9;padding:24px;text-align:center;">
        <h1 style="color:white;margin:0;">UniCare</h1>
      </div>
      <div style="padding:28px;">
        <h2 style="color:#0f172a;">${emoji} Your appointment is in ${timeLabel}!</h2>
        <p style="color:#475569;">Hi <strong>${patient.name}</strong>, this is a reminder for your upcoming consultation.</p>

        <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px;border-radius:4px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;width:140px;">👨‍⚕️ Doctor</td><td style="color:#0f172a;font-weight:bold;">Dr. ${doctor.name}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">📅 Time</td><td style="color:#0f172a;">${formatDate(slotStartIso)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">📞 Type</td><td style="color:#0f172a;">${consultationType}</td></tr>
          </table>
        </div>

        <div style="text-align:center;margin:28px 0;">
          <a href="${appointmentLink}" style="background:#f97316;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">
            Join Consultation Now
          </a>
        </div>

        <p style="color:#64748b;font-size:14px;">Make sure you have a stable internet connection and are in a quiet place.</p>
      </div>
    </div>`,
  };
};

/**
 * OTP email template — used for login verification and phone verification
 * @param {string} recipientName
 * @param {string} otp
 * @param {string} purpose  — 'login' | 'phone_verification'
 * @param {number} expiryMinutes
 */
const otpEmailTemplate = (recipientName, otp, purpose = 'login', expiryMinutes = 10) => {
  const titles = {
    login:              'Your Login OTP',
    signup:             'Verify Your Email — Signup OTP',
    phone_verification: 'Phone Number Verification OTP',
    reset:              'Password Reset OTP',
  };
  const subtexts = {
    login:              'Use the OTP below to complete your sign-in to UniCare.',
    signup:             'Use the OTP below to verify your email and complete your UniCare registration.',
    phone_verification: 'Use the OTP below to verify your phone number on UniCare.',
    reset:              'Use the OTP below to reset your UniCare account password.',
  };
  const title   = titles[purpose]   || titles.login;
  const subtext = subtexts[purpose] || subtexts.login;

  return {
    subject: `🔐 UniCare — ${title}: ${otp}`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
      <div style="background:#0ea5e9;padding:22px 28px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">UniCare</h1>
        <p style="color:#e0f2fe;margin:4px 0 0;font-size:13px;">Your Health, Our Priority</p>
      </div>
      <div style="padding:32px 28px;">
        <h2 style="color:#0f172a;margin:0 0 8px;">${title}</h2>
        <p style="color:#475569;font-size:14px;margin:0 0 24px;">
          Hi <strong>${recipientName}</strong>, ${subtext}
        </p>

        <div style="text-align:center;background:#f0f9ff;border:1px dashed #0ea5e9;border-radius:10px;padding:28px 20px;margin:0 0 24px;">
          <p style="color:#475569;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:2px;">Your OTP</p>
          <div style="letter-spacing:12px;font-size:38px;font-weight:700;color:#0f172a;font-family:monospace;">${otp}</div>
          <p style="color:#94a3b8;font-size:12px;margin:14px 0 0;">⏱ Valid for <strong>${expiryMinutes} minutes</strong></p>
        </div>

        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#92400e;font-size:13px;margin:0;">
            <strong>Security notice:</strong> Never share this OTP with anyone.
            UniCare staff will never ask for your OTP.
          </p>
        </div>

        <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;margin:0;">
          If you did not request this OTP, please ignore this email or contact support immediately.
        </p>
      </div>
    </div>`,
  };
};

module.exports = { bookingConfirmationTemplate, reminderTemplate, otpEmailTemplate };