// ─────────────────────────────────────────────────────────────────────────
// Mobile App AI Assistant (Flutter) — NEW, ADDITIVE FILE
// ─────────────────────────────────────────────────────────────────────────
// This is a completely separate route from routes/aiAssistant.js (which the
// React website already uses and which is left 100% untouched). It reuses
// the same OpenRouter-backed `callAI` util and the same `AIReport` model,
// but is mounted on its own path (/api/mobile-ai) so nothing about the
// website's existing AI Assistant behaviour changes.
//
// What this adds for the Flutter app:
//   1. A chat endpoint that talks to the patient OR doctor differently,
//      based on the logged-in profile (same idea as the website's
//      assistant, kept independent here on purpose).
//   2. Symptom -> specialization mapping: once the AI has gathered enough
//      info from a patient, it returns a `recommendedSpecialization`
//      (restricted to the exact enum your Doctor model already uses) PLUS
//      a short list of real, verified doctors in that specialization
//      pulled straight from Mongo — so the app can show "Book with these
//      doctors" cards right inside the chat.
//   3. Reuses your existing GET /api/ai/reports and GET /api/ai/report/:id
//      endpoints for history — no need to duplicate those (they're already
//      generic enough and already access-controlled correctly).
// ─────────────────────────────────────────────────────────────────────────

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { callAI } = require('../utils/aiProvider');
const AIReport = require('../modal/AIReport');
const Doctor = require('../modal/Doctor');
const Appointment = require('../modal/Appointment');
const router = express.Router();

// Must exactly match the `specialization` enum in modal/Doctor.js so the
// recommendation the AI gives is always something we can actually query for.
const SPECIALIZATIONS = [
  'Cardiologist', 'Dermatologist', 'Orthopedic', 'Pediatrician', 'Neurologist',
  'Gynecologist', 'General Physician', 'ENT Specialist', 'Psychiatrist', 'Ophthalmologist',
];

// ── System prompts ────────────────────────────────────────

const getPatientSystemPrompt = (user) => `
You are Dr. UniCare AI — a warm, intelligent, empathetic AI health assistant inside the UniCare mobile app.

PATIENT PROFILE (already known — NEVER ask for these again):
- Name: ${user.name}
- Age: ${user.age || 'Not specified'}
- Gender: ${user.gender || 'Not specified'}
- Blood Group: ${user.bloodGroup || 'Not specified'}
- Known Allergies: ${user.medicalHistory?.allergies || 'None'}
- Current Medications: ${user.medicalHistory?.currentMedications || 'None'}
- Chronic Conditions: ${user.medicalHistory?.chronicConditions || 'None'}

CONVERSATION RULES:
1. First message: greet ${user.name?.split(' ')[0]} warmly by first name and ask how they're feeling.
2. Ask ONE question at a time. Never ask multiple questions together.
3. Dig deeper naturally: duration, severity (1-10), location, triggers, what makes it better/worse.
4. Be human — use empathetic phrases like "I understand", "that sounds uncomfortable".
5. Never jump to conclusions immediately — build a full picture first (minimum 3-4 exchanges).
6. Use simple language, no heavy medical jargon.
7. Once you have enough information (or the user asks for a report/recommendation), decide which ONE specialization from this exact list best fits their symptoms:
   [${SPECIALIZATIONS.join(', ')}]
   Use "General Physician" whenever you are unsure or the symptoms are general/non-specific.

REPORT GENERATION:
When you have gathered enough information, OR the user says something like "yes generate report", "recommend a doctor", "what doctor should I see", respond ONLY with this exact format — nothing before or after, no markdown fences:

REPORT_READY:{"symptoms":["symptom1","symptom2"],"possibleDiagnosis":["condition1","condition2"],"severityLevel":"Mild","recommendedAction":"Rest and home care / Consult a doctor within 24-48 hours / Seek emergency care immediately","recommendedSpecialization":"General Physician","additionalNotes":"any important notes here","disclaimer":"This is AI-based preliminary analysis only, not a final medical diagnosis."}

- "recommendedSpecialization" MUST be exactly one value from the list above (copy the spelling exactly).
- SEVERITY GUIDE: Mild = manageable at home, Moderate = should see a doctor soon, Severe = urgent/emergency care — for Severe, always tell the user to seek in-person emergency care immediately, do not just rely on the app.

Always be compassionate — you're talking to a real person who may be worried.
`.trim();

const getDoctorSystemPrompt = (user) => `
You are a clinical AI assistant integrated into the UniCare mobile app, supporting Dr. ${user.name} (${user.specialization || 'General Practice'}).

DOCTOR PROFILE:
- Name: Dr. ${user.name}
- Specialization: ${user.specialization || 'General Practice'}
- Qualification: ${user.qualification || 'MBBS'}

YOUR ROLE:
1. Address the doctor as "Dr. ${user.name?.split(' ')[0]}".
2. Assist with: differential diagnosis, drug interactions, treatment protocols, ICD-10/11 codes, clinical summaries, dosage calculations, and interpreting patient-submitted AI reports.
3. Be concise and evidence-based — doctors need fast, accurate information.
4. Proper medical terminology is fine here.
5. Always flag when something needs further investigation or specialist referral.

This is AI-assisted clinical support only. Final decisions always rest with Dr. ${user.name}.
`.trim();

// ── Helper: find real, bookable doctors for a recommended specialization ──
async function findRecommendedDoctors(specialization, excludeDoctorId) {
  if (!SPECIALIZATIONS.includes(specialization)) return [];
  const query = { specialization, isVerified: true, isActive: true };
  if (excludeDoctorId) query._id = { $ne: excludeDoctorId };

  const doctors = await Doctor.find(query)
    .select('name specialization qualification experience fees profileImage hospitalInfo')
    .sort({ experience: -1 })
    .limit(5);

  return doctors.map((d) => ({
    doctorId: d._id,
    name: d.name,
    specialization: d.specialization,
    qualification: d.qualification || '',
    experience: d.experience || 0,
    fees: d.fees || 0,
    profileImage: d.profileImage || '',
    hospitalCity: d.hospitalInfo?.city || '',
  }));
}

// ── POST /mobile-ai/chat ───────────────────────────────────
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim()) return res.badRequest('Message is required');

    const userType = req.auth.type; // 'patient' | 'doctor'
    const userId = req.auth.id;

    const UserModel = userType === 'patient'
      ? require('../modal/Patient')
      : require('../modal/Doctor');
    const userDetails = await UserModel.findById(userId);
    if (!userDetails) return res.notFound('User not found');

    // Get or create session (kept in the same AIReport collection the
    // website uses — sessions are just documents, this doesn't collide
    // with or alter any session created from the website).
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

    session.conversation.push({ role: 'user', content: message });

    const messages = session.conversation.map((m) => ({ role: m.role, content: m.content }));
    const aiResponse = await callAI(messages, systemPrompt);

    let reportData = null;
    let recommendedDoctors = [];
    let cleanResponse = aiResponse;

    if (aiResponse.includes('REPORT_READY:')) {
      const match = aiResponse.match(/REPORT_READY:(\{[\s\S]*?\})\s*$/m);
      if (match) {
        try {
          reportData = JSON.parse(match[1]);
          const specLabel = reportData.recommendedSpecialization || 'a specialist';
          cleanResponse = `I've completed my assessment. Based on what you've shared, I'd recommend seeing a **${specLabel}**. I've generated your report and pulled up a few verified doctors you can book with right away.`;
        } catch (e) {
          console.error('Mobile AI report JSON parse error:', e.message);
        }
      }
    }

    session.conversation.push({ role: 'assistant', content: cleanResponse });

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
        // Additive-only fields — existing website report viewer simply
        // ignores these since it doesn't read them.
        recommendedSpecialization: reportData.recommendedSpecialization || '',
        generatedAt: new Date(),
      };
      session.isReportGenerated = true;

      if (userType === 'patient' && reportData.recommendedSpecialization) {
        recommendedDoctors = await findRecommendedDoctors(reportData.recommendedSpecialization);
        session.report.recommendedDoctors = recommendedDoctors.map((d) => ({
          doctorId: d.doctorId,
          name: d.name,
          specialization: d.specialization,
          fees: d.fees,
        }));
      }

      await session.save();

      // Same auto-share-with-doctor behaviour as the website assistant.
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
    } else {
      await session.save();
    }

    res.ok({
      sessionId: session._id,
      response: cleanResponse,
      reportReady: !!reportData,
      reportData: reportData ? session.report : null,
      recommendedDoctors,
    }, 'OK');
  } catch (error) {
    console.error('Mobile AI chat error:', error);
    res.serverError('AI service error', [error.message]);
  }
});

// ── POST /mobile-ai/recommend-doctors ───────────────────────
// Lightweight helper the app can call any time it already has a
// specialization string (e.g. from a previously generated report) and just
// wants a fresh list of bookable doctors for it.
router.post('/recommend-doctors', authenticate, async (req, res) => {
  try {
    const { specialization } = req.body;
    if (!specialization || !SPECIALIZATIONS.includes(specialization)) {
      return res.badRequest(`specialization must be one of: ${SPECIALIZATIONS.join(', ')}`);
    }
    const doctors = await findRecommendedDoctors(specialization);
    res.ok(doctors, 'Recommended doctors fetched');
  } catch (error) {
    res.serverError('Failed to fetch recommended doctors', [error.message]);
  }
});

module.exports = router;