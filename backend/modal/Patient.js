/**
 * modal/Patient.js
 *
 * Added: ucId field         → auto-generated as "UC-PT-YY-NNNNN" on first save
 * Added: accountSource field → records how the account was originally created
 *        'self'                       — normal self-registration (default)
 *        'transferred_from_helplink'  — auto-created from registered HelpLink user
 *        'guest_helplink_transfer'    — temporary guest recovery account
 */
const mongoose = require('mongoose');
const { computeAgeFromDob } = require('../utils/date');
const { generateUniCareId }  = require('../utils/generateId');

const emergencyContactSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  phone:        { type: String, required: true },
  relationship: { type: String, required: true },
}, { _id: false });

const medicalHistorySchema = new mongoose.Schema({
  allergies:           { type: String, default: '' },
  currentMedications:  { type: String, default: '' },
  chronicConditions:   { type: String, default: '' },
}, { _id: false });

const patientSchema = new mongoose.Schema({
  // ── UniCare Patient ID ──────────────────────────────────
  ucId: {
    type:    String,
    unique:  true,
    sparse:  true,        // allows null during the brief pre-save window
    index:   true,
  },
  // ────────────────────────────────────────────────────────

  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String },
  googleId:     { type: String, unique: true, sparse: true },
  profileImage: { type: String, default: '' },

  phone:      { type: String },
  dob:        { type: Date },
  age:        { type: Number },
  gender:     { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },

  emergencyContact: emergencyContactSchema,
  medicalHistory:   medicalHistorySchema,

  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },

  // ── Account origin (used for conditional dashboard UI) ──────────────────
  // All existing accounts default to 'self' — no migration needed.
  accountSource: {
    type:    String,
    enum:    ['self', 'transferred_from_helplink', 'guest_helplink_transfer'],
    default: 'self',
  },
  // ────────────────────────────────────────────────────────────────────────

}, { timestamps: true });


// ── Pre-save: generate ucId on first insert ───────────────
patientSchema.pre('save', async function () {
  // Generate ID only once (new document)
  if (this.isNew && !this.ucId) {
    this.ucId = await generateUniCareId('patient');
  }

  // Recalculate age whenever dob changes
  if (this.dob && this.isModified('dob')) {
    this.age = computeAgeFromDob(this.dob);
  }
});

module.exports = mongoose.model('Patient', patientSchema);