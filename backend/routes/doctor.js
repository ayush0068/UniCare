const express = require("express");
const { query, body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireRole } = require("../middleware/auth");
const Doctor = require("../modal/Doctor");
const Appointment = require("../modal/Appointment");

const router = express.Router();

// ── Doctor list (public) — only verified + active doctors ──
router.get(
  "/list",
  [
    query("search").optional().isString(),
    query("specialization").optional().isString(),
    query("city").optional().isString(),
    query("category").optional().isString(),
    query("minFees").optional().isInt({ min: 0 }),
    query("maxFees").optional().isInt({ min: 0 }),
    query("sortBy").optional().isIn(["fees", "experience", "name", "createdAt"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        search, specialization, city, category,
        minFees, maxFees,
        sortBy = "createdAt", sortOrder = "desc",
        page = 1, limit = 20,
      } = req.query;

      // ── Only verified AND active doctors are shown to patients ──
      const filter = { isVerified: true, isActive: true };

      if (specialization)
        filter.specialization = { $regex: `^${specialization}$`, $options: "i" };
      if (city) filter["hospitalInfo.city"] = { $regex: city, $options: "i" };
      if (category) filter.category = category;
      if (minFees || maxFees) {
        filter.fees = {};
        if (minFees) filter.fees.$gte = Number(minFees);
        if (maxFees) filter.fees.$lte = Number(maxFees);
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { specialization: { $regex: search, $options: "i" } },
          { "hospitalInfo.name": { $regex: search, $options: "i" } },
        ];
      }

      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        Doctor.find(filter)
          .select("-password -googleId")
          .sort(sort)
          .skip(skip)
          .limit(Number(limit)),
        Doctor.countDocuments(filter),
      ]);

      res.ok(items, "Doctors fetched", {
        page: Number(page),
        limit: Number(limit),
        total,
      });
    } catch (error) {
      res.serverError("Failed to fetch doctors", [error.message]);
    }
  }
);

// ── Get single doctor by ID (public) ──
router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select(
      "-password -googleId"
    );
    if (!doctor) return res.notFound("Doctor not found");
    res.ok(doctor, "Doctor fetched");
  } catch (error) {
    res.serverError("Failed to fetch doctor", [error.message]);
  }
});

// ── Get own profile ──
router.get(
  "/me",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.auth.id).select(
        "-password -googleId"
      );
      if (!doctor) return res.notFound("Doctor not found");
      res.ok(doctor, "Doctor profile fetched");
    } catch (error) {
      res.serverError("Failed to fetch doctor profile", [error.message]);
    }
  }
);

// ── Onboarding / profile update ──
router.put(
  "/onboarding/update",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const {
        name, phone, about, specialization, category,
        qualification, experience, fees,
        hospitalInfo, availabilityRange, dailyTimeRanges, slotDurationMinutes,
      } = req.body;

      const updated = {
        name, phone, about, specialization, category,
        qualification, experience, fees,
        hospitalInfo, availabilityRange, dailyTimeRanges, slotDurationMinutes,
      };

      const doc = await Doctor.findByIdAndUpdate(req.auth.id, updated, {
        new: true,
      }).select("-password -googleId");

      res.ok(doc, "Profile updated");
    } catch (error) {
      console.error("Onboarding update error", error);
      res.serverError("Failed to update profile", [error.message]);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION DOCUMENT UPLOAD
// Doctors upload their credentials here. Admin reviews and verifies manually.
//
// How it works (no Cloudinary dependency — uses base64 data URLs stored in DB):
//   POST /doctor/verification/upload-document
//   Body: { documentType: string, fileData: string (base64 dataURL), fileName: string }
//
// For production use with Cloudinary, replace the storage block with:
//   const cloudinary = require('cloudinary').v2;
//   const result = await cloudinary.uploader.upload(fileData, { folder: 'unicare/doctor-docs' });
//   url = result.secure_url; publicId = result.public_id;
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/verification/upload-document",
  authenticate,
  requireRole("doctor"),
  [
    body("documentType").notEmpty().withMessage("Document type is required"),
    body("fileData").notEmpty().withMessage("File data is required"),
    body("fileName").notEmpty().withMessage("File name is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const { documentType, fileData, fileName } = req.body;

      // Validate base64 data URL
      if (!fileData.startsWith("data:")) {
        return res.badRequest("fileData must be a base64 data URL");
      }

      // ── In production: replace this block with Cloudinary upload ──
      // const cloudinary = require('cloudinary').v2;
      // const result = await cloudinary.uploader.upload(fileData, {
      //   folder: 'unicare/doctor-verification',
      //   resource_type: 'auto',
      // });
      // const url = result.secure_url;
      // const publicId = result.public_id;
      // ──────────────────────────────────────────────────────────────

      // For now: store the base64 dataURL directly
      // (works fine, but large files bloat DB — swap for Cloudinary in prod)
      const url = fileData;
      const publicId = `doc_${req.auth.id}_${Date.now()}`;

      const doctor = await Doctor.findById(req.auth.id);
      if (!doctor) return res.notFound("Doctor not found");

      // Prevent duplicate document types — replace if same type uploaded again
      const existingIdx = doctor.verificationDocuments.findIndex(
        (d) => d.type === documentType
      );
      if (existingIdx > -1) {
        doctor.verificationDocuments[existingIdx] = {
          type: documentType,
          url,
          publicId,
          uploadedAt: new Date(),
        };
      } else {
        doctor.verificationDocuments.push({
          type: documentType,
          url,
          publicId,
          uploadedAt: new Date(),
        });
      }

      await doctor.save();

      res.ok(
        {
          documentType,
          fileName,
          uploadedAt: new Date(),
          totalDocuments: doctor.verificationDocuments.length,
        },
        "Document uploaded successfully. Admin will review and verify your profile."
      );
    } catch (error) {
      console.error("Document upload error:", error);
      res.serverError("Failed to upload document", [error.message]);
    }
  }
);

// ── Delete a verification document ──
router.delete(
  "/verification/document/:documentId",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.auth.id);
      if (!doctor) return res.notFound("Doctor not found");

      const docIndex = doctor.verificationDocuments.findIndex(
        (d) => d._id.toString() === req.params.documentId
      );

      if (docIndex === -1) return res.notFound("Document not found");

      doctor.verificationDocuments.splice(docIndex, 1);
      await doctor.save();

      res.ok({}, "Document removed");
    } catch (error) {
      res.serverError("Failed to remove document", [error.message]);
    }
  }
);

// ── Get own verification documents ──
router.get(
  "/verification/documents",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.auth.id).select(
        "verificationDocuments isVerified isActive"
      );
      if (!doctor) return res.notFound("Doctor not found");

      res.ok(
        {
          documents: doctor.verificationDocuments.map((d) => ({
            _id: d._id,
            type: d.type,
            uploadedAt: d.uploadedAt,
            // Don't return the raw base64 in list — just metadata
            hasFile: !!d.url,
          })),
          isVerified: doctor.isVerified,
          isActive: doctor.isActive,
        },
        "Documents fetched"
      );
    } catch (error) {
      res.serverError("Failed to fetch documents", [error.message]);
    }
  }
);

// ── Doctor dashboard ──
router.get(
  "/dashboard/:type",
  authenticate,
  async (req, res) => {
    try {
      const doctorId = req.auth.id;
      const doctor = await Doctor.findById(doctorId).select("-password -googleId");
      if (!doctor) return res.notFound("Doctor not found");

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const todayAppointments = await Appointment.find({
        doctorId,
        slotStartIso: { $gte: startOfDay, $lt: endOfDay },
        status: { $ne: "Cancelled" },
      })
        .populate("patientId", "name profileImage age email phone")
        .populate("doctorId", "name fees profileImage specialization")
        .sort({ slotStartIso: 1 });

      const upcomingAppointments = await Appointment.find({
        doctorId,
        slotStartIso: { $gt: endOfDay },
        status: { $ne: "Cancelled" },
      })
        .populate("patientId", "name profileImage age email phone")
        .populate("doctorId", "name fees profileImage specialization")
        .sort({ slotStartIso: 1 })
        .limit(5);

      const uniquePatientIds = await Appointment.distinct("patientId", { doctorId });
      const totalPatients = uniquePatientIds.length;

      const completedAppointmentCount = await Appointment.countDocuments({
        doctorId,
        status: "Completed",
      });

      const totalAppointment = await Appointment.find({
        doctorId,
        status: "Completed",
      });

      const totalRevenue = totalAppointment.reduce(
        (sum, apt) => sum + (apt.fees || doctor.fees || 0),
        0
      );

      res.ok(
        {
          doctor: {
            name: doctor.name,
            email: doctor.email,
            profileImage: doctor.profileImage,
            specialization: doctor.specialization,
            hospitalInfo: doctor.hospitalInfo,
            isVerified: doctor.isVerified,
            isActive: doctor.isActive,
            verificationDocumentsCount: doctor.verificationDocuments?.length || 0,
          },
          stats: {
            totalPatients,
            todayAppointments: todayAppointments.length,
            totalRevenue,
            completedAppointments: completedAppointmentCount,
            averageRating: 4.8,
          },
          todayAppointments,
          upcomingAppointments,
          performance: {
            pateintSatisfaction: 4.8,
            completionRate: 98,
            responseTime: "< 2min",
          },
        },
        "Dashboard data fetched"
      );
    } catch (error) {
      console.error("Doctor dashboard error", error);
      res.serverError("Failed to fetch dashboard data", [error.message]);
    }
  }
);

module.exports = router;