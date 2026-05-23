/**
 * utils/smsService.js — Twilio SMS for UniCare
 *
 * Uses Twilio to send real OTP SMS.
 * Works identically on localhost and production.
 *
 * Required .env variables:
 *   TWILIO_ACCOUNT_SID   — from https://console.twilio.com
 *   TWILIO_AUTH_TOKEN    — from https://console.twilio.com
 *   TWILIO_PHONE_NUMBER  — your Twilio number e.g. +14155552671
 *
 * If Twilio env vars are not set, the service logs a warning and throws.
 * Never falls back to console logging.
 */

const sendSMS = async ({ to, message }) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error(
      'Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file.'
    );
  }

  // Lazy-load twilio so startup doesn't fail if package isn't installed yet
  const twilio = require('twilio');
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: message,
    from: TWILIO_PHONE_NUMBER,
    to,
  });
};

module.exports = { sendSMS };