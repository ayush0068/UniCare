'use client'

import { userAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';
import { Eye, EyeOff, Stethoscope, Heart, ShieldCheck, Star, Clock, ArrowRight, User, Lock, Mail } from 'lucide-react';

interface AuthFormProps {
  type: 'login' | 'signup';
  userRole: 'patient' | 'doctor';
}

/* ─── Patient left-panel content ─── */
const PATIENT_HIGHLIGHTS = [
  { icon: '🩺', text: '500+ verified specialists' },
  { icon: '⚡', text: 'Book in under 60 seconds' },
  { icon: '🔒', text: 'Your data is private & secure' },
  { icon: '💬', text: 'HD video consultations' },
];

/* ─── Doctor left-panel content ─── */
const DOCTOR_HIGHLIGHTS = [
  { icon: '📅', text: 'Manage your schedule effortlessly' },
  { icon: '👥', text: 'Reach thousands of patients' },
  { icon: '💳', text: 'Fast & transparent payouts' },
  { icon: '📊', text: 'Analytics & appointment insights' },
];

const AuthForm = ({ type, userRole }: AuthFormProps) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const { registerDoctor, registerPatient, loginDoctor, loginPatient, loading, error } = userAuthStore();
  const router = useRouter();

  const isSignUp = type === 'signup';
  const isDoctor = userRole === 'doctor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !agreeTerms) return;
    try {
      if (isSignUp) {
        if (isDoctor) {
          await registerDoctor({ name: formData.name, email: formData.email, password: formData.password });
        } else {
          await registerPatient({ name: formData.name, email: formData.email, password: formData.password });
        }
        router.push(`/onboarding/${userRole}`);
      } else {
        if (isDoctor) {
          await loginDoctor(formData.email, formData.password);
          router.push('/doctor/dashboard');
        } else {
          await loginPatient(formData.email, formData.password);
          router.push('/patient/dashboard');
        }
      }
    } catch (err) {
      console.error(`${type} failed:`, err);
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?type=${userRole}`;
  };

  const altLinkPath = isSignUp ? `/login/${userRole}` : `/signup/${userRole}`;

  /* ─────────────────────────── Render ─────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&display=swap');
        .uc-font  { font-family: 'DM Sans', system-ui, sans-serif; }
        .uc-serif { font-family: 'Fraunces', Georgia, serif; }

        @keyframes panel-slide {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes form-rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .panel-animate { animation: panel-slide 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .form-animate  { animation: form-rise  0.55s cubic-bezier(0.16,1,0.3,1) 0.15s both; }

        @keyframes highlight-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .hl-item { animation: highlight-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        /* Custom input underline focus */
        .uc-input {
          border: none;
          border-bottom: 2px solid;
          border-radius: 0;
          background: transparent;
          padding-left: 2rem;
          transition: border-color 0.2s ease;
          outline: none !important;
          box-shadow: none !important;
        }
        .uc-input:focus { outline: none !important; box-shadow: none !important; }

        @keyframes error-shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-5px); }
          40%,80% { transform: translateX(5px); }
        }
        .error-shake { animation: error-shake 0.4s ease; }

        .submit-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }

        @keyframes blob-dr {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(12px,-10px) scale(1.06); }
        }
        .blob-animate { animation: blob-dr 8s ease-in-out infinite; }
        .blob-animate-alt { animation: blob-dr 10s ease-in-out infinite reverse 2s; }
      `}</style>

      <div className='uc-font min-h-screen flex'>

        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        {isDoctor ? (
          /* ── Doctor Panel: Deep slate, authoritative ── */
          <div className='panel-animate hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between bg-slate-950 relative overflow-hidden px-12 py-12'>
            {/* Background elements */}
            <div className='blob-animate absolute top-[-80px] right-[-60px] w-80 h-80 bg-sky-500/8 rounded-full blur-3xl pointer-events-none' />
            <div className='blob-animate-alt absolute bottom-[-60px] left-[-40px] w-64 h-64 bg-blue-600/6 rounded-full blur-2xl pointer-events-none' />

            {/* Grid texture */}
            <div className='absolute inset-0 opacity-[0.04]' style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

            {/* Logo */}
            <div className='relative z-10 flex items-center gap-2.5'>
              <div className='w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30'>
                <Stethoscope className='w-4 h-4 text-white' />
              </div>
              <span className='uc-serif text-[18px] font-bold text-white'>
                Uni<span className='text-sky-400'>Care</span>
                <sup className='text-slate-500 font-light text-[11px]'>+</sup>
              </span>
            </div>

            {/* Main copy */}
            <div className='relative z-10 space-y-6'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-4'>For Medical Professionals</p>
                <h2 className='uc-serif text-4xl xl:text-5xl font-bold text-white leading-[1.08] tracking-tight'>
                  Practice smarter.<br />
                  <em className='not-italic text-sky-400'>Reach further.</em>
                </h2>
                <p className='mt-4 text-slate-400 text-sm leading-relaxed max-w-xs'>
                  Join hundreds of verified doctors who manage their practice, consult patients, and grow their reputation on UniCare+.
                </p>
              </div>

              <div className='space-y-3'>
                {DOCTOR_HIGHLIGHTS.map((item, i) => (
                  <div
                    key={i}
                    className='hl-item flex items-center gap-3'
                    style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                  >
                    <div className='w-9 h-9 bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-center flex-shrink-0 text-base'>
                      {item.icon}
                    </div>
                    <span className='text-slate-300 text-sm font-medium'>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Credential badge */}
              <div className='inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3'>
                <ShieldCheck className='w-4 h-4 text-sky-400 flex-shrink-0' />
                <span className='text-sky-300 text-xs font-semibold'>All doctors are verified & credentialed</span>
              </div>
            </div>

            {/* Bottom stat */}
            <div className='relative z-10 grid grid-cols-3 gap-4 pt-8 border-t border-slate-800/60'>
              {[{ v: '500+', l: 'Doctors' }, { v: '50K+', l: 'Patients' }, { v: '4.9★', l: 'Rating' }].map((s) => (
                <div key={s.l} className='text-center'>
                  <p className='uc-serif text-xl font-bold text-white'>{s.v}</p>
                  <p className='text-[11px] text-slate-500 font-medium mt-0.5'>{s.l}</p>
                </div>
              ))}
            </div>
          </div>

        ) : (
          /* ── Patient Panel: Warm cream, approachable ── */
          <div className='panel-animate hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between bg-[#F0F7FF] relative overflow-hidden px-12 py-12'>
            {/* Soft blobs */}
            <div className='blob-animate absolute top-[-60px] right-[-40px] w-72 h-72 bg-sky-200/60 rounded-full blur-3xl pointer-events-none' />
            <div className='blob-animate-alt absolute bottom-[-40px] left-0 w-56 h-56 bg-blue-100/80 rounded-full blur-2xl pointer-events-none' />

            {/* Dot grid */}
            <div className='absolute inset-0 opacity-30' style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            {/* Logo */}
            <div className='relative z-10 flex items-center gap-2.5'>
              <div className='w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center shadow-md shadow-sky-200'>
                <Stethoscope className='w-4 h-4 text-white' />
              </div>
              <span className='uc-serif text-[18px] font-bold text-slate-900'>
                Uni<span className='text-sky-500'>Care</span>
                <sup className='text-slate-400 font-light text-[11px]'>+</sup>
              </span>
            </div>

            {/* Main copy */}
            <div className='relative z-10 space-y-6'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-widest text-sky-500 mb-4'>For Patients</p>
                <h2 className='uc-serif text-4xl xl:text-5xl font-bold text-slate-900 leading-[1.08] tracking-tight'>
                  Your health,<br />
                  <em className='not-italic text-sky-500'>your terms.</em>
                </h2>
                <p className='mt-4 text-slate-500 text-sm leading-relaxed max-w-xs'>
                  Get expert medical advice from the comfort of your home. Book instantly, consult confidently.
                </p>
              </div>

              <div className='space-y-3'>
                {PATIENT_HIGHLIGHTS.map((item, i) => (
                  <div
                    key={i}
                    className='hl-item flex items-center gap-3'
                    style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                  >
                    <div className='w-9 h-9 bg-white border border-sky-100 shadow-sm rounded-xl flex items-center justify-center flex-shrink-0 text-base'>
                      {item.icon}
                    </div>
                    <span className='text-slate-700 text-sm font-medium'>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Testimonial snippet */}
              <div className='bg-white rounded-2xl p-4 border border-sky-100 shadow-sm'>
                <div className='flex gap-0.5 mb-2'>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className='w-3.5 h-3.5 text-amber-400 fill-amber-400' />
                  ))}
                </div>
                <p className='text-slate-600 text-xs leading-relaxed italic'>
                  "Booked a cardiologist in minutes. The video call was crystal clear and the doctor was amazing."
                </p>
                <p className='text-[11px] text-slate-400 font-semibold mt-2'>— Priya S., Mumbai</p>
              </div>
            </div>

            {/* Bottom live badge */}
            <div className='relative z-10 flex items-center gap-3 bg-white border border-sky-100 shadow-sm rounded-2xl px-4 py-3'>
              <span className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0' />
              <span className='text-sm font-semibold text-slate-700'>Doctors available right now</span>
              <span className='ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg'>Live</span>
            </div>
          </div>
        )}

        {/* ═══════════════ RIGHT: FORM PANEL ═══════════════ */}
        <div className={`flex-1 flex items-center justify-center px-6 py-12 ${isDoctor ? 'bg-white' : 'bg-white'}`}>
          <div className='form-animate w-full max-w-md'>

            {/* Mobile logo */}
            <div className='lg:hidden flex items-center gap-2 mb-8'>
              <div className='w-7 h-7 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center'>
                <Stethoscope className='w-3.5 h-3.5 text-white' />
              </div>
              <span className='uc-serif text-lg font-bold text-slate-900'>
                Uni<span className='text-sky-500'>Care</span><sup className='text-slate-400 font-light text-[10px]'>+</sup>
              </span>
            </div>

            {/* Role indicator pill */}
            <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 ${
              isDoctor
                ? 'bg-slate-900 text-sky-400 border border-slate-700'
                : 'bg-sky-50 text-sky-600 border border-sky-100'
            }`}>
              {isDoctor ? <Stethoscope className='w-3.5 h-3.5' /> : <Heart className='w-3.5 h-3.5' />}
              {isDoctor ? 'Doctor Portal' : 'Patient Portal'}
            </div>

            {/* Heading */}
            <div className='mb-8'>
              <h1 className='uc-serif text-3xl font-bold text-slate-900 leading-tight'>
                {isSignUp
                  ? (isDoctor ? 'Join as a Doctor' : 'Create Your Account')
                  : (isDoctor ? 'Welcome Back, Doctor' : 'Welcome Back')}
              </h1>
              <p className='text-slate-500 text-sm mt-2'>
                {isSignUp
                  ? (isDoctor ? 'Start seeing patients on UniCare+ today.' : 'Access quality healthcare from anywhere.')
                  : 'Sign in to continue to your dashboard.'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className='error-shake mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl'>
                <div className='w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-red-500 text-xs font-bold'>!</span>
                </div>
                <p className='text-red-700 text-sm leading-relaxed'>{error}</p>
              </div>
            )}

            {/* Google Button */}
            <button
              type='button'
              onClick={handleGoogleAuth}
              className='w-full flex items-center justify-center gap-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3 px-4 rounded-2xl transition-all duration-200 hover:border-slate-300 hover:shadow-sm mb-6'
            >
              <svg className='w-5 h-5 flex-shrink-0' viewBox='0 0 24 24'>
                <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
              </svg>
              {isSignUp ? 'Sign up' : 'Sign in'} with Google
            </button>

            {/* Divider */}
            <div className='relative flex items-center gap-4 mb-6'>
              <div className='flex-1 h-px bg-slate-100' />
              <span className='text-xs text-slate-400 font-medium'>or continue with email</span>
              <div className='flex-1 h-px bg-slate-100' />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className='space-y-5'>
              {isSignUp && (
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Full Name</Label>
                  <div className='relative'>
                    <User className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused === 'name' ? 'text-sky-500' : 'text-slate-300'}`} />
                    <input
                      id='name'
                      type='text'
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      className={`uc-input w-full py-2.5 text-sm text-slate-900 placeholder:text-slate-300 border-b-2 ${focused === 'name' ? (isDoctor ? 'border-sky-500' : 'border-sky-500') : 'border-slate-200'}`}
                      placeholder='Dr. Arjun Sharma'
                      required
                    />
                  </div>
                </div>
              )}

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Email Address</Label>
                <div className='relative'>
                  <Mail className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused === 'email' ? 'text-sky-500' : 'text-slate-300'}`} />
                  <input
                    id='email'
                    type='email'
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className={`uc-input w-full py-2.5 text-sm text-slate-900 placeholder:text-slate-300 border-b-2 ${focused === 'email' ? 'border-sky-500' : 'border-slate-200'}`}
                    placeholder='you@example.com'
                    required
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>Password</Label>
                <div className='relative'>
                  <Lock className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused === 'password' ? 'text-sky-500' : 'text-slate-300'}`} />
                  <input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className={`uc-input w-full py-2.5 text-sm text-slate-900 placeholder:text-slate-300 border-b-2 pr-8 ${focused === 'password' ? 'border-sky-500' : 'border-slate-200'}`}
                    placeholder='Min. 8 characters'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors'
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className='flex items-start gap-3 pt-1'>
                  <Checkbox
                    id='terms'
                    checked={agreeTerms}
                    onCheckedChange={(c) => setAgreeTerms(c as boolean)}
                    className='mt-0.5 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500'
                  />
                  <label htmlFor='terms' className='text-xs text-slate-500 leading-relaxed cursor-pointer'>
                    I agree to UniCare+'s{' '}
                    <Link href='#' className='text-sky-600 hover:underline font-medium'>Terms of Service</Link>
                    {' '}and{' '}
                    <Link href='#' className='text-sky-600 hover:underline font-medium'>Privacy Policy</Link>
                  </label>
                </div>
              )}

              <div className='pt-2'>
                <button
                  type='submit'
                  disabled={loading || (isSignUp && !agreeTerms)}
                  className={`submit-btn w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 px-6 rounded-2xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${isDoctor
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 hover:shadow-slate-900/30'
                      : 'bg-gradient-to-b from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-sky-300/40 hover:shadow-sky-400/50'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                      </svg>
                      {isSignUp ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight className='w-4 h-4' />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Switch auth mode */}
            <p className='text-center text-sm text-slate-500 mt-6'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link href={altLinkPath} className='text-sky-600 hover:text-sky-700 font-semibold hover:underline transition-colors'>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Link>
            </p>

            {/* Switch role hint */}
            <div className={`mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 pb-4`}>
              <span>Are you a {isDoctor ? 'patient' : 'doctor'}?</span>
              <Link
                href={`/${isSignUp ? 'signup' : 'login'}/${isDoctor ? 'patient' : 'doctor'}`}
                className='text-slate-600 hover:text-slate-900 font-semibold hover:underline transition-colors'
              >
                {isDoctor ? 'Patient login →' : 'Doctor login →'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthForm;