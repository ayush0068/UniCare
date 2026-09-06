const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ── NEW (additive) — used only by the mobile app's assistant to show
// "book with these doctors" cards. Optional/unused by the website, which
// simply won't read these fields, so nothing existing breaks.
const recommendedDoctorSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  name: String,
  specialization: String,
  fees: Number,
}, { _id: false });

const aiReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType',
  },
  userType: {
    type: String,
    enum: ['Patient', 'Doctor'],
    required: true,
  },
  conversation: [messageSchema],
  report: {
    patientName: String,
    age: String,
    gender: String,
    symptoms: [String],
    possibleDiagnosis: [String],
    severityLevel: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe', ''],
      default: '',
    },
    recommendedAction: String,
    additionalNotes: String,
    generatedAt: Date,
    // ── NEW (additive) fields — populated only via the mobile assistant ──
    recommendedSpecialization: { type: String, default: '' },
    recommendedDoctors: { type: [recommendedDoctorSchema], default: [] },
  },
  isReportGenerated: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AIReport', aiReportSchema);