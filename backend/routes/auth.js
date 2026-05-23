/**
 * routes/auth.js — UniCare Authentication
 *
 * OTP CHANGES (non-breaking):
 *  - /doctor/login and /patient/login now return { requiresOtp: true, tempToken }
 *    instead of a session JWT when credentials are valid.
 *  - POST /otp/verify-login  — verifies OTP and returns the real JWT
 *  - POST /otp/resend-login  — resends OTP using tempToken
 *  - POST /otp/send-phone    — sends OTP to verify a phone number (post-login)
 *  - POST /otp/verify-phone  — verifies phone OTP and marks phoneVerified in DB
 *
 * All existing routes (Google OAuth, guest login, register) are UNCHANGED.
 */

const express   = require('express');
const { body }  = require('express-validator');
const validate  = require('../middleware/validate');
const Doctor    = require('../modal/Doctor');
const Patient   = require('../modal/Patient');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const passport  = require('passport');
const crypto    = require('crypto');

const { sendMail }           = require('../utils/emailService');
const { sendSMS }            = require('../utils/smsService');
const { otpEmailTemplate }   = require('../utils/emailTemplates');
const { generateOTP, verifyOTP } = require('../utils/otpStore');
const { authenticate }       = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────

const signToken = (id, type) =>
  jwt.sign({ id, type }, process.env.JWT_SECRET, { expiresIn: '7d' });

const signTempToken = (id, type) =>
  jwt.sign({ id, type, otp_pending: true }, process.env.JWT_SECRET, { expiresIn: '10m' });

const verifyTempToken = (token) => {
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET);
    return d.otp_pending ? d : null;
  } catch { return null; }
};

const loginOtpKey = (userId) => `login:${userId}`;
const phoneOtpKey = (userId) => `phone:${userId}`;

const dispatchOTP = async ({ otp, email, phone, name, purpose }) => {
  const tpl = otpEmailTemplate(name, otp, purpose, 10);
  await sendMail({ to: email, subject: tpl.subject, html: tpl.html });
  if (phone) {
    const to = phone.startsWith('+') ? phone : `+91${phone}`;
    const purposeText = {
      signup: 'signup verification',
      reset:  'password reset',
      login:  'login verification',
    }[purpose] || 'verification';
    await sendSMS({
      to,
      message: `Your UniCare ${purposeText} OTP is ${otp}. Valid for 10 minutes. Do not share this with anyone.`,
    });
  }
};

// ── Signup OTP store (pending registrations, not yet in DB) ──
// Key: "signup:<email>"  Value: { data, otp, expiresAt }
const pendingSignups = new Map();
const SIGNUP_TTL = 10 * 60 * 1000; // 10 min

// Cleanup expired pending signups
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingSignups.entries()) {
    if (now > v.expiresAt) pendingSignups.delete(k);
  }
}, 15 * 60 * 1000);

const signupOtpKey = (email) => `signup:${email}`;

// ── Doctor Register — Step 1: send OTP ───────────────────────
// Does NOT create account yet. Stores pending data + sends OTP.
router.post('/doctor/register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;

      const exists = await Doctor.findOne({ email });
      if (exists) return res.badRequest('An account with this email already exists.');

      // Cooldown check
      const existing = pendingSignups.get(signupOtpKey(email));
      if (existing && Date.now() < existing.expiresAt) {
        const elapsed = Date.now() - (existing.expiresAt - SIGNUP_TTL);
        if (elapsed < 60 * 1000) {
          return res.status(429).json({ success: false, message: `Please wait ${60 - Math.floor(elapsed / 1000)}s before resending.` });
        }
      }

      const hashed = await bcrypt.hash(password, 12);
      const otp    = Math.floor(100000 + Math.random() * 900000).toString();

      pendingSignups.set(signupOtpKey(email), {
        data:      { name, email, password: hashed, phone: phone || null },
        type:      'doctor',
        otp,
        attempts:  0,
        expiresAt: Date.now() + SIGNUP_TTL,
      });

      await dispatchOTP({ otp, email, phone: phone || null, name, purpose: 'signup' });

      res.ok({
        requiresOtp: true,
        sentTo: {
          email,
          phone: phone ? phone.replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2') : null,
        },
      }, 'OTP sent to your email' + (phone ? ' and phone' : '') + '. Please verify to complete signup.');
    } catch (error) { res.serverError('Registration failed', [error.message]); }
  }
);

// ── Doctor Login ──────────────────────────────────────────────
router.post('/doctor/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const doc = await Doctor.findOne({ email });
      if (!doc) return res.unauthorized('Invalid credentials');

      if (password === 'OTP_MODE') {
        // Passwordless — just send OTP, no password check
        if (!doc.isActive) return res.unauthorized('Your account has been deactivated. Please contact support.');
        if (!doc.isVerified) return res.unauthorized('Your account is pending verification by admin.');

        const key = loginOtpKey(doc._id);
        const result = generateOTP(key);
        if (result.cooldown) return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(result.waitMs / 1000)}s before requesting another OTP.` });

        await dispatchOTP({ otp: result.otp, email: doc.email, phone: doc.phone || null, name: doc.name, purpose: 'login' });
        const tempToken = signTempToken(doc._id, 'doctor');
        return res.ok({ requiresOtp: true, tempToken, sentTo: { email: doc.email, phone: doc.phone ? doc.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2') : null } }, 'OTP sent to your registered email' + (doc.phone ? ' and phone' : ''));
      }

      // Password mode — verify password then issue JWT directly, no OTP
      if (!doc.password) return res.unauthorized('Invalid credentials');
      const match = await bcrypt.compare(password, doc.password);
      if (!match) return res.unauthorized('Invalid credentials');
      if (!doc.isActive) return res.unauthorized('Your account has been deactivated. Please contact support.');
      if (!doc.isVerified) return res.unauthorized('Your account is pending verification by admin.');

      const token = signToken(doc._id, 'doctor');
      return res.ok({ token, user: { id: doc._id, type: 'doctor', name: doc.name, email: doc.email } }, 'Login successful');
    } catch (error) { res.serverError('Login failed', [error.message]); }
  }
);

// ── Patient Register — Step 1: send OTP ──────────────────────
router.post('/patient/register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;

      const exists = await Patient.findOne({ email });
      if (exists) return res.badRequest('An account with this email already exists.');

      const existing = pendingSignups.get(signupOtpKey(email));
      if (existing && Date.now() < existing.expiresAt) {
        const elapsed = Date.now() - (existing.expiresAt - SIGNUP_TTL);
        if (elapsed < 60 * 1000) {
          return res.status(429).json({ success: false, message: `Please wait ${60 - Math.floor(elapsed / 1000)}s before resending.` });
        }
      }

      const hashed = await bcrypt.hash(password, 12);
      const otp    = Math.floor(100000 + Math.random() * 900000).toString();

      pendingSignups.set(signupOtpKey(email), {
        data:      { name, email, password: hashed, phone: phone || null },
        type:      'patient',
        otp,
        attempts:  0,
        expiresAt: Date.now() + SIGNUP_TTL,
      });

      await dispatchOTP({ otp, email, phone: phone || null, name, purpose: 'signup' });

      res.ok({
        requiresOtp: true,
        sentTo: {
          email,
          phone: phone ? phone.replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2') : null,
        },
      }, 'OTP sent to your email' + (phone ? ' and phone' : '') + '. Please verify to complete signup.');
    } catch (error) { res.serverError('Registration failed', [error.message]); }
  }
);

// ── Patient Login ─────────────────────────────────────────────
router.post('/patient/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const patient = await Patient.findOne({ email });
      if (!patient) return res.unauthorized('Invalid credentials');

      if (password === 'OTP_MODE') {
        // Passwordless — just send OTP, no password check
        if (!patient.isActive) return res.unauthorized('Your account has been deactivated. Please contact support.');

        const key = loginOtpKey(patient._id);
        const result = generateOTP(key);
        if (result.cooldown) return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(result.waitMs / 1000)}s before requesting another OTP.` });

        await dispatchOTP({ otp: result.otp, email: patient.email, phone: patient.phone || null, name: patient.name, purpose: 'login' });
        const tempToken = signTempToken(patient._id, 'patient');
        return res.ok({ requiresOtp: true, tempToken, sentTo: { email: patient.email, phone: patient.phone ? patient.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2') : null } }, 'OTP sent to your registered email' + (patient.phone ? ' and phone' : ''));
      }

      // Password mode — verify password then issue JWT directly, no OTP
      if (!patient.password) return res.unauthorized('Invalid credentials');
      const match = await bcrypt.compare(password, patient.password);
      if (!match) return res.unauthorized('Invalid credentials');
      if (!patient.isActive) return res.unauthorized('Your account has been deactivated. Please contact support@unicare.com.');

      const token = signToken(patient._id, 'patient');
      return res.ok({ token, user: { id: patient._id, type: 'patient', name: patient.name, email: patient.email } }, 'Login successful');
    } catch (error) { res.serverError('Login failed', [error.message]); }
  }
);

// ── Verify Signup OTP — Step 2: create account ───────────────
// Body: { email, otp }
// On success: account created in DB, real JWT returned.
router.post('/otp/verify-signup',
  [body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 })],
  validate,
  async (req, res) => {
    try {
      const { email, otp } = req.body;
      const key    = signupOtpKey(email);
      const record = pendingSignups.get(key);

      if (!record) return res.status(400).json({ success: false, message: 'No pending signup found. Please register again.' });
      if (Date.now() > record.expiresAt) {
        pendingSignups.delete(key);
        return res.status(400).json({ success: false, message: 'OTP has expired. Please register again.' });
      }
      if (record.attempts >= 5) {
        pendingSignups.delete(key);
        return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please register again.' });
      }
      if (record.otp !== otp.trim()) {
        record.attempts += 1;
        pendingSignups.set(key, record);
        const left = 5 - record.attempts;
        return res.status(400).json({ success: false, message: `Invalid OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.` });
      }

      pendingSignups.delete(key); // consume

      // Create account now
      const { data, type } = record;
      const Model = type === 'doctor' ? Doctor : Patient;

      // Double-check email not taken during OTP window
      const taken = await Model.findOne({ email: data.email });
      if (taken) return res.badRequest('An account with this email already exists.');

      const user  = await Model.create({
        ...data,
        phoneVerified: !!(data.phone), // phone verified since they got SMS OTP
        emailVerified: true,
      });
      const token = signToken(user._id, type);

      res.created(
        { token, user: { id: user._id, type, name: user.name, email: user.email } },
        'Account created successfully! Welcome to UniCare.'
      );
    } catch (error) { res.serverError('Signup verification failed', [error.message]); }
  }
);

// ── Resend Signup OTP ─────────────────────────────────────────
// Body: { email }
router.post('/otp/resend-signup',
  [body('email').isEmail()],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const key    = signupOtpKey(email);
      const record = pendingSignups.get(key);

      if (!record) return res.status(400).json({ success: false, message: 'No pending signup found. Please register again.' });

      const elapsed = Date.now() - (record.expiresAt - SIGNUP_TTL);
      if (elapsed < 60 * 1000) {
        return res.status(429).json({ success: false, message: `Please wait ${60 - Math.floor(elapsed / 1000)}s before resending.` });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      pendingSignups.set(key, { ...record, otp, attempts: 0, expiresAt: Date.now() + SIGNUP_TTL });

      await dispatchOTP({ otp, email, phone: record.data.phone || null, name: record.data.name, purpose: 'signup' });

      res.ok({}, 'OTP resent successfully.');
    } catch (error) { res.serverError('Resend failed', [error.message]); }
  }
);

// ── Verify Login OTP ──────────────────────────────────────────
router.post('/otp/verify-login',
  [body('tempToken').notEmpty(), body('otp').isLength({ min: 6, max: 6 })],
  validate,
  async (req, res) => {
    try {
      const { tempToken, otp } = req.body;
      const decoded = verifyTempToken(tempToken);
      if (!decoded) return res.unauthorized('Invalid or expired session. Please login again.');

      const { id, type } = decoded;
      const result = verifyOTP(loginOtpKey(id), otp);
      if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

      const Model = type === 'doctor' ? Doctor : Patient;
      const user  = await Model.findById(id).select('-password -googleId');
      if (!user) return res.notFound('User not found');

      const token = signToken(id, type);
      res.ok({ token, user: { id: user._id, type, name: user.name, email: user.email } }, 'Login successful');
    } catch (error) { res.serverError('OTP verification failed', [error.message]); }
  }
);

// ── Resend Login OTP ──────────────────────────────────────────
router.post('/otp/resend-login',
  [body('tempToken').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const decoded = verifyTempToken(req.body.tempToken);
      if (!decoded) return res.unauthorized('Invalid or expired session. Please login again.');

      const { id, type } = decoded;
      const Model = type === 'doctor' ? Doctor : Patient;
      const user  = await Model.findById(id);
      if (!user) return res.notFound('User not found');

      const result = generateOTP(loginOtpKey(id));
      if (result.cooldown) return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(result.waitMs / 1000)}s before resending.` });

      await dispatchOTP({ otp: result.otp, email: user.email, phone: user.phone || null, name: user.name, purpose: 'login' });
      const newTempToken = signTempToken(id, type);
      res.ok({ tempToken: newTempToken }, 'OTP resent successfully');
    } catch (error) { res.serverError('Resend failed', [error.message]); }
  }
);

// ── Send Phone OTP (post-login, profile phone verification) ──
router.post('/otp/send-phone',
  authenticate,
  [body('phone').notEmpty().withMessage('Phone number is required')],
  validate,
  async (req, res) => {
    try {
      const { id, type } = req.auth;
      const phone = req.body.phone.trim();
      const Model = type === 'doctor' ? Doctor : Patient;
      const user  = await Model.findById(id);
      if (!user) return res.notFound('User not found');

      const result = generateOTP(phoneOtpKey(id));
      if (result.cooldown) return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(result.waitMs / 1000)}s before resending.` });

      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const tpl = otpEmailTemplate(user.name, result.otp, 'phone_verification', 10);
      await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html });
      await sendSMS({ to: formattedPhone, message: `Your UniCare phone verification OTP is ${result.otp}. Valid for 10 minutes. Do not share this.` });

      res.ok({ sentTo: { email: user.email, phone: formattedPhone.replace(/(\+\d{2})(\d{2})\d{6}(\d{2})/, '$1$2xxxxxx$3') } }, 'OTP sent to your email and phone number');
    } catch (error) { res.serverError('Failed to send phone OTP', [error.message]); }
  }
);

// ── Verify Phone OTP ──────────────────────────────────────────
router.post('/otp/verify-phone',
  authenticate,
  [body('otp').isLength({ min: 6, max: 6 }), body('phone').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { id, type } = req.auth;
      const { otp, phone } = req.body;
      const result = verifyOTP(phoneOtpKey(id), otp);
      if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

      const Model   = type === 'doctor' ? Doctor : Patient;
      const updated = await Model.findByIdAndUpdate(id, { phone: phone.trim(), phoneVerified: true }, { new: true }).select('-password -googleId');
      res.ok({ phone: updated.phone, phoneVerified: true }, 'Phone number verified successfully');
    } catch (error) { res.serverError('Phone OTP verification failed', [error.message]); }
  }
);

// ── Google OAuth ──────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  const userType = req.query.type || 'patient';
  passport.authenticate('google', { scope: ['profile', 'email'], state: userType, prompt: 'select_account' })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const { user, type } = req.user;
      if (!user.isActive) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent('Your account has been deactivated. Please contact support.')}`);
      }
      if (type === 'doctor' && !user.isVerified) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent('Your doctor account is pending verification by admin.')}`);
      }
      const token = signToken(user._id, type);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/success?token=${token}&type=${type}&user=${encodeURIComponent(JSON.stringify({ id: user._id, name: user.name, email: user.email, profileImage: user.profileImage }))}`;
      res.redirect(redirectUrl);
    } catch (e) { res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(e.message)}`); }
  }
);

router.get('/failure', (req, res) => res.badRequest('Google authentication Failed'));

// ── Guest Login ───────────────────────────────────────────────
router.post('/guest/login', async (req, res) => {
  try {
    const guestId = crypto.randomBytes(8).toString('hex');
    const guest   = await Patient.create({ name: 'Guest User', email: `guest_${guestId}@unicare.guest`, isGuest: true, guestAppointmentCount: 0, isVerified: false, isActive: true });
    const token = signToken(guest._id, 'patient');
    res.created({ token, user: { id: guest._id, type: 'patient', isGuest: true, name: 'Guest User' } }, 'Guest session started');
  } catch (error) { res.serverError('Failed to start guest session', [error.message]); }
});

// ── Forgot Password ───────────────────────────────────────────
// In-memory store for reset tokens (10 min TTL)
const resetTokens = new Map();
setInterval(() => { const now = Date.now(); for (const [k,v] of resetTokens.entries()) { if (now > v.expiresAt) resetTokens.delete(k); } }, 15 * 60 * 1000);

// Step 1: Send OTP to email (and phone if registered)
// POST /auth/forgot-password/send-otp  { email }
router.post('/forgot-password/send-otp',
  [body('email').isEmail()],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Look up in both models
      const user = await Doctor.findOne({ email }) || await Patient.findOne({ email });
      if (!user) {
        // Don't reveal if email exists — always return success
        return res.ok({ sentTo: { email, phone: null } }, 'If this email is registered, an OTP has been sent.');
      }

      const key    = `reset:${email}`;
      const result = generateOTP(key);
      if (result.cooldown) {
        return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(result.waitMs / 1000)}s before resending.` });
      }

      await dispatchOTP({ otp: result.otp, email: user.email, phone: user.phone || null, name: user.name, purpose: 'reset' });

      res.ok({
        sentTo: {
          email: user.email,
          phone: user.phone ? user.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2') : null,
        },
      }, 'OTP sent to your registered email' + (user.phone ? ' and phone' : ''));
    } catch (error) { res.serverError('Failed to send OTP', [error.message]); }
  }
);

// Step 2: Verify OTP — returns a short-lived resetToken
// POST /auth/forgot-password/verify-otp  { email, otp }
router.post('/forgot-password/verify-otp',
  [body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 })],
  validate,
  async (req, res) => {
    try {
      const { email, otp } = req.body;
      const key    = `reset:${email}`;
      const result = verifyOTP(key, otp);
      if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

      // Issue a short-lived reset token (5 min)
      const resetToken = jwt.sign({ email, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '5m' });
      resetTokens.set(resetToken, { email, expiresAt: Date.now() + 5 * 60 * 1000 });

      res.ok({ resetToken }, 'OTP verified. You can now reset your password.');
    } catch (error) { res.serverError('OTP verification failed', [error.message]); }
  }
);

// Step 3: Reset password using resetToken
// POST /auth/forgot-password/reset  { resetToken, newPassword }
router.post('/forgot-password/reset',
  [body('resetToken').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;

      const record = resetTokens.get(resetToken);
      if (!record || Date.now() > record.expiresAt) {
        return res.status(400).json({ success: false, message: 'Reset session expired. Please start again.' });
      }

      let decoded;
      try { decoded = jwt.verify(resetToken, process.env.JWT_SECRET); }
      catch { return res.status(400).json({ success: false, message: 'Invalid reset token.' }); }

      if (decoded.purpose !== 'password_reset') return res.status(400).json({ success: false, message: 'Invalid reset token.' });

      const { email } = decoded;
      const hashed    = await bcrypt.hash(newPassword, 12);

      // Update whichever model has this email
      const docUpdate     = await Doctor.findOneAndUpdate({ email }, { password: hashed });
      const patientUpdate = !docUpdate ? await Patient.findOneAndUpdate({ email }, { password: hashed }) : null;

      if (!docUpdate && !patientUpdate) return res.notFound('Account not found.');

      resetTokens.delete(resetToken); // one-time use

      res.ok({}, 'Password reset successfully. You can now sign in with your new password.');
    } catch (error) { res.serverError('Password reset failed', [error.message]); }
  }
);

module.exports = router;