'use client';

/**
 * SignupOTPModal.tsx — UniCare Signup Email + Phone OTP Verification
 *
 * Shown after the signup form is submitted.
 * OTP is verified → account is created → user is logged in.
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, RefreshCw, X, Mail, Phone } from 'lucide-react';

interface SignupOTPModalProps {
  email: string;
  sentTo: { email: string; phone: string | null };
  onSuccess: (token: string, user: { id: string; type: string; name: string; email: string }) => void;
  onClose: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

const SignupOTPModal = ({ email, sentTo, onSuccess, onClose }: SignupOTPModalProps) => {
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setTimeout(() => inputsRef.current[0]?.focus(), 100);
  }, []);

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
    if (text.length === 6) { setOtp(text.split('')); inputsRef.current[5]?.focus(); }
    e.preventDefault();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API}/auth/otp/verify-signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp: code }),
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
      const res  = await fetch(`${API}/auth/otp/resend-signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
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
        <style>{`@keyframes otpIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-500 to-violet-600 px-8 py-7 text-white">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Verify your account</h2>
          <p className="text-violet-100 text-sm mt-1">One last step — enter the OTP to create your account.</p>
        </div>

        {/* Sent-to badges */}
        <div className="px-8 pt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-full text-xs font-medium text-violet-700">
            <Mail className="w-3 h-3" /> {sentTo.email}
          </span>
          {sentTo.phone && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-full text-xs font-medium text-violet-700">
              <Phone className="w-3 h-3" /> {sentTo.phone}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input key={i} ref={(el) => { inputsRef.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                  ${digit ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
                  focus:border-violet-500 focus:bg-violet-50 focus:ring-2 focus:ring-violet-100`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <button onClick={handleVerify} disabled={loading || otp.join('').length !== 6}
            className="w-full py-3.5 bg-gradient-to-b from-violet-500 to-violet-600 text-white font-semibold rounded-2xl
              shadow-lg shadow-violet-300/40 hover:from-violet-400 hover:to-violet-500 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating account…</>
              : <><UserCheck className="w-4 h-4" />Verify &amp; Create Account</>}
          </button>

          <div className="mt-4 text-center">
            {countdown > 0
              ? <p className="text-sm text-slate-400">Resend in <span className="font-semibold text-slate-600">{countdown}s</span></p>
              : <button onClick={handleResend} disabled={resending}
                  className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Resending…' : 'Resend OTP'}
                </button>}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Account will only be created after successful verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupOTPModal;