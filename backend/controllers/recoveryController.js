const crypto  = require("crypto");
const bcrypt  = require("bcryptjs");
const TemporaryRecoverySession = require("../modal/TemporaryRecoverySession");
const AftercareCase            = require("../modal/AftercareCase");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — generate a cryptographically secure session token
// ─────────────────────────────────────────────────────────────────────────────
const generateToken = () => crypto.randomBytes(32).toString("hex");

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Create a temporary recovery session from an AftercareCase
// @route  POST /api/recovery/create
// @access Public — called by HelpLink redirect (verified by x-api-key)
// ─────────────────────────────────────────────────────────────────────────────
const createRecoverySession = async (req, res) => {
  try {
    // Verify source
    if (req.headers["x-api-key"] !== process.env.AFTERCARE_SECRET) {
      return res.status(403).json({ success: false, message: "Unauthorized source" });
    }

    const { aftercareCaseId, userId, guestId, isGuest } = req.body;

    // Load the AftercareCase to build the incident snapshot
    let incidentSnapshot = {};
    if (aftercareCaseId) {
      const ac = await AftercareCase.findById(aftercareCaseId);
      if (ac) {
        incidentSnapshot = {
          incidentType: ac.incidentType || "unknown",
          severity:     ac.consent?.incident !== false ? (ac.notes ? "reported" : "unknown") : "unknown",
          timestamp:    ac.time || ac.createdAt,
          // Only include notes/location if user consented
          userNotes:    ac.consent?.contact  !== false ? (ac.userNote || "") : "",
          location:     ac.consent?.location !== false ? (ac.location || null) : null,
        };
      }
    }

    const sessionToken = generateToken();

    const session = await TemporaryRecoverySession.create({
      sessionToken,
      source:               "helplink",
      linkedHelpLinkUserId: isGuest ? null : (userId || null),
      linkedGuestId:        isGuest ? (guestId || null) : null,
      aftercareCaseId:      aftercareCaseId || null,
      incidentSnapshot,
      isGuest:              !!isGuest,
      status:               "active",
      auditLog: [{ action: "session_created", meta: { source: "helplink" } }],
    });

    return res.status(201).json({
      success:      true,
      sessionToken: session.sessionToken,
      expiresAt:    session.expiresAt,
      isGuest:      session.isGuest,
    });

  } catch (err) {
    console.error("createRecoverySession error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get recovery session by token (for snapshot page)
// @route  GET /api/recovery/:token
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
const getRecoverySession = async (req, res) => {
  try {
    const session = await TemporaryRecoverySession.findOne({
      sessionToken: req.params.token,
      status:       { $in: ["active", "saved"] },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Recovery session not found or expired" });
    }

    if (new Date() > session.expiresAt && session.status === "active") {
      session.status = "expired";
      await session.save();
      return res.status(410).json({ success: false, message: "Recovery session has expired" });
    }

    // Return only safe fields — never expose otpHash, linkedUnicarePatientId internals
    return res.json({
      success: true,
      session: {
        sessionToken:     session.sessionToken,
        source:           session.source,
        isGuest:          session.isGuest,
        status:           session.status,
        expiresAt:        session.expiresAt,
        incidentSnapshot: session.incidentSnapshot,
        consultations:    session.consultations.map(c => ({
          doctorName:   c.doctorName,
          consultedAt:  c.consultedAt,
          notes:        c.notes,
          prescriptions: c.prescriptions,
          followUpDate: c.followUpDate,
        })),
        hasPersisted:     !!(session.persistedPhone || session.persistedEmail),
        createdAt:        session.createdAt,
      },
    });

  } catch (err) {
    console.error("getRecoverySession error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Send OTP to persist recovery session (Save Recovery Session flow)
// @route  POST /api/recovery/:token/send-otp
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
const sendOtpForPersistence = async (req, res) => {
  try {
    const { contact, type } = req.body; // type: "phone" | "email"

    const session = await TemporaryRecoverySession.findOne({
      sessionToken: req.params.token,
      status:       { $in: ["active", "saved"] },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found or expired" });
    }

    // Generate 6-digit OTP
    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash   = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    session.otpHash       = otpHash;
    session.otpExpiresAt  = otpExpiry;

    if (type === "phone") session.persistedPhone = contact;
    if (type === "email") session.persistedEmail = contact;

    session.auditLog.push({ action: "otp_sent", meta: { type } });
    await session.save();

    // In production: send OTP via SMS/email service here
    // For now: log it (replace with your actual email/SMS service)
    console.log(`[Recovery OTP] Token: ${req.params.token} | OTP: ${otp} | Contact: ${contact}`);

    return res.json({
      success: true,
      message: `OTP sent to your ${type}. Valid for 10 minutes.`,
      // In dev only — remove in production:
      ...(process.env.NODE_ENV === "development" && { devOtp: otp }),
    });

  } catch (err) {
    console.error("sendOtpForPersistence error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Verify OTP and persist the recovery session
// @route  POST /api/recovery/:token/verify-otp
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
const verifyOtpAndPersist = async (req, res) => {
  try {
    const { otp } = req.body;

    const session = await TemporaryRecoverySession.findOne({
      sessionToken: req.params.token,
      status:       { $in: ["active", "saved"] },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found or expired" });
    }

    if (!session.otpHash || !session.otpExpiresAt) {
      return res.status(400).json({ success: false, message: "No OTP requested for this session" });
    }

    if (new Date() > session.otpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const valid = await bcrypt.compare(otp, session.otpHash);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Extend expiry to 30 days now that user has verified
    session.status    = "saved";
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    session.otpHash   = null; // clear OTP after use
    session.auditLog.push({ action: "otp_verified", meta: { status: "saved" } });
    await session.save();

    return res.json({
      success:      true,
      message:      "Recovery session saved. You can access it anytime with your phone/email + OTP.",
      sessionToken: session.sessionToken,
      expiresAt:    session.expiresAt,
    });

  } catch (err) {
    console.error("verifyOtpAndPersist error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get snapshot data for PDF download (privacy-filtered)
// @route  GET /api/recovery/:token/snapshot
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
const getSnapshotDownload = async (req, res) => {
  try {
    const session = await TemporaryRecoverySession.findOne({
      sessionToken: req.params.token,
      status:       { $in: ["active", "saved"] },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found or expired" });
    }

    // Return only privacy-safe snapshot fields
    // NEVER includes: helper identities, tracking history, moderation data
    const snapshot = {
      generatedAt:      new Date().toISOString(),
      source:           "HelpLink Emergency Aftercare",
      incident: {
        type:      session.incidentSnapshot.incidentType,
        severity:  session.incidentSnapshot.severity,
        timestamp: session.incidentSnapshot.timestamp,
        notes:     session.incidentSnapshot.userNotes,
      },
      consultations: session.consultations.map(c => ({
        doctor:        c.doctorName,
        date:          c.consultedAt,
        notes:         c.notes,
        prescriptions: c.prescriptions,
        followUp:      c.followUpDate,
      })),
      sessionStatus: session.status,
      disclaimer:    "This snapshot was generated from a temporary recovery session. It contains only information you chose to share.",
    };

    session.auditLog.push({ action: "snapshot_downloaded" });
    await session.save();

    return res.json({ success: true, snapshot });

  } catch (err) {
    console.error("getSnapshotDownload error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createRecoverySession,
  getRecoverySession,
  sendOtpForPersistence,
  verifyOtpAndPersist,
  getSnapshotDownload,
};