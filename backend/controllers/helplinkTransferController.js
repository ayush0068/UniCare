/**
 * controllers/helplinkTransferController.js
 *
 * Handles conditional onboarding when HelpLink transfers a user to UniCare+.
 *
 * Two cases:
 *   CASE 1 — Registered HelpLink user  → payload.email is a real email
 *   CASE 2 — Guest HelpLink user       → payload.email is null / missing
 *
 * POST /api/helplink/transfer
 *   Body: HelpLink transfer payload (see transferPayloadSchema in validation)
 *   Returns: { token, accountType, credentials? (guest only), patientId }
 *
 * Security:
 *   - Protected by x-api-key matching process.env.AFTERCARE_SECRET
 *   - Passwords are hashed with bcrypt (12 rounds)
 *   - Guest emails are unique-guaranteed via collision retry
 *   - No duplicate accounts for the same real email
 */

const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const crypto      = require('crypto');
const Patient     = require('../modal/Patient');
const AftercareCase = require('../modal/AftercareCase');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id, type: 'patient' }, process.env.JWT_SECRET, { expiresIn: '7d' });

/**
 * Generate a random 8-character uppercase alphanumeric password.
 * e.g. "X7KQ92LM"
 */
const generateTempPassword = () =>
  crypto.randomBytes(6).toString('base64').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8).padEnd(8, 'X');

/**
 * Generate a unique guest email in the format:
 *   guest_NNNNN@guest.unicare.app
 * Retries up to 5 times if there's a collision.
 */
const generateGuestEmail = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const num   = Math.floor(10000 + Math.random() * 89999);
    const email = `guest_${num}@guest.unicare.app`;
    const exists = await Patient.findOne({ email }).lean();
    if (!exists) return email;
  }
  // Fallback to timestamp-based email (extremely unlikely to collide)
  return `guest_${Date.now()}@guest.unicare.app`;
};

/**
 * Attach recovery data from HelpLink to an AftercareCase record, linking
 * the newly obtained UniCare patientId to any existing unlinked case.
 *
 * This is non-blocking — failure won't break the login flow.
 */
const linkAftercaseToPatient = async (requestId, patientId) => {
  if (!requestId || !patientId) return;
  try {
    await AftercareCase.updateMany(
      { requestId, userId: null },
      { $set: { userId: String(patientId) } }
    );
  } catch (err) {
    console.error('[helplinkTransfer] linkAftercaseToPatient error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Controller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/helplink/transfer
 *
 * Expected body:
 * {
 *   email:        string | null,   // null → guest
 *   name:         string,
 *   requestId:    string,          // HelpLink request ObjectId
 *   incidentType: string,
 *   helperNotes:  string,
 *   severity:     string,
 *   summary:      string,
 *   timestamp:    ISO string,
 *   recoveryStatus: string,
 *   location:     object | null,
 * }
 */
const helplinkTransfer = async (req, res) => {
  try {
    // ── 0. Verify x-api-key ──────────────────────────────────────────────────
    if (req.headers['x-api-key'] !== process.env.AFTERCARE_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized source' });
    }

    const {
      email,
      name         = 'Patient',
      requestId,
      incidentType = 'unknown',
      helperNotes  = '',
      severity     = '',
      summary      = '',
      timestamp,
      recoveryStatus = 'pending',
      location     = null,
    } = req.body;

    const hasEmail = email && typeof email === 'string' && email.includes('@');

    // ── CASE 1: Registered HelpLink user (real email present) ────────────────
    if (hasEmail) {
      const normalizedEmail = email.toLowerCase().trim();

      // 1a. Check if patient already exists in UniCare
      let patient = await Patient.findOne({ email: normalizedEmail });

      if (patient) {
        // ── Account EXISTS → log them in, append recovery data ──────────────
        const token = signToken(patient._id);
        await linkAftercaseToPatient(requestId, patient._id);

        return res.status(200).json({
          success:     true,
          accountType: 'existing',
          token,
          patientId:   patient._id,
          name:        patient.name,
          isGuest:     false,
        });

      } else {
        // ── Account DOES NOT EXIST → auto-create ────────────────────────────
        // Generate a secure random password internally (user can reset later)
        const tempPassword = generateTempPassword();
        const hashed       = await bcrypt.hash(tempPassword, 12);

        patient = await Patient.create({
          name:   name || normalizedEmail.split('@')[0],
          email:  normalizedEmail,
          password: hashed,
          isVerified: true,        // trusted — came via HelpLink registered flow
          // Mark origin so dashboard can show contextual UI
          // We store this via a new field added to the schema (see schema patch)
          accountSource: 'transferred_from_helplink',
        });

        const token = signToken(patient._id);
        await linkAftercaseToPatient(requestId, patient._id);

        return res.status(201).json({
          success:     true,
          accountType: 'new_registered',
          token,
          patientId:   patient._id,
          name:        patient.name,
          isGuest:     false,
        });
      }
    }

    // ── CASE 2: Guest HelpLink user (no email) ───────────────────────────────
    const guestEmail    = await generateGuestEmail();
    const tempPassword  = generateTempPassword();
    const hashed        = await bcrypt.hash(tempPassword, 12);

    const guest = await Patient.create({
      name:          name || 'Guest Recovery Account',
      email:         guestEmail,
      password:      hashed,
      isVerified:    true,
      accountSource: 'guest_helplink_transfer',
    });

    const token = signToken(guest._id);
    await linkAftercaseToPatient(requestId, guest._id);

    return res.status(201).json({
      success:     true,
      accountType: 'guest',
      token,
      patientId:   guest._id,
      name:        guest.name,
      isGuest:     true,
      credentials: {
        email:    guestEmail,
        password: tempPassword,   // plaintext shown ONCE to user in UI
      },
    });

  } catch (err) {
    // Handle duplicate email race condition
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
        code:    'EMAIL_CONFLICT',
      });
    }
    console.error('[helplinkTransfer] error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { helplinkTransfer };