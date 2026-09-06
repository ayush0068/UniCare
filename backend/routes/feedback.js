/**
 * UniCare Feedback Routes
 * Mount at: /api/feedback
 *
 * Patient/guest-facing endpoints only. Admin viewing of all submitted
 * feedback lives in routes/admin.js under /api/admin/feedback (its own
 * "Feedback & Reviews" tab, gated by the `feedbackManagement` permission).
 *
 * Endpoints:
 *   POST /            — submit a new rating/review
 *   GET  /mine         — this patient's own submitted feedback history
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const Feedback = require('../modal/Feedback');

const router = express.Router();

/**
 * POST /api/feedback
 * Body: { rating: 1-5, categories?: string[], message?: string,
 *         appVersion?: string, platform?: string }
 */
router.post(
  '/',
  authenticate,
  requireRole('patient'),
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('categories').optional().isArray().withMessage('categories must be an array'),
    body('categories.*').optional().isIn(['UI', 'Design', 'Idea', 'Performance', 'Other']),
    body('message').optional().isString().isLength({ max: 1000 }),
    body('appVersion').optional().isString().isLength({ max: 40 }),
    body('platform').optional().isString().isLength({ max: 20 }),
    // Optional display-name override — lets a guest type a name for the
    // review instead of showing "Guest User". Falls back to the account
    // name; never used to change the actual account/profile name.
    body('patientName').optional().isString().isLength({ max: 80 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { rating, categories = [], message = '', appVersion = '', platform = '', patientName } = req.body;

      const feedback = await Feedback.create({
        patientId: req.user._id,
        patientName: (patientName && patientName.trim()) || req.user.name || 'Patient',
        rating,
        categories,
        message,
        appVersion,
        platform,
      });

      res.created(feedback, 'Thanks for your feedback!');
    } catch (err) {
      res.serverError('Failed to submit feedback', [err.message]);
    }
  }
);

/**
 * GET /api/feedback/mine
 * This patient's own past submissions, most recent first.
 */
router.get('/mine', authenticate, requireRole('patient'), async (req, res) => {
  try {
    const items = await Feedback.find({ patientId: req.user._id }).sort({ createdAt: -1 });
    res.ok(items, 'Feedback fetched');
  } catch (err) {
    res.serverError('Failed to fetch feedback', [err.message]);
  }
});

module.exports = router;
