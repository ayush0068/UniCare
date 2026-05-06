/**
 * routes/helplinkTransfer.js
 *
 * Mount at: /api/helplink
 * Route:    POST /api/helplink/transfer
 *
 * Protected by x-api-key (AFTERCARE_SECRET) — handled inside the controller,
 * same pattern as existing aftercare route.
 *
 * Add to server.js:
 *   const helplinkTransferRoutes = require('./routes/helplinkTransfer');
 *   app.use('/api/helplink', helplinkTransferRoutes);
 */

const express = require('express');
const router  = express.Router();

const { helplinkTransfer } = require('../controllers/helplinkTransferController');

// POST /api/helplink/transfer
router.post('/transfer', helplinkTransfer);

module.exports = router;