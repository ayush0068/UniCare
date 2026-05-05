/**
 * modal/Doctor.js
 * Added: verificationDocuments field for doctor credential uploads
 */
const mongoose = require('mongoose');
const { generateUniCareId } = require('../utils/generateId');

const healthcareCategoriesList = [
  'Primary Care',
  'Manage Your Condition',
  'Mental & Behavioral Health',
  'Sexual Health',
  "Children's Health",
  'Senior Health',
  "Women's Health",
  "Men's Health",
  'Wellness',
];

const dailyTimeRangeSchema = new mongoose.Schema({
  start: { type: String },
  end:   { type: String },
}, { _id: false });

const availabilityRangeSchema = new mongoose.Schema({
  startDate:        { type: String },
  endDate:          { type: String },
  excludedWeekdays: { type: [Number], default: [] },
}, { _id: false });

// ── Verification document sub-schema ──────────────────────────
const verificationDocumentSchema = new mongoose.Schema({
  type:       { type: String },   // e.g. "Medical Degree", "Registration Certificate"
  url:        { type: String },   // Cloudinary / storage URL
  publicId:   { type: String },   // Cloudinary public_id for deletion
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const doctorSchema = new mongoose.Schema({
  // ── UniCare Doctor ID ─────────────────────────────────────────
  ucId: {
    type:   String,
    unique: true,
    sparse: true,
    index:  true,
  },

  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String },
  googleId:     { type: String, unique: true, sparse: true },
  profileImage: { type: String, default: '' },

  specialization: {
    type: String,
    enum: [
      'Cardiologist', 'Dermatologist', 'Orthopedic', 'Pediatrician',
      'Neurologist', 'Gynecologist', 'General Physician', 'ENT Specialist',
      'Psychiatrist', 'Ophthalmologist',
    ],
  },
  category:      { type: [String], enum: healthcareCategoriesList, required: false },
  qualification: { type: String, required: false },
  experience:    { type: Number },
  about:         { type: String },
  fees:          { type: Number },

  hospitalInfo: {
    name:    String,
    address: String,
    city:    String,
  },

  availabilityRange:    availabilityRangeSchema,
  dailyTimeRanges:      { type: [dailyTimeRangeSchema], default: [] },
  slotDurationMinutes:  { type: Number, default: 30 },

  // ── Verification documents (uploaded by doctor) ───────────────
  verificationDocuments: { type: [verificationDocumentSchema], default: [] },

  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });


// ── Pre-save: generate ucId on first insert ───────────────
doctorSchema.pre('save', async function () {
  if (this.isNew && !this.ucId) {
    this.ucId = await generateUniCareId('doctor');
  }
});

module.exports = mongoose.model('Doctor', doctorSchema);