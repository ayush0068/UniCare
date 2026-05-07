const mongoose = require('mongoose');
const { generateUniCareId } = require('../utils/generateId');

const healthcareCategoriesList = [
  'Primary Care', 'Manage Your Condition', 'Mental & Behavioral Health',
  'Sexual Health', "Children's Health", 'Senior Health', "Women's Health",
  "Men's Health", 'Wellness',
];

const dailyTimeRangeSchema = new mongoose.Schema({ start: String, end: String }, { _id: false });

const availabilityRangeSchema = new mongoose.Schema({
  startDate: String, endDate: String, excludedWeekdays: { type: [Number], default: [] },
}, { _id: false });

const verificationDocumentSchema = new mongoose.Schema({
  type: String, url: String, publicId: String, uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

// ── Bank / Payout details ──────────────────────────────────────
const bankDetailsSchema = new mongoose.Schema({
  accountHolderName: { type: String, default: '' },
  accountNumber:     { type: String, default: '' },
  ifscCode:          { type: String, default: '' },
  bankName:          { type: String, default: '' },
  branchName:        { type: String, default: '' },
  accountType:       { type: String, enum: ['savings', 'current', ''], default: '' },
  upiId:             { type: String, default: '' },
  updatedAt:         { type: Date },
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  ucId:         { type: String, unique: true, sparse: true, index: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String },
  googleId:     { type: String, unique: true, sparse: true },
  profileImage: { type: String, default: '' },

  specialization: {
    type: String,
    enum: ['Cardiologist','Dermatologist','Orthopedic','Pediatrician','Neurologist',
           'Gynecologist','General Physician','ENT Specialist','Psychiatrist','Ophthalmologist'],
  },
  category:      { type: [String], enum: healthcareCategoriesList },
  qualification: { type: String },
  experience:    { type: Number },
  about:         { type: String },
  fees:          { type: Number },

  hospitalInfo:        { name: String, address: String, city: String },
  availabilityRange:   availabilityRangeSchema,
  dailyTimeRanges:     { type: [dailyTimeRangeSchema], default: [] },
  slotDurationMinutes: { type: Number, default: 30 },

  verificationDocuments: { type: [verificationDocumentSchema], default: [] },

  // ── Bank / payout details (filled by doctor, used by admin to pay) ──
  bankDetails: { type: bankDetailsSchema, default: () => ({}) },

  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

doctorSchema.pre('save', async function () {
  if (this.isNew && !this.ucId) this.ucId = await generateUniCareId('doctor');
});

module.exports = mongoose.model('Doctor', doctorSchema);