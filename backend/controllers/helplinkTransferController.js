/**
 * controllers/helplinkTransferController.js  — UPDATED
 *
 * CHANGES vs previous version:
 *   1. Default password is now "123456" (instead of a random 8-char string)
 *      for BOTH registered and guest accounts created via HelpLink transfer.
 *      Password is shown to the user once in the UI via the `credentials` field.
 *   2. Returns `credentials: { email, password }` for BOTH new_registered AND
 *      guest account types (so the frontend can show the Consult Now modal with
 *      credentials for both flows).
 *   3. Stores full incident data (severity, summary, helperNotes) on the
 *      AftercareCase and also links it back by patientId after account creation.
 *   4. Returns the aftercareCase data in the response so the frontend can
 *      display a summary report inline before the user proceeds to the dashboard.
 *
 * SECURITY NOTE:
 *   "123456" is intentionally weak — it is shown to the user ONCE and they
 *   are expected to change it from their profile. The account is also marked
 *   isVerified:true (trusted source = HelpLink) so no email verification loop.
 */

const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const Patient       = require('../modal/Patient');
const AftercareCase = require('../modal/AftercareCase');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id, type: 'patient' }, process.env.JWT_SECRET, { expiresIn: '7d' });

/** Default password for all HelpLink-transferred accounts */
const DEFAULT_PASSWORD = '123456';

/**
 * Generate a unique guest email: guest_NNNNN@guest.unicare.app
 * Retries up to 5 times on collision.
 */
const generateGuestEmail = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const num   = Math.floor(10000 + Math.random() * 89999);
    const email = `guest_${num}@guest.unicare.app`;
    const exists = await Patient.findOne({ email }).lean();
    if (!exists) return email;
  }
  return `guest_${Date.now()}@guest.unicare.app`;
};

/**
 * Attach recovery data from HelpLink to an AftercareCase record, linking
 * the newly obtained UniCare patientId. Also enriches the case with full
 * incident data (severity, summary, helperNotes) if not already set.
 * Non-blocking — failure won't break the login flow.
 */
const linkAndEnrichAftercareCase = async (requestId, patientId, extraData = {}) => {
  if (!requestId || !patientId) return null;
  try {
    const update = {
      $set: {
        userId: String(patientId),
        ...(extraData.severity    && { severity:    extraData.severity }),
        ...(extraData.summary     && { summary:     extraData.summary }),
        ...(extraData.helperNotes && { helperNotes: extraData.helperNotes }),
      },
    };
    const doc = await AftercareCase.findOneAndUpdate(
      { requestId },
      update,
      { new: true }
    );
    return doc;
  } catch (err) {
    console.error('[helplinkTransfer] linkAndEnrichAftercareCase error:', err.message);
    return null;
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
 *   email:        string | null,   // null → guest account
 *   name:         string,
 *   requestId:    string,
 *   incidentType: string,
 *   helperNotes:  string,
 *   severity:     string,
 *   summary:      string,
 *   timestamp:    ISO string,
 *   recoveryStatus: string,
 *   location:     object | null,
 * }
 *
 * Response always includes:
 * {
 *   success:     true,
 *   accountType: 'existing' | 'new_registered' | 'guest',
 *   token:       string,
 *   patientId:   string,
 *   name:        string,
 *   isGuest:     boolean,
 *   credentials: { email, password },  // present for new_registered AND guest
 *   aftercareCase: { ... } | null,     // the linked/created AftercareCase doc
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
      name           = 'Patient',
      requestId,
      incidentType   = 'unknown',
      helperNotes    = '',
      severity       = 'unknown',
      summary        = '',
      timestamp,
      recoveryStatus = 'pending',
      location       = null,
    } = req.body;

    const hasEmail = email && typeof email === 'string' && email.includes('@');

    // Shared extra data for case enrichment
    const extraData = { severity, summary, helperNotes };

    // Pre-hash the default password (same for all HelpLink transfers)
    const hashedDefault = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // ── CASE 1: Registered HelpLink user (real email present) ────────────────
    if (hasEmail) {
      const normalizedEmail = email.toLowerCase().trim();

      let patient = await Patient.findOne({ email: normalizedEmail });

      if (patient) {
        // ── Account EXISTS → log them in, link recovery data ─────────────
        const token         = signToken(patient._id);
        const aftercareCase = await linkAndEnrichAftercareCase(requestId, patient._id, extraData);

        return res.status(200).json({
          success:      true,
          accountType:  'existing',
          token,
          patientId:    patient._id,
          name:         patient.name,
          isGuest:      false,
          // Existing account: show default password so they know what was set
          // (they may have changed it already → just remind them)
          credentials:  null, // existing account — don't expose any password
          aftercareCase: aftercareCase || null,
        });

      } else {
        // ── Account DOES NOT EXIST → create with default password ────────
        patient = await Patient.create({
          name:          name || normalizedEmail.split('@')[0],
          email:         normalizedEmail,
          password:      hashedDefault,
          isVerified:    true,
          accountSource: 'transferred_from_helplink',
        });

        const token         = signToken(patient._id);
        const aftercareCase = await linkAndEnrichAftercareCase(requestId, patient._id, extraData);

        return res.status(201).json({
          success:      true,
          accountType:  'new_registered',
          token,
          patientId:    patient._id,
          name:         patient.name,
          isGuest:      false,
          // NEW: send credentials so UI shows "Consult Now" modal with creds
          credentials: {
            email:    normalizedEmail,
            password: DEFAULT_PASSWORD,
          },
          aftercareCase: aftercareCase || null,
        });
      }
    }

    // ── CASE 2: Guest HelpLink user (no email) ───────────────────────────────
    const guestEmail = await generateGuestEmail();

    const guest = await Patient.create({
      name:          name || 'Guest Recovery Account',
      email:         guestEmail,
      password:      hashedDefault,
      isVerified:    true,
      accountSource: 'guest_helplink_transfer',
    });

    const token         = signToken(guest._id);
    const aftercareCase = await linkAndEnrichAftercareCase(requestId, guest._id, extraData);

    return res.status(201).json({
      success:      true,
      accountType:  'guest',
      token,
      patientId:    guest._id,
      name:         guest.name,
      isGuest:      true,
      credentials: {
        email:    guestEmail,
        password: DEFAULT_PASSWORD,
      },
      aftercareCase: aftercareCase || null,
    });

  } catch (err) {
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