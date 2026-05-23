/**
 * utils/otpStore.js — In-memory OTP store for UniCare
 * Supports both email and phone as keys.
 * TTL: 10 minutes. One-time use (deleted on successful verify).
 * Cleanup: expired entries purged every 15 minutes.
 */

const otpMap = new Map(); // key → { otp, expiresAt, attempts }

const OTP_TTL_MS      = 10 * 60 * 1000;  // 10 min
const MAX_ATTEMPTS    = 5;
const RESEND_COOLDOWN = 60 * 1000;        // 1 min between resends

/**
 * Generate and store a 6-digit OTP for the given key.
 * Enforces a 1-minute resend cooldown.
 * Returns { otp, cooldown: false } or { otp: null, cooldown: true }
 */
const generateOTP = (key) => {
  const existing = otpMap.get(key);
  if (existing && Date.now() < existing.expiresAt) {
    const elapsed = Date.now() - (existing.expiresAt - OTP_TTL_MS);
    if (elapsed < RESEND_COOLDOWN) {
      return { otp: null, cooldown: true, waitMs: RESEND_COOLDOWN - elapsed };
    }
  }

  const otp      = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;
  otpMap.set(key, { otp, expiresAt, attempts: 0 });
  return { otp, cooldown: false };
};

/**
 * Verify OTP for the given key.
 * Returns { valid: true } or { valid: false, reason: string }
 */
const verifyOTP = (key, inputOtp) => {
  const record = otpMap.get(key);
  if (!record) return { valid: false, reason: 'No OTP found. Please request a new one.' };
  if (Date.now() > record.expiresAt) {
    otpMap.delete(key);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpMap.delete(key);
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }
  if (record.otp !== inputOtp.toString().trim()) {
    record.attempts += 1;
    otpMap.set(key, record);
    const left = MAX_ATTEMPTS - record.attempts;
    return { valid: false, reason: `Invalid OTP. ${left} attempt${left === 1 ? '' : 's'} remaining.` };
  }
  otpMap.delete(key); // one-time use
  return { valid: true };
};

/** Check if an OTP is pending (without consuming it) */
const hasPendingOTP = (key) => {
  const record = otpMap.get(key);
  return !!(record && Date.now() < record.expiresAt);
};

// Cleanup expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpMap.entries()) {
    if (now > v.expiresAt) otpMap.delete(k);
  }
}, 15 * 60 * 1000);

module.exports = { generateOTP, verifyOTP, hasPendingOTP };