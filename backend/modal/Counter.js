/**
 * modal/Counter.js
 *
 * Stores the last-used sequence number per entity type.
 * findOneAndUpdate with $inc is atomic — safe under concurrent registrations.
 *
 * Documents created automatically on first use:
 *   { _id: 'patient', seq: 1 }
 *   { _id: 'doctor',  seq: 1 }
 */
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id:  { type: String, required: true },  // entity key: 'patient' | 'doctor'
  seq:  { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);