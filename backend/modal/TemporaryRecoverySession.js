const mongoose = require("mongoose");

/**
 * TemporaryRecoverySession
 *
 * A secure, time-limited identity layer for HelpLink users arriving on UniCare+.
 * Does NOT require a UniCare account.
 * Can be optionally converted to a persistent identity via OTP.
 *
 * Exists independently of AftercareCase — it REFERENCES a case but is separate.
 * Existing AftercareCase documents and routes are completely unaffected.
 */
const recoverySessionSchema = new mongoose.Schema({

  // ── Identity ──────────────────────────────────────────────────────────────
  // Secure random token used as the URL identifier
  sessionToken: {
    type:     String,
    required: true,
    unique:   true,
    index:    true,
  },

  // Source is always "helplink" for now, extensible later
  source: {
    type:    String,
    default: "helplink",
  },

  // ── HelpLink references (optional — both guests and users supported) ──────
  linkedHelpLinkUserId: { type: String, default: null }, // null for guests
  linkedGuestId:        { type: String, default: null }, // null for registered users
  aftercareCaseId:      { type: String, default: null }, // AftercareCase._id reference

  // Snapshot of the incident data (privacy-filtered — no helper identities)
  incidentSnapshot: {
    incidentType: { type: String, default: "unknown" },
    severity:     { type: String, default: "medium"  },
    timestamp:    { type: Date,   default: null       },
    userNotes:    { type: String, default: ""         },
    location:     { type: Object, default: null       }, // null if user declined
  },

  // ── Session state ─────────────────────────────────────────────────────────
  isGuest: { type: Boolean, default: true },

  // Status lifecycle: active → saved → expired
  status: {
    type:    String,
    enum:    ["active", "saved", "expired"],
    default: "active",
  },

  // Expiry — default 72 hours, configurable via env
  expiresAt: {
    type:    Date,
    default: () => new Date(Date.now() + (parseInt(process.env.RECOVERY_SESSION_TTL_HOURS || "72")) * 60 * 60 * 1000),
    index:   true,
  },

  // ── Persistence (after Save Recovery Session action) ─────────────────────
  // When user verifies via OTP/email, we store their contact here
  persistedPhone: { type: String, default: null },
  persistedEmail: { type: String, default: null },
  otpHash:        { type: String, default: null }, // bcrypt hash of OTP
  otpExpiresAt:   { type: Date,   default: null },

  // ── Linked UniCare account (optional — created much later) ───────────────
  linkedUnicarePatientId: { type: String, default: null },

  // ── Consultation records (privacy-safe) ──────────────────────────────────
  consultations: [{
    doctorId:          String,
    doctorName:        String,
    consultedAt:       Date,
    notes:             String,
    prescriptions:     [String],
    followUpDate:      Date,
    // Consent level chosen at booking
    sharedContextLevel: {
      type: String,
      enum: ["summary_only", "notes_and_media", "none"],
      default: "summary_only",
    },
    // Doctor access expires after consultation
    doctorAccessExpiresAt: Date,
  }],

  // ── Audit log (minimal, privacy-safe) ────────────────────────────────────
  auditLog: [{
    action:    String, // e.g. "session_created", "otp_verified", "doctor_consulted"
    timestamp: { type: Date, default: Date.now },
    meta:      Object, // non-sensitive metadata only
  }],

}, { timestamps: true });

// Auto-expire index — MongoDB removes documents after expiresAt
recoverySessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("TemporaryRecoverySession", recoverySessionSchema);