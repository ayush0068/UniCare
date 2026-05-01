const express = require("express");
const Appointment = require("../modal/Appointment");
const Doctor = require("../modal/Doctor");
const Parchi = require("../modal/Parchi");
const Patient = require("../modal/Patient");
const { authenticate, requireRole } = require("../middleware/auth");
const { query, body } = require("express-validator");
const validate = require("../middleware/validate");
const { sendMail } = require('../utils/emailService');
const { bookingConfirmationTemplate } = require('../utils/emailTemplates');
const { generatePrescriptionPdf } = require('../utils/prescriptionPdf');

const router = express.Router();

const GUEST_SURCHARGE = 30;

// ── Helper: Determine discount based on parchi visitCount ──
// Visit 1 → Full price (no parchi yet)
// Visit 2 → FREE  (visitCount === 1)
// Visit 3 → FREE  (visitCount === 2)
// Visit 4 → HALF  (visitCount === 3)
// Visit 5+ → FULL (visitCount >= 4)
const getDiscountType = (parchi) => {
  if (!parchi) return 'none';
  const vc = parchi.visitCount;
  if (vc <= 2) return 'free';
  if (vc === 3) return 'half';
  return 'none';
};

//Doctor's appointment
router.get(
  "/doctor",
  authenticate,
  requireRole("doctor"),
  [
    query("status").optional().isArray().withMessage("Status can be an array"),
    query("status.*").optional().isString().withMessage("Each status must be an string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { status } = req.query;
      const filter = { doctorId: req.auth.id };
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        filter.status = { $in: statusArray };
      }
      const appointment = await Appointment.find(filter)
        .populate("patientId", "name email phone dob age profileImage")
        .populate("doctorId", "name fees phone specialization profileImage hospitalInfo")
        .sort({ slotStartIso: 1, slotEndIso: 1 });
      res.ok(appointment, "Appointment fetched successfully");
    } catch (error) {
      console.error("Doctor appointment fetch error", error);
      res.serverError("Failed to fetch appointment", [error.message]);
    }
  }
);

//Patient appointment
router.get(
  "/patient",
  authenticate,
  requireRole("patient"),
  [
    query("status").optional().isArray().withMessage("Status can be an array"),
    query("status.*").optional().isString().withMessage("Each status must be an string"),
  ],
  validate,
  async (req, res) => {
    try {
      const { status } = req.query;
      const filter = { patientId: req.auth.id };
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        filter.status = { $in: statusArray };
      }
      const appointment = await Appointment.find(filter)
        .populate("doctorId", "name fees phone specialization hospitalInfo profileImage")
        .populate("patientId", "name email profileImage")
        .sort({ slotStartIso: 1, slotEndIso: 1 });
      res.ok(appointment, "Appointment fetched successfully");
    } catch (error) {
      console.error("Patient appointment fetch error", error);
      res.serverError("Failed to fetch appointment", [error.message]);
    }
  }
);

//Get booked slots for doctor on specific date
router.get("/booked-slots/:doctorId/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const startDay = new Date(date);
    startDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const bookedAppointment = await Appointment.find({
      doctorId,
      slotStartIso: { $gte: startDay, $lte: endOfDay },
      status: { $ne: "Cancelled" },
    }).select("slotStartIso");
    const bookedSlot = bookedAppointment.map((apt) => apt.slotStartIso);
    res.ok(bookedSlot, "Booked slot retrieved");
  } catch (error) {
    res.serverError("Failed to fetch booked slot", [error.message]);
  }
});

// ── Check discount — slotDate ke against parchi check karo ──
router.get("/check-discount/:doctorId", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const patientId = req.auth.id;
    const { slotDate } = req.query;

    // ── Guest users get no discount ever ──
    const patientDoc = await Patient.findById(patientId).select('isGuest');
    if (patientDoc?.isGuest) {
      return res.ok(
        { discountType: 'none', parchiNumber: null, visitCount: 0, expiryDate: null },
        "Guest users are not eligible for loyalty discounts"
      );
    }

    const checkDate = slotDate ? new Date(slotDate) : new Date();

    const parchi = await Parchi.findOne({
      doctorId,
      patientId,
      isActive: true,
      expiryDate: { $gt: checkDate },
    });

    const discountType = getDiscountType(parchi);

    res.ok(
      {
        discountType,
        parchiNumber: parchi?.parchiNumber || null,
        visitCount: parchi?.visitCount || 0,
        expiryDate: parchi?.expiryDate || null,
      },
      "Discount info fetched"
    );
  } catch (error) {
    res.serverError("Failed to check discount", [error.message]);
  }
});

// ── Book appointment ──
router.post("/book", authenticate, requireRole("patient"), [
  body("doctorId").isMongoId().withMessage("valid doctor ID is required"),
  body("slotStartIso").isISO8601().withMessage("valid start time is required"),
  body("slotEndIso").isISO8601().withMessage("valid end time is required"),
  body("consultationType")
    .isIn(["Video Consultation", "Voice Call"])
    .withMessage("valid consultation type required"),
  body("symptoms").isString().trim().withMessage("symptoms description is required (min 10 char)"),
  body("consultationFees").isNumeric().withMessage("consultationFees is required"),
  body("platformFees").isNumeric().withMessage("platformFees is required"),
  body("totalAmount").isNumeric().withMessage("totalAmount is required"),
  validate,
  async (req, res) => {
    try {
      const {
        doctorId, slotStartIso, slotEndIso, date,
        consultationType, symptoms, consultationFees,
        platformFees, totalAmount,
      } = req.body;

      const conflictingAppointment = await Appointment.findOne({
        doctorId,
        status: { $in: ["Scheduled", "In Progress"] },
        $or: [{
          slotStartIso: { $lt: new Date(slotEndIso) },
          slotEndIso: { $gt: new Date(slotStartIso) },
        }],
      });

      if (conflictingAppointment) {
        return res.forbidden("This time slot is already booked");
      }

      const patientId = req.auth.id;
      const slotDateObj = new Date(slotStartIso);

      // ── Fetch patient to check guest status ──
      const patientDoc = await Patient.findById(patientId).select('isGuest guestAppointmentCount');
      const isGuestUser = patientDoc?.isGuest;

      let finalConsultationFees, finalPlatformFees, finalTotalAmount, visitNumber, parchi;

      if (isGuestUser) {
        // ── Guest: enforce 3-booking limit ──
        if (patientDoc.guestAppointmentCount >= 3) {
          return res.forbidden(
            "Guest users can only book up to 3 appointments. Please create a free account to continue."
          );
        }

        // ── Guest: no parchi, no discount, flat ₹30 surcharge ──
        finalConsultationFees = consultationFees;
        finalPlatformFees = platformFees;
        finalTotalAmount = consultationFees + platformFees + GUEST_SURCHARGE;
        visitNumber = 1;
        parchi = null;

        // Increment guest booking count
        await Patient.findByIdAndUpdate(patientId, {
          $inc: { guestAppointmentCount: 1 },
        });

      } else {
        // ── Registered patient: full parchi + discount logic ──
        parchi = await Parchi.findOne({
          doctorId,
          patientId,
          isActive: true,
          expiryDate: { $gt: slotDateObj },
        });

        const discountType = getDiscountType(parchi);
        const doctor = await Doctor.findById(doctorId).select('fees');
        const baseFee = doctor?.fees || consultationFees;

        if (!parchi) {
          // ── First visit or 10 days baad — full price, new parchi ──
          finalConsultationFees = consultationFees;
          finalPlatformFees = platformFees;
          finalTotalAmount = totalAmount;
          visitNumber = 1;

          const expiry = new Date(slotDateObj);
          expiry.setDate(expiry.getDate() + 10);

          parchi = new Parchi({
            doctorId,
            patientId,
            firstVisitDate: slotDateObj,
            expiryDate: expiry,
            visitCount: 1,
            isActive: true,
          });
          await parchi.save();

        } else {
          // ── Follow-up visit — apply discount ──
          visitNumber = parchi.visitCount + 1;

          if (discountType === 'free') {
            finalConsultationFees = 0;
            finalPlatformFees = 0;
            finalTotalAmount = 0;
          } else if (discountType === 'half') {
            finalConsultationFees = Math.ceil(baseFee / 2);
            finalPlatformFees = Math.round(finalConsultationFees * 0.1);
            finalTotalAmount = finalConsultationFees + finalPlatformFees;
          } else {
            finalConsultationFees = consultationFees;
            finalPlatformFees = platformFees;
            finalTotalAmount = totalAmount;
          }

          parchi.visitCount += 1;
          await parchi.save();
        }
      }
      // ── End guest/parchi logic ──

      const zegoRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const appointment = new Appointment({
        doctorId,
        patientId,
        date: new Date(date),
        slotStartIso: new Date(slotStartIso),
        slotEndIso: new Date(slotEndIso),
        consultationType,
        symptoms,
        zegoRoomId,
        status: "Scheduled",
        consultationFees: finalConsultationFees,
        platformFees: finalPlatformFees,
        totalAmount: finalTotalAmount,
        paymentStatus: "Pending",
        payoutStatus: "Pending",
        parchiId: parchi ? parchi._id : null,
        visitNumber,
      });

      await appointment.save();

      await appointment.populate("doctorId", "name fees phone specialization hospitalInfo profileImage");
      await appointment.populate("patientId", "name email");

      res.created(
        {
          ...appointment.toObject(),
          parchiNumber: parchi?.parchiNumber || null,
          parchiExpiry: parchi?.expiryDate || null,
          isGuest: isGuestUser,
          guestSurcharge: isGuestUser ? GUEST_SURCHARGE : 0,
        },
        "Appointment booked successfully"
      );

      // Confirmation email
      setImmediate(async () => {
        try {
          const { subject, html } = bookingConfirmationTemplate(appointment);
          await sendMail({ to: appointment.patientId.email, subject, html });
          console.log('Confirmation email sent to:', appointment.patientId.email);
        } catch (emailErr) {
          console.error('Confirmation email failed:', emailErr.message);
        }
      });

    } catch (error) {
      console.error("Book appointment error", error);
      res.serverError("Failed to book appointment", [error.message]);
    }
  },
]);

//Join
router.get("/join/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name")
      .populate("doctorId", "name");
    if (!appointment) {
      return res.notFound("Appointment not found");
    }
    appointment.status = "In Progress";
    await appointment.save();
    res.ok({ roomId: appointment.zegoRoomId, appointment }, "Consultation joined successfully");
  } catch (error) {
    console.error("Join consultation error", error);
    res.serverError("Failed to Join consultation", [error.message]);
  }
});

//End
router.put("/end/:id", authenticate, async (req, res) => {
  try {
    const { prescription, notes } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: "Completed", prescription, notes, updatedAt: new Date() },
      { new: true }
    ).populate("patientId doctorId");

    if (!appointment) {
      return res.notFound("Appointment not found");
    }

    res.ok(appointment, "Consultation completed successfully");

    // Prescription email with PDF
    try {
      const fullAppt = await Appointment.findById(req.params.id)
        .populate("patientId", "name email phone dob age gender bloodGroup")
        .populate("doctorId", "name specialization phone hospitalInfo qualification")
        .populate("parchiId");

      const pdfBuffer = await generatePrescriptionPdf(fullAppt);

      await sendMail({
        to: fullAppt.patientId.email,
        subject: '📋 Your Prescription — UniCare',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
            <div style="background:#0ea5e9;padding:24px;text-align:center;">
              <h1 style="color:white;margin:0;">UniCare</h1>
            </div>
            <div style="padding:28px;">
              <h2 style="color:#0f172a;">Your Consultation is Complete ✅</h2>
              <p style="color:#475569;">Hi <strong>${fullAppt.patientId.name}</strong>, your consultation with <strong>Dr. ${fullAppt.doctorId.name}</strong> has been completed.</p>
              <p style="color:#475569;">Please find your prescription attached as a PDF. Keep it safe for your records.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">UniCare Digital Health Platform</p>
            </div>
          </div>`,
        attachments: [{
          filename: `prescription_${fullAppt._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });
    } catch (emailErr) {
      console.error('Prescription email error:', emailErr.message);
    }

  } catch (error) {
    console.error("End consultation error", error);
    res.serverError("Failed to End consultation", [error.message]);
  }
});

//Update appointment status by doctor
router.put(
  "/status/:id",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const appointment = await Appointment.findById(req.params.id).populate("patientId doctorId");
      if (!appointment) {
        return res.notFound("Appointment not found");
      }
      if (appointment.doctorId._id.toString() !== req.auth.id) {
        return res.forbidden("Access denied");
      }
      appointment.status = status;
      appointment.updatedAt = new Date();
      await appointment.save();
      res.ok(appointment, "Appointment status updated successfully");
    } catch (error) {
      console.error("updated Appointment status error", error);
      res.serverError("Failed to update Appointment status", [error.message]);
    }
  }
);

//Get single appointment by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email phone dob age profileImage")
      .populate("doctorId", "name fees phone specialization hospitalInfo profileImage")
      .populate("parchiId");
    if (!appointment) {
      return res.notFound("Appointment not found");
    }
    const userRole = req.auth.type;
    if (userRole === "doctor" && appointment.doctorId._id.toString() !== req.auth.id) {
      return res.forbidden("Access denied");
    }
    if (userRole === "patient" && appointment.patientId._id.toString() !== req.auth.id) {
      return res.forbidden("Access denied");
    }
    res.ok({ appointment }, "Appointment fetched successfully");
  } catch (error) {
    console.error("Get appointment error", error);
    res.serverError("Failed to Get appointment", [error.message]);
  }
});

module.exports = router;