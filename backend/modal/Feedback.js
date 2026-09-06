const mongoose = require('mongoose');

/**
 * Feedback model
 * Captures in-app "How are we doing?" feedback from patients — collected
 * early (post-launch) from the Home screen promo banner and the Help
 * Center "Rate your experience" section on the Flutter app.
 *
 * patientId    — ref Patient. Guests are Patient docs too (isGuest: true),
 *                so this always resolves via the `authenticate` middleware.
 * patientName  — snapshot of the name at submission time, so admin can
 *                still see who left it even if the account is later
 *                renamed or deleted.
 * rating       — 1-5 stars, required.
 * categories   — which aspects the feedback is about. Multi-select on the
 *                client (UI, Design, Idea/Feature, Performance, Other).
 * message      — free-text comments, optional (a star rating alone is a
 *                valid submission).
 * appVersion   — optional, from PackageInfo on the client, useful for
 *                triaging UI bugs against a specific release.
 * isFeatured   — admin can flag a great review to highlight elsewhere
 *                (e.g. a future testimonials section on the website).
 */
const feedbackSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientName: { type: String, required: true, trim: true },

    rating: { type: Number, required: true, min: 1, max: 5 },

    categories: {
      type: [String],
      enum: ['UI', 'Design', 'Idea', 'Performance', 'Other'],
      default: [],
    },

    message: { type: String, default: '', trim: true, maxlength: 1000 },

    appVersion: { type: String, default: '' },
    platform: { type: String, default: '' }, // e.g. 'android' | 'ios'

    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ rating: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
