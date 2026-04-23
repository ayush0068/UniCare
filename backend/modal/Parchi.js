const mongoose = require('mongoose');

const parchiSchema = new mongoose.Schema({
  parchiNumber: {
    type: String,
    unique: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  firstVisitDate: {
    type: Date,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true, // firstVisitDate + 10 days
  },
  visitCount: {
    type: Number,
    default: 1, // starts at 1 (first paid visit)
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Auto generate parchi number before save
parchiSchema.pre('save', async function () {
  if (!this.parchiNumber) {
    const date = new Date(this.firstVisitDate);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
    this.parchiNumber = `PC-${dateStr}-${rand}`;
  }
});

module.exports = mongoose.model('Parchi', parchiSchema);