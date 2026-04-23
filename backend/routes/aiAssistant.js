const express = require('express');
const { authenticate } = require('../middleware/auth');
const { callAI } = require('../utils/aiProvider');
const AIReport = require('../modal/AIReport');
const Appointment = require('../modal/Appointment');
const router = express.Router();

// ── System prompts ────────────────────────────────────────

const getPatientSystemPrompt = (user) => `
You are Dr. UniCare AI — a warm, intelligent, and empathetic AI doctor assistant on the UniCare healthcare platform.

PATIENT PROFILE (already known — NEVER ask for these again):
- Name: ${user.name}
- Age: ${user.age || 'Not specified'}
- Gender: ${user.gender || 'Not specified'}
- Blood Group: ${user.bloodGroup || 'Not specified'}
- Known Allergies: ${user.medicalHistory?.allergies || 'None'}
- Current Medications: ${user.medicalHistory?.currentMedications || 'None'}
- Chronic Conditions: ${user.medicalHistory?.chronicConditions || 'None'}

CONVERSATION RULES:
1. First message: Greet ${user.name?.split(' ')[0]} warmly by first name. Ask how they are feeling.
2. Ask ONE question at a time. Never ask multiple questions together.
3. Dig deeper: Ask about duration, severity (1-10), location, triggers, what makes it better/worse.
4. Be human — use empathetic phrases like "I understand", "That must be uncomfortable".
5. Never jump to diagnosis immediately. Build a full picture first (minimum 4 exchanges).
6. Use simple language. No complex medical jargon.
7. After gathering sufficient symptoms (4-6 exchanges), naturally say you have enough info and offer to generate a report.

REPORT GENERATION:
When the user says "yes generate report", "generate report", "create report", OR when you have gathered enough information, respond ONLY with this exact format — nothing before or after:

REPORT_READY:{"patientName":"${user.name}","age":"${user.age || 'N/A'}","gender":"${user.gender || 'N/A'}","symptoms":["symptom1","symptom2"],"possibleDiagnosis":["condition1","condition2"],"severityLevel":"Mild","recommendedAction":"Rest and home care / Consult a doctor within 24-48 hours / Seek emergency care immediately","additionalNotes":"any important notes here","disclaimer":"This is AI-based preliminary analysis only, not a final medical diagnosis."}

SEVERITY GUIDE: Mild = manageable at home, Moderate = needs doctor soon, Severe = urgent/emergency care.

Always be compassionate. You are talking to a real person who may be worried.
`.trim();

const getDoctorSystemPrompt = (user) => `
You are a clinical AI assistant integrated into UniCare, supporting Dr. ${user.name} (${user.specialization || 'General Practice'}).

DOCTOR PROFILE:
- Name: Dr. ${user.name}
- Specialization: ${user.specialization || 'General Practice'}
- Qualification: ${user.qualification || 'MBBS'}

YOUR ROLE:
1. Address as "Dr. ${user.name?.split(' ')[0]}" always.
2. Assist with: differential diagnosis, drug interactions, treatment protocols, ICD-10/11 codes, clinical summaries, dosage calculations, patient report interpretation.
3. Be concise and evidence-based. Doctors need fast, accurate info.
4. Use proper medical terminology. You can also explain complex cases.
5. When reviewing AI patient reports, provide clinical insights.
6. Always note when something requires further investigation or specialist referral.

This is AI-assisted clinical support. Final decisions rest with Dr. ${user.name}.
`.trim();

// ── POST /ai/chat ─────────────────────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim()) return res.badRequest('Message is required');

    const userType = req.auth.type;
    const userId = req.auth.id;

    const UserModel = userType === 'patient'
      ? require('../modal/Patient')
      : require('../modal/Doctor');
    const userDetails = await UserModel.findById(userId);
    if (!userDetails) return res.notFound('User not found');

    // Get or create session
    let session;
    if (sessionId) {
      session = await AIReport.findById(sessionId);
      if (!session || session.userId.toString() !== userId) {
        return res.notFound('Session not found');
      }
    } else {
      session = new AIReport({
        userId,
        userType: userType === 'patient' ? 'Patient' : 'Doctor',
        conversation: [],
      });
      await session.save();
    }

    const systemPrompt = userType === 'patient'
      ? getPatientSystemPrompt(userDetails)
      : getDoctorSystemPrompt(userDetails);

    // Add user message
    session.conversation.push({ role: 'user', content: message });

    const messages = session.conversation.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const aiResponse = await callAI(messages, systemPrompt);

    // Detect report trigger
    let reportData = null;
    let cleanResponse = aiResponse;

    if (aiResponse.includes('REPORT_READY:')) {
      const match = aiResponse.match(/REPORT_READY:(\{[\s\S]*?\})\s*$/m);
      if (match) {
        try {
          reportData = JSON.parse(match[1]);
          cleanResponse = "I've completed my assessment. I've generated your **medical report** — it's ready to view right here. I've also shared it with your doctor so they'll be prepared for your consultation. 💊";
        } catch (e) {
          console.error('Report JSON parse error:', e.message);
        }
      }
    }

    session.conversation.push({ role: 'assistant', content: cleanResponse });
    await session.save();

    // Auto-save report if generated
    if (reportData) {
      session.report = {
        patientName: userDetails.name,
        age: userDetails.age?.toString() || 'N/A',
        gender: userDetails.gender || 'N/A',
        symptoms: reportData.symptoms || [],
        possibleDiagnosis: reportData.possibleDiagnosis || [],
        severityLevel: reportData.severityLevel || 'Mild',
        recommendedAction: reportData.recommendedAction || '',
        additionalNotes: reportData.additionalNotes || '',
        generatedAt: new Date(),
      };
      session.isReportGenerated = true;
      await session.save();

      // ── Auto-share with doctor: attach to next scheduled appointment ──
      if (userType === 'patient') {
        const nextAppointment = await Appointment.findOne({
          patientId: userId,
          status: { $in: ['Scheduled', 'In Progress'] },
          slotStartIso: { $gte: new Date() },
        }).sort({ slotStartIso: 1 });

        if (nextAppointment) {
          nextAppointment.aiReportId = session._id;
          await nextAppointment.save();
        }
      }
    }

    res.ok({
      sessionId: session._id,
      response: cleanResponse,
      reportReady: !!reportData,
      reportData: reportData ? session.report : null,
    }, 'OK');

  } catch (error) {
    console.error('AI chat error:', error);
    res.serverError('AI service error', [error.message]);
  }
});

// ── GET /ai/reports — all reports for logged-in user ──────
router.get('/reports', authenticate, async (req, res) => {
  try {
    const reports = await AIReport.find({
      userId: req.auth.id,
      isReportGenerated: true,
    }).sort({ createdAt: -1 }).limit(20);
    res.ok(reports, 'Reports fetched');
  } catch (error) {
    res.serverError('Failed to fetch reports', [error.message]);
  }
});

// ── GET /ai/report/:id — single report ───────────────────
router.get('/report/:id', authenticate, async (req, res) => {
  try {
    const report = await AIReport.findById(req.params.id);
    if (!report) return res.notFound('Report not found');

    // Both patient (owner) and doctor (via appointment) can view
    const isOwner = report.userId.toString() === req.auth.id;
    let isDoctorWithAccess = false;

    if (req.auth.type === 'doctor' && !isOwner) {
      const appointment = await Appointment.findOne({
        doctorId: req.auth.id,
        aiReportId: report._id,
      });
      isDoctorWithAccess = !!appointment;
    }

    if (!isOwner && !isDoctorWithAccess) return res.forbidden('Access denied');

    res.ok(report, 'Report fetched');
  } catch (error) {
    res.serverError('Failed to fetch report', [error.message]);
  }
});

// ── GET /ai/appointment-report/:appointmentId — doctor gets patient AI report ──
router.get('/appointment-report/:appointmentId', authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('aiReportId');

    if (!appointment) return res.notFound('Appointment not found');

    if (req.auth.type === 'doctor' && appointment.doctorId.toString() !== req.auth.id) {
      return res.forbidden('Access denied');
    }
    if (req.auth.type === 'patient' && appointment.patientId.toString() !== req.auth.id) {
      return res.forbidden('Access denied');
    }

    if (!appointment.aiReportId) {
      return res.ok(null, 'No AI report for this appointment');
    }

    res.ok(appointment.aiReportId, 'AI report fetched');
  } catch (error) {
    res.serverError('Failed to fetch AI report', [error.message]);
  }
});

module.exports = router;