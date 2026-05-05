const express = require("express");
const router  = express.Router();

const {
  receiveAftercare,
  getAftercareCases,
  getAftercareCase,
  getMyCases,          // ✅ NEW
  getCaseByRequestId,  // ✅ NEW
} = require("../controllers/aftercareController");

// ── EXISTING ROUTES (completely unchanged) ────────────────────────────────────

// POST /api/aftercare  — HelpLink pushes incident data here (now idempotent)
router.post("/aftercare", receiveAftercare);

// GET  /api/aftercare  — UniCare dashboard fetches all cases
router.get("/aftercare", getAftercareCases);

// ── NEW ROUTES ────────────────────────────────────────────────────────────────

// GET /api/aftercare/my
// Returns ONLY cases belonging to the logged-in HelpLink user.
// Caller must pass x-user-id header (the HelpLink user's MongoDB _id).
// Registered BEFORE /:id so Express matches "my" as a literal, not an id.
router.get("/aftercare/my", getMyCases);

// GET /api/aftercare/by-request/:requestId
// Returns a single case by HelpLink requestId string.
// Used by the guest flow — guest validates via ?guestId= query param.
// Registered with a distinct prefix so it never conflicts with /:id.
router.get("/aftercare/by-request/:requestId", getCaseByRequestId);

// GET  /api/aftercare/:id — fetch a single case by MongoDB _id (EXISTING, last)
// Must stay AFTER the named routes above to avoid "my" being treated as an id.
router.get("/aftercare/:id", getAftercareCase);

module.exports = router;