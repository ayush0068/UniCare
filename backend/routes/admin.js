/**
 * UniCare Admin API Routes
 * Mount at: /api/admin
 *
 * Endpoints:
 *   Auth
 *     POST /auth/login
 *
 *   Dashboard
 *     GET  /dashboard/stats
 *
 *   Admin Management (super_admin only)
 *     GET  /admins
 *     POST /admins/create
 *     PUT  /admins/:id/permissions
 *     PUT  /admins/:id/toggle-active
 *     DELETE /admins/:id
 *
 *   User (Patient) Management
 *     GET  /users
 *     GET  /users/:id
 *     PUT  /users/:id/toggle-active
 *
 *   Doctor Management
 *     GET  /doctors
 *     GET  /doctors/:id
 *     PUT  /doctors/:id/verify
 *     PUT  /doctors/:id/toggle-active
 *
 *   Appointments
 *     GET  /appointments
 *     GET  /appointments/:id
 *
 *   Payments
 *     GET  /payments
 *     GET  /payments/stats
 */

const express = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Admin = require('../modal/Admin');
const Doctor = require('../modal/Doctor');
const Patient = require('../modal/Patient');
const Appointment = require('../modal/Appointment');
const Notification = require('../modal/Notification');

const { authenticateAdmin, requireSuperAdmin, requirePermission } = require('../middleware/adminAuth');

const router = express.Router();

// ─── Helper ────────────────────────────────────────────────────────────────

const signAdminToken = (id) =>
    jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/auth/login
 * Credentials loaded from .env:
 *   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASS  — auto-seeded on first login if Admin collection is empty
 */
router.post(
    '/auth/login',
    [
        body('email').isEmail().withMessage('Valid email required'),
        body('pass').notEmpty().withMessage('Password required'),
    ],
    validate,
    async (req, res) => {
        try {
            const { email, pass } = req.body;

            // ── Auto-seed super admin from .env on very first login ──────────
            const count = await Admin.countDocuments();
            if (count === 0) {
                const envEmail = process.env.SUPER_ADMIN_EMAIL;
                const envPass  = process.env.SUPER_ADMIN_PASS;
                if (!envEmail || !envPass) {
                    return res.serverError('No admins exist and SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASS env vars are missing.');
                }
                const hashed = await bcrypt.hash(envPass, 12);
                await Admin.create({
                    name: 'Super Admin',
                    email: envEmail,
                    pass: hashed,
                    role: 'super_admin',
                    permissions: {
                        userManagement: true,
                        doctorManagement: true,
                        paymentManagement: true,
                        analytics: true,
                    }
                });
            }
            // ─────────────────────────────────────────────────────────────────

            const admin = await Admin.findOne({ email });
            if (!admin) return res.unauthorized('Invalid credentials');
            if (!admin.isActive) return res.forbidden('Account is deactivated');

            const match = await bcrypt.compare(pass, admin.pass);
            if (!match) return res.unauthorized('Invalid credentials');

            admin.lastLogin = new Date();
            await admin.save();

            const token = signAdminToken(admin._id);

            res.ok(
                {
                    token,
                    admin: {
                        id: admin._id,
                        name: admin.name,
                        email: admin.email,
                        role: admin.role,
                        permissions: admin.permissions,
                    },
                },
                'Login successful'
            );
        } catch (err) {
            res.serverError('Login failed', [err.message]);
        }
    }
);

/**
 * GET /api/admin/auth/me
 */
router.get('/auth/me', authenticateAdmin, (req, res) => {
    res.ok({
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
        permissions: req.admin.permissions,
    }, 'Admin fetched');
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/dashboard/stats
 */
router.get(
    '/dashboard/stats',
    authenticateAdmin,
    requirePermission('analytics'),
    async (req, res) => {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const [
                totalUsers,
                activeUsers,
                totalDoctors,
                verifiedDoctors,
                activeDoctors,
                pendingVerification,
                totalAppointments,
                todayAppointments,
                monthlyAppointments,
                completedAppointments,
                cancelledAppointments,
                paidPayments,
                monthlyRevenue,
                recentAppointments,
                appointmentsByStatus,
                revenueByMonth,
                topDoctors,
            ] = await Promise.all([
                Patient.countDocuments(),
                Patient.countDocuments({ isActive: true }),
                Doctor.countDocuments(),
                Doctor.countDocuments({ isVerified: true }),
                Doctor.countDocuments({ isActive: true }),
                Doctor.countDocuments({ isVerified: false }),
                Appointment.countDocuments(),
                Appointment.countDocuments({ date: { $gte: startOfToday } }),
                Appointment.countDocuments({ date: { $gte: startOfMonth } }),
                Appointment.countDocuments({ status: 'Completed' }),
                Appointment.countDocuments({ status: 'Cancelled' }),
                Appointment.aggregate([
                    { $match: { paymentStatus: 'Paid' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
                ]),
                Appointment.aggregate([
                    { $match: { paymentStatus: 'Paid', paymentDate: { $gte: startOfMonth } } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
                ]),
                Appointment.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('doctorId', 'name specialization profileImage')
                    .populate('patientId', 'name email profileImage')
                    .lean(),
                Appointment.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
                // Last 6 months revenue
                Appointment.aggregate([
                    { $match: { paymentStatus: 'Paid' } },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$paymentDate' },
                                month: { $month: '$paymentDate' },
                            },
                            revenue: { $sum: '$totalAmount' },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                    { $limit: 6 },
                ]),
                // Top 5 doctors by appointments
                Appointment.aggregate([
                    { $group: { _id: '$doctorId', count: { $sum: 1 }, revenue: { $sum: '$consultationFees' } } },
                    { $sort: { count: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: 'doctors',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'doctor',
                        },
                    },
                    { $unwind: '$doctor' },
                    {
                        $project: {
                            name: '$doctor.name',
                            specialization: '$doctor.specialization',
                            profileImage: '$doctor.profileImage',
                            appointments: '$count',
                            revenue: 1,
                        },
                    },
                ]),
            ]);

            const totalRevenue = paidPayments[0]?.total || 0;
            const thisMonthRevenue = monthlyRevenue[0]?.total || 0;

            res.ok({
                overview: {
                    totalUsers,
                    activeUsers,
                    inactiveUsers: totalUsers - activeUsers,
                    totalDoctors,
                    verifiedDoctors,
                    activeDoctors,
                    pendingVerification,
                    totalAppointments,
                    todayAppointments,
                    monthlyAppointments,
                    completedAppointments,
                    cancelledAppointments,
                    totalRevenue,
                    thisMonthRevenue,
                },
                charts: {
                    appointmentsByStatus,
                    revenueByMonth,
                    topDoctors,
                },
                recentAppointments,
            }, 'Stats fetched');
        } catch (err) {
            console.error('Dashboard stats error:', err);
            res.serverError('Failed to fetch stats', [err.message]);
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN MANAGEMENT  (super_admin only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/admins
 */
router.get('/admins', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().select('-pass').sort({ createdAt: -1 });
        res.ok(admins, 'Admins fetched');
    } catch (err) {
        res.serverError('Failed to fetch admins', [err.message]);
    }
});

/**
 * POST /api/admin/admins/create
 */
router.post(
    '/admins/create',
    authenticateAdmin,
    requireSuperAdmin,
    [
        body('name').notEmpty().withMessage('Name required'),
        body('email').isEmail().withMessage('Valid email required'),
        body('pass').isLength({ min: 6 }).withMessage('Password min 6 chars'),
        body('role').optional().isIn(['admin', 'super_admin']),
        body('permissions').optional().isObject(),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, pass, role = 'admin', permissions } = req.body;

            const exists = await Admin.findOne({ email });
            if (exists) return res.badRequest('Admin with this email already exists');

            const hashed = await bcrypt.hash(pass, 12);

            const defaultPerms = {
                userManagement: false,
                doctorManagement: false,
                paymentManagement: false,
                analytics: false,
            };

            const admin = await Admin.create({
                name,
                email,
                pass: hashed,
                role,
                createdBy: req.admin._id,
                permissions: permissions ? { ...defaultPerms, ...permissions } : defaultPerms,
            });

            const { pass: _, ...adminData } = admin.toObject();
            res.created(adminData, 'Admin created');
        } catch (err) {
            res.serverError('Failed to create admin', [err.message]);
        }
    }
);

/**
 * PUT /api/admin/admins/:id/permissions
 */
router.put(
    '/admins/:id/permissions',
    authenticateAdmin,
    requireSuperAdmin,
    async (req, res) => {
        try {
            const { permissions } = req.body;
            if (!permissions || typeof permissions !== 'object') {
                return res.badRequest('permissions object required');
            }

            const admin = await Admin.findById(req.params.id).select('-pass');
            if (!admin) return res.notFound('Admin not found');

            admin.permissions = { ...admin.permissions.toObject(), ...permissions };
            await admin.save();
            res.ok(admin, 'Permissions updated');
        } catch (err) {
            res.serverError('Failed to update permissions', [err.message]);
        }
    }
);

/**
 * PUT /api/admin/admins/:id/toggle-active
 */
router.put('/admins/:id/toggle-active', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        if (req.params.id === req.admin._id.toString()) {
            return res.badRequest('Cannot deactivate your own account');
        }
        const admin = await Admin.findById(req.params.id).select('-pass');
        if (!admin) return res.notFound('Admin not found');
        admin.isActive = !admin.isActive;
        await admin.save();
        res.ok(admin, `Admin ${admin.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
        res.serverError('Failed to toggle admin status', [err.message]);
    }
});

/**
 * DELETE /api/admin/admins/:id
 */
router.delete('/admins/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        if (req.params.id === req.admin._id.toString()) {
            return res.badRequest('Cannot delete your own account');
        }
        await Admin.findByIdAndDelete(req.params.id);
        res.ok({}, 'Admin deleted');
    } catch (err) {
        res.serverError('Failed to delete admin', [err.message]);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER (PATIENT) MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 */
router.get(
    '/users',
    authenticateAdmin,
    requirePermission('userManagement'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString(),
        query('isActive').optional().isBoolean(),
    ],
    validate,
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, isActive } = req.query;
            const filter = {};

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { ucId: { $regex: search, $options: 'i' } },
                ];
            }
            if (isActive !== undefined) filter.isActive = isActive === 'true';

            const skip = (Number(page) - 1) * Number(limit);
            const [users, total] = await Promise.all([
                Patient.find(filter)
                    .select('-password -googleId')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Patient.countDocuments(filter),
            ]);

            res.ok(users, 'Users fetched', { page: Number(page), limit: Number(limit), total });
        } catch (err) {
            res.serverError('Failed to fetch users', [err.message]);
        }
    }
);

/**
 * GET /api/admin/users/:id
 */
router.get('/users/:id', authenticateAdmin, requirePermission('userManagement'), async (req, res) => {
    try {
        const user = await Patient.findById(req.params.id).select('-password -googleId');
        if (!user) return res.notFound('User not found');

        const appointments = await Appointment.find({ patientId: req.params.id })
            .populate('doctorId', 'name specialization fees profileImage')
            .sort({ date: -1 })
            .limit(10);

        res.ok({ user, appointments }, 'User fetched');
    } catch (err) {
        res.serverError('Failed to fetch user', [err.message]);
    }
});

/**
 * PUT /api/admin/users/:id/toggle-active
 */
router.put(
    '/users/:id/toggle-active',
    authenticateAdmin,
    requirePermission('userManagement'),
    async (req, res) => {
        try {
            const user = await Patient.findById(req.params.id).select('-password -googleId');
            if (!user) return res.notFound('User not found');
            user.isActive = !user.isActive;
            await user.save();
            res.ok(user, `User ${user.isActive ? 'activated' : 'deactivated'}`);

            setImmediate(async () => {
                try {
                    await Notification.create({
                        recipientId:   user._id,
                        recipientType: 'patient',
                        type:    user.isActive ? 'account_activated' : 'account_deactivated',
                        title:   user.isActive ? 'Account Activated' : 'Account Deactivated',
                        message: user.isActive
                            ? 'Your UniCare account has been reactivated. You can now book appointments.'
                            : 'Your UniCare account has been deactivated by an administrator. Please contact support@unicare.com for assistance.',
                        link: user.isActive ? '/patient/dashboard' : '',
                    });
                } catch (e) { console.error('Notification error:', e.message); }
            });
        } catch (err) {
            res.serverError('Failed to toggle user status', [err.message]);
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════════
// DOCTOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/doctors
 */
router.get(
    '/doctors',
    authenticateAdmin,
    requirePermission('doctorManagement'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString(),
        query('isVerified').optional().isBoolean(),
        query('isActive').optional().isBoolean(),
        query('specialization').optional().isString(),
    ],
    validate,
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, isVerified, isActive, specialization } = req.query;
            const filter = {};

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { ucId: { $regex: search, $options: 'i' } },
                    { 'hospitalInfo.city': { $regex: search, $options: 'i' } },
                ];
            }
            if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
            if (isActive !== undefined) filter.isActive = isActive === 'true';
            if (specialization) filter.specialization = specialization;

            const skip = (Number(page) - 1) * Number(limit);
            const [doctors, total] = await Promise.all([
                Doctor.find(filter)
                    .select('-password -googleId')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Doctor.countDocuments(filter),
            ]);

            res.ok(doctors, 'Doctors fetched', { page: Number(page), limit: Number(limit), total });
        } catch (err) {
            res.serverError('Failed to fetch doctors', [err.message]);
        }
    }
);

/**
 * GET /api/admin/doctors/:id
 */
router.get('/doctors/:id', authenticateAdmin, requirePermission('doctorManagement'), async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select('-password -googleId');
        if (!doctor) return res.notFound('Doctor not found');

        const [appointments, totalRevenue] = await Promise.all([
            Appointment.find({ doctorId: req.params.id })
                .populate('patientId', 'name email profileImage age')
                .sort({ date: -1 })
                .limit(10),
            Appointment.aggregate([
                { $match: { doctorId: doctor._id, paymentStatus: 'Paid' } },
                { $group: { _id: null, total: { $sum: '$consultationFees' } } },
            ]),
        ]);

        res.ok({ doctor, appointments, totalRevenue: totalRevenue[0]?.total || 0 }, 'Doctor fetched');
    } catch (err) {
        res.serverError('Failed to fetch doctor', [err.message]);
    }
});

/**
 * PUT /api/admin/doctors/:id/verify
 * Toggles isVerified. When verified=false, also forces isActive=false.
 */
router.put(
    '/doctors/:id/verify',
    authenticateAdmin,
    requirePermission('doctorManagement'),
    async (req, res) => {
        try {
            const doctor = await Doctor.findById(req.params.id).select('-password -googleId');
            if (!doctor) return res.notFound('Doctor not found');

            doctor.isVerified = !doctor.isVerified;
            if (!doctor.isVerified) doctor.isActive = false;

            await doctor.save();
            res.ok(doctor, `Doctor ${doctor.isVerified ? 'verified' : 'unverified'}`);

            setImmediate(async () => {
                try {
                    await Notification.create({
                        recipientId:   doctor._id,
                        recipientType: 'doctor',
                        type:    doctor.isVerified ? 'verification_approved' : 'verification_rejected',
                        title:   doctor.isVerified ? '🎉 Verification Approved!' : 'Verification Revoked',
                        message: doctor.isVerified
                            ? 'Congratulations! Your medical credentials have been verified by the UniCare team. Your profile is now live and visible to patients. You can start accepting appointments.'
                            : 'Your verification status has been revoked by an administrator. Your profile is no longer visible to patients. Please contact support for more information.',
                        link: doctor.isVerified ? '/doctor/dashboard' : '/doctor/profile',
                    });
                } catch (e) { console.error('Notification error:', e.message); }
            });
        } catch (err) {
            res.serverError('Failed to verify doctor', [err.message]);
        }
    }
);

/**
 * PUT /api/admin/doctors/:id/toggle-active
 * A doctor must be verified before they can be activated.
 */
router.put(
    '/doctors/:id/toggle-active',
    authenticateAdmin,
    requirePermission('doctorManagement'),
    async (req, res) => {
        try {
            const doctor = await Doctor.findById(req.params.id).select('-password -googleId');
            if (!doctor) return res.notFound('Doctor not found');

            if (!doctor.isActive && !doctor.isVerified) {
                return res.badRequest('Doctor must be verified before being activated');
            }

            doctor.isActive = !doctor.isActive;
            await doctor.save();
            res.ok(doctor, `Doctor ${doctor.isActive ? 'activated' : 'deactivated'}`);

            setImmediate(async () => {
                try {
                    await Notification.create({
                        recipientId:   doctor._id,
                        recipientType: 'doctor',
                        type:    doctor.isActive ? 'account_activated' : 'account_deactivated',
                        title:   doctor.isActive ? 'Account Activated' : 'Account Deactivated',
                        message: doctor.isActive
                            ? 'Your UniCare account has been activated. You are now visible to patients and can receive appointment bookings.'
                            : 'Your UniCare account has been deactivated by an administrator. You will not receive new appointments until reactivated.',
                        link: doctor.isActive ? '/doctor/dashboard' : '',
                    });
                } catch (e) { console.error('Notification error:', e.message); }
            });
        } catch (err) {
            res.serverError('Failed to toggle doctor status', [err.message]);
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/appointments
 */
router.get(
    '/appointments',
    authenticateAdmin,
    requirePermission('analytics'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isString(),
        query('paymentStatus').optional().isString(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601(),
        query('search').optional().isString(),
    ],
    validate,
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status, paymentStatus, from, to, search } = req.query;
            const filter = {};

            if (status) filter.status = status;
            if (paymentStatus) filter.paymentStatus = paymentStatus;
            if (from || to) {
                filter.date = {};
                if (from) filter.date.$gte = new Date(from);
                if (to) filter.date.$lte = new Date(to);
            }

            let appointments;
            const skip = (Number(page) - 1) * Number(limit);

            if (search) {
                // Search requires population first then filter (or aggregation)
                appointments = await Appointment.find(filter)
                    .populate('doctorId', 'name specialization email profileImage')
                    .populate('patientId', 'name email phone profileImage')
                    .sort({ date: -1 })
                    .lean();

                const lower = search.toLowerCase();
                appointments = appointments.filter(a =>
                    a.doctorId?.name?.toLowerCase().includes(lower) ||
                    a.patientId?.name?.toLowerCase().includes(lower) ||
                    a.patientId?.email?.toLowerCase().includes(lower)
                );
                const total = appointments.length;
                appointments = appointments.slice(skip, skip + Number(limit));
                return res.ok(appointments, 'Appointments fetched', {
                    page: Number(page), limit: Number(limit), total,
                });
            }

            const [items, total] = await Promise.all([
                Appointment.find(filter)
                    .populate('doctorId', 'name specialization email profileImage fees')
                    .populate('patientId', 'name email phone profileImage')
                    .sort({ date: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Appointment.countDocuments(filter),
            ]);

            res.ok(items, 'Appointments fetched', { page: Number(page), limit: Number(limit), total });
        } catch (err) {
            res.serverError('Failed to fetch appointments', [err.message]);
        }
    }
);

/**
 * GET /api/admin/appointments/:id
 */
router.get('/appointments/:id', authenticateAdmin, requirePermission('analytics'), async (req, res) => {
    try {
        const appt = await Appointment.findById(req.params.id)
            .populate('doctorId', '-password -googleId')
            .populate('patientId', '-password -googleId');
        if (!appt) return res.notFound('Appointment not found');
        res.ok(appt, 'Appointment fetched');
    } catch (err) {
        res.serverError('Failed to fetch appointment', [err.message]);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/payments
 */
router.get(
    '/payments',
    authenticateAdmin,
    requirePermission('paymentManagement'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('paymentStatus').optional().isString(),
        query('payoutStatus').optional().isString(),
        query('from').optional().isISO8601(),
        query('to').optional().isISO8601(),
    ],
    validate,
    async (req, res) => {
        try {
            const { page = 1, limit = 20, paymentStatus, payoutStatus, from, to } = req.query;
            const filter = {};

            if (paymentStatus) filter.paymentStatus = paymentStatus;
            if (payoutStatus) filter.payoutStatus = payoutStatus;
            if (from || to) {
                filter.paymentDate = {};
                if (from) filter.paymentDate.$gte = new Date(from);
                if (to) filter.paymentDate.$lte = new Date(to);
            }

            const skip = (Number(page) - 1) * Number(limit);
            const [items, total] = await Promise.all([
                Appointment.find({ ...filter, paymentStatus: { $ne: 'Pending' } })
                    .populate('doctorId', 'name specialization fees profileImage')
                    .populate('patientId', 'name email profileImage')
                    .sort({ paymentDate: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Appointment.countDocuments({ ...filter, paymentStatus: { $ne: 'Pending' } }),
            ]);

            res.ok(items, 'Payments fetched', { page: Number(page), limit: Number(limit), total });
        } catch (err) {
            res.serverError('Failed to fetch payments', [err.message]);
        }
    }
);

/**
 * GET /api/admin/payments/stats
 */
router.get(
    '/payments/stats',
    authenticateAdmin,
    requirePermission('paymentManagement'),
    async (req, res) => {
        try {
            const [totalRevenue, pendingPayouts, refunded, methodBreakdown] = await Promise.all([
                Appointment.aggregate([
                    { $match: { paymentStatus: 'Paid' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
                ]),
                Appointment.aggregate([
                    { $match: { payoutStatus: 'Pending', paymentStatus: 'Paid' } },
                    { $group: { _id: null, total: { $sum: '$consultationFees' }, count: { $sum: 1 } } },
                ]),
                Appointment.aggregate([
                    { $match: { paymentStatus: 'refunded' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
                ]),
                Appointment.aggregate([
                    { $match: { paymentStatus: 'Paid' } },
                    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
                ]),
            ]);

            res.ok({
                totalRevenue: totalRevenue[0]?.total || 0,
                totalPaid: totalRevenue[0]?.count || 0,
                pendingPayoutAmount: pendingPayouts[0]?.total || 0,
                pendingPayoutCount: pendingPayouts[0]?.count || 0,
                refundedAmount: refunded[0]?.total || 0,
                refundedCount: refunded[0]?.count || 0,
                methodBreakdown,
            }, 'Payment stats fetched');
        } catch (err) {
            res.serverError('Failed to fetch payment stats', [err.message]);
        }
    }
);


router.get(
  '/payouts',
  authenticateAdmin,
  requirePermission('paymentManagement'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('payoutStatus').optional().isString(),
    query('doctorId').optional().isMongoId(),
  ],
  validate,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, payoutStatus, doctorId } = req.query;
 
      const filter = { paymentStatus: 'Paid' };
      if (payoutStatus) filter.payoutStatus = payoutStatus;
      if (doctorId)     filter.doctorId     = doctorId;
 
      const skip = (Number(page) - 1) * Number(limit);
 
      const [items, total] = await Promise.all([
        Appointment.find(filter)
          .populate('doctorId', 'name email specialization profileImage bankDetails ucId fees')
          .populate('patientId', 'name email profileImage')
          .sort({ paymentDate: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Appointment.countDocuments(filter),
      ]);
 
      // Attach payoutAmount = consultationFees (platform fees excluded)
      const enriched = items.map(a => ({
        ...a.toObject(),
        payoutAmount: a.consultationFees, // doctor gets consultation fee only
      }));
 
      // Summary stats
      const [pendingStats, paidStats] = await Promise.all([
        Appointment.aggregate([
          { $match: { paymentStatus: 'Paid', payoutStatus: 'Pending' } },
          { $group: { _id: null, total: { $sum: '$consultationFees' }, count: { $sum: 1 } } },
        ]),
        Appointment.aggregate([
          { $match: { paymentStatus: 'Paid', payoutStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$consultationFees' }, count: { $sum: 1 } } },
        ]),
      ]);
 
      res.ok(enriched, 'Payouts fetched', {
        page: Number(page), limit: Number(limit), total,
        summary: {
          pendingAmount: pendingStats[0]?.total || 0,
          pendingCount:  pendingStats[0]?.count || 0,
          paidAmount:    paidStats[0]?.total    || 0,
          paidCount:     paidStats[0]?.count    || 0,
        },
      });
    } catch (err) {
      res.serverError('Failed to fetch payouts', [err.message]);
    }
  }
);
 
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/payouts/:appointmentId/mark-paid
// Admin marks a single appointment payout as paid (manual bank transfer done)
// payoutAmount = consultationFees (platform fee is UniCare's revenue, excluded)
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/payouts/:appointmentId/mark-paid',
  authenticateAdmin,
  requirePermission('paymentManagement'),
  [
    body('payoutNote').optional().isString().isLength({ max: 300 }),
    body('transactionRef').optional().isString().isLength({ max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { payoutNote = '', transactionRef = '' } = req.body;
      const { appointmentId } = req.params;
 
      const appointment = await Appointment.findById(appointmentId)
        .populate('doctorId', 'name email bankDetails specialization')
        .populate('patientId', 'name email');
 
      if (!appointment) return res.notFound('Appointment not found');
      if (appointment.paymentStatus !== 'Paid') return res.badRequest('Patient has not paid for this appointment yet');
      if (appointment.payoutStatus === 'Paid') return res.badRequest('Payout already marked as paid for this appointment');
 
      // Amount doctor receives = consultationFees only (platform fees stay with UniCare)
      const payoutAmount = appointment.consultationFees;
 
      appointment.payoutStatus = 'Paid';
      appointment.payoutDate   = new Date();
      // Store payout meta in notes if provided
      if (transactionRef || payoutNote) {
        appointment.notes = [
          appointment.notes,
          transactionRef ? `Payout Ref: ${transactionRef}` : '',
          payoutNote ? `Note: ${payoutNote}` : '',
        ].filter(Boolean).join(' | ');
      }
      await appointment.save();
 
      res.ok(
        {
          appointmentId,
          doctorName:   appointment.doctorId.name,
          payoutAmount,
          payoutDate:   appointment.payoutDate,
          transactionRef,
        },
        `Payout of ₹${payoutAmount} marked as paid to Dr. ${appointment.doctorId.name}`
      );
 
      // ── Notification to doctor ──
      setImmediate(async () => {
        try {
          const Notification = require('../modal/Notification');
          await Notification.create({
            recipientId:   appointment.doctorId._id,
            recipientType: 'doctor',
            type:          'payment_received',
            title:         '💳 Payout Received!',
            message:       `You have received a payout of ₹${payoutAmount} for your consultation on ${new Date(appointment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.${transactionRef ? ` Reference: ${transactionRef}` : ''}`,
            link:          '/doctor/dashboard',
          });
        } catch (e) { console.error('Payout notification error:', e.message); }
      });
    } catch (err) {
      res.serverError('Failed to mark payout as paid', [err.message]);
    }
  }
);
 
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/payouts/bulk-mark-paid
// Mark multiple appointments as paid in one action
// Body: { appointmentIds: string[], transactionRef?: string, payoutNote?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/payouts/bulk-mark-paid',
  authenticateAdmin,
  requirePermission('paymentManagement'),
  [
    body('appointmentIds').isArray({ min: 1 }).withMessage('appointmentIds array is required'),
    body('transactionRef').optional().isString(),
    body('payoutNote').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { appointmentIds, transactionRef = '', payoutNote = '' } = req.body;
 
      // Only update eligible ones: paid by patient, not yet paid out
      const result = await Appointment.updateMany(
        {
          _id:           { $in: appointmentIds },
          paymentStatus: 'Paid',
          payoutStatus:  'Pending',
        },
        {
          $set: {
            payoutStatus: 'Paid',
            payoutDate:   new Date(),
          },
        }
      );
 
      // Calculate total payout amount
      const affected = await Appointment.find({
        _id: { $in: appointmentIds }, payoutStatus: 'Paid',
      }).select('consultationFees doctorId');
 
      const totalPayout = affected.reduce((s, a) => s + a.consultationFees, 0);
 
      res.ok(
        { updated: result.modifiedCount, totalPayout, transactionRef },
        `${result.modifiedCount} payouts marked as paid. Total: ₹${totalPayout}`
      );
 
      // Notifications
      setImmediate(async () => {
        try {
          const Notification = require('../modal/Notification');
          const appts = await Appointment.find({ _id: { $in: appointmentIds }, payoutStatus: 'Paid' })
            .select('doctorId consultationFees date');
          for (const a of appts) {
            await Notification.create({
              recipientId:   a.doctorId,
              recipientType: 'doctor',
              type:          'payment_received',
              title:         '💳 Payout Received!',
              message:       `You have received a payout of ₹${a.consultationFees} for your consultation on ${new Date(a.date).toLocaleDateString('en-IN')}.${transactionRef ? ` Reference: ${transactionRef}` : ''}`,
              link:          '/doctor/dashboard',
            });
          }
        } catch (e) { console.error('Bulk payout notification error:', e.message); }
      });
    } catch (err) {
      res.serverError('Failed to bulk mark payouts', [err.message]);
    }
  }
);

module.exports = router;