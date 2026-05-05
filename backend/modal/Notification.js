const mongoose = require('mongoose');

/**
 * Notification model
 * recipientId  — Doctor._id or Patient._id
 * recipientType — 'doctor' | 'patient'
 * type          — category for icon/color on frontend
 * title         — short heading
 * message       — full text
 * isRead        — false until user opens notification panel
 * link          — optional frontend route to navigate to on click
 */
const notificationSchema = new mongoose.Schema(
  {
    recipientId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientType: { type: String, enum: ['doctor', 'patient'], required: true },
    type: {
      type: String,
      enum: [
        'verification_approved',  // doctor verified by admin
        'verification_rejected',  // doctor unverified by admin
        'account_activated',      // account re-activated
        'account_deactivated',    // account deactivated
        'appointment_booked',     // new appointment booked
        'appointment_cancelled',  // appointment cancelled
        'appointment_completed',  // consultation ended
        'prescription_ready',     // prescription added
        'payment_received',       // payment confirmed
        'general',                // misc
      ],
      default: 'general',
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
    link:    { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for fast unread-count queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);