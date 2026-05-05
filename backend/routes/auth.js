const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const Doctor = require('../modal/Doctor')
const Patient = require('../modal/Patient')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const router = express.Router();

const signToken = (id, type) =>
    jwt.sign({ id, type }, process.env.JWT_SECRET, { expiresIn: '7d' });


// ── Doctor Register ────────────────────────────────────────────
router.post('/doctor/register',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
    ],
    validate,
    async (req, res) => {
        try {
            const exists = await Doctor.findOne({ email: req.body.email });
            if (exists) return res.badRequest("Doctor already exists");
            const hashed = await bcrypt.hash(req.body.password, 12);
            const doc = await Doctor.create({ ...req.body, password: hashed });
            const token = signToken(doc._id, 'doctor');
            res.created({ token, user: { id: doc._id, type: 'doctor' } }, 'Doctor registered')
        } catch (error) {
            res.serverError('Registration failed', [error.message])
        }
    }
)


// ── Doctor Login — blocks inactive + unverified with clear message ──
router.post('/doctor/login',
    [
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
    ],
    validate,
    async (req, res) => {
        try {
            const doc = await Doctor.findOne({ email: req.body.email });
            if (!doc || !doc.password) return res.unauthorized("Invalid credentials");

            const match = await bcrypt.compare(req.body.password, doc.password);
            if (!match) return res.unauthorized("Invalid credentials");

            // ── Block: account deactivated by admin ──
            if (!doc.isActive) {
                return res.unauthorized(
                    "Your account has been deactivated by the administrator. Please contact support for assistance."
                );
            }

            // ── Block: not yet verified by admin ──
            if (!doc.isVerified) {
                return res.unauthorized(
                    "Your account is pending verification. Please upload your documents on the profile page and wait for admin approval."
                );
            }

            const token = signToken(doc._id, 'doctor');
            res.created({ token, user: { id: doc._id, type: 'doctor' } }, 'Login successful')
        } catch (error) {
            res.serverError('Login failed', [error.message])
        }
    }
)


// ── Patient Register ───────────────────────────────────────────
router.post('/patient/register',
    [
        body('name').notEmpty(),
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
    ],
    validate,
    async (req, res) => {
        try {
            const exists = await Patient.findOne({ email: req.body.email });
            if (exists) return res.badRequest("Patient already exists");
            const hashed = await bcrypt.hash(req.body.password, 12);
            const patient = await Patient.create({ ...req.body, password: hashed });
            const token = signToken(patient._id, 'patient');
            res.created({ token, user: { id: patient._id, type: 'patient' } }, 'Patient registered')
        } catch (error) {
            res.serverError('Registration failed', [error.message])
        }
    }
)


// ── Patient Login — blocks inactive with clear message ──
router.post('/patient/login',
    [
        body('email').isEmail(),
        body('password').isLength({ min: 6 }),
    ],
    validate,
    async (req, res) => {
        try {
            const patient = await Patient.findOne({ email: req.body.email });
            if (!patient || !patient.password) return res.unauthorized("Invalid credentials");

            const match = await bcrypt.compare(req.body.password, patient.password);
            if (!match) return res.unauthorized("Invalid credentials");

            // ── Block: account deactivated by admin ──
            if (!patient.isActive) {
                return res.unauthorized(
                    "Your account has been deactivated by the administrator. Please contact support@unicare.com for assistance."
                );
            }

            const token = signToken(patient._id, 'patient');
            res.created({ token, user: { id: patient._id, type: 'patient' } }, 'Login successful')
        } catch (error) {
            res.serverError('Login failed', [error.message])
        }
    }
)


// ── Google OAuth ───────────────────────────────────────────────
router.get('/google', (req, res, next) => {
    const userType = req.query.type || 'patient';
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: userType,
        prompt: 'select_account'
    })(req, res, next)
})

router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: "/auth/failure"
    }),
    async (req, res) => {
        try {
            const { user, type } = req.user;

            // Block inactive users from Google OAuth too
            if (!user.isActive) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent('Your account has been deactivated. Please contact support.')}`);
            }

            // Block unverified doctors from Google OAuth
            if (type === 'doctor' && !user.isVerified) {
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent('Your doctor account is pending verification by admin.')}`);
            }

            const token = signToken(user._id, type);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/auth/success?token=${token}&type=${type}&user=${encodeURIComponent(JSON.stringify({
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            }))}`;
            res.redirect(redirectUrl)
        } catch (e) {
            res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(e.message)}`)
        }
    }
)

// Auth failure
router.get('/failure', (req, res) => res.badRequest('Google authentication Failed'))


// ── Guest Login ────────────────────────────────────────────────
router.post('/guest/login', async (req, res) => {
    try {
        const guestId = require('crypto').randomBytes(8).toString('hex');
        const guest = await Patient.create({
            name: 'Guest User',
            email: `guest_${guestId}@unicare.guest`,
            isGuest: true,
            guestAppointmentCount: 0,
            isVerified: false,
            isActive: true,
        });
        const token = signToken(guest._id, 'patient');
        res.created(
            { token, user: { id: guest._id, type: 'patient', isGuest: true, name: 'Guest User' } },
            'Guest session started'
        );
    } catch (error) {
        res.serverError('Failed to start guest session', [error.message]);
    }
});


module.exports = router;