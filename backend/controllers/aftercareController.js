const AftercareCase = require("../modal/AftercareCase");

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Receive aftercare case from HelpLink  (IDEMPOTENT + CONSENT AWARE)
// @route  POST /api/aftercare
// @access Public (verified by x-api-key header)
// ─────────────────────────────────────────────────────────────────────────────
const receiveAftercare = async (req, res) => {
  try {
    // 🔐 Verify source
    if (req.headers["x-api-key"] !== process.env.AFTERCARE_SECRET) {
      return res.status(403).json({ success: false, message: "Unauthorized source" });
    }

    const data = req.body;

    // ── IDEMPOTENCY CHECK (unchanged) ─────────────────────────────────────
    if (data.requestId) {
      const existing = await AftercareCase.findOne({ requestId: data.requestId });
      if (existing) {
        return res.status(200).json({
          success:   true,
          message:   "Aftercare case already exists",
          caseId:    existing._id,
          requestId: existing.requestId,
          isGuest:   !existing.userId,
          guestId:   existing.guestId || null,
        });
      }
    }

    // ── SANITIZE userNote — strip any HTML tags ───────────────────────────
    // Prevents XSS if the note is ever rendered as HTML.
    const sanitizedNote = (data.userNote || "").replace(/<[^>]*>?/gm, "").slice(0, 300);

    // ── BUILD consent object — only save if provided ──────────────────────
    // If the frontend sends consent flags use them; otherwise leave as null
    // so existing records and old integrations are never broken.
    const consentData = data.consent
      ? {
          incident:  data.consent.incident  ?? true,
          location:  data.consent.location  ?? true,
          contact:   data.consent.contact   ?? true,
          anonymous: data.consent.anonymous ?? false,
        }
      : undefined; // not provided → Mongoose uses schema defaults (null)

    // ── FILTER fields based on consent ───────────────────────────────────
    // If the user opted out of sharing location, store null.
    // If anonymous, store null for name.
    const resolvedLocation = consentData?.location === false ? null : (data.location || null);
    const resolvedName     = consentData?.anonymous === true  ? "Anonymous" : (data.name || "Guest User");

    // ── CREATE NEW CASE ───────────────────────────────────────────────────
    const newCase = await AftercareCase.create({
      // existing fields
      name:         resolvedName,
      userId:       data.userId       ? String(data.userId) : null,
      incidentType: data.incidentType || "unknown",
      notes:        data.notes        || "",
      location:     resolvedLocation,
      time:         data.time         ? new Date(data.time) : new Date(),
      source:       data.source       || "helplink",
      // existing new fields
      requestId:    data.requestId    || null,
      guestId:      data.guestId      || null,
      // ✅ NEW — consent + userNote
      ...(consentData && { consent: consentData }),
      userNote:     sanitizedNote,
    });

    return res.status(201).json({
      success:   true,
      message:   "Aftercare case created",
      caseId:    newCase._id,
      requestId: newCase.requestId,
      isGuest:   !newCase.userId,
      guestId:   newCase.guestId || null,
    });

  } catch (err) {
    // Race-condition duplicate key safety net (unchanged)
    if (err.code === 11000 && err.keyPattern?.requestId) {
      const dupe = await AftercareCase.findOne({ requestId: req.body?.requestId });
      return res.status(200).json({
        success:   true,
        message:   "Aftercare case already exists (concurrent request)",
        caseId:    dupe?._id,
        requestId: dupe?.requestId,
        isGuest:   dupe ? !dupe.userId : true,
        guestId:   dupe?.guestId || null,
      });
    }
    console.error("receiveAftercare error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL FUNCTIONS BELOW ARE COMPLETELY UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

const getAftercareCases = async (req, res) => {
  try {
    const cases = await AftercareCase.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: cases.length, cases });
  } catch (err) {
    console.error("getAftercareCases error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getAftercareCase = async (req, res) => {
  try {
    const found = await AftercareCase.findById(req.params.id);
    if (!found) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }
    return res.json({ success: true, case: found });
  } catch (err) {
    console.error("getAftercareCase error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getMyCases = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(400).json({ success: false, message: "x-user-id header is required" });
    }
    const cases = await AftercareCase.find({ userId: String(userId) }).sort({ createdAt: -1 });
    return res.json({ success: true, count: cases.length, cases });
  } catch (err) {
    console.error("getMyCases error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getCaseByRequestId = async (req, res) => {
  try {
    const { requestId } = req.params;
    const found = await AftercareCase.findOne({ requestId });
    if (!found) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }
    if (found.guestId) {
      const providedGuestId = req.query.guestId;
      if (!providedGuestId || providedGuestId !== found.guestId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    } else if (found.userId) {
      const providedUserId = req.headers["x-user-id"];
      if (!providedUserId || String(providedUserId) !== String(found.userId)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }
    return res.json({ success: true, case: found });
  } catch (err) {
    console.error("getCaseByRequestId error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  receiveAftercare,
  getAftercareCases,
  getAftercareCase,
  getMyCases,
  getCaseByRequestId,
};