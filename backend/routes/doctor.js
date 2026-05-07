const express = require('express');
const { query, body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const Doctor = require('../modal/Doctor');
const Appointment = require('../modal/Appointment');

const router = express.Router();

// ── Doctor list (public) ──
router.get('/list', [
  query('search').optional().isString(),
  query('specialization').optional().isString(),
  query('city').optional().isString(),
  query('category').optional().isString(),
  query('minFees').optional().isInt({ min: 0 }),
  query('maxFees').optional().isInt({ min: 0 }),
  query('sortBy').optional().isIn(['fees','experience','name','createdAt']),
  query('sortOrder').optional().isIn(['asc','desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res) => {
  try {
    const { search, specialization, city, category, minFees, maxFees,
            sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    const filter = { isVerified: true, isActive: true };
    if (specialization) filter.specialization = { $regex: `^${specialization}$`, $options: 'i' };
    if (city)           filter['hospitalInfo.city'] = { $regex: city, $options: 'i' };
    if (category)       filter.category = category;
    if (minFees || maxFees) {
      filter.fees = {};
      if (minFees) filter.fees.$gte = Number(minFees);
      if (maxFees) filter.fees.$lte = Number(maxFees);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { 'hospitalInfo.name': { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Doctor.find(filter)
        .select('-password -googleId -bankDetails')
        .sort(sort).skip(skip).limit(Number(limit)),
      Doctor.countDocuments(filter),
    ]);

    res.ok(items, 'Doctors fetched', { page: Number(page), limit: Number(limit), total });
  } catch (error) {
    res.serverError('Failed to fetch doctors', [error.message]);
  }
});

// ── Own profile ──
router.get('/me', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.auth.id).select('-password -googleId');
    if (!doctor) return res.notFound('Doctor not found');
    res.ok(doctor, 'Doctor profile fetched');
  } catch (error) {
    res.serverError('Failed to fetch profile', [error.message]);
  }
});

// ── Bank details GET ──
// Returns masked account number (last 4 digits only) for display
router.get('/bank-details', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.auth.id).select('bankDetails');
    if (!doctor) return res.notFound('Doctor not found');

    const bd = (doctor.bankDetails || {});
    const accNum = bd.accountNumber || '';
    const masked = {
      accountHolderName: bd.accountHolderName || '',
      accountNumber:     accNum.length > 4
        ? '*'.repeat(accNum.length - 4) + accNum.slice(-4)
        : accNum,
      ifscCode:    bd.ifscCode    || '',
      bankName:    bd.bankName    || '',
      branchName:  bd.branchName  || '',
      accountType: bd.accountType || '',
      upiId:       bd.upiId       || '',
      updatedAt:   bd.updatedAt   || null,
      hasBankDetails: !!(accNum || bd.upiId),
    };

    res.ok(masked, 'Bank details fetched');
  } catch (error) {
    res.serverError('Failed to fetch bank details', [error.message]);
  }
});

// ── Bank details PUT ──
router.put('/bank-details', authenticate, requireRole('doctor'), [
  body('accountHolderName').notEmpty().withMessage('Account holder name is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('ifscCode').notEmpty().withMessage('IFSC code is required'),
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountType').isIn(['savings','current']).withMessage('Account type must be savings or current'),
], validate, async (req, res) => {
  try {
    const { accountHolderName, accountNumber, ifscCode, bankName, branchName, accountType, upiId } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.auth.id,
      {
        bankDetails: {
          accountHolderName: accountHolderName.trim(),
          accountNumber:     accountNumber.trim(),
          ifscCode:          ifscCode.trim().toUpperCase(),
          bankName:          bankName.trim(),
          branchName:        (branchName || '').trim(),
          accountType,
          upiId:             (upiId || '').trim(),
          updatedAt:         new Date(),
        },
      },
      { new: true }
    ).select('bankDetails');

    res.ok(
      { hasBankDetails: true, updatedAt: doctor.bankDetails.updatedAt },
      'Bank details saved successfully'
    );
  } catch (error) {
    res.serverError('Failed to save bank details', [error.message]);
  }
});

// ── Onboarding / profile update ──
router.put('/onboarding/update', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const { name, phone, about, specialization, category, qualification,
            experience, fees, hospitalInfo, availabilityRange, dailyTimeRanges, slotDurationMinutes } = req.body;

    const doc = await Doctor.findByIdAndUpdate(
      req.auth.id,
      { name, phone, about, specialization, category, qualification,
        experience, fees, hospitalInfo, availabilityRange, dailyTimeRanges, slotDurationMinutes },
      { new: true }
    ).select('-password -googleId');

    res.ok(doc, 'Profile updated');
  } catch (error) {
    res.serverError('Failed to update profile', [error.message]);
  }
});

// ── Verification document upload ──
router.post('/verification/upload-document', authenticate, requireRole('doctor'), [
  body('documentType').notEmpty(),
  body('fileData').notEmpty(),
  body('fileName').notEmpty(),
], validate, async (req, res) => {
  try {
    const { documentType, fileData, fileName } = req.body;
    if (!fileData.startsWith('data:')) return res.badRequest('fileData must be a base64 data URL');

    const doctor = await Doctor.findById(req.auth.id);
    if (!doctor) return res.notFound('Doctor not found');

    const idx = doctor.verificationDocuments.findIndex(d => d.type === documentType);
    const entry = { type: documentType, url: fileData, publicId: `doc_${req.auth.id}_${Date.now()}`, uploadedAt: new Date() };

    if (idx > -1) doctor.verificationDocuments[idx] = entry;
    else          doctor.verificationDocuments.push(entry);

    await doctor.save();
    res.ok({ documentType, fileName, uploadedAt: new Date(), totalDocuments: doctor.verificationDocuments.length },
      'Document uploaded successfully');
  } catch (error) {
    res.serverError('Failed to upload document', [error.message]);
  }
});

router.delete('/verification/document/:documentId', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.auth.id);
    if (!doctor) return res.notFound('Doctor not found');
    const idx = doctor.verificationDocuments.findIndex(d => d._id.toString() === req.params.documentId);
    if (idx === -1) return res.notFound('Document not found');
    doctor.verificationDocuments.splice(idx, 1);
    await doctor.save();
    res.ok({}, 'Document removed');
  } catch (error) {
    res.serverError('Failed to remove document', [error.message]);
  }
});

router.get('/verification/documents', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.auth.id).select('verificationDocuments isVerified isActive');
    if (!doctor) return res.notFound('Doctor not found');
    res.ok({
      documents: doctor.verificationDocuments.map(d => ({ _id: d._id, type: d.type, uploadedAt: d.uploadedAt, hasFile: !!d.url })),
      isVerified: doctor.isVerified, isActive: doctor.isActive,
    }, 'Documents fetched');
  } catch (error) {
    res.serverError('Failed to fetch documents', [error.message]);
  }
});

// ── Doctor dashboard ──
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const doctorId = req.auth.id;
    const doctor = await Doctor.findById(doctorId).select('-password -googleId');
    if (!doctor) return res.notFound('Doctor not found');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay   = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [todayAppointments, upcomingAppointments, uniquePatientIds, completedCount, totalAppointment] =
      await Promise.all([
        Appointment.find({ doctorId, slotStartIso: { $gte: startOfDay, $lt: endOfDay }, status: { $ne: 'Cancelled' } })
          .populate('patientId','name profileImage age email phone')
          .populate('doctorId','name fees profileImage specialization').sort({ slotStartIso: 1 }),
        Appointment.find({ doctorId, slotStartIso: { $gt: endOfDay }, status: { $ne: 'Cancelled' } })
          .populate('patientId','name profileImage age email phone')
          .populate('doctorId','name fees profileImage specialization').sort({ slotStartIso: 1 }).limit(5),
        Appointment.distinct('patientId', { doctorId }),
        Appointment.countDocuments({ doctorId, status: 'Completed' }),
        Appointment.find({ doctorId, status: 'Completed' }),
      ]);

    const totalRevenue = totalAppointment.reduce((sum, apt) => sum + (apt.fees || doctor.fees || 0), 0);

    res.ok({
      doctor: {
        name: doctor.name, email: doctor.email, profileImage: doctor.profileImage,
        specialization: doctor.specialization, hospitalInfo: doctor.hospitalInfo,
        isVerified: doctor.isVerified, isActive: doctor.isActive,
        verificationDocumentsCount: doctor.verificationDocuments?.length || 0,
        hasBankDetails: !!(doctor.bankDetails?.accountNumber || doctor.bankDetails?.upiId),
      },
      stats: { totalPatients: uniquePatientIds.length, todayAppointments: todayAppointments.length, totalRevenue, completedAppointments: completedCount, averageRating: 4.8 },
      todayAppointments, upcomingAppointments,
      performance: { pateintSatisfaction: 4.8, completionRate: 98, responseTime: '< 2min' },
    }, 'Dashboard data fetched');
  } catch (error) {
    res.serverError('Failed to fetch dashboard data', [error.message]);
  }
});

// ── Get single doctor (public) ──
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select('-password -googleId -bankDetails');
    if (!doctor) return res.notFound('Doctor not found');
    res.ok(doctor, 'Doctor fetched');
  } catch (error) {
    res.serverError('Failed to fetch doctor', [error.message]);
  }
});

module.exports = router;