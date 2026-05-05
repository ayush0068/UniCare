const express = require('express');
const { authenticate } = require('../middleware/auth');
const Notification = require('../modal/Notification');

const router = express.Router();

// ── GET /notification — fetch notifications for logged-in user ──
// Returns latest 30, sorted newest first
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.auth.id,
      recipientType: req.auth.type,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: req.auth.id,
      recipientType: req.auth.type,
      isRead: false,
    });

    res.ok({ notifications, unreadCount }, 'Notifications fetched');
  } catch (err) {
    res.serverError('Failed to fetch notifications', [err.message]);
  }
});

// ── PUT /notification/mark-all-read ──
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.auth.id, recipientType: req.auth.type, isRead: false },
      { $set: { isRead: true } }
    );
    res.ok({}, 'All notifications marked as read');
  } catch (err) {
    res.serverError('Failed to mark notifications', [err.message]);
  }
});

// ── PUT /notification/:id/read ──
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.auth.id },
      { isRead: true }
    );
    res.ok({}, 'Notification marked as read');
  } catch (err) {
    res.serverError('Failed to mark notification', [err.message]);
  }
});

// ── DELETE /notification/:id ──
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.auth.id });
    res.ok({}, 'Notification deleted');
  } catch (err) {
    res.serverError('Failed to delete notification', [err.message]);
  }
});

// ── DELETE /notification/clear-all ──
router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    await Notification.deleteMany({
      recipientId: req.auth.id,
      recipientType: req.auth.type,
    });
    res.ok({}, 'All notifications cleared');
  } catch (err) {
    res.serverError('Failed to clear notifications', [err.message]);
  }
});

module.exports = router;