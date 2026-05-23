const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  date: { type: Date, required: true },
  slotStartIso: { type: String, required: true },
  slotEndIso: { type: String, required: true },
  consultationType: {
    type: String,
    enum: ['Video Consultation', 'Voice Call'],
    default: 'Video Consultation'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled', 'In Progress'],
    default: 'Scheduled'
  },
  symptoms: { type: String, default: '' },
  zegoRoomId: { type: String, default: '' },
  prescription: { type: String, default: '' },
  reminder60Sent: { type: Boolean, default: false },
  reminder30Sent: { type: Boolean, default: false },
  notes: { type: String, default: '' },

  // ── Parchi (OPD slip) ──
  parchiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parchi',
    default: null,
  },
  visitNumber: {
    type: Number,
    default: 1,
  },

  // ── AI Pre-consultation Report ──
  aiReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIReport',
    default: null,
  },

  // Payment fields
  consultationFees: { type: Number, required: true },
  platformFees:     { type: Number, required: true },
  guestSurcharge:   { type: Number, default: 0 },   // ₹30 extra for guest users — kept by admin
  totalAmount:      { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'refunded'],
    default: 'Pending'
  },
  payoutStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Cancelled'],
    default: 'Pending'
  },
  payoutDate:           { type: Date },
  payoutTransactionRef: { type: String, default: '' }, // auto-generated UTR e.g. UCUTR25000001
  paymentMethod: { type: String, default: 'Online' },

  // RazorPay fields
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  paymentDate: { type: Date },

}, { timestamps: true });

appointmentSchema.index({ doctorId: 1, date: 1, slotStartIso: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);