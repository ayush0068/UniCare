'use client';

/**
 * ForgotPasswordModal.tsx — UniCare Forgot Password
 * Step 1: Enter email
 * Step 2: Enter OTP (sent to email + phone if registered)
 * Step 3: Set new password
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, RefreshCw, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

type Step = 'email' | 'otp' | 'password' | 'done';

const ForgotPasswordModal = ({ onClose }: ForgotPasswordModalProps) => {
  const [step, setStep]               = useState<Step>('email');
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [resending, setResending]     = useState(false);
  const [error, setError]             = useState('');
  const [countdown, setCountdown]     = useState(0);
  const [sentTo, setSentTo]           = useState<{ email: string; phone: string | null }>({ email: '', phone: null });
  const [resetToken, setResetToken]   = useState('');

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 1: Send OTP ────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSentTo(data.data.sentTo);
        setStep('otp');
        setCountdown(60);
        setTimeout(() => inputsRef.current[0]?.focus(), 100);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/forgot-password/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), otp: code }),
      });
      const data = await res.json();
      if (data.success) {
        setResetToken(data.data.resetToken);
        setStep('password');
      } else {
        setError(data.message || 'Invalid OTP.');
        setOtp(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Step 3: Set new password ────────────────────────────────
  const handleSetPassword = async () => {
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPass) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/forgot-password/reset`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/forgot-password/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) { setCountdown(60); setOtp(['', '', '', '', '', '']); inputsRef.current[0]?.focus(); }
      else setError(data.message || 'Failed to resend.');
    } catch { setError('Network error.'); }
    finally { setResending(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp]; next[index] = value.slice(-1); setOtp(next); setError('');
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputsRef.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) { setOtp(text.split('')); inputsRef.current[5]?.focus(); }
    e.preventDefault();
  };

  const stepTitles: Record<Step, string> = {
    email:    'Forgot Password',
    otp:      'Enter OTP',
    password: 'Set New Password',
    done:     'Password Reset!',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'fpIn 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
        <style>{`@keyframes fpIn { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-7 text-white">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>

          {/* Step dots */}
          {step !== 'done' && (
            <div className="flex gap-1.5 mb-4">
              {(['email','otp','password'] as Step[]).map((s, i) => (
                <div key={s} className={`h-1 rounded-full transition-all duration-300 ${
                  step === s ? 'w-6 bg-sky-400' : i < ['email','otp','password'].indexOf(step) ? 'w-3 bg-sky-600' : 'w-3 bg-white/20'
                }`} />
              ))}
            </div>
          )}

          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
            {step === 'done' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-white" />}
          </div>
          <h2 className="text-xl font-bold">{stepTitles[step]}</h2>
          <p className="text-slate-400 text-sm mt-1">
            {step === 'email'    && 'Enter your registered email to receive an OTP.'}
            {step === 'otp'      && <>OTP sent to <span className="text-white font-medium">{sentTo.email}</span>{sentTo.phone && <> & <span className="text-white font-medium">{sentTo.phone}</span></>}</>}
            {step === 'password' && 'OTP verified. Now set your new password.'}
            {step === 'done'     && 'Your password has been reset successfully.'}
          </p>
        </div>

        <div className="px-8 py-7">

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-sky-500 transition-colors">
                  <Mail className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                    placeholder="you@example.com"
                    className="flex-1 pl-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none bg-transparent"
                    autoFocus
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={handleSendOTP} disabled={loading}
                className="w-full py-3.5 bg-gradient-to-b from-slate-700 to-slate-800 text-white font-semibold rounded-2xl
                  hover:from-slate-600 hover:to-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending OTP…</>
                  : 'Send OTP'}
              </button>
            </div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={el => { inputsRef.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                      ${digit ? 'border-slate-700 bg-slate-50 text-slate-900' : 'border-slate-200 bg-slate-50'}
                      focus:border-slate-700 focus:ring-2 focus:ring-slate-100`}
                  />
                ))}
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <button onClick={handleVerifyOTP} disabled={loading || otp.join('').length !== 6}
                className="w-full py-3.5 bg-gradient-to-b from-slate-700 to-slate-800 text-white font-semibold rounded-2xl
                  hover:from-slate-600 hover:to-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Verifying…</>
                  : 'Verify OTP'}
              </button>
              <div className="text-center">
                {countdown > 0
                  ? <p className="text-sm text-slate-400">Resend in <span className="font-semibold text-slate-600">{countdown}s</span></p>
                  : <button onClick={handleResend} disabled={resending}
                      className="inline-flex items-center gap-1.5 text-sm text-slate-600 font-semibold hover:text-slate-800 transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      {resending ? 'Resending…' : 'Resend OTP'}
                    </button>}
              </div>
            </div>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'password' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-sky-500 transition-colors">
                  <Lock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <input type={showPass ? 'text' : 'password'} value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="Min. 6 characters"
                    className="flex-1 pl-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none bg-transparent pr-8"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-sky-500 transition-colors">
                  <Lock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPass}
                    onChange={e => { setConfirmPass(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                    placeholder="Re-enter password"
                    className="flex-1 pl-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none bg-transparent pr-8"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={handleSetPassword} disabled={loading}
                className="w-full py-3.5 bg-gradient-to-b from-slate-700 to-slate-800 text-white font-semibold rounded-2xl
                  hover:from-slate-600 hover:to-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Resetting…</>
                  : 'Reset Password'}
              </button>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-slate-500 text-sm">You can now sign in with your new password.</p>
              <button onClick={onClose}
                className="w-full py-3.5 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl
                  hover:from-emerald-400 hover:to-emerald-500 transition-all">
                Back to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;