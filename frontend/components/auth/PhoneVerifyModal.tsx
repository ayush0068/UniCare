'use client';

/**
 * PhoneVerifyModal.tsx — UniCare Phone Number OTP Verification
 *
 * Used from the profile page when a user adds/changes their phone number.
 * Sends OTP to both email and the new phone number.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Phone, RefreshCw, X, CheckCircle } from 'lucide-react';
import { postWithAuth } from '@/service/httpService';

interface PhoneVerifyModalProps {
  phone: string;
  onSuccess: (phone: string) => void;
  onClose: () => void;
}

const PhoneVerifyModal = ({ phone, onSuccess, onClose }: PhoneVerifyModalProps) => {
  const [step, setStep]           = useState<'send' | 'verify'>('send');
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sent, setSent]           = useState<{ email: string; phone: string } | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await postWithAuth('/auth/otp/send-phone', { phone });
      if (res.success) {
        setSent(res.data.sentTo);
        setStep('verify');
        setCountdown(60);
        setTimeout(() => inputsRef.current[0]?.focus(), 100);
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (e: any) {
      setError(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

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
      const res = await postWithAuth('/auth/otp/verify-phone', { otp: code, phone });
      if (res.success) {
        onSuccess(phone);
      } else {
        setError(res.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } catch (e: any) {
      setError(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setError('');
    try {
      const res = await postWithAuth('/auth/otp/send-phone', { phone });
      if (res.success) { setCountdown(60); setOtp(['', '', '', '', '', '']); inputsRef.current[0]?.focus(); }
      else setError(res.message || 'Failed to resend.');
    } catch (e: any) { setError(e.message || 'Network error.'); }
    finally { setResending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'otpIn 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
        <style>{`@keyframes otpIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-7 text-white">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Verify Phone Number</h2>
          <p className="text-emerald-100 text-sm mt-1">
            {step === 'send'
              ? `We'll send an OTP to ${phone} and your registered email.`
              : `OTP sent to ${sent?.email}${sent?.phone ? ` and ${sent.phone}` : ''}`}
          </p>
        </div>

        <div className="px-8 py-7">
          {step === 'send' ? (
            <>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Tap the button below to send a verification OTP to your phone number{' '}
                <span className="font-semibold text-slate-800">{phone}</span> and your registered email.
              </p>
              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl
                  shadow-lg shadow-emerald-300/40 hover:from-emerald-400 hover:to-emerald-500 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending…</>
                ) : <><Phone className="w-4 h-4" />Send Verification OTP</>}
              </button>
              {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
            </>
          ) : (
            <>
              <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={(el) => { inputsRef.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                      ${digit ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
                      focus:border-emerald-500 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-100`}
                  />
                ))}
              </div>

              {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm text-center">{error}</div>}

              <button onClick={handleVerify} disabled={loading || otp.join('').length !== 6}
                className="w-full py-3.5 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-semibold rounded-2xl
                  shadow-lg shadow-emerald-300/40 hover:from-emerald-400 hover:to-emerald-500 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Verifying…</>
                ) : <><CheckCircle className="w-4 h-4" />Verify Phone</>}
              </button>

              <div className="mt-4 text-center">
                {countdown > 0
                  ? <p className="text-sm text-slate-400">Resend in <span className="font-semibold text-slate-600">{countdown}s</span></p>
                  : <button onClick={handleResend} disabled={resending}
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      {resending ? 'Resending…' : 'Resend OTP'}
                    </button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneVerifyModal;