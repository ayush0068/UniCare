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

  // ── EXISTING — Consent flags ──────────────────────────────────────────────
  consent: {
    incident:  { type: Boolean, default: null },
    location:  { type: Boolean, default: null },
    contact:   { type: Boolean, default: null },
    anonymous: { type: Boolean, default: null },
  },

  // ── EXISTING — Optional user note ─────────────────────────────────────────
  userNote: {
    type:      String,
    maxlength: 300,
    default:   "",
  },

  // ── NEW — Richer incident data from HelpLink ──────────────────────────────
  // severity:    'high' | 'medium' | 'low' | 'unknown'
  // summary:     AI-generated or human-written summary of what happened
  // helperNotes: Notes left by the responder/helper on scene
  severity: {
    type:    String,
    default: "unknown",
  },
  summary: {
    type:      String,
    maxlength: 1000,
    default:   "",
  },
  helperNotes: {
    type:      String,
    maxlength: 1000,
    default:   "",
  },

}, { timestamps: true });

// ── Indexes (unchanged) ───────────────────────────────────────────────────────
aftercareSchema.index({ userId:    1 });
aftercareSchema.index({ guestId:   1 });
aftercareSchema.index({ requestId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("AftercareCase", aftercareSchema);