const express = require("express");
const router  = express.Router();

const {
  createRecoverySession,
  getRecoverySession,
  sendOtpForPersistence,
  verifyOtpAndPersist,
  getSnapshotDownload,
} = require("../controllers/recoveryController");

// POST /api/recovery/create
// Called by HelpLink backend after aftercare data is sent
// Verified by x-api-key header (same AFTERCARE_SECRET)
router.post("/recovery/create", createRecoverySession);

// GET /api/recovery/:token
// Snapshot page fetches session data by token
router.get("/recovery/:token", getRecoverySession);

// POST /api/recovery/:token/send-otp
// User requests OTP to persist their session
router.post("/recovery/:token/send-otp", sendOtpForPersistence);

// POST /api/recovery/:token/verify-otp
// User submits OTP to save session permanently
router.post("/recovery/:token/verify-otp", verifyOtpAndPersist);

// GET /api/recovery/:token/snapshot
// Download privacy-filtered case snapshot
router.get("/recovery/:token/snapshot", getSnapshotDownload);

module.exports = router;