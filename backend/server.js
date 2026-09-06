require('dotenv').config();
require('./modal/Parchi');

const http       = require('http');
const express    = require('express');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const morgan     = require('morgan');
const cors       = require('cors');
const bodyParser = require('body-parser');

const response    = require('./middleware/response');
require('./config/passport');
const passportLib = require('passport');

const { startReminderScheduler } = require('./utils/reminderScheduler');
const aiAssistantRoutes          = require('./routes/aiAssistant');
const mobileAiAssistantRoutes    = require('./routes/mobileAiAssistant'); // NEW — Flutter app only, additive

// ── Call signaling — Flutter app's in-built WebRTC calling (new) ────────────
// The website is unaffected: it keeps using ZegoCloud exactly as before.
// This only powers the mobile app's doctor/patient calling.
const { initCallSignaling } = require('./sockets/callSignaling');

// ── Aftercare Bridge — HelpLink → UniCare (existing) ─────────────────────────
const aftercareRoutes = require('./routes/aftercare');

// ── Temporary Recovery Session — new identity layer ──────────────────────────
const recoveryRoutes  = require('./routes/recovery');

const app  = express();
const PORT = process.env.PORT || 8000;

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean) || '*',
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(response);
app.use(passportLib.initialize());

// ── DB readiness guard ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is not ready. Please try again shortly.',
    });
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.ok({
  time:     new Date().toISOString(),
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}, 'OK'));

// ── Existing routes (completely unchanged) ────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/doctor',       require('./routes/doctor'));
app.use('/api/patient',      require('./routes/patient'));
app.use('/api/appointment',  require('./routes/appointment'));
app.use('/api/payment',      require('./routes/payment'));
app.use('/api/ai',           aiAssistantRoutes);
app.use('/api/mobile-ai',    mobileAiAssistantRoutes); // NEW — Flutter app's AI Assistant (OpenRouter-backed)
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/notification', require('./routes/notification'));
app.use('/api/feedback',     require('./routes/feedback')); // NEW — in-app patient ratings/reviews (Flutter app)

// ── Aftercare Bridge (existing — HelpLink → UniCare case storage) ─────────────
app.use('/api', aftercareRoutes);

// ── Temporary Recovery Session (new — identity layer on top of aftercare) ─────
app.use('/api', recoveryRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack:   err.stack,
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
    startReminderScheduler();

    // Wrap Express in a plain http.Server so Socket.IO (used only by the
    // Flutter app for call signaling) can share the same port. This has
    // no effect on any existing route, the website, or ZegoCloud — it's
    // required purely so both HTTP and WebSocket traffic can be served
    // from the same listener.
    const server = http.createServer(app);
    initCallSignaling(server);

    server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();