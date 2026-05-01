/**
 * scripts/migrateIds.js
 *
 * One-time migration: assigns UC-PT / UC-DR IDs to all existing
 * patients and doctors that don't yet have a ucId.
 *
 * Run ONCE after deploying the updated models:
 *   node scripts/migrateIds.js
 *
 * Safe to re-run — it skips records that already have a ucId.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Import updated models ─────────────────────────────────
const Patient = require('../modal/Patient');
const Doctor  = require('../modal/Doctor');
const Counter = require('../modal/Counter');

// ── ID generator (inline copy, avoids circular imports) ───
async function generateId(entity, yy) {
  const counterKey = `${entity}_${yy}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq    = String(counter.seq).padStart(5, '0');
  const prefix = entity === 'doctor' ? 'DR' : 'PT';
  return `UC-${prefix}-${yy}-${seq}`;
}

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  MongoDB connected\n');

  // ── Patients ────────────────────────────────────────────
  const patients = await Patient.find({ ucId: { $exists: false } }).sort({ createdAt: 1 });
  console.log(`👥  Patients without ucId: ${patients.length}`);

  for (const p of patients) {
    const yy  = p.createdAt
      ? new Date(p.createdAt).getFullYear().toString().slice(-2)
      : new Date().getFullYear().toString().slice(-2);
    p.ucId = await generateId('patient', yy);
    await Patient.updateOne({ _id: p._id }, { $set: { ucId: p.ucId } });
    console.log(`  ✓ ${p.name.padEnd(28)} → ${p.ucId}`);
  }

  // ── Doctors ─────────────────────────────────────────────
  const doctors = await Doctor.find({ ucId: { $exists: false } }).sort({ createdAt: 1 });
  console.log(`\n🩺  Doctors without ucId: ${doctors.length}`);

  for (const d of doctors) {
    const yy = d.createdAt
      ? new Date(d.createdAt).getFullYear().toString().slice(-2)
      : new Date().getFullYear().toString().slice(-2);
    d.ucId = await generateId('doctor', yy);
    await Doctor.updateOne({ _id: d._id }, { $set: { ucId: d.ucId } });
    console.log(`  ✓ ${d.name.padEnd(28)} → ${d.ucId}`);
  }

  console.log('\n✅  Migration complete');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});