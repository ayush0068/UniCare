'use client';

/**
 * OTPModal.tsx — UniCare Login OTP Verification
 *
 * Shown immediately after successful credentials check.
 * Handles 6-digit OTP entry, countdown timer, and resend.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, RefreshCw, X } from 'lucide-react';

interface OTPModalProps {
  tempToken: string;
  sentTo: { email: string; phone: string | null };
  onSuccess: (token: string, user: { id: string; type: string; name: string; email: string }) => void;
  onClose: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

const OTPModal = ({ tempToken, sentTo, onSuccess, onClose }: OTPModalProps) => {
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(60);
  const [currentTemp, setCurrentTemp] = useState(tempToken);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError('');
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputsRef.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/auth/otp/verify-login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tempToken: currentTemp, otp: code }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.data.token, data.data.user);
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError('');
    try {
      const res  = await fetch(`${API}/auth/otp/resend-login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tempToken: currentTemp }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTemp(data.data.tempToken);
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      } else {
        setError(data.message || 'Failed to resend OTP.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'otpIn 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
        <style>{`
          @keyframes otpIn {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-sky-500 to-sky-600 px-8 py-7 text-white">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Verify it's you</h2>
          <p className="text-sky-100 text-sm mt-1">
            We sent a 6-digit OTP to{' '}
            <span className="font-semibold text-white">{sentTo.email}</span>
            {sentTo.phone && (
              <> and <span className="font-semibold text-white">{sentTo.phone}</span></>
            )}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          {/* OTP inputs */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-150
                  ${digit ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
                  focus:border-sky-500 focus:bg-sky-50 focus:ring-2 focus:ring-sky-100`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="w-full py-3.5 bg-gradient-to-b from-sky-500 to-sky-600 text-white font-semibold rounded-2xl
              shadow-lg shadow-sky-300/40 hover:from-sky-400 hover:to-sky-500 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verifying…
              </>
            ) : 'Verify OTP'}
          </button>

          {/* Resend */}
          <div className="mt-5 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-slate-400">
                Resend OTP in <span className="font-semibold text-slate-600">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Resending…' : 'Resend OTP'}
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed">
            Check your spam folder if you don't see the email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;