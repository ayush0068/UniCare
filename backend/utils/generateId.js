/**
 * utils/generateId.js
 *
 * UniCare Custom ID Generator
 * ───────────────────────────
 *
 * FORMAT
 * ──────
 *   Patient  →  UC-PT-YY-NNNNN
 *   Doctor   →  UC-DR-YY-NNNNN
 *
 * BREAKDOWN
 *   UC      UniCare platform prefix
 *   PT/DR   Entity shortform  (PT = Patient, DR = Doctor)
 *   YY      2-digit registration year  (25 = 2025)
 *   NNNNN   5-digit zero-padded per-year sequence  (00001 → 99999)
 *
 * EXAMPLES
 *   UC-PT-25-00001   First patient registered in 2025
 *   UC-PT-25-00042   42nd patient registered in 2025
 *   UC-DR-25-00001   First doctor registered in 2025
 *   UC-DR-25-00008   8th doctor registered in 2025
 *
 * The counter key is scoped by entity + year so sequences reset each year.
 * e.g. counter key  "patient_25"  →  UC-PT-25-NNNNN
 *      counter key  "doctor_25"   →  UC-DR-25-NNNNN
 *
 * Why this design?
 *   - Human-readable and clearly branded
 *   - PT vs DR makes entity type obvious at a glance
 *   - Year prefix lets support staff instantly know when someone joined
 *   - 5-digit sequence supports 99,999 registrations per year per type
 *   - Atomic $inc on Counter prevents duplicate IDs under concurrent load
 */

const Counter = require('../modal/Counter');

/**
 * Returns the next sequential UniCare ID for the given entity.
 *
 * @param {'patient'|'doctor'} entity
 * @returns {Promise<string>}  e.g. "UC-PT-25-00001"
 */
async function generateUniCareId(entity) {
  const yy = new Date().getFullYear().toString().slice(-2); // "25"
  const counterKey = `${entity}_${yy}`;                    // "patient_25"

  // Atomic increment — safe under concurrent requests
  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq    = String(counter.seq).padStart(5, '0');      // "00001"
  const prefix = entity === 'doctor' ? 'DR' : 'PT';        // "DR" | "PT"

  return `UC${prefix}${yy}${seq}`;                      // "UC-PT-25-00001"
}

module.exports = { generateUniCareId };