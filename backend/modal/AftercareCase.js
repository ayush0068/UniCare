const mongoose = require("mongoose");

const aftercareSchema = new mongoose.Schema({
  // ── EXISTING FIELDS (completely unchanged) ────────────────────────────────
  name:         { type: String, default: "Guest User" },
  userId:       { type: String, default: null },
  incidentType: String,
  notes:        String,
  location:     Object,
  time:         Date,
  source:       { type: String, default: "helplink" },
  status:       { type: String, default: "pending" },

  // ── EXISTING NEW FIELDS (requestId / guestId — unchanged) ─────────────────
  requestId: {
    type:    String,
    unique:  true,
    sparse:  true,
    default: null,
  },
  guestId: {
    type:    String,
    default: null,
  },

  // ── NEW — Consent flags ───────────────────────────────────────────────────
  // Stores exactly what the user agreed to share.
  // All fields default to null so existing records are unaffected.
  consent: {
    incident:  { type: Boolean, default: null },
    location:  { type: Boolean, default: null },
    contact:   { type: Boolean, default: null },
    anonymous: { type: Boolean, default: null },
  },

  // ── NEW — Optional user note ──────────────────────────────────────────────
  // Free-text note added by the user in the consent modal.
  // maxlength enforced at schema level + sanitized in controller.
  userNote: {
    type:      String,
    maxlength: 300,
    default:   "",
  },

}, { timestamps: true });

// ── Indexes (unchanged) ───────────────────────────────────────────────────────
aftercareSchema.index({ userId:    1 });
aftercareSchema.index({ guestId:   1 });
aftercareSchema.index({ requestId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("AftercareCase", aftercareSchema);